import React from 'react';
import { ArrowRight, Sprout, Scale } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

const Col = ({ title, items, accent }) => (
  <div className="glass-light hover-lift rounded-2xl p-5">
    <div className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] uppercase tracking-[0.2em] font-bold mb-4 ${accent}`}>
      {title}
    </div>
    <ul className="space-y-2.5 text-sm text-wana-ink leading-relaxed">
      {items.map((it, i) => (<li key={i} className="flex gap-2"><span className="text-wana-glow mt-0.5">◆</span>{it}</li>))}
    </ul>
  </div>
);

export default function TheoryOfChange() {
  const { t } = useLanguage();
  const cols = t('theory.cols');
  const c = t('theory.content');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="max-w-3xl mb-10">
        <div className="text-[11px] uppercase tracking-[0.25em] font-semibold text-wana-moss">From information to justice</div>
        <h1 className="mt-2 font-display font-bold text-4xl sm:text-5xl tracking-tight text-wana-ink leading-[1.05]">{t('theory.title')}</h1>
        <p className="mt-3 text-wana-soil text-[16px] leading-relaxed">{t('theory.sub')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
        <Col title={cols.input} items={c.input} accent="bg-wana-forest/10 text-wana-forest" />
        <ArrowConnector />
        <Col title={cols.activities} items={c.activities} accent="bg-wana-forest/15 text-wana-forest" />
        <ArrowConnector />
        <Col title={cols.outputs} items={c.outputs} accent="bg-wana-moss/15 text-wana-moss" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-3 mt-3">
        <div className="lg:col-span-2" />
        <Col title={cols.outcomes} items={c.outcomes} accent="bg-wana-ochre/20 text-[#6e4d10]" />
        <ArrowConnector />
        <Col title={cols.impact} items={c.impact} accent="bg-wana-terracotta/15 text-wana-terracotta" />
      </div>

      <div className="mt-12 grid lg:grid-cols-2 gap-6">
        <div className="bg-wana-forest text-white rounded-md p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-10 w-10 rounded-md bg-white/10 flex items-center justify-center"><Sprout className="h-5 w-5" /></div>
            <div className="font-heading font-bold text-lg">SDG 15 — Life on Land</div>
          </div>
          <p className="text-white/85 leading-relaxed">{t('landing.sdg_15')}</p>
        </div>
        <div className="bg-wana-ochre text-white rounded-md p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-10 w-10 rounded-md bg-white/10 flex items-center justify-center"><Scale className="h-5 w-5" /></div>
            <div className="font-heading font-bold text-lg">SDG 16 — Peace & Justice</div>
          </div>
          <p className="text-white/90 leading-relaxed">{t('landing.sdg_16')}</p>
        </div>
      </div>

      <div className="mt-10 bg-white border border-wana-border rounded-md p-6 max-w-3xl">
        <h2 className="font-heading font-bold text-xl text-wana-ink">{t('theory.governance_title')}</h2>
        <p className="mt-3 text-wana-soil leading-relaxed">{t('theory.governance_text')}</p>
      </div>
    </div>
  );
}

const ArrowConnector = () => (
  <div className="hidden lg:flex items-center justify-center">
    <ArrowRight className="h-6 w-6 text-wana-moss" />
  </div>
);
