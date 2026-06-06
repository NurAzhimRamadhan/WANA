import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

const styles = {
  safe: 'bg-[#4A6B53]/12 text-[#4A6B53] border border-[#4A6B53]/30',
  confirmed_impact: 'bg-[#B75D46]/10 text-[#B75D46] border border-[#B75D46]/20',
  potential_impact: 'bg-[#D49A36]/15 text-[#8a6118] border border-[#D49A36]/30',
  under_review: 'bg-[#5A7A85]/10 text-[#395461] border border-[#5A7A85]/25',
};

export const ImpactBadge = ({ status }) => {
  const { t } = useLanguage();
  const cls = styles[status] || styles.under_review;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${cls}`}
      data-testid={`impact-badge-${status}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
      {t(`status.${status}`)}
    </span>
  );
};

const priorityStyles = {
  high: 'bg-[#B75D46]/10 text-[#B75D46] border border-[#B75D46]/20',
  medium: 'bg-[#D49A36]/15 text-[#8a6118] border border-[#D49A36]/30',
  low: 'bg-[#5A7A85]/10 text-[#395461] border border-[#5A7A85]/25',
};

export const PriorityBadge = ({ priority }) => {
  const { t } = useLanguage();
  const cls = priorityStyles[priority] || priorityStyles.low;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold ${cls}`}>
      {t(`priority.${priority}`)}
    </span>
  );
};

const riskStyles = {
  rendah:  'bg-[#4A6B53]/12 text-[#4A6B53] border border-[#4A6B53]/30',
  sedang:  'bg-[#5A7A85]/10 text-[#395461] border border-[#5A7A85]/25',
  tinggi:  'bg-[#D49A36]/18 text-[#8a6118] border border-[#D49A36]/35',
  kritis:  'bg-[#B75D46]/12 text-[#B75D46] border border-[#B75D46]/30',
};

export const RiskBadge = ({ level, score }) => {
  const { t } = useLanguage();
  const cls = riskStyles[level] || riskStyles.rendah;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap ${cls}`} data-testid={`risk-badge-${level}`}>
      {t(`risk.${level}`)}
      {typeof score === 'number' && (
        <span className="font-mono opacity-80">· {score}</span>
      )}
    </span>
  );
};

export default ImpactBadge;
