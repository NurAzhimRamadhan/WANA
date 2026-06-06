import React, { useState } from 'react';
import { FileText, Upload, Sparkles, Download, AlertTriangle, Map as MapIcon, BookOpen, ListChecks } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { api } from '@/lib/api';
import { WANA } from '@/constants/testIds/wana';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import HelpBox from '@/components/HelpBox';
import { toast } from 'sonner';
import jsPDF from 'jspdf';

const SAMPLE_DOCUMENT = `KEPUTUSAN MENTERI LINGKUNGAN HIDUP DAN KEHUTANAN REPUBLIK INDONESIA
NOMOR: SK.118/MENLHK/2026
TENTANG: IZIN PEMANFAATAN HUTAN UNTUK HUTAN TANAMAN INDUSTRI DI KABUPATEN BATANGHARI, PROVINSI JAMBI.

Menimbang:
a. bahwa berdasarkan kebijakan tata ruang nasional, sebagian kawasan hutan produksi di Provinsi Jambi dapat dimanfaatkan untuk Hutan Tanaman Industri (HTI);
b. bahwa permohonan PT XYZ Forestry telah memenuhi persyaratan administratif sesuai Peraturan Pemerintah No. 23/2021.

Memutuskan:
Pasal 1. Memberikan izin pemanfaatan hutan kepada PT XYZ Forestry untuk areal seluas 28.000 hektar di Kabupaten Batanghari, Provinsi Jambi, untuk pembangunan Hutan Tanaman Industri jenis akasia, selama jangka waktu 35 tahun.
Pasal 2. Pemegang izin wajib melakukan konsultasi publik dengan masyarakat sekitar sebelum operasi dimulai.
Pasal 3. Areal izin ini sebagian berhimpitan dengan kawasan hidup Suku Anak Dalam (Orang Rimba) di Bukit Duabelas, sehingga pemegang izin wajib menyusun rencana mitigasi sosial sebelum pembukaan lahan.
Pasal 4. Pelanggaran terhadap ketentuan dalam Surat Keputusan ini dapat mengakibatkan pencabutan izin sesuai peraturan perundang-undangan yang berlaku.

Ditetapkan di Jakarta, 29 Januari 2026.`;

export default function ImpactBrief() {
  const { t, lang } = useLanguage();
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [briefLang, setBriefLang] = useState(lang);
  const [busy, setBusy] = useState(false);
  const [brief, setBrief] = useState(null);

  const exportPdf = () => {
    if (!brief) return;
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const W = doc.internal.pageSize.getWidth();
    const M = 48;
    let y = 60;
    const writeLine = (text, opts = {}) => {
      const { size = 11, bold = false, color = [28, 27, 26], gap = 6 } = opts;
      doc.setFont('helvetica', bold ? 'bold' : 'normal');
      doc.setFontSize(size);
      doc.setTextColor(...color);
      const lines = doc.splitTextToSize(text, W - M * 2);
      lines.forEach((ln) => {
        if (y > 780) { doc.addPage(); y = 60; }
        doc.text(ln, M, y);
        y += size + gap;
      });
    };
    writeLine('WANA — Impact Brief', { size: 20, bold: true, color: [28, 63, 43], gap: 4 });
    writeLine(brief.title, { size: 14, bold: true, color: [28, 63, 43], gap: 10 });
    writeLine(`Confidence: ${Math.round(brief.confidence * 100)}%  ·  AI-generated, awaiting human validation`, { size: 10, color: [89, 87, 84], gap: 14 });
    const sections = [
      ['Ringkasan / Summary', brief.plain_summary],
      ['Apa artinya untuk komunitas / What this means', brief.community_meaning],
      ['Risiko Utama / Key Risks', brief.key_risks.map((r) => `• ${r}`).join('\n')],
      ['Dampak Teritorial / Territorial Impact', brief.territorial_impact],
      ['Pasal Penting / Important Articles', brief.important_articles.map((a) => `• ${a}`).join('\n')],
    ];
    sections.forEach(([h, body]) => {
      y += 4;
      writeLine(h, { size: 12, bold: true, color: [28, 63, 43], gap: 8 });
      writeLine(body, { size: 11, gap: 4 });
      y += 6;
    });
    writeLine('Disclaimer: Ringkasan ini dihasilkan oleh AI dan WAJIB divalidasi oleh pendamping hukum sebelum digunakan dalam tindakan hukum. / This summary is AI-generated and MUST be validated by a legal companion before any legal action.', { size: 9, color: [89, 87, 84] });
    doc.save(`wana-brief-${brief.id}.pdf`);
  };

  const generate = async () => {
    if (!text.trim() || text.trim().length < 50) {
      toast.error(lang === 'id' ? 'Teks terlalu singkat (min 50 karakter).' : 'Text too short (min 50 chars).');
      return;
    }
    setBusy(true);
    setBrief(null);
    try {
      const { data } = await api.post('/impact-brief/generate', {
        title: title || (lang === 'id' ? 'Dokumen Regulasi' : 'Regulation Document'),
        language: briefLang,
        text,
      });
      setBrief(data);
      toast.success(lang === 'id' ? 'Brief berhasil dibuat.' : 'Brief generated.');
    } catch (e) {
      toast.error(e?.response?.data?.detail || (lang === 'id' ? 'Gagal membuat brief.' : 'Failed to generate brief.'));
    } finally {
      setBusy(false);
    }
  };

  const uploadFile = async (file) => {
    if (!file) return;
    setBusy(true);
    setBrief(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('title', title || file.name);
      fd.append('language', briefLang);
      const { data } = await api.post('/impact-brief/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setBrief(data);
      toast.success(lang === 'id' ? 'Brief berhasil dibuat dari unggahan.' : 'Brief generated from upload.');
    } catch (e) {
      toast.error(e?.response?.data?.detail || (lang === 'id' ? 'Gagal memproses dokumen.' : 'Failed to process document.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8">
        <div className="text-[11px] uppercase tracking-[0.25em] font-semibold text-wana-moss">AI Policy Intelligence</div>
        <h1 className="mt-2 font-display font-bold text-4xl sm:text-5xl tracking-tight text-wana-ink leading-[1.05]">{t('brief.title')}</h1>
        <p className="mt-3 text-wana-soil max-w-3xl text-[16px] leading-relaxed">{t('brief.sub')}</p>
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        {/* INPUT */}
        <div className="lg:col-span-2 glass-light rounded-2xl p-5 flex flex-col gap-4 glow-forest">
          <Input
            data-testid={WANA.brief.titleInput}
            placeholder={t('brief.doc_title_ph')}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="bg-wana-bg border-wana-border"
          />

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-wana-soil mb-2 block">{t('common.what_this_means')}</label>
            <Select value={briefLang} onValueChange={setBriefLang}>
              <SelectTrigger data-testid={WANA.brief.languageSelect} className="bg-wana-bg border-wana-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="id">Bahasa Indonesia</SelectItem>
                <SelectItem value="en">English</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-wana-soil mb-2 block">{t('brief.paste_label')}</label>
            <Textarea
              data-testid={WANA.brief.textArea}
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={10}
              className="bg-wana-bg border-wana-border font-mono text-xs leading-relaxed"
              placeholder="..."
            />
            <button
              type="button"
              onClick={() => { setText(SAMPLE_DOCUMENT); setTitle('SK.118/MENLHK/2026'); }}
              data-testid={WANA.brief.pasteSampleBtn}
              className="mt-2 text-xs font-semibold text-wana-forest hover:underline"
            >
              {t('brief.paste_sample')}
            </button>
          </div>

          <div className="doc-rule pt-4 flex items-center justify-between gap-3">
            <div className="text-sm text-wana-soil">{t('brief.or')}</div>
            <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 rounded-md border border-wana-border bg-wana-bg text-sm hover:bg-wana-border/30 transition-colors">
              <Upload className="h-4 w-4 text-wana-forest" />
              <span className="font-medium">{t('brief.upload_label')}</span>
              <input
                type="file"
                accept=".pdf,.txt"
                className="hidden"
                data-testid={WANA.brief.fileInput}
                onChange={(e) => uploadFile(e.target.files?.[0])}
              />
            </label>
          </div>

          <Button
            data-testid={WANA.brief.generateBtn}
            onClick={generate}
            disabled={busy}
            className="btn-gloss bg-wana-forest hover:bg-wana-forest/90 text-white font-semibold rounded-full hover-lift glow-forest"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            {busy ? t('brief.generating') : t('brief.generate')}
          </Button>

          <HelpBox title={lang === 'id' ? 'Catatan validasi' : 'Validation note'}>
            {t('brief.disclaimer')}
          </HelpBox>
        </div>

        {/* OUTPUT */}
        <div className="lg:col-span-3">
          {!brief && !busy && (
            <div className="glass-light rounded-2xl p-12 text-center border-2 border-dashed border-wana-border/60">
              <FileText className="h-10 w-10 mx-auto text-wana-moss" />
              <h3 className="mt-4 font-display font-semibold text-xl text-wana-ink">
                {lang === 'id' ? 'Brief akan muncul di sini' : 'Brief will appear here'}
              </h3>
              <p className="mt-3 text-sm text-wana-soil max-w-md mx-auto leading-relaxed">
                {lang === 'id'
                  ? 'Tempel atau unggah dokumen, lalu klik Hasilkan Impact Brief untuk menerima ringkasan terstruktur yang siap dibawa ke musyawarah komunitas.'
                  : 'Paste or upload a document, then click Generate Impact Brief to receive a structured summary ready for community meetings.'}
              </p>
            </div>
          )}

          {busy && (
            <div className="relative glass-light rounded-2xl p-14 text-center overflow-hidden glow-forest">
              <div className="absolute inset-0 bg-forest-radial opacity-15" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-40 w-40 rounded-full bg-wana-glow/15 blur-3xl animate-pulse" />
              <div className="relative inline-flex items-center gap-3 text-wana-forest font-display font-semibold text-lg">
                <Sparkles className="h-6 w-6 animate-pulse text-wana-gold" />
                <span>{t('brief.generating')}</span>
              </div>
              <div className="relative mt-6 flex justify-center gap-1.5">
                {[0, 1, 2, 3, 4].map((i) => (
                  <span
                    key={i}
                    className="h-1.5 w-8 rounded-full bg-wana-moss/30 overflow-hidden"
                  >
                    <span
                      className="block h-full bg-wana-glow rounded-full"
                      style={{ animation: `pulse-ring 1.4s ease-in-out ${i * 0.18}s infinite alternate` }}
                    />
                  </span>
                ))}
              </div>
              <div className="relative mt-5 text-xs text-wana-soil">
                {lang === 'id' ? 'Claude Sonnet 4.5 menganalisis dokumen…' : 'Claude Sonnet 4.5 analyzing document…'}
              </div>
            </div>
          )}

          {brief && (
            <div className="glass-light rounded-2xl p-7 glow-forest" data-testid={WANA.brief.resultCard}>
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <div className="text-xs uppercase tracking-[0.2em] font-semibold text-wana-moss">Impact Brief</div>
                  <h2 className="mt-2 font-heading font-bold text-2xl text-wana-ink tracking-tight">{brief.title}</h2>
                </div>
                <button
                  type="button"
                  data-testid={WANA.brief.pdfBtn}
                  onClick={exportPdf}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-md bg-wana-forest text-white text-sm font-semibold hover:bg-wana-forest/90 transition-colors"
                >
                  <Download className="h-4 w-4" /> {t('common.download_pdf')}
                </button>
              </div>

              {/* confidence */}
              <div className="mt-5 flex items-center gap-3">
                <div className="text-xs uppercase tracking-wider font-semibold text-wana-soil">{t('brief.confidence')}</div>
                <div className="flex-1 max-w-[260px] h-1.5 bg-wana-border rounded overflow-hidden">
                  <div className="h-full bg-wana-forest" style={{ width: `${Math.round(brief.confidence * 100)}%` }} />
                </div>
                <div className="text-sm font-semibold text-wana-forest">{Math.round(brief.confidence * 100)}%</div>
              </div>

              <Block icon={<BookOpen className="h-4 w-4" />} title={t('brief.sections.plain')}>{brief.plain_summary}</Block>
              <Block icon={<FileText className="h-4 w-4" />} title={t('brief.sections.meaning')}>{brief.community_meaning}</Block>

              <Block icon={<AlertTriangle className="h-4 w-4" />} title={t('brief.sections.risks')}>
                <ul className="space-y-2">
                  {brief.key_risks.map((r, i) => (
                    <li key={i} className="flex gap-2"><span className="text-wana-terracotta">•</span><span>{r}</span></li>
                  ))}
                </ul>
              </Block>

              <Block icon={<MapIcon className="h-4 w-4" />} title={t('brief.sections.territorial')}>{brief.territorial_impact}</Block>

              <Block icon={<ListChecks className="h-4 w-4" />} title={t('brief.sections.articles')}>
                <ul className="space-y-2">
                  {brief.important_articles.map((a, i) => (
                    <li key={i} className="flex gap-2"><span className="text-wana-moss">§</span><span>{a}</span></li>
                  ))}
                </ul>
              </Block>

              <div className="mt-6 p-3 rounded-md bg-wana-ochre/10 border border-wana-ochre/30 text-sm text-[#6e4d10]">
                {t('brief.disclaimer')}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const Block = ({ icon, title, children }) => (
  <section className="mt-6 doc-rule pt-5">
    <div className="flex items-center gap-2 text-wana-forest font-heading font-semibold text-sm uppercase tracking-wider">
      {icon}<span>{title}</span>
    </div>
    <div className="mt-3 text-wana-ink leading-relaxed text-[15px]">{children}</div>
  </section>
);
