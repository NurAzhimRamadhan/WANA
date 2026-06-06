import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Save, FolderOpen, ChevronRight, FileText, Upload, FileCheck2, RefreshCcw, AlertTriangle } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { api } from '@/lib/api';
import { WANA } from '@/constants/testIds/wana';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import EvidenceDocuments from '@/components/EvidenceDocuments';

const STATUS_VALUES = ['draft', 'under_review', 'submitted', 'archived'];

const STATUS_TAG = {
  draft: 'bg-[#5A7A85]/10 text-[#395461] border-[#5A7A85]/30',
  under_review: 'bg-[#D49A36]/15 text-[#8a6118] border-[#D49A36]/30',
  submitted: 'bg-[#4A6B53]/15 text-[#4A6B53] border-[#4A6B53]/30',
  archived: 'bg-[#B75D46]/10 text-[#B75D46] border-[#B75D46]/30',
};

const TIMELINE_ICON = {
  pack_created: FolderOpen,
  file_uploaded: Upload,
  file_deleted: AlertTriangle,
  file_status_changed: FileCheck2,
  status_changed: RefreshCcw,
};

function timeAgo(iso, lang) {
  const ms = Date.now() - new Date(iso).getTime();
  const s = Math.max(1, Math.floor(ms / 1000));
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (lang === 'id') {
    if (s < 60) return `${s} detik lalu`;
    if (m < 60) return `${m} menit lalu`;
    if (h < 24) return `${h} jam lalu`;
    return `${d} hari lalu`;
  }
  if (s < 60) return `${s}s ago`;
  if (m < 60) return `${m}m ago`;
  if (h < 24) return `${h}h ago`;
  return `${d}d ago`;
}

export default function EvidencePacks() {
  const { t, lang } = useLanguage();
  const [packs, setPacks] = useState([]);
  const [active, setActive] = useState(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ case_name: '', community: '', region: '' });

  const items = t('evidence.checklist_items');

  const refresh = async () => {
    const { data } = await api.get('/evidence-packs');
    setPacks(data);
    if (data.length && !active) setActive(data[0]);
    if (active) {
      const updated = data.find((p) => p.id === active.id);
      if (updated) setActive(updated);
    }
  };

  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, []);

  const createPack = async () => {
    if (!form.case_name || !form.community || !form.region) {
      toast.error('Lengkapi form / Fill the form.');
      return;
    }
    const { data } = await api.post('/evidence-packs', form);
    setPacks((p) => [data, ...p]);
    setActive(data);
    setOpen(false);
    setForm({ case_name: '', community: '', region: '' });
  };

  const updatePack = async (patch) => {
    const { data } = await api.put(`/evidence-packs/${active.id}`, patch);
    setActive(data);
    setPacks((prev) => prev.map((p) => p.id === data.id ? data : p));
  };

  const toggleChecklist = async (key) => {
    if (!active) return;
    const next = { ...active.checklist, [key]: !active.checklist[key] };
    await updatePack({ checklist: next });
  };

  const saveObjection = async () => {
    await updatePack({ legal_objection_draft: active.legal_objection_draft });
    toast.success(t('evidence.saved'));
  };

  const changeStatus = async (s) => {
    await updatePack({ status: s });
  };

  const onPackUpdated = (data) => {
    setActive(data);
    setPacks((prev) => prev.map((p) => p.id === data.id ? data : p));
  };

  const sortedTimeline = useMemo(() => {
    if (!active) return [];
    return [...active.timeline].sort((a, b) => new Date(b.ts) - new Date(a.ts));
  }, [active]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="text-[11px] uppercase tracking-[0.25em] font-semibold text-wana-moss">Legal case workspace</div>
          <h1 className="mt-2 font-display font-bold text-4xl sm:text-5xl tracking-tight text-wana-ink leading-[1.05]">{t('evidence.title')}</h1>
          <p className="mt-3 text-wana-soil max-w-3xl text-[16px] leading-relaxed">{t('evidence.sub')}</p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button data-testid={WANA.evidence.newCaseBtn} className="bg-wana-forest hover:bg-wana-forest/90 text-white font-semibold">
              <Plus className="h-4 w-4 mr-2" /> {t('evidence.new_case')}
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-white">
            <DialogHeader><DialogTitle className="font-heading">{t('evidence.new_case')}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Input data-testid={WANA.evidence.caseNameInput} placeholder={t('evidence.case_name_ph')} value={form.case_name} onChange={(e) => setForm({ ...form, case_name: e.target.value })} />
              <Input data-testid={WANA.evidence.communityInput} placeholder={t('evidence.community_ph')} value={form.community} onChange={(e) => setForm({ ...form, community: e.target.value })} />
              <Input data-testid={WANA.evidence.regionInput} placeholder={t('evidence.region_ph')} value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })} />
              <Button data-testid={WANA.evidence.submitBtn} onClick={createPack} className="w-full bg-wana-forest hover:bg-wana-forest/90 text-white">{t('common.submit')}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="mt-8 grid lg:grid-cols-12 gap-6">
        {/* sidebar list */}
        <aside className="lg:col-span-4">
          <div className="bg-white border border-wana-border rounded-md">
            <div className="px-4 py-3 border-b border-wana-border flex items-center gap-2 text-xs uppercase tracking-wider font-semibold text-wana-soil">
              <FolderOpen className="h-4 w-4" /> {t('evidence.title')}
            </div>
            {packs.length === 0 && (
              <div className="p-6 text-sm text-wana-soil text-center">{t('evidence.no_packs')}</div>
            )}
            <ul>
              {packs.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    data-testid={WANA.evidence.packItem(p.id)}
                    onClick={() => setActive(p)}
                    className={`w-full text-left px-4 py-3 border-b border-wana-border last:border-b-0 hover:bg-wana-bg transition-colors ${
                      active?.id === p.id ? 'bg-wana-bg' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-semibold text-sm text-wana-ink truncate">{p.case_name}</div>
                      <ChevronRight className="h-4 w-4 text-wana-soil shrink-0" />
                    </div>
                    <div className="text-xs text-wana-soil mt-0.5">{p.community} · {p.region}</div>
                    <div className="mt-1.5 flex items-center gap-2">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border ${STATUS_TAG[p.status] || STATUS_TAG.draft}`}>
                        {t(`evidence.pack_statuses.${p.status}`)}
                      </span>
                      <span className="text-[10px] text-wana-soil">{p.files?.length || 0} files</span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </aside>

        {/* detail */}
        <section className="lg:col-span-8">
          {!active && (
            <div className="bg-white border border-dashed border-wana-border rounded-md p-12 text-center">
              <FileText className="h-10 w-10 mx-auto text-wana-moss" />
              <p className="mt-3 text-wana-soil">{t('evidence.no_packs')}</p>
            </div>
          )}

          {active && (
            <div className="space-y-5">
              {/* HEADER */}
              <div className="bg-white border border-wana-border rounded-md p-5">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <h2 className="font-heading font-bold text-2xl text-wana-ink">{active.case_name}</h2>
                    <div className="text-sm text-wana-soil mt-1">{active.community} · {active.region}</div>
                    <span className={`mt-2 inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider border ${STATUS_TAG[active.status] || STATUS_TAG.draft}`}>
                      {t(`evidence.pack_statuses.${active.status}`)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-semibold text-wana-soil">{t('evidence.status_label')}:</label>
                    <Select value={active.status} onValueChange={changeStatus}>
                      <SelectTrigger data-testid={WANA.evidence.statusSelect} className="w-52 bg-wana-bg">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_VALUES.map((s) => (
                          <SelectItem key={s} value={s}>{t(`evidence.pack_statuses.${s}`)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* CHECKLIST */}
              <div className="bg-white border border-wana-border rounded-md p-5">
                <h3 className="font-heading font-semibold text-lg text-wana-ink mb-3">{t('evidence.checklist_title')}</h3>
                <ul className="grid sm:grid-cols-2 gap-3">
                  {Object.keys(active.checklist).map((key) => (
                    <li key={key} className="flex items-start gap-3 p-3 border border-wana-border rounded-md">
                      <Checkbox
                        data-testid={WANA.evidence.checklistItem(key)}
                        checked={!!active.checklist[key]}
                        onCheckedChange={() => toggleChecklist(key)}
                        className="mt-0.5"
                      />
                      <span className="text-sm text-wana-ink leading-snug">{items[key] || key}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* DOCUMENTS */}
              <EvidenceDocuments pack={active} onPackUpdated={onPackUpdated} />

              {/* OBJECTION */}
              <div className="bg-white border border-wana-border rounded-md p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-heading font-semibold text-lg text-wana-ink">{t('evidence.objection_title')}</h3>
                  <Button data-testid={WANA.evidence.saveBtn} onClick={saveObjection} variant="outline" className="border-wana-border">
                    <Save className="h-4 w-4 mr-2" /> {t('common.save')}
                  </Button>
                </div>
                <Textarea
                  data-testid={WANA.evidence.objectionTextarea}
                  rows={10}
                  value={active.legal_objection_draft || ''}
                  onChange={(e) => setActive({ ...active, legal_objection_draft: e.target.value })}
                  placeholder={t('evidence.objection_ph')}
                  className="bg-wana-bg border-wana-border font-mono text-sm"
                />
              </div>

              {/* TIMELINE */}
              <div className="bg-white border border-wana-border rounded-md p-5">
                <h3 className="font-heading font-semibold text-lg text-wana-ink mb-4">{t('evidence.timeline_title')}</h3>
                <ol className="relative space-y-4 ml-3 border-l border-wana-border pl-5">
                  {sortedTimeline.map((ev, i) => {
                    const kind = ev.kind || 'pack_created';
                    const Icon = TIMELINE_ICON[kind] || FolderOpen;
                    const label = t(`evidence.timeline_events.${kind}`);
                    return (
                      <li key={i} className="relative">
                        <span className="absolute -left-[33px] top-0 h-7 w-7 rounded-full bg-white border border-wana-border flex items-center justify-center text-wana-forest">
                          <Icon className="h-3.5 w-3.5" />
                        </span>
                        <div className="text-sm text-wana-ink font-semibold leading-tight">{label}</div>
                        <div className="text-xs text-wana-soil mt-0.5 leading-relaxed">{ev.event}</div>
                        <div className="text-[11px] text-wana-soil mt-0.5">
                          {timeAgo(ev.ts, lang)} · {ev.by || 'system'}
                        </div>
                      </li>
                    );
                  })}
                  {sortedTimeline.length === 0 && (
                    <li className="text-sm text-wana-soil">—</li>
                  )}
                </ol>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
