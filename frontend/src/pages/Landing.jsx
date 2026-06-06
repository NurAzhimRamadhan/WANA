import React from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'framer-motion';
import {
  ArrowRight, Bell, FileText, Sprout, Scale, ShieldCheck,
  Clock, Globe, TrendingUp, Eye, Sparkles,
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { WANA } from '@/constants/testIds/wana';
import { FadeUp, Reveal, RevealItem } from '@/components/motion-primitives';
import { useEffect, useState, useRef } from 'react';
import { api } from '@/lib/api';

const HERO_IMG = 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=2400&q=80&auto=format';

export default function Landing() {
  const { t, lang } = useLanguage();
  const problems = t('landing.problem_items');
  const values = t('landing.value_items');
  const journey = t('landing.journey_steps');
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const yImage = useTransform(scrollYProgress, [0, 1], ['0%', '20%']);
  const yText = useTransform(scrollYProgress, [0, 1], ['0%', '-12%']);
  const opacityHero = useTransform(scrollYProgress, [0, 0.85], [1, 0.25]);

  const [stats, setStats] = useState({
    regulations_total: 0, territories_total: 0, communities_total: 0, conflicts_total: 0, critical_risk: 0,
  });
  useEffect(() => {
    api.get('/dashboard/summary').then(({ data }) => setStats(data)).catch(() => {});
  }, []);

  return (
    <div>
      {/* HERO — Cinematic */}
      <section ref={heroRef} className="relative h-[100vh] min-h-[640px] overflow-hidden">
        <motion.div style={{ y: yImage }} className="absolute inset-0 scale-110">
          <img src={HERO_IMG} alt="" className="w-full h-full object-cover" loading="eager" />
        </motion.div>
        <div className="absolute inset-0 fog-veil" />
        <div className="absolute inset-0 grain" />
        {/* atmospheric glow blobs */}
        <div className="absolute -top-20 -left-20 h-[60vh] w-[60vh] rounded-full blur-3xl bg-wana-glow/15" />
        <div className="absolute bottom-0 right-0 h-[55vh] w-[55vh] rounded-full blur-3xl bg-wana-gold/8" />

        <motion.div
          style={{ y: yText, opacity: opacityHero }}
          className="relative h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col justify-center"
        >
          <FadeUp y={20} delay={0.05}>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass-dark text-[11px] font-semibold text-wana-glow tracking-[0.18em] uppercase">
              <Sprout className="h-3.5 w-3.5" />
              {t('landing.eyebrow')}
            </div>
          </FadeUp>
          <FadeUp delay={0.18}>
            <h1 className="mt-6 font-display font-bold text-4xl sm:text-6xl lg:text-7xl text-white leading-[1.02] tracking-tight text-shadow-soft max-w-5xl">
              {t('landing.hero_title')}
            </h1>
          </FadeUp>
          <FadeUp delay={0.32}>
            <p className="mt-7 text-white/85 text-lg sm:text-xl leading-relaxed max-w-2xl text-shadow-soft">
              {t('landing.hero_sub')}
            </p>
          </FadeUp>
          <FadeUp delay={0.45}>
            <div className="mt-10 flex flex-wrap gap-3">
              <Link
                to="/monitor"
                data-testid={WANA.landing.heroCta}
                className="btn-gloss inline-flex items-center gap-2 px-6 py-3.5 rounded-full bg-white text-wana-forest font-semibold text-sm hover-lift glow-forest"
              >
                {t('landing.cta_monitor')} <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/brief"
                data-testid={WANA.landing.heroCtaBrief}
                className="btn-gloss inline-flex items-center gap-2 px-6 py-3.5 rounded-full bg-wana-gold text-white font-semibold text-sm hover-lift glow-gold"
              >
                {t('landing.cta_brief')} <FileText className="h-4 w-4" />
              </Link>
              <Link
                to="/alerts"
                data-testid={WANA.landing.heroCtaAlerts}
                className="btn-gloss inline-flex items-center gap-2 px-6 py-3.5 rounded-full glass-dark text-white font-semibold text-sm hover-lift ring-1 ring-white/20"
              >
                {t('landing.cta_alerts')} <Bell className="h-4 w-4" />
              </Link>
            </div>
          </FadeUp>

          {/* floating stat strip */}
          <FadeUp delay={0.65}>
            <div className="mt-16 hidden md:grid grid-cols-4 gap-4 max-w-3xl">
              <StatChip icon={Globe} value={stats.regulations_total} label={lang === 'id' ? 'Regulasi terpantau' : 'Regulations tracked'} />
              <StatChip icon={ShieldCheck} value={stats.territories_total} label={lang === 'id' ? 'Wilayah adat' : 'Territories'} />
              <StatChip icon={TrendingUp} value={stats.conflicts_total} label={lang === 'id' ? 'Konflik tercatat' : 'Conflicts'} />
              <StatChip icon={Eye} value={stats.critical_risk} label={lang === 'id' ? 'Risiko kritis' : 'Critical risk'} accent="terracotta" />
            </div>
          </FadeUp>
        </motion.div>

        {/* scroll cue */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.6 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/70 text-[11px] uppercase tracking-[0.25em] flex flex-col items-center gap-2"
        >
          <span>scroll</span>
          <span className="h-8 w-[1px] bg-gradient-to-b from-white/60 to-transparent" />
        </motion.div>
      </section>

      {/* PROBLEM */}
      <section className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
        <FadeUp>
          <div className="max-w-3xl">
            <div className="text-[11px] uppercase tracking-[0.25em] font-semibold text-wana-moss">
              {lang === 'id' ? 'Asimetri Informasi' : 'Information Asymmetry'}
            </div>
            <h2 className="mt-4 font-display font-bold text-4xl sm:text-5xl text-wana-ink tracking-tight leading-[1.05]">
              {t('landing.problem_title')}
            </h2>
            <p className="mt-5 text-wana-soil text-lg leading-relaxed">{t('landing.problem_lead')}</p>
          </div>
        </FadeUp>

        <Reveal className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-6">
          {problems.map((p, i) => (
            <RevealItem key={i}>
              <div className="group relative glass-light hover-lift rounded-2xl p-7 h-full">
                <div className="h-11 w-11 rounded-xl bg-wana-forest text-white flex items-center justify-center mb-5 group-hover:scale-105 transition-transform">
                  <Clock className="h-5 w-5" />
                </div>
                <h3 className="font-display font-semibold text-xl text-wana-ink">{p.t}</h3>
                <p className="mt-2.5 text-[15px] text-wana-soil leading-relaxed">{p.d}</p>
                <span className="absolute -top-px left-6 right-6 h-px bg-gradient-to-r from-transparent via-wana-moss/60 to-transparent" />
              </div>
            </RevealItem>
          ))}
        </Reveal>
      </section>

      {/* VALUE — Dark cinematic band */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-forest-radial" />
        <div className="absolute inset-0 grain opacity-60" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32 text-white">
          <div className="grid lg:grid-cols-2 gap-14 items-start">
            <FadeUp>
              <div>
                <div className="text-[11px] uppercase tracking-[0.25em] font-semibold text-wana-glow">
                  {lang === 'id' ? 'Solusi' : 'Solution'}
                </div>
                <h2 className="mt-4 font-display font-bold text-4xl sm:text-5xl tracking-tight leading-[1.05] text-shadow-soft text-white">
                  {t('landing.value_title')}
                </h2>
                <p className="mt-5 text-white/75 text-lg leading-relaxed">{t('landing.value_lead')}</p>
                <div className="mt-8 inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass-dark text-[11px] font-semibold text-wana-glow tracking-wider uppercase">
                  <Sparkles className="h-3.5 w-3.5" /> Powered by WANA AI · Real-time monitoring
                </div>
              </div>
            </FadeUp>
            <Reveal className="space-y-3">
              {values.map((v, i) => {
                const Icon = [ShieldCheck, FileText, Bell][i] || ShieldCheck;
                return (
                  <RevealItem key={i}>
                    <div className="group relative glass-dark hover-lift rounded-2xl p-6 ring-1 ring-white/10">
                      <div className="flex gap-5">
                        <div className="h-12 w-12 shrink-0 rounded-xl bg-gradient-to-br from-wana-glow/30 to-wana-forest text-white flex items-center justify-center ring-1 ring-white/15">
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="font-display font-semibold text-xl text-white">{v.t}</h3>
                          <p className="mt-2 text-[15px] text-white/72 leading-relaxed">{v.d}</p>
                        </div>
                      </div>
                    </div>
                  </RevealItem>
                );
              })}
            </Reveal>
          </div>
        </div>
      </section>

      {/* JOURNEY */}
      <section className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
        <FadeUp>
          <h2 className="font-display font-bold text-4xl sm:text-5xl text-wana-ink tracking-tight leading-[1.05] max-w-3xl">
            {t('landing.journey_title')}
          </h2>
        </FadeUp>
        <Reveal className="mt-14 grid grid-cols-1 md:grid-cols-5 gap-4 relative">
          {/* connector line desktop */}
          <div className="absolute top-12 left-[10%] right-[10%] h-px bg-gradient-to-r from-transparent via-wana-moss/40 to-transparent hidden md:block" />
          {journey.map((step, i) => (
            <RevealItem key={i}>
              <div className="relative glass-light hover-lift rounded-2xl p-5 h-full">
                <div className="flex items-center gap-2.5 mb-3">
                  <span className="h-8 w-8 rounded-full bg-wana-forest text-white text-sm font-display font-bold flex items-center justify-center">
                    {i + 1}
                  </span>
                  <span className="text-[11px] uppercase tracking-[0.2em] font-semibold text-wana-moss">
                    {lang === 'id' ? 'Langkah' : 'Step'}
                  </span>
                </div>
                <p className="text-[14px] text-wana-ink leading-relaxed">{step}</p>
              </div>
            </RevealItem>
          ))}
        </Reveal>
      </section>

      {/* SDG */}
      <section className="relative overflow-hidden bg-wana-forest text-white">
        <div className="absolute inset-0 bg-forest-radial opacity-90" />
        <div className="absolute inset-0 grain opacity-60" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
          <FadeUp>
            <h2 className="font-display font-bold text-4xl sm:text-5xl tracking-tight leading-[1.05] max-w-3xl text-shadow-soft text-white">
              {t('landing.sdg_title')}
            </h2>
          </FadeUp>
          <div className="mt-12 grid md:grid-cols-2 gap-6">
            <FadeUp delay={0.05}>
              <div className="glass-dark rounded-2xl p-8 ring-1 ring-white/10 hover-lift">
                <div className="flex items-center gap-3.5">
                  <div className="h-12 w-12 rounded-xl bg-wana-moss/30 ring-1 ring-wana-glow/30 flex items-center justify-center">
                    <Sprout className="h-5 w-5 text-wana-glow" />
                  </div>
                  <div className="font-display font-bold text-xl">SDG 15</div>
                </div>
                <p className="mt-5 text-white/80 leading-relaxed text-[15px]">{t('landing.sdg_15')}</p>
              </div>
            </FadeUp>
            <FadeUp delay={0.15}>
              <div className="glass-dark rounded-2xl p-8 ring-1 ring-white/10 hover-lift">
                <div className="flex items-center gap-3.5">
                  <div className="h-12 w-12 rounded-xl bg-wana-gold/30 ring-1 ring-wana-gold/40 flex items-center justify-center">
                    <Scale className="h-5 w-5 text-wana-gold" />
                  </div>
                  <div className="font-display font-bold text-xl">SDG 16</div>
                </div>
                <p className="mt-5 text-white/80 leading-relaxed text-[15px]">{t('landing.sdg_16')}</p>
              </div>
            </FadeUp>
          </div>
          <FadeUp delay={0.3}>
            <div className="mt-12">
              <Link to="/theory" className="inline-flex items-center gap-2 text-sm font-semibold text-wana-glow hover:gap-3 transition-all">
                {t('nav.theory')} <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </FadeUp>
        </div>
      </section>
    </div>
  );
}

function StatChip({ icon: Icon, value, label, accent = 'glow' }) {
  const accentColor = accent === 'terracotta' ? 'text-wana-terracotta' : 'text-wana-glow';
  return (
    <div className="glass-dark rounded-xl px-4 py-3 ring-1 ring-white/10">
      <div className="flex items-center gap-2 text-white/65 text-[10px] uppercase tracking-wider font-semibold">
        <Icon className={`h-3.5 w-3.5 ${accentColor}`} />
        <span className="truncate">{label}</span>
      </div>
      <div className="mt-1 font-display font-bold text-white text-2xl">{value}</div>
    </div>
  );
}
