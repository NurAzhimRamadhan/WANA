"""WANA backend integration tests."""
import os
import time
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL")
if not BASE_URL:
    # fallback to frontend .env
    from pathlib import Path
    fe = Path("/app/frontend/.env").read_text()
    for line in fe.splitlines():
        if line.startswith("REACT_APP_BACKEND_URL="):
            BASE_URL = line.split("=", 1)[1].strip()
            break
BASE_URL = BASE_URL.rstrip("/")
API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# -------- Health
def test_root(session):
    r = session.get(f"{API}/")
    assert r.status_code == 200
    assert r.json().get("status") == "ok"


# -------- Regulations
def test_regulations_list_returns_12_sorted_desc(session):
    r = session.get(f"{API}/regulations")
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)
    assert len(data) == 12
    dates = [d["date_issued"] for d in data]
    assert dates == sorted(dates, reverse=True)


def test_regulations_filter_region_jambi(session):
    r = session.get(f"{API}/regulations", params={"region": "Jambi"})
    assert r.status_code == 200
    data = r.json()
    assert len(data) >= 1
    for d in data:
        assert d["region"] == "Jambi"


def test_regulations_filter_status_confirmed(session):
    r = session.get(f"{API}/regulations", params={"status": "confirmed_impact"})
    assert r.status_code == 200
    data = r.json()
    assert len(data) >= 1
    for d in data:
        assert d["impact_status"] == "confirmed_impact"


def test_regulations_search_q(session):
    r = session.get(f"{API}/regulations", params={"q": "sawit"})
    assert r.status_code == 200
    data = r.json()
    assert len(data) >= 1
    found = any("sawit" in (d.get("title_id", "") + d.get("title_en", "")).lower() for d in data)
    assert found


def test_regulations_get_by_id(session):
    listing = session.get(f"{API}/regulations").json()
    rid = listing[0]["id"]
    r = session.get(f"{API}/regulations/{rid}")
    assert r.status_code == 200
    assert r.json()["id"] == rid


def test_regulations_get_invalid_404(session):
    r = session.get(f"{API}/regulations/non-existent-id-xyz")
    assert r.status_code == 404


def test_regulations_meta_regions(session):
    r = session.get(f"{API}/regulations/meta/regions")
    assert r.status_code == 200
    data = r.json()
    assert "regions" in data
    regs = data["regions"]
    assert isinstance(regs, list)
    assert regs == sorted(regs)
    assert "Jambi" in regs


# -------- Territories
def test_territories_list_6_with_overlap(session):
    r = session.get(f"{API}/territories")
    assert r.status_code == 200
    data = r.json()
    assert len(data) == 6
    for t in data:
        assert isinstance(t["polygon"], list) and len(t["polygon"]) >= 3
        assert "has_overlap" in t


# -------- Alerts
def test_alerts_list_8(session):
    r = session.get(f"{API}/alerts")
    assert r.status_code == 200
    data = r.json()
    assert len(data) == 8


def test_alerts_filter_priority_high(session):
    r = session.get(f"{API}/alerts", params={"priority": "high"})
    assert r.status_code == 200
    for d in r.json():
        assert d["priority"] == "high"


def test_alerts_filter_region(session):
    r = session.get(f"{API}/alerts", params={"region": "Jambi"})
    assert r.status_code == 200
    for d in r.json():
        assert d["region"] == "Jambi"


def test_alert_patch_read(session):
    alerts = session.get(f"{API}/alerts").json()
    aid = alerts[0]["id"]
    r = session.patch(f"{API}/alerts/{aid}", json={"is_read": True})
    assert r.status_code == 200
    # verify persisted
    refreshed = session.get(f"{API}/alerts").json()
    target = next(a for a in refreshed if a["id"] == aid)
    assert target["is_read"] is True
    # toggle back
    session.patch(f"{API}/alerts/{aid}", json={"is_read": False})


def test_alert_patch_invalid_id(session):
    r = session.patch(f"{API}/alerts/bad-id-x", json={"is_read": True})
    assert r.status_code == 404


# -------- Alert subscriptions
def test_alert_subscription_create(session):
    payload = {
        "name": "TEST_Paralegal",
        "organization": "TEST_Org",
        "region": "Jambi",
        "channel": "email",
        "contact": "test@example.com",
    }
    r = session.post(f"{API}/alert-subscriptions", json=payload)
    assert r.status_code == 200
    data = r.json()
    assert data["name"] == "TEST_Paralegal"
    assert data["region"] == "Jambi"
    assert "id" in data


# -------- Evidence packs CRUD
def test_evidence_pack_full_crud(session):
    create_payload = {
        "case_name": "TEST_Case_Dayak_Ngaju",
        "community": "TEST_Dayak_Ngaju",
        "region": "Kalimantan Tengah",
    }
    r = session.post(f"{API}/evidence-packs", json=create_payload)
    assert r.status_code == 200
    pack = r.json()
    pid = pack["id"]
    assert pack["status"] == "draft"
    assert pack["case_name"] == "TEST_Case_Dayak_Ngaju"
    assert isinstance(pack["checklist"], dict)

    # list
    r = session.get(f"{API}/evidence-packs")
    assert r.status_code == 200
    ids = [p["id"] for p in r.json()]
    assert pid in ids

    # update
    upd = {
        "status": "under_review",
        "checklist": {"territory_map": True, "community_consent": True},
        "legal_objection_draft": "Test objection text",
    }
    r = session.put(f"{API}/evidence-packs/{pid}", json=upd)
    assert r.status_code == 200
    updated = r.json()
    assert updated["status"] == "under_review"
    assert updated["legal_objection_draft"] == "Test objection text"

    # get by id verifies persistence
    r = session.get(f"{API}/evidence-packs/{pid}")
    assert r.status_code == 200
    assert r.json()["status"] == "under_review"


def test_evidence_pack_update_invalid_404(session):
    r = session.put(f"{API}/evidence-packs/bad-pid", json={"status": "draft"})
    assert r.status_code == 404


# -------- Dashboard
def test_dashboard_summary(session):
    r = session.get(f"{API}/dashboard/summary")
    assert r.status_code == 200
    data = r.json()
    assert data["regulations_total"] == 12
    assert data["territories_total"] == 6
    for key in ["confirmed_impact", "potential_impact", "under_review", "unread_alerts", "territories_with_overlap"]:
        assert key in data


# -------- Impact brief (Claude)
SAMPLE_DOC = (
    "Peraturan Menteri Lingkungan Hidup dan Kehutanan tentang pelepasan kawasan hutan "
    "produksi konversi seluas 12.400 hektar di Kabupaten Kapuas, Kalimantan Tengah, "
    "untuk areal perkebunan kelapa sawit. Pasal 3 menyatakan pengelolaan harus memperhatikan "
    "hak masyarakat hukum adat yang berada di sekitar kawasan tersebut. Pasal 5 mengatur "
    "kewajiban pemegang izin untuk melakukan konsultasi publik."
)


def test_impact_brief_short_text_400(session):
    r = session.post(f"{API}/impact-brief/generate", json={"text": "terlalu pendek"})
    assert r.status_code == 400


def test_impact_brief_generate_and_pdf(session):
    r = session.post(
        f"{API}/impact-brief/generate",
        json={"title": "TEST_Regulasi_Sawit", "language": "id", "text": SAMPLE_DOC},
        timeout=120,
    )
    assert r.status_code == 200, f"Brief gen failed: {r.status_code} {r.text[:300]}"
    data = r.json()
    assert "id" in data
    assert data["plain_summary"]
    assert data["community_meaning"]
    assert isinstance(data["key_risks"], list) and len(data["key_risks"]) >= 1
    assert data["territorial_impact"]
    assert isinstance(data["important_articles"], list)
    assert isinstance(data["confidence"], (int, float))

    # PDF
    bid = data["id"]
    r2 = session.get(f"{API}/impact-briefs/{bid}/pdf", timeout=30)
    assert r2.status_code == 200
    assert r2.headers.get("content-type", "").startswith("application/pdf")
    assert len(r2.content) > 500


def test_impact_brief_pdf_invalid_404(session):
    r = session.get(f"{API}/impact-briefs/no-such-id/pdf")
    assert r.status_code == 404
