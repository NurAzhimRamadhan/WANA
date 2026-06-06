import React, { createContext, useContext, useEffect, useState } from 'react';
import { translations, t as tFn } from '@/lib/i18n';

const LanguageContext = createContext({
  lang: 'id',
  setLang: () => {},
  t: (path) => path,
});

export const LanguageProvider = ({ children }) => {
  const [lang, setLangState] = useState(() => {
    try {
      return localStorage.getItem('wana_lang') || 'id';
    } catch {
      return 'id';
    }
  });

  const setLang = (l) => {
    setLangState(l);
    try { localStorage.setItem('wana_lang', l); } catch {}
  };

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const t = (path) => tFn(lang, path);

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, translations }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
