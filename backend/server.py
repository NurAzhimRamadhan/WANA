from fastapi import FastAPI, APIRouter, HTTPException, UploadFile, File, Form
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import io
import json
import re
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Literal
import uuid
from datetime import datetime, timezone

from pypdf import PdfReader

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY', '')

app = FastAPI(title="WANA — Wilayah Adat Nusantara Accountability")
api_router = APIRouter(prefix="/api")


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


# ---------- MODELS ----------

ImpactStatus = Literal["safe", "potential_impact", "confirmed_impact", "under_review"]
AlertPriority = Literal["high", "medium", "low"]
RiskLevel = Literal["rendah", "sedang", "tinggi", "kritis"]


class Regulation(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    number: str
    title_id: str
    title_en: str
    institution: str
    date_issued: str
    region: str
    summary_id: str
    summary_en: str
    impact_status: ImpactStatus
    document_url: str
    affected_territories: List[str] = []
    category: Optional[str] = None
    risk_level: Optional[RiskLevel] = None
    risk_score: Optional[int] = 0
    confidence_score: Optional[float] = 0.0
    communities: List[str] = []
    recommendation_id: Optional[str] = ""
    recommendation_en: Optional[str] = ""
    sumber: Optional[str] = ""
    created_at: str = Field(default_factory=now_iso)


class Alert(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    regulation_id: str
    title_id: str
    title_en: str
    region: str
    territory: str
    priority: AlertPriority
    channel: Literal["whatsapp", "email", "system"]
    message_id: str
    message_en: str
    action_needed: bool = True
    is_read: bool = False
    curator_approved: bool = True
    created_at: str = Field(default_factory=now_iso)


class Territory(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    community: str
    region: str
    # geometry as list of [lat, lng]
    polygon: List[List[float]]
    has_overlap: bool = False
    overlap_with: Optional[str] = None
    overlap_polygon: Optional[List[List[float]]] = None
    note_id: Optional[str] = None
    note_en: Optional[str] = None


class EvidencePack(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    case_name: str
    community: str
    region: str
    status: Literal["draft", "under_review", "submitted", "archived"] = "draft"
    checklist: dict = Field(default_factory=lambda: {
        "territory_map": False,
        "community_consent": False,
        "regulation_copy": False,
        "field_photos": False,
        "witness_statements": False,
        "ancestral_proof": False,
    })
    timeline: List[dict] = []
    files: List[dict] = []
    legal_objection_draft: str = ""
    created_at: str = Field(default_factory=now_iso)
    updated_at: str = Field(default_factory=now_iso)


class ImpactBrief(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    language: Literal["id", "en"] = "id"
    source_text: str
    plain_summary: str
    community_meaning: str
    key_risks: List[str]
    territorial_impact: str
    important_articles: List[str]
    confidence: float
    created_at: str = Field(default_factory=now_iso)


class BriefRequest(BaseModel):
    title: Optional[str] = "Dokumen Regulasi"
    language: Literal["id", "en"] = "id"
    text: str


class EvidencePackCreate(BaseModel):
    case_name: str
    community: str
    region: str


class EvidencePackUpdate(BaseModel):
    status: Optional[str] = None
    checklist: Optional[dict] = None
    timeline: Optional[List[dict]] = None
    legal_objection_draft: Optional[str] = None
    files: Optional[List[dict]] = None


class AlertReadUpdate(BaseModel):
    is_read: bool = True


class AlertSubscription(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    organization: Optional[str] = ""
    region: str
    channel: Literal["whatsapp", "email", "both"] = "both"
    contact: str
    created_at: str = Field(default_factory=now_iso)


NotificationCategory = Literal["urgent", "warning", "success", "info"]
NotificationType = Literal["regulation", "brief", "spatial", "alert", "evidence", "validation"]


class Notification(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    type: NotificationType
    category: NotificationCategory
    title_id: str
    title_en: str
    message_id: str
    message_en: str
    region: Optional[str] = ""
    link: Optional[str] = "/"
    is_read: bool = False
    created_at: str = Field(default_factory=now_iso)


class Conflict(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title_id: str
    title_en: str
    region: str
    community: str
    category: str
    status: str
    risk_level: RiskLevel
    started_at: str
    regulation_number: Optional[str] = ""
    summary_id: str
    summary_en: str
    casualties_reported: int = 0
    mitigation_id: str = ""
    mitigation_en: str = ""
    created_at: str = Field(default_factory=now_iso)


class NewsItem(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title_id: str
    title_en: str
    source: str
    date_published: str
    region: str
    category: str
    summary_id: str
    summary_en: str
    url: str
    created_at: str = Field(default_factory=now_iso)


# ---------- ENDPOINTS ----------

@api_router.get("/")
async def root():
    return {"service": "WANA API", "status": "ok"}


# Regulations
@api_router.get("/regulations", response_model=List[Regulation])
async def list_regulations(
    region: Optional[str] = None,
    status: Optional[str] = None,
    category: Optional[str] = None,
    risk: Optional[str] = None,
    q: Optional[str] = None,
):
    query: dict = {}
    if region and region != "all":
        query["region"] = region
    if status and status != "all":
        query["impact_status"] = status
    if category and category != "all":
        query["category"] = category
    if risk and risk != "all":
        query["risk_level"] = risk
    if q:
        query["$or"] = [
            {"title_id": {"$regex": q, "$options": "i"}},
            {"title_en": {"$regex": q, "$options": "i"}},
            {"number": {"$regex": q, "$options": "i"}},
            {"institution": {"$regex": q, "$options": "i"}},
            {"region": {"$regex": q, "$options": "i"}},
        ]
    docs = await db.regulations.find(query, {"_id": 0}).sort("date_issued", -1).to_list(500)
    return docs


@api_router.get("/regulations/{reg_id}", response_model=Regulation)
async def get_regulation(reg_id: str):
    doc = await db.regulations.find_one({"id": reg_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Regulation not found")
    return doc


@api_router.get("/regulations/meta/regions")
async def list_regions():
    docs = await db.regulations.distinct("region")
    return {"regions": sorted(docs)}


# Alerts
@api_router.get("/alerts", response_model=List[Alert])
async def list_alerts(region: Optional[str] = None, priority: Optional[str] = None):
    query: dict = {}
    if region and region != "all":
        query["region"] = region
    if priority and priority != "all":
        query["priority"] = priority
    docs = await db.alerts.find(query, {"_id": 0}).sort("created_at", -1).to_list(200)
    return docs


@api_router.patch("/alerts/{alert_id}")
async def update_alert(alert_id: str, payload: AlertReadUpdate):
    res = await db.alerts.update_one({"id": alert_id}, {"$set": {"is_read": payload.is_read}})
    if res.matched_count == 0:
        raise HTTPException(404, "Alert not found")
    return {"ok": True}


@api_router.post("/alert-subscriptions", response_model=AlertSubscription)
async def subscribe_alert(sub: AlertSubscription):
    doc = sub.model_dump()
    await db.alert_subscriptions.insert_one(doc)
    return sub


# Notifications — system activity feed
@api_router.get("/notifications", response_model=List[Notification])
async def list_notifications(limit: int = 30):
    docs = await db.notifications.find({}, {"_id": 0}).sort("created_at", -1).to_list(limit)
    return docs


@api_router.get("/notifications/unread-count")
async def notifications_unread_count():
    n = await db.notifications.count_documents({"is_read": False})
    return {"unread": n}


@api_router.patch("/notifications/{notif_id}")
async def mark_notification_read(notif_id: str, payload: AlertReadUpdate):
    res = await db.notifications.update_one({"id": notif_id}, {"$set": {"is_read": payload.is_read}})
    if res.matched_count == 0:
        raise HTTPException(404, "Notification not found")
    return {"ok": True}


@api_router.post("/notifications/mark-all-read")
async def notifications_mark_all_read():
    res = await db.notifications.update_many({"is_read": False}, {"$set": {"is_read": True}})
    return {"updated": res.modified_count}


# Territories
@api_router.get("/territories", response_model=List[Territory])
async def list_territories():
    docs = await db.territories.find({}, {"_id": 0}).to_list(200)
    return docs


# Evidence packs
@api_router.get("/evidence-packs", response_model=List[EvidencePack])
async def list_evidence_packs():
    docs = await db.evidence_packs.find({}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return docs


@api_router.post("/evidence-packs", response_model=EvidencePack)
async def create_evidence_pack(payload: EvidencePackCreate):
    pack = EvidencePack(**payload.model_dump())
    pack.timeline.append({
        "ts": now_iso(),
        "event": "Pack created",
        "by": "system",
    })
    await db.evidence_packs.insert_one(pack.model_dump())
    return pack


@api_router.get("/evidence-packs/{pack_id}", response_model=EvidencePack)
async def get_evidence_pack(pack_id: str):
    doc = await db.evidence_packs.find_one({"id": pack_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Pack not found")
    return doc


@api_router.put("/evidence-packs/{pack_id}", response_model=EvidencePack)
async def update_evidence_pack(pack_id: str, payload: EvidencePackUpdate):
    existing = await db.evidence_packs.find_one({"id": pack_id}, {"_id": 0})
    if not existing:
        raise HTTPException(404, "Pack not found")
    update = {k: v for k, v in payload.model_dump().items() if v is not None}
    update["updated_at"] = now_iso()
    push = None
    if payload.status and payload.status != existing.get("status"):
        push = {"timeline": {
            "ts": now_iso(),
            "event": _humanize_event("status_changed", "", payload.status),
            "by": "Paralegal",
            "kind": "status_changed",
        }}
    op = {"$set": update}
    if push:
        op["$push"] = push
    await db.evidence_packs.update_one({"id": pack_id}, op)
    doc = await db.evidence_packs.find_one({"id": pack_id}, {"_id": 0})
    return doc


# Evidence files
EVIDENCE_UPLOAD_DIR = ROOT_DIR / "uploads" / "evidence"
EVIDENCE_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_MIME_PREFIXES = ("image/", "application/pdf", "application/msword",
                        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                        "text/")
MAX_FILE_BYTES = 10 * 1024 * 1024  # 10 MB
EVIDENCE_CATEGORIES = {
    "field_photo", "customary_letter", "territory_map", "conflict_evidence",
    "witness_statement", "fpic_document", "related_regulation", "other",
}
FILE_STATUSES = {"pending_validation", "verified", "needs_revision", "draft"}


class EvidenceFileStatusUpdate(BaseModel):
    status: Literal["pending_validation", "verified", "needs_revision", "draft"]


def _humanize_event(action: str, file_name: str = "", category: str = "", lang: str = "id") -> str:
    # We store a generic event string; UI will render localized labels.
    if action == "file_uploaded":
        return f"Dokumen \"{file_name}\" diunggah (kategori: {category})"
    if action == "file_deleted":
        return f"Dokumen \"{file_name}\" dihapus"
    if action == "file_status_changed":
        return f"Status dokumen \"{file_name}\" diubah menjadi {category}"
    if action == "pack_created":
        return "Paket bukti dibuat"
    if action == "status_changed":
        return f"Status paket diubah menjadi {category}"
    return action


@api_router.post("/evidence-packs/{pack_id}/files")
async def upload_evidence_file(
    pack_id: str,
    file: UploadFile = File(...),
    category: str = Form("other"),
    uploaded_by: str = Form("Paralegal"),
):
    pack = await db.evidence_packs.find_one({"id": pack_id}, {"_id": 0})
    if not pack:
        raise HTTPException(404, "Pack not found")
    if category not in EVIDENCE_CATEGORIES:
        category = "other"
    contents = await file.read()
    if len(contents) > MAX_FILE_BYTES:
        raise HTTPException(400, "File too large (max 10 MB).")
    mime = file.content_type or "application/octet-stream"
    if not mime.startswith(ALLOWED_MIME_PREFIXES):
        raise HTTPException(400, f"Unsupported file type: {mime}")

    file_id = str(uuid.uuid4())
    pack_dir = EVIDENCE_UPLOAD_DIR / pack_id
    pack_dir.mkdir(parents=True, exist_ok=True)
    safe_name = re.sub(r"[^A-Za-z0-9._-]", "_", file.filename or "file")
    stored_path = pack_dir / f"{file_id}_{safe_name}"
    with open(stored_path, "wb") as f:
        f.write(contents)

    meta = {
        "id": file_id,
        "name": file.filename or safe_name,
        "stored_name": stored_path.name,
        "size": len(contents),
        "mime": mime,
        "category": category,
        "status": "pending_validation",
        "uploaded_by": uploaded_by or "Paralegal",
        "uploaded_at": now_iso(),
    }

    event = {
        "ts": now_iso(),
        "event": _humanize_event("file_uploaded", meta["name"], category),
        "by": uploaded_by or "Paralegal",
        "kind": "file_uploaded",
        "ref_id": file_id,
    }

    await db.evidence_packs.update_one(
        {"id": pack_id},
        {"$push": {"files": meta, "timeline": event}, "$set": {"updated_at": now_iso()}},
    )
    doc = await db.evidence_packs.find_one({"id": pack_id}, {"_id": 0})
    return doc


@api_router.get("/evidence-packs/{pack_id}/files/{file_id}/download")
async def download_evidence_file(pack_id: str, file_id: str):
    pack = await db.evidence_packs.find_one({"id": pack_id}, {"_id": 0})
    if not pack:
        raise HTTPException(404, "Pack not found")
    file_meta = next((f for f in pack.get("files", []) if f["id"] == file_id), None)
    if not file_meta:
        raise HTTPException(404, "File not found")
    path = EVIDENCE_UPLOAD_DIR / pack_id / file_meta["stored_name"]
    if not path.exists():
        raise HTTPException(404, "File missing on disk")

    def iterfile():
        with open(path, "rb") as f:
            yield from f

    return StreamingResponse(
        iterfile(),
        media_type=file_meta.get("mime", "application/octet-stream"),
        headers={"Content-Disposition": f'inline; filename="{file_meta["name"]}"'},
    )


@api_router.patch("/evidence-packs/{pack_id}/files/{file_id}")
async def update_evidence_file_status(pack_id: str, file_id: str, payload: EvidenceFileStatusUpdate):
    pack = await db.evidence_packs.find_one({"id": pack_id}, {"_id": 0})
    if not pack:
        raise HTTPException(404, "Pack not found")
    file_meta = next((f for f in pack.get("files", []) if f["id"] == file_id), None)
    if not file_meta:
        raise HTTPException(404, "File not found")

    event = {
        "ts": now_iso(),
        "event": _humanize_event("file_status_changed", file_meta["name"], payload.status),
        "by": "Curator",
        "kind": "file_status_changed",
        "ref_id": file_id,
    }
    await db.evidence_packs.update_one(
        {"id": pack_id, "files.id": file_id},
        {"$set": {"files.$.status": payload.status, "updated_at": now_iso()},
         "$push": {"timeline": event}},
    )
    return await db.evidence_packs.find_one({"id": pack_id}, {"_id": 0})


@api_router.delete("/evidence-packs/{pack_id}/files/{file_id}")
async def delete_evidence_file(pack_id: str, file_id: str):
    pack = await db.evidence_packs.find_one({"id": pack_id}, {"_id": 0})
    if not pack:
        raise HTTPException(404, "Pack not found")
    file_meta = next((f for f in pack.get("files", []) if f["id"] == file_id), None)
    if not file_meta:
        raise HTTPException(404, "File not found")

    path = EVIDENCE_UPLOAD_DIR / pack_id / file_meta["stored_name"]
    if path.exists():
        try:
            path.unlink()
        except Exception:
            pass

    event = {
        "ts": now_iso(),
        "event": _humanize_event("file_deleted", file_meta["name"]),
        "by": "Paralegal",
        "kind": "file_deleted",
        "ref_id": file_id,
    }
    await db.evidence_packs.update_one(
        {"id": pack_id},
        {"$pull": {"files": {"id": file_id}},
         "$push": {"timeline": event},
         "$set": {"updated_at": now_iso()}},
    )
    return await db.evidence_packs.find_one({"id": pack_id}, {"_id": 0})


# Impact Brief — Claude Sonnet 4.5
SYSTEM_BRIEF_ID = """Anda adalah asisten paralegal hukum kehutanan Indonesia untuk WANA (Wilayah Adat Nusantara Accountability).
Tugas Anda adalah meringkas dokumen regulasi/kebijakan kehutanan menjadi penjelasan singkat yang dapat dipahami oleh paralegal komunitas adat.

WAJIB BALAS HANYA dengan JSON valid (tanpa penjelasan tambahan, tanpa markdown fence) dengan struktur:
{
  "plain_summary": "ringkasan 2-3 kalimat dalam bahasa sederhana",
  "community_meaning": "1-2 paragraf: 'Apa artinya ini untuk komunitas Anda?' — jelaskan dengan kalimat manusiawi, hindari jargon",
  "key_risks": ["risiko 1", "risiko 2", "risiko 3", "risiko 4"],
  "territorial_impact": "1 paragraf tentang potensi dampak pada wilayah adat",
  "important_articles": ["Pasal X tentang ...", "Pasal Y tentang ..."],
  "confidence": 0.0-1.0
}
Gunakan istilah hukum dengan hati-hati. Jika dokumen tidak jelas, turunkan confidence di bawah 0.6."""

SYSTEM_BRIEF_EN = """You are a forestry-law paralegal assistant for WANA (Wilayah Adat Nusantara Accountability).
Summarize Indonesian forestry policy/regulation documents into a plain-language brief that indigenous community paralegals can understand.

ALWAYS REPLY with ONLY valid JSON (no explanation, no markdown fences) of shape:
{
  "plain_summary": "2-3 sentence plain summary",
  "community_meaning": "1-2 paragraphs: 'What this means for your community' — human voice, no jargon",
  "key_risks": ["risk 1", "risk 2", "risk 3", "risk 4"],
  "territorial_impact": "1 paragraph on potential impact to indigenous territories",
  "important_articles": ["Article X on ...", "Article Y on ..."],
  "confidence": 0.0-1.0
}
Use legal terminology carefully. If the document is unclear, lower the confidence below 0.6."""


def _extract_text_from_pdf(file_bytes: bytes) -> str:
    reader = PdfReader(io.BytesIO(file_bytes))
    text_parts = []
    for page in reader.pages:
        try:
            text_parts.append(page.extract_text() or "")
        except Exception:
            continue
    return "\n".join(text_parts).strip()


def _extract_json(text: str) -> dict:
    # try direct parse
    try:
        return json.loads(text)
    except Exception:
        pass
    # try to find first {...} block
    m = re.search(r"\{[\s\S]*\}", text)
    if m:
        try:
            return json.loads(m.group(0))
        except Exception:
            pass
    raise ValueError("Could not parse JSON from LLM output")


async def _generate_brief(language: str, title: str, source_text: str) -> ImpactBrief:
    if not EMERGENT_LLM_KEY:
        raise HTTPException(500, "EMERGENT_LLM_KEY not configured")

    from emergentintegrations.llm.chat import LlmChat, UserMessage

    system_msg = SYSTEM_BRIEF_ID if language == "id" else SYSTEM_BRIEF_EN
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=f"brief-{uuid.uuid4()}",
        system_message=system_msg,
    ).with_model("anthropic", "claude-sonnet-4-5-20250929")

    # truncate very long docs
    truncated = source_text[:18000]
    prompt = (
        f"Dokumen judul: {title}\n\nIsi dokumen:\n---\n{truncated}\n---\n\nBalas hanya JSON."
        if language == "id"
        else f"Document title: {title}\n\nDocument content:\n---\n{truncated}\n---\n\nReply with JSON only."
    )

    try:
        response_text = await chat.send_message(UserMessage(text=prompt))
    except Exception as e:
        logger.exception("Claude call failed")
        msg = str(e)
        if "budget" in msg.lower():
            raise HTTPException(502, "AI service budget temporarily exhausted. Please try again shortly.")
        raise HTTPException(502, "AI service temporarily unavailable. Please try again.")
    try:
        data = _extract_json(response_text)
    except Exception:
        raise HTTPException(502, "Could not parse AI response. Please retry.")

    brief = ImpactBrief(
        title=title,
        language=language,
        source_text=truncated,
        plain_summary=data.get("plain_summary", ""),
        community_meaning=data.get("community_meaning", ""),
        key_risks=data.get("key_risks", []) or [],
        territorial_impact=data.get("territorial_impact", ""),
        important_articles=data.get("important_articles", []) or [],
        confidence=float(data.get("confidence", 0.7)),
    )
    await db.impact_briefs.insert_one(brief.model_dump())
    return brief


@api_router.post("/impact-brief/generate", response_model=ImpactBrief)
async def generate_brief_text(payload: BriefRequest):
    if not payload.text or len(payload.text.strip()) < 50:
        raise HTTPException(400, "Document text is too short. Minimum 50 characters.")
    return await _generate_brief(payload.language, payload.title or "Dokumen Regulasi", payload.text)


@api_router.post("/impact-brief/upload", response_model=ImpactBrief)
async def generate_brief_upload(
    file: UploadFile = File(...),
    title: str = Form("Dokumen Regulasi"),
    language: str = Form("id"),
):
    contents = await file.read()
    if file.filename.lower().endswith(".pdf"):
        text = _extract_text_from_pdf(contents)
    else:
        try:
            text = contents.decode("utf-8", errors="ignore")
        except Exception:
            text = ""
    if not text or len(text.strip()) < 50:
        raise HTTPException(400, "Could not extract enough text from the uploaded document.")
    return await _generate_brief(language, title, text)


@api_router.get("/impact-briefs", response_model=List[ImpactBrief])
async def list_briefs():
    docs = await db.impact_briefs.find({}, {"_id": 0}).sort("created_at", -1).to_list(50)
    return docs


@api_router.get("/impact-briefs/{brief_id}/pdf")
async def export_brief_pdf(brief_id: str):
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
    from reportlab.lib.units import cm
    from reportlab.lib.colors import HexColor

    doc = await db.impact_briefs.find_one({"id": brief_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Brief not found")

    buffer = io.BytesIO()
    pdf = SimpleDocTemplate(buffer, pagesize=A4, leftMargin=2*cm, rightMargin=2*cm)
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle("WanaTitle", parent=styles["Title"], textColor=HexColor("#1C3F2B"), fontSize=20, spaceAfter=12)
    h_style = ParagraphStyle("WanaH", parent=styles["Heading2"], textColor=HexColor("#1C3F2B"), fontSize=13, spaceAfter=6, spaceBefore=12)
    body_style = ParagraphStyle("WanaBody", parent=styles["BodyText"], fontSize=11, leading=15, textColor=HexColor("#1C1B1A"))

    flow = []
    flow.append(Paragraph("WANA — Impact Brief", title_style))
    flow.append(Paragraph(doc["title"], h_style))
    flow.append(Spacer(1, 6))
    flow.append(Paragraph(f"<i>Confidence: {round(doc['confidence']*100)}% — AI-generated, awaiting human validation</i>", body_style))

    flow.append(Paragraph("Ringkasan / Summary", h_style))
    flow.append(Paragraph(doc["plain_summary"], body_style))

    flow.append(Paragraph("Apa artinya untuk komunitas / What this means", h_style))
    flow.append(Paragraph(doc["community_meaning"], body_style))

    flow.append(Paragraph("Risiko Utama / Key Risks", h_style))
    for r in doc["key_risks"]:
        flow.append(Paragraph(f"• {r}", body_style))

    flow.append(Paragraph("Dampak Teritorial / Territorial Impact", h_style))
    flow.append(Paragraph(doc["territorial_impact"], body_style))

    flow.append(Paragraph("Pasal Penting / Important Articles", h_style))
    for a in doc["important_articles"]:
        flow.append(Paragraph(f"• {a}", body_style))

    flow.append(Spacer(1, 18))
    flow.append(Paragraph("<i>Disclaimer: Ringkasan ini dihasilkan oleh AI dan WAJIB divalidasi oleh pendamping hukum sebelum digunakan dalam tindakan hukum. / This summary is AI-generated and MUST be validated by a legal companion before any legal action.</i>", body_style))

    pdf.build(flow)
    buffer.seek(0)
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="wana-brief-{brief_id}.pdf"'},
    )


# Dashboard summary
@api_router.get("/dashboard/summary")
async def dashboard_summary():
    total_regs = await db.regulations.count_documents({})
    confirmed = await db.regulations.count_documents({"impact_status": "confirmed_impact"})
    potential = await db.regulations.count_documents({"impact_status": "potential_impact"})
    review = await db.regulations.count_documents({"impact_status": "under_review"})
    safe = await db.regulations.count_documents({"impact_status": "safe"})
    critical = await db.regulations.count_documents({"risk_level": "kritis"})
    high = await db.regulations.count_documents({"risk_level": "tinggi"})
    unread = await db.alerts.count_documents({"is_read": False})
    territories = await db.territories.count_documents({})
    overlaps = await db.territories.count_documents({"has_overlap": True})
    conflicts = await db.conflicts.count_documents({})
    news = await db.news.count_documents({})
    communities = await db.territories.distinct("community")
    return {
        "regulations_total": total_regs,
        "confirmed_impact": confirmed,
        "potential_impact": potential,
        "under_review": review,
        "safe": safe,
        "critical_risk": critical,
        "high_risk": high,
        "unread_alerts": unread,
        "territories_total": territories,
        "territories_with_overlap": overlaps,
        "conflicts_total": conflicts,
        "news_total": news,
        "communities_total": len(communities),
    }


@api_router.get("/regulations/meta/categories")
async def regulation_categories():
    pipeline = [
        {"$group": {"_id": "$category", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
    ]
    docs = await db.regulations.aggregate(pipeline).to_list(50)
    return {"categories": [{"category": d["_id"], "count": d["count"]} for d in docs if d["_id"]]}


@api_router.get("/regulations/meta/risks")
async def regulation_risk_breakdown():
    pipeline = [
        {"$group": {"_id": "$risk_level", "count": {"$sum": 1}}},
    ]
    docs = await db.regulations.aggregate(pipeline).to_list(50)
    return {"risks": [{"risk_level": d["_id"], "count": d["count"]} for d in docs if d["_id"]]}


# Conflicts
@api_router.get("/conflicts", response_model=List[Conflict])
async def list_conflicts(region: Optional[str] = None, risk: Optional[str] = None, q: Optional[str] = None):
    query: dict = {}
    if region and region != "all":
        query["region"] = region
    if risk and risk != "all":
        query["risk_level"] = risk
    if q:
        query["$or"] = [
            {"title_id": {"$regex": q, "$options": "i"}},
            {"title_en": {"$regex": q, "$options": "i"}},
            {"community": {"$regex": q, "$options": "i"}},
        ]
    docs = await db.conflicts.find(query, {"_id": 0}).sort("started_at", -1).to_list(200)
    return docs


# News
@api_router.get("/news", response_model=List[NewsItem])
async def list_news(region: Optional[str] = None, category: Optional[str] = None, q: Optional[str] = None):
    query: dict = {}
    if region and region != "all":
        query["region"] = region
    if category and category != "all":
        query["category"] = category
    if q:
        query["$or"] = [
            {"title_id": {"$regex": q, "$options": "i"}},
            {"title_en": {"$regex": q, "$options": "i"}},
            {"source": {"$regex": q, "$options": "i"}},
        ]
    docs = await db.news.find(query, {"_id": 0}).sort("date_published", -1).to_list(100)
    return docs


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


# ---------- SEED ON STARTUP ----------
SEED_REGULATIONS = [
    {
        "number": "P.62/MENLHK/2026",
        "title_id": "Pelepasan Kawasan Hutan untuk Perkebunan Sawit di Kalimantan Tengah",
        "title_en": "Forest Area Release for Palm Oil Plantation in Central Kalimantan",
        "institution": "KLHK — Kementerian Lingkungan Hidup dan Kehutanan",
        "date_issued": "2026-02-08",
        "region": "Kalimantan Tengah",
        "summary_id": "Pelepasan 12.400 hektar kawasan hutan produksi konversi menjadi areal perkebunan sawit di Kabupaten Kapuas. Termasuk dalam wilayah hidup Komunitas Adat Dayak Ngaju.",
        "summary_en": "Release of 12,400 hectares of convertible production forest to palm oil plantation area in Kapuas Regency. Includes ancestral domain of Dayak Ngaju indigenous community.",
        "impact_status": "confirmed_impact",
        "document_url": "https://jdih.menlhk.go.id/",
        "affected_territories": ["Dayak Ngaju — Kapuas"],
    },
    {
        "number": "SK.118/MENLHK/2026",
        "title_id": "Izin Pemanfaatan Hutan untuk Hutan Tanaman Industri di Jambi",
        "title_en": "Forest Utilization Permit for Industrial Plantation Forest in Jambi",
        "institution": "KLHK",
        "date_issued": "2026-01-29",
        "region": "Jambi",
        "summary_id": "Izin pemanfaatan hutan seluas 28.000 ha untuk HTI akasia. Tumpang tindih dengan wilayah Suku Anak Dalam (Orang Rimba) di Bukit Duabelas.",
        "summary_en": "28,000 ha forest utilization permit for acacia industrial plantation. Overlaps with Suku Anak Dalam (Orang Rimba) territory in Bukit Duabelas.",
        "impact_status": "confirmed_impact",
        "document_url": "https://jdih.menlhk.go.id/",
        "affected_territories": ["Suku Anak Dalam — Bukit Duabelas"],
    },
    {
        "number": "Permen LHK No. 7/2026",
        "title_id": "Penetapan Kawasan Hutan Lindung Pegunungan Meratus",
        "title_en": "Designation of Meratus Mountains Protected Forest Area",
        "institution": "KLHK",
        "date_issued": "2026-01-22",
        "region": "Kalimantan Selatan",
        "summary_id": "Penetapan ulang batas kawasan hutan lindung. Potensi membatasi akses tradisional Komunitas Adat Dayak Meratus terhadap hasil hutan non-kayu.",
        "summary_en": "Re-designation of protected forest boundaries. Potentially restricts traditional access of Dayak Meratus communities to non-timber forest products.",
        "impact_status": "potential_impact",
        "document_url": "https://jdih.menlhk.go.id/",
        "affected_territories": ["Dayak Meratus"],
    },
    {
        "number": "P.45/MENLHK/2026",
        "title_id": "Perubahan Peruntukan Kawasan Hutan di Papua Barat",
        "title_en": "Change of Forest Area Designation in West Papua",
        "institution": "KLHK",
        "date_issued": "2026-01-14",
        "region": "Papua Barat",
        "summary_id": "Perubahan peruntukan 54.000 ha kawasan hutan di Kabupaten Sorong untuk areal penggunaan lain (APL). Sebagian besar adalah tanah ulayat Suku Moi.",
        "summary_en": "Change of designation of 54,000 ha of forest area in Sorong Regency to 'other use area' (APL). Mostly Suku Moi ancestral land.",
        "impact_status": "confirmed_impact",
        "document_url": "https://jdih.menlhk.go.id/",
        "affected_territories": ["Suku Moi — Sorong"],
    },
    {
        "number": "SK.34/MENLHK/2026",
        "title_id": "Penambahan Areal Konsesi PBPH di Sulawesi Tengah",
        "title_en": "Concession Area Addition for PBPH in Central Sulawesi",
        "institution": "KLHK",
        "date_issued": "2026-01-05",
        "region": "Sulawesi Tengah",
        "summary_id": "Penambahan 6.200 ha areal konsesi pemanfaatan hutan. Berada di sekitar wilayah hidup masyarakat adat Wana di Morowali Utara.",
        "summary_en": "Addition of 6,200 ha forest utilization concession area, near the Wana indigenous community's living area in North Morowali.",
        "impact_status": "under_review",
        "document_url": "https://jdih.menlhk.go.id/",
        "affected_territories": ["Wana — Morowali Utara"],
    },
    {
        "number": "Perda Provinsi Riau No. 3/2026",
        "title_id": "Tata Ruang Wilayah Provinsi Riau (Revisi)",
        "title_en": "Riau Provincial Spatial Plan (Revision)",
        "institution": "Pemprov Riau",
        "date_issued": "2025-12-20",
        "region": "Riau",
        "summary_id": "Revisi peta tata ruang yang mengubah klasifikasi kawasan di sekitar Taman Nasional Tesso Nilo. Berpotensi mengurangi wilayah hidup komunitas adat Talang Mamak.",
        "summary_en": "Spatial plan revision reclassifying areas around Tesso Nilo National Park. Potentially reduces Talang Mamak indigenous community territory.",
        "impact_status": "potential_impact",
        "document_url": "https://jdih.riau.go.id/",
        "affected_territories": ["Talang Mamak — Tesso Nilo"],
    },
    {
        "number": "P.91/MENLHK/2025",
        "title_id": "Pedoman Pengakuan Hutan Adat Tahap II",
        "title_en": "Guidelines for Customary Forest Recognition Phase II",
        "institution": "KLHK",
        "date_issued": "2025-12-10",
        "region": "Nasional",
        "summary_id": "Penyederhanaan prosedur pengakuan hutan adat. Berdampak positif: mempercepat penetapan hutan adat. Komunitas didorong segera ajukan permohonan.",
        "summary_en": "Simplification of customary forest recognition procedure. Positive impact: faster designation. Communities are encouraged to file applications.",
        "impact_status": "under_review",
        "document_url": "https://jdih.menlhk.go.id/",
        "affected_territories": ["Nasional"],
    },
    {
        "number": "SK.221/MENLHK/2025",
        "title_id": "Pencabutan Izin Konsesi di Kalimantan Timur",
        "title_en": "Revocation of Concession Permits in East Kalimantan",
        "institution": "KLHK",
        "date_issued": "2025-11-28",
        "region": "Kalimantan Timur",
        "summary_id": "Pencabutan 14 izin konsesi yang tidak aktif. Membuka peluang reklaim wilayah adat oleh komunitas Dayak Kenyah dan Bahau.",
        "summary_en": "Revocation of 14 inactive concession permits. Opens reclamation opportunities for Dayak Kenyah and Bahau indigenous communities.",
        "impact_status": "potential_impact",
        "document_url": "https://jdih.menlhk.go.id/",
        "affected_territories": ["Dayak Kenyah", "Dayak Bahau"],
    },
    {
        "number": "Permen ESDM No. 12/2025",
        "title_id": "Izin Pinjam Pakai Kawasan Hutan untuk Pertambangan Nikel",
        "title_en": "Forest Area Borrow-to-Use Permit for Nickel Mining",
        "institution": "Kementerian ESDM",
        "date_issued": "2025-11-15",
        "region": "Sulawesi Tenggara",
        "summary_id": "Izin pinjam pakai 4.800 ha kawasan hutan untuk pertambangan nikel di Konawe. Tumpang tindih dengan wilayah adat Tolaki Mekongga.",
        "summary_en": "Borrow-to-use permit for 4,800 ha forest area for nickel mining in Konawe. Overlaps with Tolaki Mekongga ancestral territory.",
        "impact_status": "confirmed_impact",
        "document_url": "https://jdih.esdm.go.id/",
        "affected_territories": ["Tolaki Mekongga"],
    },
    {
        "number": "P.28/MENLHK/2025",
        "title_id": "Rencana Kehutanan Tingkat Provinsi Maluku Utara",
        "title_en": "Provincial Forestry Plan for North Maluku",
        "institution": "KLHK & Pemprov Malut",
        "date_issued": "2025-10-30",
        "region": "Maluku Utara",
        "summary_id": "Rencana kehutanan provinsi mencakup zonasi baru di Pulau Halmahera. Komunitas adat Tobelo Dalam perlu segera memastikan batas wilayah hidup.",
        "summary_en": "Provincial forestry plan includes new zoning on Halmahera Island. Tobelo Dalam indigenous community must urgently verify territorial boundaries.",
        "impact_status": "potential_impact",
        "document_url": "https://jdih.menlhk.go.id/",
        "affected_territories": ["Tobelo Dalam — Halmahera"],
    },
    {
        "number": "SK.402/MENLHK/2025",
        "title_id": "Penetapan Hutan Adat Kasepuhan Karang",
        "title_en": "Designation of Kasepuhan Karang Customary Forest",
        "institution": "KLHK",
        "date_issued": "2025-10-12",
        "region": "Banten",
        "summary_id": "Penetapan resmi 486 ha sebagai hutan adat Kasepuhan Karang. Dampak positif untuk pengakuan komunitas adat di Lebak, Banten.",
        "summary_en": "Official designation of 486 ha as Kasepuhan Karang customary forest. Positive impact for recognition of indigenous community in Lebak, Banten.",
        "impact_status": "under_review",
        "document_url": "https://jdih.menlhk.go.id/",
        "affected_territories": ["Kasepuhan Karang"],
    },
    {
        "number": "Permen LHK No. 21/2025",
        "title_id": "Pengaturan Perhutanan Sosial dan Kemitraan",
        "title_en": "Regulation on Social Forestry and Partnership",
        "institution": "KLHK",
        "date_issued": "2025-09-25",
        "region": "Nasional",
        "summary_id": "Perubahan skema perhutanan sosial. Membuka jalur baru bagi komunitas untuk mengelola hutan negara, tetapi dengan persyaratan administratif tambahan.",
        "summary_en": "Changes to social forestry scheme. Opens new pathways for communities to manage state forests, but with additional administrative requirements.",
        "impact_status": "potential_impact",
        "document_url": "https://jdih.menlhk.go.id/",
        "affected_territories": ["Nasional"],
    },
]

SEED_TERRITORIES = [
    {
        "name": "Wilayah Adat Dayak Ngaju",
        "community": "Dayak Ngaju",
        "region": "Kalimantan Tengah",
        "polygon": [[-1.95, 113.85], [-1.95, 114.20], [-2.25, 114.20], [-2.25, 113.85]],
        "has_overlap": True,
        "overlap_with": "P.62/MENLHK/2026 — Pelepasan Kawasan Hutan",
        "overlap_polygon": [[-2.00, 113.95], [-2.00, 114.12], [-2.18, 114.12], [-2.18, 113.95]],
        "note_id": "Tumpang tindih ~12.400 ha dengan area pelepasan kawasan hutan untuk sawit.",
        "note_en": "~12,400 ha overlap with palm oil forest release area.",
    },
    {
        "name": "Wilayah Adat Suku Anak Dalam",
        "community": "Orang Rimba (SAD)",
        "region": "Jambi",
        "polygon": [[-1.85, 102.55], [-1.85, 102.95], [-2.20, 102.95], [-2.20, 102.55]],
        "has_overlap": True,
        "overlap_with": "SK.118/MENLHK/2026 — Izin HTI Akasia",
        "overlap_polygon": [[-1.95, 102.65], [-1.95, 102.88], [-2.15, 102.88], [-2.15, 102.65]],
        "note_id": "Tumpang tindih signifikan dengan izin HTI 28.000 ha.",
        "note_en": "Significant overlap with 28,000 ha industrial plantation permit.",
    },
    {
        "name": "Wilayah Adat Suku Moi",
        "community": "Suku Moi",
        "region": "Papua Barat",
        "polygon": [[-0.70, 131.10], [-0.70, 131.55], [-1.20, 131.55], [-1.20, 131.10]],
        "has_overlap": True,
        "overlap_with": "P.45/MENLHK/2026 — Perubahan Peruntukan APL",
        "overlap_polygon": [[-0.85, 131.20], [-0.85, 131.45], [-1.10, 131.45], [-1.10, 131.20]],
        "note_id": "54.000 ha berubah menjadi APL — sebagian besar tanah ulayat.",
        "note_en": "54,000 ha converted to 'other use' — mostly ancestral land.",
    },
    {
        "name": "Wilayah Adat Kasepuhan Karang",
        "community": "Kasepuhan Karang",
        "region": "Banten",
        "polygon": [[-6.65, 106.30], [-6.65, 106.45], [-6.80, 106.45], [-6.80, 106.30]],
        "has_overlap": False,
        "note_id": "Sudah ditetapkan sebagai hutan adat — tidak ada tumpang tindih aktif.",
        "note_en": "Officially designated as customary forest — no active overlap.",
    },
    {
        "name": "Wilayah Adat Tolaki Mekongga",
        "community": "Tolaki Mekongga",
        "region": "Sulawesi Tenggara",
        "polygon": [[-3.85, 121.95], [-3.85, 122.30], [-4.15, 122.30], [-4.15, 121.95]],
        "has_overlap": True,
        "overlap_with": "Permen ESDM 12/2025 — IPPKH Tambang Nikel",
        "overlap_polygon": [[-3.95, 122.05], [-3.95, 122.22], [-4.08, 122.22], [-4.08, 122.05]],
        "note_id": "Konsesi tambang nikel 4.800 ha tumpang tindih dengan wilayah hidup.",
        "note_en": "4,800 ha nickel mining concession overlaps with living territory.",
    },
    {
        "name": "Wilayah Adat Dayak Meratus",
        "community": "Dayak Meratus",
        "region": "Kalimantan Selatan",
        "polygon": [[-2.55, 115.20], [-2.55, 115.60], [-2.95, 115.60], [-2.95, 115.20]],
        "has_overlap": True,
        "overlap_with": "Permen LHK 7/2026 — Hutan Lindung Meratus",
        "overlap_polygon": [[-2.65, 115.30], [-2.65, 115.50], [-2.85, 115.50], [-2.85, 115.30]],
        "note_id": "Akses tradisional terhadap hasil hutan berpotensi terbatas.",
        "note_en": "Traditional access to forest products may be restricted.",
    },
]


def _seed_alerts(reg_lookup):
    alerts = []
    pairs = [
        ("P.62/MENLHK/2026", "Dayak Ngaju — Kapuas", "high", "whatsapp"),
        ("SK.118/MENLHK/2026", "Orang Rimba — Bukit Duabelas", "high", "whatsapp"),
        ("P.45/MENLHK/2026", "Suku Moi — Sorong", "high", "email"),
        ("Permen ESDM No. 12/2025", "Tolaki Mekongga — Konawe", "high", "whatsapp"),
        ("Permen LHK No. 7/2026", "Dayak Meratus", "medium", "email"),
        ("Perda Provinsi Riau No. 3/2026", "Talang Mamak", "medium", "system"),
        ("SK.34/MENLHK/2026", "Wana — Morowali Utara", "medium", "whatsapp"),
        ("P.91/MENLHK/2025", "Nasional", "low", "email"),
    ]
    for number, territory, prio, channel in pairs:
        r = reg_lookup.get(number)
        if not r:
            continue
        alerts.append({
            "id": str(uuid.uuid4()),
            "regulation_id": r["id"],
            "title_id": f"Peringatan: {r['title_id']}",
            "title_en": f"Alert: {r['title_en']}",
            "region": r["region"],
            "territory": territory,
            "priority": prio,
            "channel": channel,
            "message_id": f"Regulasi {number} berpotensi berdampak pada wilayah {territory}. Tinjau detail dan siapkan respons.",
            "message_en": f"Regulation {number} potentially impacts {territory} territory. Review details and prepare response.",
            "action_needed": prio in ("high", "medium"),
            "is_read": False,
            "curator_approved": True,
            "created_at": now_iso(),
        })
    return alerts


def _seed_notifications():
    from datetime import timedelta
    now = datetime.now(timezone.utc)
    deltas = [
        (timedelta(minutes=5),   "regulation", "urgent",  "Regulasi baru terdeteksi",
            "New regulation detected",
            "Perubahan kawasan hutan terdeteksi di Kalimantan Selatan — Pegunungan Meratus.",
            "Forest area change detected in South Kalimantan — Meratus Mountains.",
            "Kalimantan Selatan", "/monitor"),
        (timedelta(minutes=12),  "brief",      "success", "Impact Brief selesai diproses",
            "Impact Brief generated",
            "Brief untuk wilayah Dayak Meratus telah berhasil dibuat dan siap divalidasi.",
            "Brief for Dayak Meratus territory has been generated and is ready for validation.",
            "Kalimantan Selatan", "/brief"),
        (timedelta(hours=1),     "spatial",    "warning", "Tumpang tindih wilayah terdeteksi",
            "Territorial overlap detected",
            "Overlap baru terdeteksi di Papua Barat — Suku Moi vs. perubahan APL.",
            "New overlap detected in West Papua — Suku Moi vs. APL conversion.",
            "Papua Barat", "/spatial"),
        (timedelta(hours=2),     "alert",      "info",    "Peringatan WhatsApp terkirim",
            "WhatsApp alert dispatched",
            "Notifikasi terkirim ke 14 paralegal komunitas Suku Anak Dalam.",
            "Notification dispatched to 14 Suku Anak Dalam community paralegals.",
            "Jambi", "/alerts"),
        (timedelta(hours=4),     "evidence",   "info",    "Paket bukti diperbarui",
            "Evidence pack updated",
            "Paralegal menambahkan 3 foto lapangan ke kasus Kapuas.",
            "A paralegal added 3 field photos to the Kapuas case.",
            "Kalimantan Tengah", "/evidence"),
        (timedelta(hours=6),     "validation", "warning", "Validasi hukum diperlukan",
            "Legal validation required",
            "Impact brief untuk Tolaki Mekongga menunggu peninjauan pendamping hukum.",
            "Impact brief for Tolaki Mekongga awaits legal companion review.",
            "Sulawesi Tenggara", "/brief"),
        (timedelta(hours=10),    "regulation", "urgent",  "Izin baru: pertambangan nikel",
            "New permit: nickel mining",
            "Izin Pinjam Pakai Kawasan Hutan terbit untuk pertambangan nikel di Konawe.",
            "Forest Area Borrow-to-Use Permit issued for nickel mining in Konawe.",
            "Sulawesi Tenggara", "/monitor"),
        (timedelta(days=1),      "brief",      "success", "10 brief baru tersedia minggu ini",
            "10 new briefs this week",
            "Sistem WANA berhasil memproses 10 dokumen regulasi minggu ini.",
            "WANA processed 10 regulation documents this week.",
            "Nasional", "/brief"),
        (timedelta(days=1, hours=4), "spatial", "info",   "Peta wilayah diperbarui",
            "Territory map updated",
            "Batas wilayah adat Kasepuhan Karang dikonfirmasi ulang oleh komunitas.",
            "Kasepuhan Karang ancestral boundary re-confirmed by the community.",
            "Banten", "/spatial"),
        (timedelta(days=2),      "alert",      "info",    "Langganan baru disetujui",
            "New subscription approved",
            "Pendamping hukum dari LBH Manado telah berlangganan peringatan Sulut.",
            "A legal companion from LBH Manado has subscribed to North Sulawesi alerts.",
            "Sulawesi Utara", "/alerts"),
    ]
    out = []
    for delta, ntype, cat, t_id, t_en, m_id, m_en, region, link in deltas:
        out.append({
            "id": str(uuid.uuid4()),
            "type": ntype,
            "category": cat,
            "title_id": t_id,
            "title_en": t_en,
            "message_id": m_id,
            "message_en": m_en,
            "region": region,
            "link": link,
            "is_read": False,
            "created_at": (now - delta).isoformat(),
        })
    return out



@app.on_event("startup")
async def seed_db():
    # Detect old schema (no `category`) and rebuild bulk data
    sample = await db.regulations.find_one({}, {"_id": 0, "category": 1})
    needs_rebuild = (sample is None) or ("category" not in sample) or (sample.get("category") is None)

    if needs_rebuild:
        from wana_seed import (
            gen_regulations, gen_territories, gen_conflicts, gen_news, gen_alerts,
        )
        await db.regulations.delete_many({})
        await db.alerts.delete_many({})
        await db.territories.delete_many({})
        await db.conflicts.delete_many({})
        await db.news.delete_many({})

        regulations = gen_regulations(130)
        territories = gen_territories(regulations, n=60)
        conflicts = gen_conflicts(regulations, territories, n=55)
        news = gen_news(regulations, n=32)
        alerts = gen_alerts(regulations, n=14)

        await db.regulations.insert_many(regulations)
        await db.territories.insert_many(territories)
        await db.conflicts.insert_many(conflicts)
        await db.news.insert_many(news)
        await db.alerts.insert_many(alerts)
        logger.info(
            f"Seeded {len(regulations)} regulations, {len(territories)} territories, "
            f"{len(conflicts)} conflicts, {len(news)} news, {len(alerts)} alerts"
        )

    if await db.notifications.count_documents({}) == 0:
        notifs = _seed_notifications()
        if notifs:
            await db.notifications.insert_many(notifs)
            logger.info(f"Seeded {len(notifs)} notifications")


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
