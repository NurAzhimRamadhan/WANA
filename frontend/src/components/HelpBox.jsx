import React from 'react';
import { HelpCircle } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

/**
 * Calm "What does this mean?" explanatory box. Used to demystify legal terms.
 */
export default function HelpBox({ children, title }) {
  const { t } = useLanguage();
  return (
    <div className="border border-wana-border bg-white rounded-md p-4 flex gap-3">
      <span className="h-8 w-8 shrink-0 rounded-md bg-wana-forest/10 text-wana-forest flex items-center justify-center">
        <HelpCircle className="h-4 w-4" />
      </span>
      <div className="text-sm leading-relaxed">
        <div className="font-semibold text-wana-ink mb-1">
          {title || t('common.what_this_means')}
        </div>
        <div className="text-wana-soil">{children}</div>
      </div>
    </div>
  );
}
