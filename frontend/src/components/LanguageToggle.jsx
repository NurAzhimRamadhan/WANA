import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { WANA } from '@/constants/testIds/wana';

export default function LanguageToggle() {
  const { lang, setLang } = useLanguage();
  return (
    <div
      data-testid={WANA.nav.languageToggle}
      className="inline-flex items-center rounded-md border border-wana-border bg-white p-0.5 text-xs font-semibold"
    >
      <button
        type="button"
        data-testid={WANA.nav.languageOptionId}
        onClick={() => setLang('id')}
        className={`px-2.5 py-1 rounded transition-colors duration-200 ${
          lang === 'id' ? 'bg-wana-forest text-white' : 'text-wana-soil hover:text-wana-forest'
        }`}
      >
        ID
      </button>
      <button
        type="button"
        data-testid={WANA.nav.languageOptionEn}
        onClick={() => setLang('en')}
        className={`px-2.5 py-1 rounded transition-colors duration-200 ${
          lang === 'en' ? 'bg-wana-forest text-white' : 'text-wana-soil hover:text-wana-forest'
        }`}
      >
        EN
      </button>
    </div>
  );
}
