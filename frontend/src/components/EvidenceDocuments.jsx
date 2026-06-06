import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  Upload, FileText, Image as ImageIcon, FileType2, X, Trash2,
  ExternalLink, ShieldCheck, AlertCircle, Loader2, FilePlus2,
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { api } from '@/lib/api';
import { WANA } from '@/constants/testIds/wana';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

const CATEGORY_KEYS = [
  'field_photo', 'customary_letter', 'territory_map', 'conflict_evidence',
  'witness_statement', 'fpic_document', 'related_regulation', 'other',
];

const CHECKLIST_CATEGORY_MAP = {
  territory_map: 'territory_map',
  field_photos: 'field_photo',
  witness_statements: 'witness_statement',
  community_consent: 'fpic_document',
  regulation_copy: 'related_regulation',
  ancestral_proof: 'customary_letter',
};

const STATUS_STYLES = {
  pending_validation: 'bg-[#D49A36]/15 text-[#8a6118] border-[#D49A36]/30',
  verified: 'bg-[#4A6B53]/15 text-[#4A6B53] border-[#4A6B53]/30',
  needs_revision: 'bg-[#B75D46]/10 text-[#B75D46] border-[#B75D46]/30',
  draft: 'bg-[#5A7A85]/10 text-[#395461] border-[#5A7A85]/30',
};

function humanSize(bytes) {
  if (!bytes) return '0 KB';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

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

const FileIcon = ({ file }) => {
  const mime = file.mime || '';
  if (mime.startsWith('image/')) return <ImageIcon className="h-5 w-5 text-wana-river" />;
  if (mime === 'application/pdf') return <FileText className="h-5 w-5 text-[#B75D46]" />;
  return <FileType2 className="h-5 w-5 text-wana-moss" />;
};

export default function EvidenceDocuments({ pack, onPackUpdated }) {
  const { t, lang } = useLanguage();
  const [category, setCategory] = useState('other');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const inputRef = useRef(null);

  const files = pack.files || [];

  const readiness = useMemo(() => {
    const checklistKeys = Object.keys(pack.checklist || {});
    const total = checklistKeys.length || 6;
    const completed = checklistKeys.reduce((acc, key) => {
      if (pack.checklist[key]) return acc + 1;
      // also count as complete if at least one verified file in the mapped category
      const mapped = CHECKLIST_CATEGORY_MAP[key];
      const hasVerified = mapped && files.some((f) => f.category === mapped && f.status === 'verified');
      return acc + (hasVerified ? 1 : 0);
    }, 0);
    const pct = total ? Math.round((completed / total) * 100) : 0;
    return { completed, total, pct };
  }, [pack.checklist, files]);

  const uploadFile = useCallback(async (file) => {
    if (!file) return;
    const maxBytes = 10 * 1024 * 1024;
    if (file.size > maxBytes) {
      toast.error(lang === 'id' ? 'Ukuran file melebihi 10 MB' : 'File exceeds 10 MB');
      return;
    }
    setUploading(true);
    setProgress(0);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('category', category);
      fd.append('uploaded_by', 'Paralegal Komunitas');
      const { data } = await api.post(`/evidence-packs/${pack.id}/files`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          if (e.total) setProgress(Math.round((e.loaded / e.total) * 100));
        },
      });
      onPackUpdated(data);
      toast.success(t('evidence.upload_success'));
    } catch (e) {
      toast.error(e?.response?.data?.detail || t('evidence.upload_error'));
    } finally {
      setUploading(false);
      setProgress(0);
    }
  }, [api, category, lang, onPackUpdated, pack.id, t]);

  const handleInputChange = (e) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (f) uploadFile(f);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) uploadFile(f);
  };

  const deleteFile = async () => {
    if (!confirmDelete) return;
    try {
      const { data } = await api.delete(`/evidence-packs/${pack.id}/files/${confirmDelete.id}`);
      onPackUpdated(data);
      toast.success(lang === 'id' ? 'Dokumen dihapus' : 'Document deleted');
    } catch (e) {
      toast.error(lang === 'id' ? 'Gagal menghapus' : 'Failed to delete');
    } finally {
      setConfirmDelete(null);
    }
  };

  const verifyFile = async (file) => {
    const next = file.status === 'verified' ? 'pending_validation' : 'verified';
    try {
      const { data } = await api.patch(`/evidence-packs/${pack.id}/files/${file.id}`, { status: next });
      onPackUpdated(data);
    } catch (e) {
      toast.error('Failed');
    }
  };

  return (
    <div className="bg-white border border-wana-border rounded-md p-5">
      <div className="flex items-start justify-between gap-3 flex-wrap mb-5">
        <div>
          <h3 className="font-heading font-semibold text-lg text-wana-ink">{t('evidence.docs_title')}</h3>
          <p className="mt-1 text-sm text-wana-soil leading-relaxed max-w-2xl">{t('evidence.docs_sub')}</p>
        </div>
        <ReadinessBar readiness={readiness} />
      </div>

      {/* Upload zone */}
      <div
        data-testid={WANA.evidence.uploadZone}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => !uploading && inputRef.current?.click()}
        className={`relative rounded-md border-2 border-dashed transition-all duration-200 cursor-pointer p-7 text-center ${
          dragOver ? 'border-wana-forest bg-wana-forest/5' : 'border-wana-border bg-wana-bg/40 hover:bg-wana-bg/70 hover:border-wana-moss/60'
        } ${uploading ? 'pointer-events-none opacity-90' : ''}`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,application/pdf,image/jpeg,image/png,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          className="hidden"
          data-testid={WANA.evidence.uploadInput}
          onChange={handleInputChange}
        />
        <div className="mx-auto h-12 w-12 rounded-md bg-white border border-wana-border flex items-center justify-center mb-3">
          {uploading
            ? <Loader2 className="h-6 w-6 text-wana-forest animate-spin" />
            : <Upload className="h-6 w-6 text-wana-forest" />}
        </div>
        <div className="font-heading font-semibold text-wana-ink">
          {uploading ? t('evidence.upload_progress') : t('evidence.upload_zone_title')}
        </div>
        <div className="mt-1 text-sm text-wana-soil">{t('evidence.upload_drop')}</div>
        <div className="text-xs text-wana-soil mt-0.5">{t('evidence.upload_or')}</div>
        <div className="text-[11px] text-wana-soil mt-2">{t('evidence.upload_constraints')}</div>

        {uploading && (
          <div className="mt-4 max-w-sm mx-auto h-1.5 bg-wana-border rounded overflow-hidden">
            <div className="h-full bg-wana-forest transition-all" style={{ width: `${progress || 8}%` }} />
          </div>
        )}
      </div>

      {/* Category selector */}
      <div className="mt-4 flex items-center gap-3 flex-wrap">
        <label className="text-xs font-semibold uppercase tracking-wider text-wana-soil">{t('evidence.pick_category')}</label>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger data-testid={WANA.evidence.uploadCategory} className="w-64 bg-wana-bg border-wana-border">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CATEGORY_KEYS.map((k) => (
              <SelectItem key={k} value={k}>{t(`evidence.categories.${k}`)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* File list */}
      {files.length === 0 ? (
        <div className="mt-6 rounded-md border border-dashed border-wana-border bg-wana-bg/30 p-8 text-center">
          <FilePlus2 className="h-9 w-9 mx-auto text-wana-moss/60" />
          <h4 className="mt-3 font-heading font-semibold text-wana-ink">{t('evidence.empty_files_title')}</h4>
          <p className="mt-1 text-sm text-wana-soil max-w-md mx-auto">{t('evidence.empty_files_sub')}</p>
        </div>
      ) : (
        <ul className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-3">
          {files.map((f) => {
            const isImage = (f.mime || '').startsWith('image/');
            const previewUrl = f._blobUrl || '#';
            return (
              <li
                key={f.id}
                data-testid={WANA.evidence.fileCard(f.id)}
                className="group bg-white border border-wana-border rounded-md p-3.5 hover:border-wana-moss/50 hover:shadow-sm transition-all duration-200"
              >
                <div className="flex gap-3">
                  {/* thumbnail/icon */}
                  <div className="shrink-0 h-14 w-14 rounded-md border border-wana-border bg-wana-bg/60 overflow-hidden flex items-center justify-center">
                    {isImage ? (
                      <img src={previewUrl} alt={f.name} className="h-full w-full object-cover" loading="lazy" />
                    ) : (
                      <FileIcon file={f} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2">
                      <div className="font-semibold text-sm text-wana-ink truncate flex-1" title={f.name}>{f.name}</div>
                      <span className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border ${STATUS_STYLES[f.status] || STATUS_STYLES.pending_validation}`}>
                        {t(`evidence.file_statuses.${f.status}`)}
                      </span>
                    </div>
                    <div className="mt-1 text-[11px] text-wana-soil">
                      {humanSize(f.size)} · {t('evidence.uploaded_at')} {timeAgo(f.uploaded_at, lang)} {t('evidence.uploaded_by')} {f.uploaded_by}
                    </div>
                    <div className="mt-1 text-[11px] font-semibold text-wana-moss">
                      {t('evidence.category')}: <span className="font-normal text-wana-soil">{t(`evidence.categories.${f.category}`)}</span>
                    </div>

                    <div className="mt-2.5 flex items-center gap-1">
                      <a
                        href={previewUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        data-testid={WANA.evidence.fileOpenBtn(f.id)}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-wana-forest hover:underline"
                      >
                        <ExternalLink className="h-3 w-3" /> {t('evidence.file_actions.open')}
                      </a>
                      <span className="text-wana-border">·</span>
                      <button
                        type="button"
                        data-testid={WANA.evidence.fileVerifyBtn(f.id)}
                        onClick={() => verifyFile(f)}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-wana-moss hover:underline"
                      >
                        {f.status === 'verified'
                          ? <><AlertCircle className="h-3 w-3" /> {t('evidence.file_actions.request_revision')}</>
                          : <><ShieldCheck className="h-3 w-3" /> {t('evidence.file_actions.verify')}</>}
                      </button>
                      <span className="text-wana-border">·</span>
                      <button
                        type="button"
                        data-testid={WANA.evidence.fileDeleteBtn(f.id)}
                        onClick={() => setConfirmDelete(f)}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-wana-terracotta hover:underline"
                      >
                        <Trash2 className="h-3 w-3" /> {t('evidence.file_actions.delete')}
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* Delete confirmation */}
      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent className="bg-white border-wana-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-heading">{t('evidence.delete_confirm_title')}</AlertDialogTitle>
            <AlertDialogDescription className="text-wana-soil">
              {t('evidence.delete_confirm_body')}
              {confirmDelete && (
                <div className="mt-3 p-2.5 rounded-md bg-wana-bg border border-wana-border text-xs text-wana-ink font-mono">
                  {confirmDelete.name}
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-wana-border">{t('evidence.delete_confirm_no')}</AlertDialogCancel>
            <AlertDialogAction
              data-testid={WANA.evidence.deleteConfirmYes}
              onClick={deleteFile}
              className="bg-wana-terracotta hover:bg-wana-terracotta/90 text-white"
            >
              {t('evidence.delete_confirm_yes')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ReadinessBar({ readiness }) {
  const { t } = useLanguage();
  const color = readiness.pct >= 80 ? 'bg-wana-moss' : readiness.pct >= 40 ? 'bg-wana-ochre' : 'bg-wana-terracotta';
  return (
    <div className="min-w-[220px] max-w-xs w-full sm:w-auto" data-testid={WANA.evidence.readinessBar}>
      <div className="flex items-baseline justify-between text-xs">
        <span className="font-semibold uppercase tracking-wider text-wana-soil">{t('evidence.readiness_label')}</span>
        <span className="font-heading font-bold text-wana-forest text-base">{readiness.pct}%</span>
      </div>
      <div className="mt-1.5 h-2 bg-wana-border rounded overflow-hidden">
        <div className={`h-full ${color} transition-all duration-500`} style={{ width: `${readiness.pct}%` }} />
      </div>
      <div className="mt-1 text-[11px] text-wana-soil">
        {readiness.completed} {t('evidence.readiness_files')} {readiness.total} {t('evidence.readiness_files_completed')}
      </div>
    </div>
  );
}
