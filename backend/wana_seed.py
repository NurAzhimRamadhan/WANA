"""
WANA — AI Indigenous Governance Intelligence Seed
Realistic, deterministic data generator for Indonesian forestry governance.
Generates: regulations (~130), territories with overlap (~60), conflicts (~55),
news (~30), communities (~160 referenced), alerts (~12).
"""
import random
import uuid
from datetime import datetime, timedelta, timezone

random.seed(42)


# ---------- PROVINCES & GEOGRAPHIC CENTERS ----------
PROVINCE_CENTERS = {
    "Aceh": (4.7, 96.7),
    "Sumatera Utara": (2.5, 99.0),
    "Sumatera Barat": (-0.7, 100.5),
    "Riau": (0.3, 101.5),
    "Kepulauan Riau": (0.9, 104.5),
    "Jambi": (-1.6, 103.5),
    "Sumatera Selatan": (-3.3, 104.0),
    "Bangka Belitung": (-2.5, 106.5),
    "Bengkulu": (-3.7, 102.3),
    "Lampung": (-4.7, 105.0),
    "Banten": (-6.4, 106.2),
    "DKI Jakarta": (-6.2, 106.8),
    "Jawa Barat": (-6.9, 107.6),
    "Jawa Tengah": (-7.2, 110.5),
    "DI Yogyakarta": (-7.8, 110.4),
    "Jawa Timur": (-7.5, 112.7),
    "Bali": (-8.4, 115.2),
    "Nusa Tenggara Barat": (-8.6, 117.5),
    "Nusa Tenggara Timur": (-9.4, 121.0),
    "Kalimantan Barat": (0.0, 110.0),
    "Kalimantan Tengah": (-2.0, 113.5),
    "Kalimantan Selatan": (-3.0, 115.3),
    "Kalimantan Timur": (1.0, 116.5),
    "Kalimantan Utara": (3.5, 116.5),
    "Sulawesi Utara": (1.4, 124.8),
    "Gorontalo": (0.7, 122.4),
    "Sulawesi Tengah": (-1.4, 121.4),
    "Sulawesi Barat": (-2.7, 119.0),
    "Sulawesi Selatan": (-4.0, 120.0),
    "Sulawesi Tenggara": (-4.0, 122.0),
    "Maluku": (-3.7, 128.7),
    "Maluku Utara": (1.0, 127.8),
    "Papua": (-4.0, 138.5),
    "Papua Barat": (-1.7, 132.5),
    "Papua Tengah": (-3.7, 137.0),
    "Papua Pegunungan": (-4.0, 139.0),
    "Papua Selatan": (-7.0, 139.5),
    "Papua Barat Daya": (-1.3, 131.5),
}

PROVINCES = list(PROVINCE_CENTERS.keys())


# ---------- COMMUNITIES (160+, mapped to province) ----------
COMMUNITIES_BY_PROVINCE = {
    "Aceh": ["Gayo Lues", "Alas", "Tamiang", "Singkil", "Aneuk Jamee"],
    "Sumatera Utara": ["Batak Toba", "Karo", "Pakpak", "Mandailing", "Nias", "Pesisir Sibolga"],
    "Sumatera Barat": ["Minangkabau Pandai Sikek", "Mentawai", "Sungai Pagu", "Kerinci Pesisir"],
    "Riau": ["Sakai", "Talang Mamak", "Bonai", "Petalangan", "Akit"],
    "Kepulauan Riau": ["Suku Laut", "Orang Mantang"],
    "Jambi": ["Orang Rimba (SAD)", "Batin Sembilan", "Anak Dalam Cerenti", "Talang Mamak Jambi"],
    "Sumatera Selatan": ["Anak Dalam Sumsel", "Komering", "Pasemah", "Marga Semende"],
    "Bangka Belitung": ["Lom", "Mapur", "Sekak"],
    "Bengkulu": ["Rejang", "Lembak", "Serawai", "Pekal"],
    "Lampung": ["Krui", "Lampung Pepadun", "Lampung Saibatin", "Tulang Bawang"],
    "Banten": ["Baduy Dalam", "Baduy Luar", "Kasepuhan Karang", "Kasepuhan Cisitu"],
    "DKI Jakarta": ["Betawi Setu Babakan"],
    "Jawa Barat": ["Kasepuhan Ciptagelar", "Kasepuhan Sinar Resmi", "Cireundeu"],
    "Jawa Tengah": ["Samin Sukolilo", "Samin Klopoduwur"],
    "DI Yogyakarta": ["Adat Mataraman"],
    "Jawa Timur": ["Tengger", "Osing Banyuwangi"],
    "Bali": ["Tenganan Pegringsingan", "Trunyan", "Bali Aga Sidatapa"],
    "Nusa Tenggara Barat": ["Sasak Bayan", "Sumbawa Brang Rea", "Mbojo Donggo"],
    "Nusa Tenggara Timur": ["Manggarai", "Ngada Bena", "Sumba Wanokaka", "Atoni Meto", "Boti", "Helong", "Lamaholot Lewotobi"],
    "Kalimantan Barat": ["Dayak Iban Sungai Utik", "Dayak Kanayatn", "Dayak Bidayuh", "Dayak Punan", "Dayak Tamambaloh"],
    "Kalimantan Tengah": ["Dayak Ngaju Kapuas", "Dayak Bakumpai", "Dayak Maanyan", "Dayak Lawangan", "Dayak Ot Danum"],
    "Kalimantan Selatan": ["Dayak Meratus Loksado", "Dayak Bukit", "Banjar Tengah"],
    "Kalimantan Timur": ["Dayak Kenyah", "Dayak Bahau", "Dayak Tunjung", "Dayak Modang Long Wai", "Paser"],
    "Kalimantan Utara": ["Dayak Tidung", "Dayak Lundayeh", "Dayak Berusu", "Punan Tubu"],
    "Sulawesi Utara": ["Bantik", "Sangihe", "Talaud", "Bolaang Mongondow", "Tonsea"],
    "Gorontalo": ["Polahi", "Suwawa", "Bolango"],
    "Sulawesi Tengah": ["Wana Bulang", "Kaili Ledo", "Pamona Poso", "Mori Atas", "Bungku Mekongga"],
    "Sulawesi Barat": ["Mamasa", "Mandar Balanipa", "Pattae", "Mamuju Pegunungan"],
    "Sulawesi Selatan": ["Toraja Sangalla", "Konjo", "Kajang Ammatoa", "Bugis Soppeng", "Bajau Bira"],
    "Sulawesi Tenggara": ["Tolaki Mekongga", "Moronene Hukaea Laea", "Muna Tikep", "Buton Wakatobi", "Bajo Sampela"],
    "Maluku": ["Nuaulu", "Naulu Sepa", "Yamdena", "Tanimbar Selaru", "Kei Besar", "Seram Manusela"],
    "Maluku Utara": ["Tobelo Dalam (O Hongana Manyawa)", "Sawai", "Hibua Lamo", "Mangole", "Taliabu", "Loloda"],
    "Papua": ["Asmat", "Dani Baliem", "Lani Tiom", "Mee Paniai"],
    "Papua Barat": ["Moi Sigin", "Maybrat", "Tehit Konda", "Inanwatan", "Arfak Hatam", "Sough"],
    "Papua Tengah": ["Mee Deiyai", "Wandamen", "Damal", "Amungme Tsinga", "Kamoro Kaokonao"],
    "Papua Pegunungan": ["Yali", "Hupla", "Walak"],
    "Papua Selatan": ["Marind Anim", "Mandobo Boven Digoel", "Auyu", "Yei", "Wambon"],
    "Papua Barat Daya": ["Moi Kelim", "Tehit Sawiat", "Imeko Aifat"],
}

ALL_COMMUNITIES = [
    {"name": c, "region": p}
    for p, lst in COMMUNITIES_BY_PROVINCE.items() for c in lst
]


# ---------- CATEGORIES, RISKS, STATUSES ----------
CATEGORIES = [
    "tambang", "sawit", "hti", "konservasi", "psn",
    "food_estate", "geothermal", "hutan_lindung",
    "perhutanan_sosial", "infrastruktur",
]
CATEGORY_LABEL_ID = {
    "tambang": "Tambang", "sawit": "Sawit", "hti": "HTI",
    "konservasi": "Kawasan Konservasi", "psn": "PSN",
    "food_estate": "Food Estate", "geothermal": "Geothermal",
    "hutan_lindung": "Hutan Lindung",
    "perhutanan_sosial": "Perhutanan Sosial",
    "infrastruktur": "Infrastruktur",
}
CATEGORY_LABEL_EN = {
    "tambang": "Mining", "sawit": "Palm Oil", "hti": "Industrial Plantation",
    "konservasi": "Conservation Area", "psn": "National Strategic Project",
    "food_estate": "Food Estate", "geothermal": "Geothermal",
    "hutan_lindung": "Protected Forest",
    "perhutanan_sosial": "Social Forestry",
    "infrastruktur": "Infrastructure",
}

RISK_LEVELS = ["rendah", "sedang", "tinggi", "kritis"]
RISK_LABEL_ID = {"rendah": "Rendah", "sedang": "Sedang", "tinggi": "Tinggi", "kritis": "Kritis"}
RISK_LABEL_EN = {"rendah": "Low", "sedang": "Medium", "tinggi": "High", "kritis": "Critical"}

STATUSES = ["safe", "under_review", "potential_impact", "confirmed_impact"]


# ---------- INSTITUTIONS ----------
INSTITUTIONS = [
    "KLHK — Kementerian Lingkungan Hidup dan Kehutanan",
    "Kementerian ESDM",
    "Kementerian ATR/BPN",
    "Kementerian PUPR",
    "Kementerian Pertanian",
    "Kementerian Investasi/BKPM",
    "BPN — Badan Pertanahan Nasional",
    "Pemprov terkait",
    "Pemkab terkait",
    "Kementerian Koordinator Perekonomian",
]


# ---------- TITLE TEMPLATES PER CATEGORY ----------
TITLE_TEMPLATES = {
    "tambang": [
        ("Izin Pinjam Pakai Kawasan Hutan untuk Pertambangan {mineral} di {region}",
         "Forest Area Borrow-to-Use Permit for {mineral_en} Mining in {region}"),
        ("Izin Usaha Pertambangan {mineral} di {region}",
         "{mineral_en} Mining Business Permit in {region}"),
    ],
    "sawit": [
        ("Pelepasan Kawasan Hutan untuk Perkebunan Sawit PT {company} di {region}",
         "Forest Area Release for Palm Oil Plantation PT {company} in {region}"),
        ("Perubahan Peruntukan Kawasan Hutan untuk Sawit di {region}",
         "Change of Forest Area Designation for Palm Oil in {region}"),
    ],
    "hti": [
        ("Izin Pemanfaatan Hutan untuk HTI {species} di {region}",
         "Industrial Plantation Forest Permit for {species_en} in {region}"),
        ("Perpanjangan Izin Usaha Pemanfaatan Hutan Tanaman Industri di {region}",
         "Extension of Industrial Plantation Forest Permit in {region}"),
    ],
    "konservasi": [
        ("Penetapan Perluasan Kawasan Konservasi {area} di {region}",
         "Designation of {area} Conservation Area Extension in {region}"),
        ("Perubahan Fungsi Kawasan Konservasi {area} di {region}",
         "Change of Conservation Area Function {area} in {region}"),
    ],
    "psn": [
        ("Penetapan Proyek Strategis Nasional {project} di {region}",
         "National Strategic Project Designation: {project} in {region}"),
        ("Percepatan PSN {project} di {region}",
         "Acceleration of National Strategic Project {project} in {region}"),
    ],
    "food_estate": [
        ("Pengembangan Food Estate {commodity} di {region}",
         "Food Estate Development for {commodity_en} in {region}"),
        ("Penetapan Lokasi Food Estate {commodity} di {region}",
         "Food Estate Site Designation: {commodity_en} in {region}"),
    ],
    "geothermal": [
        ("Penetapan Wilayah Kerja Panas Bumi {field} di {region}",
         "Geothermal Working Area Designation: {field} in {region}"),
    ],
    "hutan_lindung": [
        ("Perubahan Fungsi Kawasan Hutan Lindung {area} di {region}",
         "Change of Protected Forest Function: {area} in {region}"),
        ("Penetapan Ulang Batas Hutan Lindung {area} di {region}",
         "Re-designation of Protected Forest Boundary: {area} in {region}"),
    ],
    "perhutanan_sosial": [
        ("Penetapan Hutan Adat Komunitas {community} di {region}",
         "Designation of {community} Customary Forest in {region}"),
        ("Pemberian Hak Kelola Perhutanan Sosial bagi Komunitas {community} di {region}",
         "Social Forestry Management Rights for {community} in {region}"),
    ],
    "infrastruktur": [
        ("Pembangunan {infra} di {region}",
         "{infra_en} Development in {region}"),
        ("Pinjam Pakai Kawasan Hutan untuk {infra} di {region}",
         "Forest Area Borrow-to-Use for {infra_en} in {region}"),
    ],
}

PLACEHOLDERS = {
    "mineral":     ["Nikel", "Emas", "Tembaga", "Batubara", "Bauksit", "Timah", "Mangan", "Pasir Besi"],
    "mineral_en":  ["Nickel", "Gold", "Copper", "Coal", "Bauxite", "Tin", "Manganese", "Iron Sand"],
    "company":     ["Nusantara Lestari", "Hijau Khatulistiwa", "Sawit Sejahtera", "Bumi Hijau Raya",
                    "Patriot Sawit", "Karya Hutan Indonesia", "Mega Sawit Mandiri"],
    "species":     ["Akasia", "Eukaliptus", "Sengon", "Jabon"],
    "species_en":  ["Acacia", "Eucalyptus", "Sengon", "Jabon"],
    "area":        ["Kerumutan", "Tesso Nilo", "Leuser", "Bukit Tigapuluh", "Meratus", "Lorentz",
                    "Wasur", "Bukit Duabelas", "Sebangau", "Halimun Salak", "Kayan Mentarang"],
    "project":     ["Jalan Trans-Papua", "Bendungan Bener", "Kawasan Industri Hijau", "Pelabuhan Kontainer",
                    "PLTA Batang Toru", "Smelter Nikel Terpadu", "Bandar Antariksa Biak",
                    "Jalan Lintas Selatan", "Kawasan Ekonomi Khusus"],
    "commodity":   ["Padi & Singkong", "Tebu", "Jagung", "Kedelai", "Sorgum"],
    "commodity_en":["Rice & Cassava", "Sugarcane", "Corn", "Soybean", "Sorghum"],
    "field":       ["Lumut Balai", "Sorik Marapi", "Wayang Windu", "Mataloko", "Suoh-Sekincau",
                    "Lahendong", "Patuha", "Sokoria"],
    "infra":       ["Jalan Tol Lintas Provinsi", "Bendungan Multifungsi", "Saluran Irigasi Primer",
                    "Bandar Udara Perintis", "Pelabuhan Lokal", "Jaringan Transmisi Listrik 500 kV"],
    "infra_en":    ["Inter-province Toll Road", "Multipurpose Dam", "Primary Irrigation Canal",
                    "Regional Airport", "Local Port", "500 kV Power Transmission Line"],
}


# ---------- RECOMMENDATION TEMPLATES ----------
RECOMMENDATIONS_ID = [
    "Lakukan mediasi komunitas dan dialog multi-pihak sebelum operasional dimulai.",
    "Audit independen atas legalitas izin dan kepatuhan administrasi sesuai PP 23/2021.",
    "Lakukan konsultasi FPIC (Free, Prior, Informed Consent) dengan komunitas adat terdampak.",
    "Inisiasi pemetaan partisipatif batas wilayah adat sebagai dasar negosiasi.",
    "Verifikasi legalitas dokumen perizinan terhadap RTRW provinsi dan kabupaten.",
    "Usulkan moratorium izin baru di wilayah tumpang tindih hingga proses verifikasi selesai.",
    "Dorong dialog multi-pihak yang dimediasi Komnas HAM atau pemerintah daerah.",
    "Lakukan kajian dampak sosial-ekologi independen sebelum operasional lanjut.",
    "Dampingi komunitas menyiapkan paket bukti hukum dan surat keberatan resmi.",
    "Koordinasi dengan KLHK & ATR/BPN untuk peninjauan kembali tata batas.",
]
RECOMMENDATIONS_EN = [
    "Initiate community mediation and multi-stakeholder dialogue before operations begin.",
    "Independent audit of permit legality and administrative compliance under PP 23/2021.",
    "Conduct FPIC (Free, Prior, Informed Consent) with affected indigenous communities.",
    "Initiate participatory mapping of customary boundaries as a basis for negotiation.",
    "Verify permit legality against provincial and regency spatial plans.",
    "Propose a moratorium on new permits in overlap zones until verification completes.",
    "Push multi-stakeholder dialogue mediated by Komnas HAM or local government.",
    "Conduct independent socio-ecological impact assessment before further operations.",
    "Support the community in preparing a legal evidence pack and formal objection letter.",
    "Coordinate with KLHK & ATR/BPN for a boundary re-examination.",
]


# ---------- SUMMARY TEMPLATES ----------
def _summary(category: str, community: str, region: str, status: str, lang: str = "id"):
    if lang == "id":
        templates = {
            "tambang": f"Regulasi ini berpotensi menyebabkan tumpang tindih dengan wilayah adat {community} di {region} akibat masuknya konsesi tambang ke kawasan hidup komunitas.",
            "sawit": f"Pembukaan perkebunan sawit di {region} berpotensi menggeser wilayah adat {community} dan menurunkan tutupan hutan komunitas.",
            "hti": f"Penetapan kawasan HTI di {region} dapat membatasi akses tradisional komunitas {community} terhadap hutan non-kayu dan situs adat.",
            "konservasi": f"Perubahan fungsi kawasan konservasi di {region} berpengaruh pada hak kelola tradisional komunitas {community}.",
            "psn": f"Proyek Strategis Nasional di {region} berpotensi memotong wilayah hidup komunitas {community} tanpa konsultasi yang memadai.",
            "food_estate": f"Pengembangan Food Estate di {region} dapat mengubah pola pertanian adat dan menggeser sistem pangan tradisional komunitas {community}.",
            "geothermal": f"Wilayah kerja panas bumi di {region} berpotensi membuka akses jalan ke wilayah inti komunitas {community} yang sebelumnya terisolasi.",
            "hutan_lindung": f"Penetapan ulang batas hutan lindung di {region} berdampak pada hak akses tradisional komunitas {community} terhadap hasil hutan.",
            "perhutanan_sosial": f"Skema perhutanan sosial di {region} memberi peluang baru bagi komunitas {community} untuk mengelola hutan secara legal.",
            "infrastruktur": f"Pembangunan infrastruktur di {region} dapat melintasi wilayah komunitas {community}, memerlukan koordinasi sebelum operasional.",
        }
    else:
        templates = {
            "tambang": f"This regulation may create overlap with the {community} customary territory in {region} due to mining concessions entering community living space.",
            "sawit": f"Opening a palm oil plantation in {region} may displace the {community} customary territory and reduce community forest cover.",
            "hti": f"The industrial plantation designation in {region} may restrict traditional access of the {community} community to non-timber forest products and sacred sites.",
            "konservasi": f"Conservation-area function change in {region} affects traditional management rights of the {community} community.",
            "psn": f"The National Strategic Project in {region} may cut through the {community} living space without adequate consultation.",
            "food_estate": f"Food Estate development in {region} may alter customary agricultural patterns and displace traditional food systems of the {community}.",
            "geothermal": f"Geothermal work area in {region} may open road access into previously isolated {community} core territory.",
            "hutan_lindung": f"Re-designation of protected forest boundaries in {region} impacts traditional access of the {community} community.",
            "perhutanan_sosial": f"Social forestry scheme in {region} provides new legal pathways for the {community} community to manage forests.",
            "infrastruktur": f"Infrastructure development in {region} may cross {community} territory, requiring coordination before operations.",
        }
    return templates.get(category, f"Regulasi terkait {category} di {region}.")


# ---------- HELPERS ----------
def _polygon(center_lat: float, center_lng: float, size: float = 0.18):
    """Create a square polygon around a center."""
    return [
        [center_lat - size, center_lng - size],
        [center_lat - size, center_lng + size],
        [center_lat + size, center_lng + size],
        [center_lat + size, center_lng - size],
    ]


def _now():
    return datetime.now(timezone.utc)


def _iso(dt):
    return dt.isoformat()


# ---------- REGULATION GENERATOR ----------
def gen_regulations(n: int = 130):
    out = []
    now = _now()
    for i in range(n):
        province = random.choice(PROVINCES)
        comms = COMMUNITIES_BY_PROVINCE.get(province, ["Masyarakat Adat Setempat"])
        community = random.choice(comms)
        category = random.choice(CATEGORIES)

        # status weighted: most are potential or under_review; a few critical
        status = random.choices(STATUSES, weights=[15, 30, 35, 20])[0]
        # risk derived from status with small variance
        risk = {
            "safe": "rendah",
            "under_review": random.choice(["rendah", "sedang"]),
            "potential_impact": random.choice(["sedang", "tinggi"]),
            "confirmed_impact": random.choice(["tinggi", "kritis"]),
        }[status]
        # perhutanan_sosial generally positive — tend to safe/under_review
        if category == "perhutanan_sosial":
            status = random.choice(["safe", "under_review", "potential_impact"])
            risk = "rendah" if status == "safe" else "sedang"

        risk_score = {
            "rendah": random.randint(8, 28),
            "sedang": random.randint(28, 58),
            "tinggi": random.randint(58, 82),
            "kritis": random.randint(82, 98),
        }[risk]
        confidence = round(random.uniform(0.62, 0.94), 2)

        # institution weighted by category
        if category == "tambang":
            institution = random.choice([INSTITUTIONS[1], INSTITUTIONS[0]])
        elif category in ("sawit", "hti", "konservasi", "hutan_lindung", "perhutanan_sosial"):
            institution = INSTITUTIONS[0]
        elif category == "psn":
            institution = random.choice([INSTITUTIONS[9], INSTITUTIONS[3]])
        elif category == "food_estate":
            institution = random.choice([INSTITUTIONS[4], INSTITUTIONS[0]])
        elif category == "geothermal":
            institution = INSTITUTIONS[1]
        else:
            institution = random.choice([INSTITUTIONS[3], INSTITUTIONS[7]])

        # title placeholders
        tpl_id, tpl_en = random.choice(TITLE_TEMPLATES[category])
        ph = {k: random.choice(v) for k, v in PLACEHOLDERS.items()}
        # ensure paired EN matches index for mineral/species/commodity/infra
        for pair_k in ["mineral", "species", "commodity", "infra"]:
            if pair_k in ph:
                idx = PLACEHOLDERS[pair_k].index(ph[pair_k])
                ph[f"{pair_k}_en"] = PLACEHOLDERS[f"{pair_k}_en"][idx]
        ph["region"] = province
        ph["community"] = community
        title_id = tpl_id.format(**ph)
        title_en = tpl_en.format(**ph)

        # number
        year = random.choice([2024, 2025, 2026])
        seq = random.randint(1, 999)
        prefixes = {
            "tambang": "SK", "sawit": "SK", "hti": "SK",
            "konservasi": "P", "psn": "Perpres", "food_estate": "P",
            "geothermal": "SK", "hutan_lindung": "P",
            "perhutanan_sosial": "SK", "infrastruktur": "Perpres",
        }
        prefix = prefixes.get(category, "SK")
        suffix = "MENLHK" if category not in ("psn", "infrastruktur", "tambang", "geothermal") else random.choice(["", ""])
        if prefix == "Perpres":
            number = f"Perpres No. {seq}/{year}"
        elif category == "tambang":
            number = f"SK ESDM No. {seq}/{year}"
        elif category == "geothermal":
            number = f"SK ESDM No. {seq}/{year}"
        else:
            number = f"{prefix}.{seq}/MENLHK/{year}"

        date_issued = (now - timedelta(days=random.randint(1, 720))).date().isoformat()

        rec_i = random.randint(0, len(RECOMMENDATIONS_ID) - 1)
        affected = [community]
        # 30% of regs affect 2 communities
        if random.random() < 0.3 and len(comms) > 1:
            extra = random.choice([c for c in comms if c != community])
            affected.append(extra)

        out.append({
            "id": str(uuid.uuid4()),
            "number": number,
            "title_id": title_id,
            "title_en": title_en,
            "institution": institution,
            "date_issued": date_issued,
            "region": province,
            "summary_id": _summary(category, community, province, status, "id"),
            "summary_en": _summary(category, community, province, status, "en"),
            "impact_status": status,
            "document_url": "https://jdih.menlhk.go.id/" if "MENLHK" in number else "https://peraturan.go.id/",
            "affected_territories": affected,
            "category": category,
            "risk_level": risk,
            "risk_score": risk_score,
            "confidence_score": confidence,
            "communities": affected,
            "recommendation_id": RECOMMENDATIONS_ID[rec_i],
            "recommendation_en": RECOMMENDATIONS_EN[rec_i],
            "sumber": random.choice([
                "JDIH KLHK", "JDIH ESDM", "JDIH Setneg", "Lembaran Negara",
                "JDIH Provinsi", "JDIH Kabupaten",
            ]),
            "created_at": _iso(now),
        })
    return out


# ---------- TERRITORY GENERATOR ----------
def gen_territories(regulations, n: int = 60):
    """Place territories on the map and mark overlap with strong-risk regulations."""
    out = []
    used = set()
    # ensure we cover each province once first, then fill more by repeating communities
    pool = list(ALL_COMMUNITIES)
    random.shuffle(pool)
    pool = pool[:n]

    # build map regulation by province (only high/critical for overlap)
    high_regs_by_province = {}
    for r in regulations:
        if r["risk_level"] in ("tinggi", "kritis") and r["category"] != "perhutanan_sosial":
            high_regs_by_province.setdefault(r["region"], []).append(r)

    for c in pool:
        if c["name"] in used:
            continue
        used.add(c["name"])
        center = PROVINCE_CENTERS[c["region"]]
        # small per-community offset
        offset = (random.uniform(-0.6, 0.6), random.uniform(-0.6, 0.6))
        clat, clng = center[0] + offset[0], center[1] + offset[1]
        poly = _polygon(clat, clng, size=random.uniform(0.12, 0.22))

        has_overlap = False
        overlap_with = None
        overlap_poly = None
        note_id = "Belum terdeteksi tumpang tindih aktif."
        note_en = "No active overlap detected."

        candidates = high_regs_by_province.get(c["region"], [])
        if candidates and random.random() < 0.55:
            reg = random.choice(candidates)
            has_overlap = True
            overlap_with = f"{reg['number']} — {CATEGORY_LABEL_ID[reg['category']]}"
            overlap_poly = _polygon(
                clat + random.uniform(-0.05, 0.05),
                clng + random.uniform(-0.05, 0.05),
                size=random.uniform(0.05, 0.12),
            )
            note_id = (
                f"Tumpang tindih {random.choice(['signifikan', 'sebagian', 'parsial'])} "
                f"dengan {CATEGORY_LABEL_ID[reg['category']].lower()} — "
                f"tingkat risiko {RISK_LABEL_ID[reg['risk_level']].lower()}."
            )
            note_en = (
                f"{random.choice(['Significant', 'Partial'])} overlap with "
                f"{CATEGORY_LABEL_EN[reg['category']].lower()} — "
                f"{RISK_LABEL_EN[reg['risk_level']].lower()} risk."
            )

        out.append({
            "id": str(uuid.uuid4()),
            "name": f"Wilayah Adat {c['name']}",
            "community": c["name"],
            "region": c["region"],
            "polygon": poly,
            "has_overlap": has_overlap,
            "overlap_with": overlap_with,
            "overlap_polygon": overlap_poly,
            "note_id": note_id,
            "note_en": note_en,
        })
    return out


# ---------- CONFLICT GENERATOR ----------
CONFLICT_TEMPLATES = [
    ("Konflik tambang nikel", "Nickel mining conflict", "tambang"),
    ("Ekspansi sawit", "Palm oil expansion", "sawit"),
    ("Konsesi HTI", "Industrial plantation concession", "hti"),
    ("Pembangunan bendungan", "Dam construction", "infrastruktur"),
    ("Proyek Strategis Nasional", "National Strategic Project", "psn"),
    ("Perubahan RTRW", "Spatial plan revision", "infrastruktur"),
    ("Pinjam pakai kawasan hutan", "Forest borrow-to-use", "tambang"),
    ("Pengembangan Food Estate", "Food Estate development", "food_estate"),
    ("Pemberian izin geothermal", "Geothermal permit grant", "geothermal"),
    ("Tumpang tindih dengan hutan lindung", "Protected forest overlap", "hutan_lindung"),
]
CONFLICT_STATUS = ["aktif", "mediasi", "litigasi", "deeskalasi", "tertunda"]


def gen_conflicts(regulations, territories, n: int = 55):
    out = []
    now = _now()
    high_regs = [r for r in regulations if r["risk_level"] in ("tinggi", "kritis")]
    for i in range(n):
        tpl_id, tpl_en, cat = random.choice(CONFLICT_TEMPLATES)
        region = random.choice(PROVINCES)
        comm = random.choice(COMMUNITIES_BY_PROVINCE.get(region, ["Masyarakat Adat"]))
        related_reg = next((r for r in high_regs if r["region"] == region), random.choice(regulations))
        status = random.choice(CONFLICT_STATUS)
        risk = random.choice(["sedang", "tinggi", "kritis"])
        casualties = random.choice([0, 0, 0, 1, 2, 3])
        date = (now - timedelta(days=random.randint(7, 540))).date().isoformat()

        out.append({
            "id": str(uuid.uuid4()),
            "title_id": f"{tpl_id} di {region} — Komunitas {comm}",
            "title_en": f"{tpl_en} in {region} — {comm} Community",
            "region": region,
            "community": comm,
            "category": cat,
            "status": status,
            "risk_level": risk,
            "started_at": date,
            "regulation_number": related_reg["number"],
            "summary_id": (
                f"Sengketa antara komunitas adat {comm} dan pemegang izin terkait "
                f"{CATEGORY_LABEL_ID[cat].lower()} di {region}. Status: {status}."
            ),
            "summary_en": (
                f"Dispute between the {comm} indigenous community and permit holders over "
                f"{CATEGORY_LABEL_EN[cat].lower()} in {region}. Status: {status}."
            ),
            "casualties_reported": casualties,
            "mitigation_id": random.choice(RECOMMENDATIONS_ID),
            "mitigation_en": random.choice(RECOMMENDATIONS_EN),
            "created_at": _iso(now),
        })
    return out


# ---------- NEWS GENERATOR ----------
NEWS_SOURCES = [
    "Mongabay Indonesia", "KOMPAS", "Tempo", "Tirto.id", "Forest Watch Indonesia",
    "AMAN", "WALHI", "BRWA", "BBC Indonesia", "The Jakarta Post",
]
NEWS_TEMPLATES_ID = [
    "Pemetaan partisipatif wilayah adat di {region} memasuki tahap finalisasi.",
    "Komunitas adat {community} ajukan keberatan resmi atas {category} di {region}.",
    "KLHK bantah dugaan pelanggaran tata batas di kawasan hutan {region}.",
    "Putusan PTUN buka peluang reklaim wilayah adat di {region}.",
    "Audit lingkungan ungkap pelanggaran izin {category} di {region}.",
    "Aliansi NGO desak moratorium izin baru di {region}.",
    "Perhutanan sosial percepat pengakuan hutan adat di {region}.",
    "Konflik agraria di {region} memasuki fase mediasi.",
    "Peneliti dorong revisi tata ruang nasional yang inklusif komunitas adat.",
    "Komnas HAM turunkan tim verifikasi ke {region}.",
]
NEWS_TEMPLATES_EN = [
    "Participatory mapping of customary territory in {region} enters finalization phase.",
    "{community} indigenous community files formal objection to {category_en} in {region}.",
    "KLHK denies allegations of boundary violations in {region} forest area.",
    "Administrative court ruling opens reclamation path for indigenous territory in {region}.",
    "Environmental audit reveals {category_en} permit violations in {region}.",
    "NGO alliance urges moratorium on new permits in {region}.",
    "Social forestry accelerates customary forest recognition in {region}.",
    "Agrarian conflict in {region} enters mediation phase.",
    "Researchers push for spatial-plan revision that includes indigenous communities.",
    "Komnas HAM deploys verification team to {region}.",
]


def gen_news(regulations, n: int = 30):
    out = []
    now = _now()
    for i in range(n):
        region = random.choice(PROVINCES)
        comm = random.choice(COMMUNITIES_BY_PROVINCE.get(region, ["Masyarakat Adat"]))
        cat = random.choice(CATEGORIES)
        idx = random.randint(0, len(NEWS_TEMPLATES_ID) - 1)
        title_id = NEWS_TEMPLATES_ID[idx].format(
            region=region, community=comm, category=CATEGORY_LABEL_ID[cat].lower())
        title_en = NEWS_TEMPLATES_EN[idx].format(
            region=region, community=comm, category_en=CATEGORY_LABEL_EN[cat].lower())
        date = (now - timedelta(days=random.randint(0, 60))).date().isoformat()
        out.append({
            "id": str(uuid.uuid4()),
            "title_id": title_id,
            "title_en": title_en,
            "source": random.choice(NEWS_SOURCES),
            "date_published": date,
            "region": region,
            "category": cat,
            "summary_id": f"Liputan terkait {CATEGORY_LABEL_ID[cat].lower()} di {region} yang berdampak pada komunitas {comm}. Berita ini menjadi konteks penting bagi pendamping hukum.",
            "summary_en": f"Coverage on {CATEGORY_LABEL_EN[cat].lower()} in {region} affecting the {comm} community. This article provides important context for legal companions.",
            "url": f"https://example.org/news/{i+1}",
            "created_at": _iso(now),
        })
    return out


# ---------- ALERT GENERATOR ----------
def gen_alerts(regulations, n: int = 14):
    out = []
    now = _now()
    high = [r for r in regulations if r["risk_level"] in ("tinggi", "kritis")][:n*2]
    random.shuffle(high)
    chosen = high[:n]
    for r in chosen:
        prio = "high" if r["risk_level"] == "kritis" else "medium"
        out.append({
            "id": str(uuid.uuid4()),
            "regulation_id": r["id"],
            "title_id": f"Peringatan: {r['title_id']}",
            "title_en": f"Alert: {r['title_en']}",
            "region": r["region"],
            "territory": ", ".join(r["affected_territories"][:2]),
            "priority": prio,
            "channel": random.choice(["whatsapp", "email", "system"]),
            "message_id": f"Regulasi {r['number']} berpotensi berdampak pada wilayah {', '.join(r['affected_territories'])}. Risiko {RISK_LABEL_ID[r['risk_level']].lower()}. Tinjau detail dan siapkan respons.",
            "message_en": f"Regulation {r['number']} potentially impacts {', '.join(r['affected_territories'])}. {RISK_LABEL_EN[r['risk_level']]} risk. Review details and prepare response.",
            "action_needed": True,
            "is_read": False,
            "curator_approved": True,
            "created_at": _iso(now - timedelta(hours=random.randint(1, 96))),
        })
    return out
