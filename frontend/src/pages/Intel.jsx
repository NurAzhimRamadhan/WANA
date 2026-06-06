import React, { useEffect, useState } from 'react';
import { Newspaper, Flame, Search, ExternalLink, AlertTriangle, Users } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { api } from '@/lib/api';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { RiskBadge } from '@/components/ImpactBadge';

const CATEGORIES = [
  'tambang', 'sawit', 'hti', 'konservasi', 'psn',
  'food_estate', 'geothermal', 'hutan_lindung', 'perhutanan_sosial', 'infrastruktur',
];
const RISKS = ['rendah', 'sedang', 'tinggi', 'kritis'];

const CONFLICT_STATUS_COLOR = {
  aktif: 'bg-[#B75D46]/10 text-[#B75D46]',
  litigasi: 'bg-[#D49A36]/15 text-[#8a6118]',
  mediasi: 'bg-[#5A7A85]/12 text-[#395461]',
  deeskalasi: 'bg-[#4A6B53]/12 text-[#4A6B53]',
  tertunda: 'bg-[#5A7A85]/10 text-[#395461]',
};

export default function Intel() {
  const { t, lang } = useLanguage();
  const [tab, setTab] = useState('news');
  const [news, setNews] = useState([]);
  const [conflicts, setConflicts] = useState([]);
  const [regions, setRegions] = useState([]);
  const [region, setRegion] = useState('all');
  const [category, setCategory] = useState('all');
  const [risk, setRisk] = useState('all');
  const [q, setQ] = useState('');

  useEffect(() => {
    (async () => {
      const { data } = await api.get('/regulations/meta/regions');
      setRegions(data.regions || []);
    })();
  }, []);

  useEffect(() => {
    (async () => {
      if (tab === 'news') {
        const params = {};
        if (region !== 'all') params.region = region;
        if (category !== 'all') params.category = category;
        if (q) params.q = q;
        const { data } = await api.get('/news', { params });
        setNews(data);
      } else {
        const params = {};
        if (region !== 'all') params.region = region;
        if (risk !== 'all') params.risk = risk;
        if (q) params.q = q;
        const { data } = await api.get('/conflicts', { params });
        setConflicts(data);
      }
    })();
  }, [tab, region, category, risk, q]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8">
        <div className="text-[11px] uppercase tracking-[0.25em] font-semibold text-wana-moss">Context layer</div>
        <h1 className="mt-2 font-display font-bold text-4xl sm:text-5xl tracking-tight text-wana-ink leading-[1.05]">{t('intel.title')}</h1>
        <p className="mt-3 text-wana-soil max-w-3xl text-[16px] leading-relaxed">{t('intel.sub')}</p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-white border border-wana-border h-auto p-1">
          <TabsTrigger value="news" data-testid="intel-tab-news" className="data-[state=active]:bg-wana-forest data-[state=active]:text-white px-4 py-2 text-sm font-semibold">
            <Newspaper className="h-4 w-4 mr-2" /> {t('intel.tab_news')}
          </TabsTrigger>
          <TabsTrigger value="conflicts" data-testid="intel-tab-conflicts" className="data-[state=active]:bg-wana-forest data-[state=active]:text-white px-4 py-2 text-sm font-semibold">
            <Flame className="h-4 w-4 mr-2" /> {t('intel.tab_conflicts')}
          </TabsTrigger>
        </TabsList>

        {/* filters */}
        <div className="mt-5 bg-white border border-wana-border rounded-md p-4 flex flex-col lg:flex-row gap-3 lg:items-center">
          <div className="flex-1 relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-wana-soil" />
            <Input
              data-testid="intel-search"
              placeholder={tab === 'news' ? t('intel.search_ph_news') : t('intel.search_ph_conflicts')}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pl-9 bg-wana-bg border-wana-border"
            />
          </div>
          <Select value={region} onValueChange={setRegion}>
            <SelectTrigger className="w-full lg:w-52 bg-wana-bg border-wana-border">
              <SelectValue placeholder={t('common.region')} />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              <SelectItem value="all">{t('common.all')} — {t('common.region')}</SelectItem>
              {regions.map((r) => (<SelectItem key={r} value={r}>{r}</SelectItem>))}
            </SelectContent>
          </Select>
          {tab === 'news' ? (
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-full lg:w-52 bg-wana-bg border-wana-border">
                <SelectValue placeholder={t('monitor.filter_category')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('common.all')} — {t('monitor.filter_category')}</SelectItem>
                {CATEGORIES.map((c) => (<SelectItem key={c} value={c}>{t(`category.${c}`)}</SelectItem>))}
              </SelectContent>
            </Select>
          ) : (
            <Select value={risk} onValueChange={setRisk}>
              <SelectTrigger className="w-full lg:w-52 bg-wana-bg border-wana-border">
                <SelectValue placeholder={t('monitor.filter_risk')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('common.all')} — {t('monitor.filter_risk')}</SelectItem>
                {RISKS.map((r) => (<SelectItem key={r} value={r}>{t(`risk.${r}`)}</SelectItem>))}
              </SelectContent>
            </Select>
          )}
        </div>

        <TabsContent value="news" className="mt-6">
          {news.length === 0 ? (
            <div className="bg-white border border-wana-border rounded-md p-8 text-center text-wana-soil">{t('intel.news_empty')}</div>
          ) : (
            <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="intel-news-list">
              {news.map((n) => (
                <li key={n.id} className="bg-white border border-wana-border rounded-md p-5 hover:border-wana-moss/50 hover:shadow-sm transition-all" data-testid={`intel-news-${n.id}`}>
                  <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider font-semibold text-wana-moss">
                    <Newspaper className="h-3 w-3" /> {n.source}
                  </div>
                  <h3 className="mt-2 font-heading font-semibold text-wana-ink leading-snug">{lang === 'id' ? n.title_id : n.title_en}</h3>
                  <p className="mt-2 text-xs text-wana-soil leading-relaxed line-clamp-3">{lang === 'id' ? n.summary_id : n.summary_en}</p>
                  <div className="mt-3 flex items-center justify-between text-[11px] text-wana-soil">
                    <span>{n.region} · {n.date_published}</span>
                    <span className="px-2 py-0.5 rounded bg-wana-forest/10 text-wana-forest font-semibold">{t(`category.${n.category}`)}</span>
                  </div>
                  <a href={n.url} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-wana-forest hover:underline">
                    {lang === 'id' ? 'Buka sumber' : 'Open source'} <ExternalLink className="h-3 w-3" />
                  </a>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="conflicts" className="mt-6">
          {conflicts.length === 0 ? (
            <div className="bg-white border border-wana-border rounded-md p-8 text-center text-wana-soil">{t('intel.conflicts_empty')}</div>
          ) : (
            <ul className="space-y-4" data-testid="intel-conflicts-list">
              {conflicts.map((c) => {
                const statusCls = CONFLICT_STATUS_COLOR[c.status] || CONFLICT_STATUS_COLOR.aktif;
                return (
                  <li key={c.id} className="bg-white border border-wana-border rounded-md p-5" data-testid={`intel-conflict-${c.id}`}>
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-heading font-semibold text-wana-ink leading-snug">{lang === 'id' ? c.title_id : c.title_en}</h3>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px]">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider ${statusCls}`}>{c.status}</span>
                          <RiskBadge level={c.risk_level} />
                          <span className="text-wana-soil">{t('intel.conflict_started')}: {c.started_at}</span>
                          {c.casualties_reported > 0 && (
                            <span className="text-wana-terracotta inline-flex items-center gap-1 font-semibold">
                              <AlertTriangle className="h-3 w-3" /> {c.casualties_reported} {t('intel.conflict_casualties').toLowerCase()}
                            </span>
                          )}
                        </div>
                        <p className="mt-2 text-sm text-wana-soil leading-relaxed">{lang === 'id' ? c.summary_id : c.summary_en}</p>
                        <div className="mt-3 grid sm:grid-cols-2 gap-3 text-xs">
                          <div className="p-2.5 rounded-md bg-wana-bg border border-wana-border">
                            <div className="font-semibold text-wana-moss uppercase tracking-wider text-[10px] mb-1 flex items-center gap-1"><Users className="h-3 w-3" /> {c.community} · {c.region}</div>
                            <div className="text-wana-ink">{t('intel.conflict_related')}: <span className="font-mono">{c.regulation_number}</span></div>
                          </div>
                          <div className="p-2.5 rounded-md bg-wana-forest/5 border border-wana-forest/20">
                            <div className="font-semibold text-wana-forest uppercase tracking-wider text-[10px] mb-1">{t('intel.conflict_mitigation')}</div>
                            <div className="text-wana-ink">{lang === 'id' ? c.mitigation_id : c.mitigation_en}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
