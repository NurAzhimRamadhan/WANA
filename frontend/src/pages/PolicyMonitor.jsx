import React, { useEffect, useState } from 'react';
import { Search, ExternalLink, RefreshCcw, Lightbulb } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { api } from '@/lib/api';
import { ImpactBadge, RiskBadge } from '@/components/ImpactBadge';
import { WANA } from '@/constants/testIds/wana';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

const CATEGORIES = [
  'tambang', 'sawit', 'hti', 'konservasi', 'psn',
  'food_estate', 'geothermal', 'hutan_lindung', 'perhutanan_sosial', 'infrastruktur',
];
const RISKS = ['rendah', 'sedang', 'tinggi', 'kritis'];
const STATUSES = ['safe', 'under_review', 'potential_impact', 'confirmed_impact'];

export default function PolicyMonitor() {
  const { t, lang } = useLanguage();
  const [items, setItems] = useState([]);
  const [regions, setRegions] = useState([]);
  const [q, setQ] = useState('');
  const [region, setRegion] = useState('all');
  const [status, setStatus] = useState('all');
  const [category, setCategory] = useState('all');
  const [risk, setRisk] = useState('all');
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = {};
      if (q) params.q = q;
      if (region !== 'all') params.region = region;
      if (status !== 'all') params.status = status;
      if (category !== 'all') params.category = category;
      if (risk !== 'all') params.risk = risk;
      const { data } = await api.get('/regulations', { params });
      setItems(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      const { data } = await api.get('/regulations/meta/regions');
      setRegions(data.regions || []);
    })();
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const id = setTimeout(fetchData, 300);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, region, status, category, risk]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8 flex items-end justify-between gap-4 flex-wrap">
        <div>
          <div className="text-[11px] uppercase tracking-[0.25em] font-semibold text-wana-moss">Policy Intelligence</div>
          <h1 className="mt-2 font-display font-bold text-4xl sm:text-5xl tracking-tight text-wana-ink leading-[1.05]">{t('monitor.title')}</h1>
          <p className="mt-3 text-wana-soil max-w-3xl text-[16px] leading-relaxed">{t('monitor.sub')}</p>
        </div>
        <div className="glass-light px-3 py-2 rounded-full text-xs text-wana-soil">
          {t('monitor.showing')} <span className="font-bold text-wana-forest">{items.length}</span> {t('monitor.of')} <span className="font-bold">{items.length}</span> {t('monitor.result_label')}
        </div>
      </div>

      <div className="sticky top-16 z-20 glass-cream rounded-2xl p-4 sm:p-5 mb-6 flex flex-col gap-3 glow-forest">
        <div className="flex flex-col lg:flex-row gap-3 lg:items-center">
          <div className="flex-1 relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-wana-soil" />
            <Input
              data-testid={WANA.monitor.searchInput}
              placeholder={t('monitor.search_ph')}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pl-9 bg-white/70 border-wana-border/60 focus-visible:ring-wana-forest/30"
            />
          </div>
          <Button
            data-testid={WANA.monitor.refreshBtn}
            onClick={fetchData}
            variant="outline"
            className="border-wana-border bg-white/70 text-wana-ink hover:bg-white"
          >
            <RefreshCcw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> {t('common.search')}
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Select value={region} onValueChange={setRegion}>
            <SelectTrigger data-testid={WANA.monitor.regionSelect} className="bg-white/70 border-wana-border/60">
              <SelectValue placeholder={t('common.region')} />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              <SelectItem value="all">{t('common.all')} — {t('common.region')}</SelectItem>
              {regions.map((r) => (<SelectItem key={r} value={r}>{r}</SelectItem>))}
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger data-testid={WANA.monitor.statusSelect} className="bg-white/70 border-wana-border/60">
              <SelectValue placeholder={t('common.status')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('common.all')} — {t('common.status')}</SelectItem>
              {STATUSES.map((s) => (<SelectItem key={s} value={s}>{t(`status.${s}`)}</SelectItem>))}
            </SelectContent>
          </Select>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger data-testid="monitor-category-select" className="bg-white/70 border-wana-border/60">
              <SelectValue placeholder={t('monitor.filter_category')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('common.all')} — {t('monitor.filter_category')}</SelectItem>
              {CATEGORIES.map((c) => (<SelectItem key={c} value={c}>{t(`category.${c}`)}</SelectItem>))}
            </SelectContent>
          </Select>
          <Select value={risk} onValueChange={setRisk}>
            <SelectTrigger data-testid="monitor-risk-select" className="bg-white/70 border-wana-border/60">
              <SelectValue placeholder={t('monitor.filter_risk')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('common.all')} — {t('monitor.filter_risk')}</SelectItem>
              {RISKS.map((r) => (<SelectItem key={r} value={r}>{t(`risk.${r}`)}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* desktop table */}
      <div className="hidden md:block glass-light rounded-2xl overflow-hidden" data-testid={WANA.monitor.table}>
        <table className="w-full text-sm">
          <thead className="bg-wana-forest/5 text-wana-ink backdrop-blur-sm">
            <tr className="text-left">
              <th className="px-4 py-3.5 font-display font-semibold text-[11px] uppercase tracking-wider">{t('monitor.col_number')}</th>
              <th className="px-4 py-3.5 font-display font-semibold text-[11px] uppercase tracking-wider">{t('monitor.col_title')}</th>
              <th className="px-4 py-3.5 font-display font-semibold text-[11px] uppercase tracking-wider">{t('monitor.col_region')}</th>
              <th className="px-4 py-3.5 font-display font-semibold text-[11px] uppercase tracking-wider">{t('monitor.filter_category')}</th>
              <th className="px-4 py-3.5 font-display font-semibold text-[11px] uppercase tracking-wider">{t('monitor.col_status')}</th>
              <th className="px-4 py-3.5 font-display font-semibold text-[11px] uppercase tracking-wider">{t('monitor.filter_risk')}</th>
              <th className="px-4 py-3.5 font-display font-semibold text-[11px] uppercase tracking-wider text-right">{t('monitor.col_date')}</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && !loading && (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-wana-soil">{t('monitor.empty')}</td></tr>
            )}
            {items.map((r) => (
              <tr key={r.id} className="border-t border-wana-border/50 hover:bg-wana-forest/4 transition-colors duration-200" data-testid={WANA.monitor.row(r.id)}>
                <td className="px-4 py-4 font-mono text-xs text-wana-soil whitespace-nowrap align-top">{r.number}</td>
                <td className="px-4 py-4 max-w-md align-top">
                  <div className="font-medium text-wana-ink leading-snug">{lang === 'id' ? r.title_id : r.title_en}</div>
                  <div className="text-xs text-wana-soil mt-1 line-clamp-2">{lang === 'id' ? r.summary_id : r.summary_en}</div>
                  {r.affected_territories?.length > 0 && (
                    <div className="mt-2 text-[11px] text-wana-moss font-semibold">
                      {t('monitor.affected')}: <span className="font-normal text-wana-soil">{r.affected_territories.join(', ')}</span>
                    </div>
                  )}
                  <div className="mt-2 text-[11px] text-wana-soil flex items-center gap-3 flex-wrap">
                    <span>{r.institution}</span>
                    <span>·</span>
                    <a href={r.document_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-wana-forest hover:underline">
                      {t('monitor.doc_link')} <ExternalLink className="h-3 w-3" />
                    </a>
                    {r.recommendation_id && (
                      <Popover>
                        <PopoverTrigger asChild>
                          <button type="button" data-testid={`monitor-rec-${r.id}`} className="inline-flex items-center gap-1 font-semibold text-wana-ochre hover:underline">
                            <Lightbulb className="h-3 w-3" /> {t('monitor.recommendation')}
                          </button>
                        </PopoverTrigger>
                        <PopoverContent side="top" align="start" className="w-80 bg-white border-wana-border text-sm leading-relaxed">
                          <div className="text-xs uppercase tracking-wider font-semibold text-wana-moss mb-1">{t('monitor.recommendation')}</div>
                          <div className="text-wana-ink">{lang === 'id' ? r.recommendation_id : r.recommendation_en}</div>
                          <div className="mt-2 text-[10px] text-wana-soil">{t('monitor.sumber')}: {r.sumber}</div>
                        </PopoverContent>
                      </Popover>
                    )}
                  </div>
                </td>
                <td className="px-4 py-4 text-wana-soil whitespace-nowrap align-top">{r.region}</td>
                <td className="px-4 py-4 align-top">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-wana-forest/10 text-wana-forest">
                    {t(`category.${r.category}`) || r.category}
                  </span>
                </td>
                <td className="px-4 py-4 align-top"><ImpactBadge status={r.impact_status} /></td>
                <td className="px-4 py-4 align-top">
                  <div className="flex flex-col gap-1.5">
                    <RiskBadge level={r.risk_level} score={r.risk_score} />
                    <div className="h-1 w-24 bg-wana-border rounded overflow-hidden">
                      <div
                        className={`h-full ${r.risk_level === 'kritis' ? 'bg-wana-terracotta' : r.risk_level === 'tinggi' ? 'bg-wana-ochre' : r.risk_level === 'sedang' ? 'bg-wana-river' : 'bg-wana-moss'}`}
                        style={{ width: `${r.risk_score || 0}%` }}
                      />
                    </div>
                    <div className="text-[10px] text-wana-soil">{t('monitor.confidence')}: {Math.round((r.confidence_score || 0) * 100)}%</div>
                  </div>
                </td>
                <td className="px-4 py-4 text-wana-soil text-xs whitespace-nowrap text-right align-top">{r.date_issued}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* mobile cards */}
      <div className="md:hidden space-y-3" data-testid={`${WANA.monitor.table}-mobile`}>
        {items.map((r) => (
          <div key={r.id} className="glass-light hover-lift rounded-2xl p-4" data-testid={`${WANA.monitor.row(r.id)}-mobile`}>
            <div className="flex items-start justify-between gap-3">
              <div className="font-mono text-xs text-wana-soil">{r.number}</div>
              <RiskBadge level={r.risk_level} score={r.risk_score} />
            </div>
            <div className="mt-2 font-semibold text-wana-ink leading-snug">{lang === 'id' ? r.title_id : r.title_en}</div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <ImpactBadge status={r.impact_status} />
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-wana-forest/10 text-wana-forest">{t(`category.${r.category}`)}</span>
            </div>
            <div className="mt-2 text-xs text-wana-soil leading-relaxed">{lang === 'id' ? r.summary_id : r.summary_en}</div>
            <div className="mt-3 text-[11px] text-wana-soil">{r.institution} · {r.region} · {r.date_issued}</div>
            {r.recommendation_id && (
              <div className="mt-3 p-2.5 rounded-md bg-wana-ochre/8 border border-wana-ochre/25 text-[12px] text-[#6e4d10]">
                <div className="font-semibold mb-0.5 flex items-center gap-1"><Lightbulb className="h-3 w-3" /> {t('monitor.recommendation')}</div>
                {lang === 'id' ? r.recommendation_id : r.recommendation_en}
              </div>
            )}
          </div>
        ))}
        {items.length === 0 && !loading && (
          <div className="bg-white border border-wana-border rounded-md p-6 text-center text-wana-soil">{t('monitor.empty')}</div>
        )}
      </div>
    </div>
  );
}
