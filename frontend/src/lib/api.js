/* eslint-disable no-unused-vars */
/**
 * WANA Static API — GitHub Pages compatible.
 *
 * Replaces FastAPI/MongoDB backend with in-memory data sourced from
 * /src/data/*.json. Keeps the SAME axios-like interface as before so the
 * rest of the app continues to work without modification:
 *
 *   await api.get(path, { params })
 *   await api.post(path, body)
 *   await api.patch(path, body)
 *   await api.put(path, body)
 *   await api.delete(path)
 *
 * Evidence packs and notification read-state persist to localStorage,
 * so the demo feels stateful across reloads.
 */

import regulationsData from '@/data/regulations.json';
import spatialData from '@/data/spatial.json';
import alertsData from '@/data/alerts.json';
import notificationsData from '@/data/notifications.json';
import conflictsData from '@/data/conflicts.json';
import newsData from '@/data/news.json';

// ---------- Storage helpers ----------
const LS = {
  evidencePacks: 'wana:evidence_packs',
  alerts: 'wana:alerts_state',
  notifications: 'wana:notifications_state',
  impactBriefs: 'wana:impact_briefs',
};
const load = (k, fb) => {
  try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fb; }
  catch { return fb; }
};
const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };

const uuid = () =>
  (crypto && crypto.randomUUID) ? crypto.randomUUID()
    : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });

const nowIso = () => new Date().toISOString();

// ---------- Materialize notifications with real ISO timestamps ----------
const notificationsBase = notificationsData.map((n) => ({
  ...n,
  is_read: false,
  created_at: new Date(Date.now() - n.minutes_ago * 60 * 1000).toISOString(),
}));

// In-memory state (overlay on top of imported JSON)
const state = {
  regulations: regulationsData,
  territories: spatialData,
  alerts: alertsData.map((a) => ({ ...a })),
  notifications: notificationsBase,
  conflicts: conflictsData,
  news: newsData,
  evidencePacks: load(LS.evidencePacks, []),
  // ephemeral files (object URLs created at upload time, lost on reload)
  evidenceFileBlobs: new Map(), // file_id -> { url, file }
  impactBriefs: load(LS.impactBriefs, []),
};

// Apply persisted read-states
const alertsState = load(LS.alerts, {});
state.alerts.forEach((a) => { if (alertsState[a.id]) a.is_read = alertsState[a.id].is_read; });
const notifState = load(LS.notifications, {});
state.notifications.forEach((n) => { if (notifState[n.id]) n.is_read = notifState[n.id].is_read; });

// ---------- Simulated network latency ----------
const delay = (ms) => new Promise((res) => setTimeout(res, ms));
const tinyDelay = () => delay(40 + Math.random() * 80);

// ---------- Filters ----------
function applyRegFilters(items, params = {}) {
  const { region, status, category, risk, q } = params;
  return items.filter((r) => {
    if (region && region !== 'all' && r.region !== region) return false;
    if (status && status !== 'all' && r.impact_status !== status) return false;
    if (category && category !== 'all' && r.category !== category) return false;
    if (risk && risk !== 'all' && r.risk_level !== risk) return false;
    if (q) {
      const ql = q.toLowerCase();
      const hay = [r.title_id, r.title_en, r.number, r.institution, r.region]
        .join(' ').toLowerCase();
      if (!hay.includes(ql)) return false;
    }
    return true;
  }).sort((a, b) => (a.date_issued < b.date_issued ? 1 : -1));
}

function applyConflictFilters(items, params = {}) {
  const { region, risk, q } = params;
  return items.filter((c) => {
    if (region && region !== 'all' && c.region !== region) return false;
    if (risk && risk !== 'all' && c.risk_level !== risk) return false;
    if (q) {
      const ql = q.toLowerCase();
      const hay = [c.title_id, c.title_en, c.community].join(' ').toLowerCase();
      if (!hay.includes(ql)) return false;
    }
    return true;
  }).sort((a, b) => (a.started_at < b.started_at ? 1 : -1));
}

function applyNewsFilters(items, params = {}) {
  const { region, category, q } = params;
  return items.filter((n) => {
    if (region && region !== 'all' && n.region !== region) return false;
    if (category && category !== 'all' && n.category !== category) return false;
    if (q) {
      const ql = q.toLowerCase();
      const hay = [n.title_id, n.title_en, n.source].join(' ').toLowerCase();
      if (!hay.includes(ql)) return false;
    }
    return true;
  }).sort((a, b) => (a.date_published < b.date_published ? 1 : -1));
}

// ---------- AI Impact Brief simulator ----------
// Detect category from free text using keyword heuristics, then synthesize
// a structured brief that mirrors the real Claude output shape.
const CATEGORY_KEYWORDS = {
  tambang: ['tambang', 'mining', 'nikel', 'bauksit', 'tembaga', 'emas', 'batubara', 'ippkh', 'pinjam pakai'],
  sawit: ['sawit', 'palm oil', 'kelapa sawit', 'perkebunan', 'plantation'],
  hti: ['hti', 'hutan tanaman industri', 'industrial plantation', 'akasia', 'eukaliptus'],
  konservasi: ['konservasi', 'taman nasional', 'national park', 'cagar alam'],
  psn: ['psn', 'proyek strategis nasional', 'national strategic'],
  food_estate: ['food estate', 'lumbung pangan'],
  geothermal: ['panas bumi', 'geothermal', 'wkp'],
  hutan_lindung: ['hutan lindung', 'protected forest'],
  perhutanan_sosial: ['perhutanan sosial', 'hutan adat', 'social forestry', 'kemitraan kehutanan'],
  infrastruktur: ['bendungan', 'jalan tol', 'pelabuhan', 'bandara', 'transmisi', 'infrastructure', 'irigasi'],
};

function detectCategory(text) {
  const t = (text || '').toLowerCase();
  let best = { cat: 'infrastruktur', hits: 0 };
  for (const [cat, kws] of Object.entries(CATEGORY_KEYWORDS)) {
    const hits = kws.reduce((acc, k) => acc + (t.includes(k) ? 1 : 0), 0);
    if (hits > best.hits) best = { cat, hits };
  }
  return best;
}

function detectRegion(text) {
  const t = (text || '').toLowerCase();
  const regions = Array.from(new Set(state.regulations.map((r) => r.region)));
  for (const r of regions) {
    if (t.includes(r.toLowerCase())) return r;
  }
  return 'Indonesia';
}

function detectCommunity(text, region) {
  const t = (text || '').toLowerCase();
  const candidates = state.territories
    .filter((tr) => tr.region === region || region === 'Indonesia')
    .map((tr) => tr.community);
  for (const c of candidates) {
    if (t.includes(c.toLowerCase())) return c;
  }
  return candidates[0] || 'masyarakat adat setempat';
}

const BRIEF_TEMPLATES_ID = {
  tambang: {
    summary: 'Regulasi ini memberi izin operasi pertambangan yang masuk ke kawasan hutan. Lokasi konsesi memiliki potensi tumpang tindih dengan wilayah hidup komunitas adat di area sekitarnya.',
    meaning: 'Bagi komunitas Anda, ini berarti ada perusahaan tambang yang sah secara administratif untuk masuk ke wilayah yang selama ini Anda kelola. Akses tradisional ke sungai, hutan buah, atau situs sakral berpotensi terbatas. Penting untuk segera memastikan batas wilayah adat tercatat dan diakui.',
    risks: [
      'Pencemaran air sungai dan sumber air komunitas',
      'Hilangnya akses ke hutan ulayat dan situs adat',
      'Konflik horizontal antara pekerja tambang dan warga',
      'Penurunan tutupan hutan dan keanekaragaman hayati',
    ],
    territorial: 'Konsesi berpotensi memotong jalur perlintasan tradisional dan menggeser wilayah berkebun. Pemetaan partisipatif perlu segera dilakukan untuk mendokumentasikan batas yang diakui komunitas.',
    articles: ['Pasal tentang pemberian izin (IPPKH/IUP)', 'Pasal kewajiban konsultasi publik', 'Pasal sanksi pelanggaran tata batas'],
  },
  sawit: {
    summary: 'Regulasi ini melepaskan kawasan hutan menjadi areal perkebunan kelapa sawit. Luas dan lokasi yang disebut mengindikasikan potensi tumpang tindih dengan ladang dan kebun adat.',
    meaning: 'Sederhananya: hutan yang selama ini Anda gunakan akan diubah peruntukannya menjadi kebun sawit milik korporasi. Hak akses tradisional kemungkinan akan dibatasi. Komunitas perlu segera memastikan FPIC dan memiliki bukti tertulis penguasaan wilayah.',
    risks: [
      'Hilangnya kebun karet dan kebun buah komunitas',
      'Polusi air dari pupuk dan pestisida sawit',
      'Konflik klaim lahan ulayat',
      'Hilangnya keanekaragaman pangan lokal',
    ],
    territorial: 'Areal pelepasan kawasan tampaknya melingkupi wilayah hidup komunitas. Surat pernyataan adat dan peta partisipatif menjadi modal hukum utama untuk negosiasi.',
    articles: ['Pasal tentang pelepasan kawasan hutan', 'Pasal kewajiban kemitraan komunitas', 'Pasal sanksi pelanggaran sosial'],
  },
  hti: {
    summary: 'Regulasi ini memberi izin pemanfaatan hutan untuk hutan tanaman industri jangka panjang. Operasi HTI biasanya mengubah hutan campuran menjadi monokultur akasia/eukaliptus.',
    meaning: 'Bagi komunitas, ini berarti wilayah hutan akan ditebang dan ditanam ulang dengan satu jenis pohon untuk pabrik kertas atau pulp. Akses pengambilan hasil hutan non-kayu (madu, rotan, getah) bisa hilang. Segera periksa apakah wilayah Anda termasuk dalam peta konsesi.',
    risks: [
      'Hilangnya hasil hutan non-kayu',
      'Penurunan ketersediaan air karena monokultur',
      'Konflik dengan patroli perusahaan',
      'Erosi tanah saat pembukaan lahan',
    ],
    territorial: 'HTI seluas puluhan ribu hektar biasanya melingkupi beberapa wilayah komunitas. Wajib verifikasi peta konsesi terhadap batas tanah ulayat.',
    articles: ['Pasal izin pemanfaatan hutan (IUPHHK-HTI)', 'Pasal hak pekerja & komunitas', 'Pasal pengakuan hutan adat di dalam konsesi'],
  },
  konservasi: {
    summary: 'Regulasi ini menetapkan atau memperluas kawasan konservasi. Status konservasi membatasi aktivitas ekonomi tetapi juga membatasi akses tradisional komunitas.',
    meaning: 'Penetapan konservasi tidak otomatis melindungi hak adat. Dalam banyak kasus, justru akses tradisional ke hutan dibatasi. Komunitas perlu mengajukan zona pemanfaatan tradisional dalam rencana pengelolaan.',
    risks: [
      'Pembatasan akses pengumpulan hasil hutan',
      'Kriminalisasi aktivitas tradisional',
      'Hilangnya hak kelola yang sudah turun-temurun',
      'Konflik dengan petugas balai konservasi',
    ],
    territorial: 'Zona inti konservasi sering melingkupi situs sakral. Negosiasi zona pemanfaatan tradisional dalam rencana pengelolaan harus dimulai sejak awal.',
    articles: ['Pasal zonasi kawasan konservasi', 'Pasal hak masyarakat sekitar', 'Pasal pemanfaatan tradisional'],
  },
  psn: {
    summary: 'Regulasi ini menetapkan proyek strategis nasional yang berpotensi memotong wilayah komunitas. PSN biasanya menggunakan instrumen percepatan dengan ruang konsultasi yang sempit.',
    meaning: 'Status PSN memberikan kemudahan birokrasi bagi proyek tetapi memperketat ruang protes komunitas. Sangat penting untuk segera membangun koalisi NGO dan pendamping hukum.',
    risks: [
      'Pengadaan tanah dengan ganti rugi tidak setara',
      'Konsultasi publik dibatasi waktu',
      'Penggusuran tanpa relokasi memadai',
      'Konflik dengan aparat keamanan',
    ],
    territorial: 'Proyek strategis nasional sering memotong garis lurus tanpa mempertimbangkan batas adat. Pemetaan partisipatif menjadi modal litigasi penting.',
    articles: ['Pasal penetapan PSN', 'Pasal pengadaan tanah untuk kepentingan umum', 'Pasal kompensasi sosial'],
  },
  food_estate: {
    summary: 'Regulasi ini mendorong pengembangan food estate skala besar. Lokasi yang ditunjuk sering berada di lahan yang sebelumnya digarap secara tradisional.',
    meaning: 'Sederhananya, pemerintah ingin membuka lahan luas untuk komoditas pangan. Pola pertanian adat (ladang, sawah tadah hujan) sering dianggap "tidak produktif" dan diubah ke pertanian industrial. Komunitas perlu mempertahankan pola pangan tradisional sebagai bukti penguasaan.',
    risks: [
      'Hilangnya pola pertanian adat',
      'Ketergantungan pada input industri',
      'Penurunan keanekaragaman pangan lokal',
      'Konflik kepemilikan lahan',
    ],
    territorial: 'Lokasi food estate cenderung di lahan datar yang juga adalah area utama produksi pangan komunitas.',
    articles: ['Pasal penetapan kawasan food estate', 'Pasal kemitraan dengan petani', 'Pasal jaminan hak penggarap'],
  },
  geothermal: {
    summary: 'Regulasi ini menetapkan wilayah kerja panas bumi. Eksplorasi geothermal membuka jalan akses ke wilayah inti yang sebelumnya terisolasi.',
    meaning: 'Wilayah hutan yang dulu sulit dijangkau akan dibuka untuk pipa dan jalan. Ini bisa mempercepat masuknya aktivitas lain yang tidak terkait. Pengawasan lalu lintas wilayah inti menjadi penting.',
    risks: [
      'Pencemaran termal sumber air',
      'Pembukaan akses ke wilayah inti',
      'Konflik penggunaan air panas tradisional',
      'Kebisingan dan polusi udara lokal',
    ],
    territorial: 'Wilayah kerja panas bumi sering berada di pegunungan yang juga wilayah hidup komunitas dataran tinggi.',
    articles: ['Pasal WKP', 'Pasal kewajiban kompensasi lingkungan', 'Pasal kemitraan komunitas sekitar'],
  },
  hutan_lindung: {
    summary: 'Regulasi ini menetapkan ulang batas atau fungsi kawasan hutan lindung. Perubahan batas berdampak langsung pada hak akses tradisional.',
    meaning: 'Perubahan batas hutan lindung kadang baik (memperluas perlindungan) tapi kadang juga mempersempit akses komunitas. Periksa peta baru terhadap wilayah hidup Anda dengan teliti.',
    risks: [
      'Pembatasan akses pengumpulan hasil hutan',
      'Kriminalisasi pengelolaan adat',
      'Hilangnya zona berkebun di pinggir hutan lindung',
      'Reklasifikasi sepihak tanpa konsultasi',
    ],
    territorial: 'Batas baru kemungkinan menggeser wilayah pemanfaatan tradisional komunitas.',
    articles: ['Pasal penetapan fungsi kawasan', 'Pasal hak masyarakat sekitar', 'Pasal pemanfaatan tradisional'],
  },
  perhutanan_sosial: {
    summary: 'Regulasi ini membuka skema perhutanan sosial atau pengakuan hutan adat. Dampaknya berpotensi positif bagi komunitas yang siap mengajukan permohonan.',
    meaning: 'Ini berita baik. Skema ini memungkinkan komunitas mendapat hak kelola legal atas hutan. Yang dibutuhkan: peta wilayah, surat pernyataan komunitas, dan bukti penguasaan turun-temurun. Segera ajukan permohonan.',
    risks: [
      'Persyaratan administratif kompleks',
      'Periode pengajuan terbatas',
      'Persaingan dengan permohonan lain',
      'Risiko kehilangan kesempatan jika tidak segera diajukan',
    ],
    territorial: 'Skema ini secara eksplisit mengakui wilayah adat sebagai unit pengelolaan.',
    articles: ['Pasal kriteria pengajuan', 'Pasal prosedur penetapan hutan adat', 'Pasal hak dan kewajiban pengelola'],
  },
  infrastruktur: {
    summary: 'Regulasi ini mengatur pembangunan infrastruktur yang berpotensi melintasi wilayah komunitas. Trase atau lokasi proyek perlu diverifikasi terhadap peta adat.',
    meaning: 'Pembangunan infrastruktur seperti jalan, bendungan, atau pelabuhan biasanya melintasi banyak wilayah. Pastikan komunitas Anda mendapat akses ke peta trase resmi, lalu bandingkan dengan peta wilayah adat untuk identifikasi potensi konflik.',
    risks: [
      'Pengadaan tanah dengan ganti rugi minim',
      'Pemotongan jalur ritual atau perlintasan adat',
      'Banjir akibat perubahan tata air',
      'Konflik dengan kontraktor',
    ],
    territorial: 'Trase infrastruktur sering melintasi banyak wilayah komunitas. Verifikasi peta resmi terhadap peta partisipatif wajib dilakukan.',
    articles: ['Pasal pengadaan tanah untuk kepentingan umum', 'Pasal AMDAL', 'Pasal kompensasi sosial dan relokasi'],
  },
};

const BRIEF_TEMPLATES_EN = {
  tambang: { summary: 'This regulation authorizes mining operations entering forest area. The concession may overlap with the surrounding indigenous living space.', meaning: 'For your community this means a company is administratively authorized to enter land you have been managing. Traditional access to rivers, fruit forests, or sacred sites may be restricted. Urgently confirm your customary boundaries are documented.', risks: ['Water pollution of community rivers', 'Loss of access to customary forest and sacred sites', 'Horizontal conflict between mine workers and residents', 'Reduced forest cover and biodiversity'], territorial: 'The concession may cut traditional crossing paths and displace gardens. Participatory mapping should begin immediately.', articles: ['Article on permit issuance (IPPKH/IUP)', 'Article on public consultation obligations', 'Article on boundary violation sanctions'] },
  sawit: { summary: 'This regulation releases forest area into palm oil plantation. The scale and location indicate potential overlap with customary gardens.', meaning: 'In simple terms: the forest your community has been using will be converted into corporate palm oil plantation. Traditional access will likely be limited. Confirm FPIC and obtain written proof of tenure.', risks: ['Loss of rubber and fruit gardens', 'Water pollution from fertilizer and pesticide', 'Customary land claim conflict', 'Loss of local food diversity'], territorial: 'The released area appears to envelop community living space. Customary statements and participatory maps are key.', articles: ['Article on forest area release', 'Article on community partnership obligation', 'Article on social violation sanctions'] },
  hti: { summary: 'This regulation grants long-term industrial plantation forest rights. HTI operations typically convert mixed forest into monoculture.', meaning: 'For the community this means the forest will be cleared and replanted as a single species for pulp or paper mills. Access to non-timber forest products may disappear. Check if your territory is in the concession map.', risks: ['Loss of non-timber forest products', 'Reduced water availability from monoculture', 'Conflict with company patrols', 'Soil erosion during land clearing'], territorial: 'HTI of tens of thousands of hectares usually covers several community territories.', articles: ['Article on forest utilization permit (IUPHHK-HTI)', 'Article on worker and community rights', 'Article on recognition of customary forest within concession'] },
  konservasi: { summary: 'This regulation designates or extends conservation area. Conservation status restricts traditional community access.', meaning: 'Conservation designation does not automatically protect customary rights. Often, traditional access is restricted. Communities should file for traditional-use zones in the management plan.', risks: ['Restriction of forest gathering', 'Criminalization of traditional activity', 'Loss of long-held management rights', 'Conflict with conservation officers'], territorial: 'Core conservation zones often envelop sacred sites.', articles: ['Article on conservation zoning', 'Article on rights of surrounding communities', 'Article on traditional use'] },
  psn: { summary: 'This regulation designates a national strategic project that may cut through community territory.', meaning: 'NSP status provides bureaucratic shortcuts for the project but narrows space for community protest. Build a coalition with NGOs and legal companions urgently.', risks: ['Land acquisition with unfair compensation', 'Limited consultation window', 'Eviction without adequate relocation', 'Conflict with security forces'], territorial: 'NSPs often draw straight lines without considering customary boundaries.', articles: ['Article on NSP designation', 'Article on land acquisition for public interest', 'Article on social compensation'] },
  food_estate: { summary: 'This regulation promotes large-scale food estate development.', meaning: 'In simple terms, the government wants to open large tracts for food commodities. Customary cultivation patterns are often considered "unproductive" and converted to industrial agriculture.', risks: ['Loss of customary farming patterns', 'Dependency on industrial inputs', 'Reduced local food diversity', 'Land tenure conflict'], territorial: 'Food-estate sites tend to be flat land that is also the community\'s main food-production area.', articles: ['Article on food-estate designation', 'Article on farmer partnership', 'Article on cultivator rights'] },
  geothermal: { summary: 'This regulation designates a geothermal working area. Exploration opens roads into previously isolated core areas.', meaning: 'Forest areas that were hard to reach will be opened for pipes and roads. This can accelerate unrelated incursions. Monitoring core-area traffic becomes important.', risks: ['Thermal pollution of water sources', 'Opening access to core territory', 'Conflict over traditional hot springs', 'Local noise and air pollution'], territorial: 'Geothermal areas often sit in mountains that are also highland community living spaces.', articles: ['Article on WKP', 'Article on environmental compensation', 'Article on community partnership'] },
  hutan_lindung: { summary: 'This regulation re-designates protected forest boundary or function.', meaning: 'Boundary changes can be good (extending protection) or restrictive (narrowing community access). Examine the new map against your living territory carefully.', risks: ['Restriction on forest gathering', 'Criminalization of customary management', 'Loss of garden zones at forest edge', 'Unilateral reclassification without consultation'], territorial: 'New boundary may shift traditional use area.', articles: ['Article on area function designation', 'Article on rights of surrounding communities', 'Article on traditional use'] },
  perhutanan_sosial: { summary: 'This regulation opens social forestry or customary forest recognition schemes.', meaning: 'This is good news. The scheme allows communities to obtain legal forest management rights. You will need maps, community declarations, and proof of long-standing tenure. File the application soon.', risks: ['Complex administrative requirements', 'Limited application window', 'Competition with other applications', 'Loss of opportunity if not filed promptly'], territorial: 'The scheme explicitly recognizes customary territory as a management unit.', articles: ['Article on application criteria', 'Article on customary forest designation procedure', 'Article on rights and obligations'] },
  infrastruktur: { summary: 'This regulation governs infrastructure construction that may cross community territory.', meaning: 'Infrastructure such as roads, dams, or ports usually crosses many territories. Get the official alignment map and overlay it against your customary map to identify conflict points.', risks: ['Land acquisition with minimal compensation', 'Cutting of ritual paths', 'Flooding from water-system changes', 'Conflict with contractors'], territorial: 'Infrastructure alignment often crosses many communities.', articles: ['Article on land acquisition for public interest', 'Article on EIA', 'Article on social compensation and relocation'] },
};

function generateBrief(language, title, text) {
  const { cat, hits } = detectCategory(text);
  const region = detectRegion(text);
  const community = detectCommunity(text, region);
  const T = language === 'en' ? BRIEF_TEMPLATES_EN[cat] : BRIEF_TEMPLATES_ID[cat];
  const confidence = Math.min(0.95, 0.62 + hits * 0.05 + Math.random() * 0.08);

  // contextual injection — community + region into meaning/territorial
  const inject = (s) => s
    .replace(/komunitas Anda/g, `komunitas ${community}`)
    .replace(/wilayah Anda/g, `wilayah ${community} di ${region}`)
    .replace(/your community/g, `the ${community} community`)
    .replace(/your territory/g, `${community} territory in ${region}`);

  const brief = {
    id: uuid(),
    title: title || (language === 'id' ? 'Dokumen Regulasi' : 'Regulation Document'),
    language,
    source_text: (text || '').slice(0, 18000),
    plain_summary: inject(T.summary),
    community_meaning: inject(T.meaning),
    key_risks: T.risks.slice(),
    territorial_impact: inject(T.territorial),
    important_articles: T.articles.slice(),
    confidence: Math.round(confidence * 100) / 100,
    created_at: nowIso(),
    detected_category: cat,
    detected_region: region,
    detected_community: community,
  };
  state.impactBriefs.unshift(brief);
  if (state.impactBriefs.length > 50) state.impactBriefs.length = 50;
  save(LS.impactBriefs, state.impactBriefs);
  return brief;
}

async function readTextFromUpload(file) {
  if (!file) return '';
  const name = (file.name || '').toLowerCase();
  if (name.endsWith('.txt') || name.endsWith('.md') || (file.type || '').startsWith('text/')) {
    return await file.text();
  }
  // For PDF/DOC we don't parse in browser — feed file name as hint so the
  // category detector still fires on the document title.
  return `Dokumen ${file.name}`;
}

// ---------- Notification mutation persistence ----------
function persistNotifReadStates() {
  const map = {};
  state.notifications.forEach((n) => { map[n.id] = { is_read: n.is_read }; });
  save(LS.notifications, map);
}
function persistAlertReadStates() {
  const map = {};
  state.alerts.forEach((a) => { map[a.id] = { is_read: a.is_read }; });
  save(LS.alerts, map);
}

// ---------- Path matchers ----------
const RE = {
  regulation: /^\/regulations\/([^/]+)$/,
  regionsMeta: /^\/regulations\/meta\/regions$/,
  categoriesMeta: /^\/regulations\/meta\/categories$/,
  risksMeta: /^\/regulations\/meta\/risks$/,
  alertById: /^\/alerts\/([^/]+)$/,
  notificationById: /^\/notifications\/([^/]+)$/,
  evidenceById: /^\/evidence-packs\/([^/]+)$/,
  evidenceFiles: /^\/evidence-packs\/([^/]+)\/files$/,
  evidenceFileById: /^\/evidence-packs\/([^/]+)\/files\/([^/]+)$/,
  evidenceFileDownload: /^\/evidence-packs\/([^/]+)\/files\/([^/]+)\/download$/,
};

// ---------- Handlers ----------
async function handleGet(path, params = {}) {
  await tinyDelay();
  let m;

  if (path === '/regulations') return applyRegFilters(state.regulations, params).slice(0, 500);
  if (path === '/regulations/meta/regions')
    return { regions: Array.from(new Set(state.regulations.map((r) => r.region))).sort() };
  if (path === '/regulations/meta/categories') {
    const counts = {};
    state.regulations.forEach((r) => { counts[r.category] = (counts[r.category] || 0) + 1; });
    return { categories: Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([category, count]) => ({ category, count })) };
  }
  if (path === '/regulations/meta/risks') {
    const counts = {};
    state.regulations.forEach((r) => { counts[r.risk_level] = (counts[r.risk_level] || 0) + 1; });
    return { risks: Object.entries(counts).map(([risk_level, count]) => ({ risk_level, count })) };
  }
  m = path.match(RE.regulation);
  if (m) {
    const r = state.regulations.find((x) => x.id === m[1]);
    if (!r) throw apiError(404, 'Not found');
    return r;
  }
  if (path === '/territories') return state.territories;
  if (path === '/alerts') {
    return state.alerts.filter((a) => {
      if (params.region && params.region !== 'all' && a.region !== params.region) return false;
      if (params.priority && params.priority !== 'all' && a.priority !== params.priority) return false;
      return true;
    }).sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  }
  if (path === '/notifications') {
    return [...state.notifications].sort((a, b) => (a.created_at < b.created_at ? 1 : -1)).slice(0, params.limit || 30);
  }
  if (path === '/notifications/unread-count')
    return { unread: state.notifications.filter((n) => !n.is_read).length };
  if (path === '/conflicts') return applyConflictFilters(state.conflicts, params);
  if (path === '/news') return applyNewsFilters(state.news, params);
  if (path === '/evidence-packs') return [...state.evidencePacks].sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  m = path.match(RE.evidenceById);
  if (m) {
    const p = state.evidencePacks.find((x) => x.id === m[1]);
    if (!p) throw apiError(404, 'Pack not found');
    return p;
  }
  if (path === '/dashboard/summary') {
    return {
      regulations_total: state.regulations.length,
      confirmed_impact: state.regulations.filter((r) => r.impact_status === 'confirmed_impact').length,
      potential_impact: state.regulations.filter((r) => r.impact_status === 'potential_impact').length,
      under_review: state.regulations.filter((r) => r.impact_status === 'under_review').length,
      safe: state.regulations.filter((r) => r.impact_status === 'safe').length,
      critical_risk: state.regulations.filter((r) => r.risk_level === 'kritis').length,
      high_risk: state.regulations.filter((r) => r.risk_level === 'tinggi').length,
      unread_alerts: state.alerts.filter((a) => !a.is_read).length,
      territories_total: state.territories.length,
      territories_with_overlap: state.territories.filter((t) => t.has_overlap).length,
      conflicts_total: state.conflicts.length,
      news_total: state.news.length,
      communities_total: new Set(state.territories.map((t) => t.community)).size,
    };
  }
  throw apiError(404, `Unhandled GET ${path}`);
}

async function handlePost(path, body) {
  await tinyDelay();
  let m;

  if (path === '/impact-brief/generate') {
    if (!body?.text || body.text.trim().length < 50) throw apiError(400, 'Document text is too short.');
    await delay(1400 + Math.random() * 900); // simulate AI think
    return generateBrief(body.language || 'id', body.title, body.text);
  }

  if (path === '/impact-brief/upload') {
    const file = body.get('file');
    const title = body.get('title') || (file?.name || 'Dokumen Regulasi');
    const language = body.get('language') || 'id';
    const text = await readTextFromUpload(file);
    await delay(1400 + Math.random() * 900);
    return generateBrief(language, title, text + ' ' + title);
  }

  if (path === '/alert-subscriptions') {
    return { id: uuid(), created_at: nowIso(), ...body };
  }

  if (path === '/notifications/mark-all-read') {
    let count = 0;
    state.notifications.forEach((n) => { if (!n.is_read) { n.is_read = true; count++; } });
    persistNotifReadStates();
    return { updated: count };
  }

  if (path === '/evidence-packs') {
    const pack = {
      id: uuid(),
      case_name: body.case_name,
      community: body.community,
      region: body.region,
      status: 'draft',
      checklist: {
        territory_map: false, community_consent: false, regulation_copy: false,
        field_photos: false, witness_statements: false, ancestral_proof: false,
      },
      files: [],
      timeline: [{ ts: nowIso(), event: 'Paket bukti dibuat', by: 'system', kind: 'pack_created' }],
      legal_objection_draft: '',
      created_at: nowIso(),
      updated_at: nowIso(),
    };
    state.evidencePacks.unshift(pack);
    save(LS.evidencePacks, state.evidencePacks);
    return pack;
  }

  m = path.match(RE.evidenceFiles);
  if (m) {
    const pack = state.evidencePacks.find((p) => p.id === m[1]);
    if (!pack) throw apiError(404, 'Pack not found');
    const file = body.get('file');
    const category = body.get('category') || 'other';
    const uploaded_by = body.get('uploaded_by') || 'Paralegal';
    if (!file) throw apiError(400, 'Missing file');
    if (file.size > 10 * 1024 * 1024) throw apiError(400, 'File too large (max 10 MB).');
    const fileId = uuid();
    const url = URL.createObjectURL(file);
    state.evidenceFileBlobs.set(fileId, { url, file });
    const meta = {
      id: fileId,
      name: file.name,
      stored_name: file.name,
      size: file.size,
      mime: file.type || 'application/octet-stream',
      category,
      status: 'pending_validation',
      uploaded_by,
      uploaded_at: nowIso(),
      _blobUrl: url,  // used by EvidenceDocuments to render preview/open links
    };
    pack.files.push(meta);
    pack.timeline.push({
      ts: nowIso(),
      event: `Dokumen "${meta.name}" diunggah (kategori: ${category})`,
      by: uploaded_by,
      kind: 'file_uploaded',
      ref_id: fileId,
    });
    pack.updated_at = nowIso();
    save(LS.evidencePacks, state.evidencePacks);
    return pack;
  }

  throw apiError(404, `Unhandled POST ${path}`);
}

async function handlePatch(path, body) {
  await tinyDelay();
  let m;
  m = path.match(RE.alertById);
  if (m) {
    const a = state.alerts.find((x) => x.id === m[1]);
    if (!a) throw apiError(404, 'Alert not found');
    a.is_read = !!body.is_read;
    persistAlertReadStates();
    return { ok: true };
  }
  m = path.match(RE.notificationById);
  if (m) {
    const n = state.notifications.find((x) => x.id === m[1]);
    if (!n) throw apiError(404, 'Notification not found');
    n.is_read = !!body.is_read;
    persistNotifReadStates();
    return { ok: true };
  }
  m = path.match(RE.evidenceFileById);
  if (m) {
    const pack = state.evidencePacks.find((p) => p.id === m[1]);
    if (!pack) throw apiError(404, 'Pack not found');
    const f = pack.files.find((x) => x.id === m[2]);
    if (!f) throw apiError(404, 'File not found');
    f.status = body.status;
    pack.timeline.push({
      ts: nowIso(),
      event: `Status dokumen "${f.name}" diubah menjadi ${body.status}`,
      by: 'Curator',
      kind: 'file_status_changed',
      ref_id: f.id,
    });
    pack.updated_at = nowIso();
    save(LS.evidencePacks, state.evidencePacks);
    return pack;
  }
  throw apiError(404, `Unhandled PATCH ${path}`);
}

async function handlePut(path, body) {
  await tinyDelay();
  const m = path.match(RE.evidenceById);
  if (m) {
    const pack = state.evidencePacks.find((p) => p.id === m[1]);
    if (!pack) throw apiError(404, 'Pack not found');
    const before = pack.status;
    Object.entries(body).forEach(([k, v]) => { if (v !== undefined && v !== null) pack[k] = v; });
    pack.updated_at = nowIso();
    if (body.status && body.status !== before) {
      pack.timeline.push({
        ts: nowIso(),
        event: `Status paket diubah menjadi ${body.status}`,
        by: 'Paralegal',
        kind: 'status_changed',
      });
    }
    save(LS.evidencePacks, state.evidencePacks);
    return pack;
  }
  throw apiError(404, `Unhandled PUT ${path}`);
}

async function handleDelete(path) {
  await tinyDelay();
  const m = path.match(RE.evidenceFileById);
  if (m) {
    const pack = state.evidencePacks.find((p) => p.id === m[1]);
    if (!pack) throw apiError(404, 'Pack not found');
    const idx = pack.files.findIndex((x) => x.id === m[2]);
    if (idx === -1) throw apiError(404, 'File not found');
    const [removed] = pack.files.splice(idx, 1);
    if (state.evidenceFileBlobs.has(removed.id)) {
      try { URL.revokeObjectURL(state.evidenceFileBlobs.get(removed.id).url); } catch {}
      state.evidenceFileBlobs.delete(removed.id);
    }
    pack.timeline.push({
      ts: nowIso(),
      event: `Dokumen "${removed.name}" dihapus`,
      by: 'Paralegal',
      kind: 'file_deleted',
      ref_id: removed.id,
    });
    pack.updated_at = nowIso();
    save(LS.evidencePacks, state.evidencePacks);
    return pack;
  }
  throw apiError(404, `Unhandled DELETE ${path}`);
}

function apiError(status, message) {
  const err = new Error(message);
  err.response = { status, data: { detail: message } };
  return err;
}

// Public axios-like client
export const api = {
  get: async (path, opts = {}) => ({ data: await handleGet(path, opts.params || {}) }),
  post: async (path, body) => ({ data: await handlePost(path, body) }),
  patch: async (path, body) => ({ data: await handlePatch(path, body) }),
  put: async (path, body) => ({ data: await handlePut(path, body) }),
  delete: async (path) => ({ data: await handleDelete(path) }),
};

export const API_BASE = ''; // unused in static mode but kept for backward compat
