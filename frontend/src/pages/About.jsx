import React, { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Quote, Sprout, Eye, ShieldCheck, Sparkles, Compass } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { FadeUp, Reveal, RevealItem } from '@/components/motion-primitives';

const ABOUT_IMG = 'https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?w=2400&q=80&auto=format';

const Section = ({ icon: Icon, title, lead, children }) => (
  <FadeUp>
    <div className="grid lg:grid-cols-[1fr_2fr] gap-10 py-12 border-b border-wana-border/70 last:border-b-0">
      <div className="lg:sticky lg:top-24 lg:self-start">
        <div className="h-11 w-11 rounded-xl bg-wana-forest text-white flex items-center justify-center mb-4">
          {Icon ? <Icon className="h-5 w-5" /> : null}
        </div>
        <h2 className="font-display font-bold text-2xl sm:text-3xl text-wana-ink tracking-tight leading-tight">{title}</h2>
        {lead && <p className="mt-2 text-sm text-wana-moss font-semibold uppercase tracking-wider">{lead}</p>}
      </div>
      <div className="text-wana-soil text-[16px] leading-[1.75] max-w-2xl">{children}</div>
    </div>
  </FadeUp>
);

export default function About() {
  const { t, lang } = useLanguage();
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const yImg = useTransform(scrollYProgress, [0, 1], ['0%', '18%']);
  const yText = useTransform(scrollYProgress, [0, 1], ['0%', '-15%']);

  return (
    <div>
      {/* Cinematic emotional hero */}
      <section ref={heroRef} className="relative h-[80vh] min-h-[560px] overflow-hidden">
        <motion.div style={{ y: yImg }} className="absolute inset-0 scale-110">
          <img src={ABOUT_IMG} alt="" className="w-full h-full object-cover" />
        </motion.div>
        <div className="absolute inset-0 fog-veil" />
        <div className="absolute inset-0 grain" />
        <motion.div
          style={{ y: yText }}
          className="relative h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col justify-center"
        >
          <FadeUp y={20}>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass-dark text-[11px] font-semibold text-wana-glow tracking-[0.2em] uppercase">
              <Compass className="h-3.5 w-3.5" /> {lang === 'id' ? 'Sebuah Infrastruktur Hak' : 'A Rights Infrastructure'}
            </div>
          </FadeUp>
          <FadeUp delay={0.15}>
            <h1 className="mt-6 font-display font-bold text-5xl sm:text-7xl text-white tracking-tight leading-[1.02] text-shadow-soft max-w-4xl">
              {t('about.title')}
            </h1>
          </FadeUp>
          <FadeUp delay={0.3}>
            <p className="mt-7 text-white/85 text-lg sm:text-xl leading-relaxed max-w-2xl text-shadow-soft">
              {t('about.lead')}
            </p>
          </FadeUp>
        </motion.div>
      </section>

      {/* Pull quote */}
      <section className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32 text-center">
        <FadeUp>
          <Quote className="h-10 w-10 text-wana-gold mx-auto mb-6 opacity-70" />
          <p className="font-display text-2xl sm:text-3xl lg:text-4xl text-wana-ink leading-[1.3] tracking-tight max-w-4xl mx-auto">
            {lang === 'id'
              ? 'Komunitas adat tidak kehilangan hak karena tidak memilikinya — mereka kehilangan hak karena mengetahuinya terlambat.'
              : 'Indigenous communities do not lose rights because they lack them — they lose them because they learn too late.'}
          </p>
          <div className="mt-6 text-sm text-wana-soil tracking-wider uppercase">{lang === 'id' ? 'Filosofi pendiri WANA' : 'WANA founding philosophy'}</div>
        </FadeUp>
      </section>

      {/* Sections */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <Section icon={Eye} title={t('about.vision_title')} lead={lang === 'id' ? 'Visi' : 'Vision'}>
          {t('about.vision')}
        </Section>
        <Section icon={Sparkles} title={t('about.mission_title')} lead={lang === 'id' ? 'Misi' : 'Mission'}>
          {t('about.mission')}
        </Section>
        <Section icon={ShieldCheck} title={t('about.why_fail_title')}>
          {t('about.why_fail')}
        </Section>
        <Section icon={Compass} title={t('about.philosophy_title')}>
          {t('about.philosophy')}
        </Section>
        <Section icon={Sprout} title={t('about.governance_title')}>
          {t('about.governance')}
        </Section>
        <Section icon={Sparkles} title={t('about.preventive_title')}>
          {t('about.preventive')}
        </Section>
      </section>

      {/* Conflict story strip */}
      <section className="relative overflow-hidden bg-wana-forest text-white">
        <div className="absolute inset-0 bg-forest-radial opacity-90" />
        <div className="absolute inset-0 grain opacity-60" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <FadeUp>
            <h2 className="font-display font-bold text-3xl sm:text-4xl tracking-tight leading-[1.1] max-w-3xl text-shadow-soft text-white">
              {lang === 'id' ? 'Konflik nyata, bukan abstraksi.' : 'Real conflicts, not abstractions.'}
            </h2>
            <p className="mt-4 text-white/75 max-w-2xl">
              {lang === 'id'
                ? 'WANA dirancang dari pelajaran-pelajaran lapangan: tambang nikel di Konawe, sawit di Kapuas, food estate di Halmahera, infrastruktur strategis di Papua. Setiap titik konflik adalah komunitas yang seharusnya bisa merespons lebih cepat.'
                : 'WANA is built on field-tested lessons: nickel mining in Konawe, palm oil in Kapuas, food estate in Halmahera, strategic projects in Papua. Every flashpoint is a community that should have been able to respond sooner.'}
            </p>
          </FadeUp>
          <Reveal className="mt-10 grid sm:grid-cols-3 gap-4">
            {[
              { region: 'Sulawesi Tenggara', label: 'Tolaki Mekongga', issue: lang === 'id' ? 'Pertambangan nikel' : 'Nickel mining' },
              { region: 'Kalimantan Tengah', label: 'Dayak Ngaju', issue: lang === 'id' ? 'Pelepasan kawasan sawit' : 'Palm oil release' },
              { region: 'Papua Barat', label: 'Suku Moi', issue: lang === 'id' ? 'Perubahan APL 54.000 ha' : '54,000 ha APL change' },
            ].map((c, i) => (
              <RevealItem key={i}>
                <div className="glass-dark rounded-xl p-5 ring-1 ring-white/10 hover-lift">
                  <div className="text-[11px] uppercase tracking-[0.2em] text-wana-glow font-semibold">{c.region}</div>
                  <div className="mt-2 font-display font-bold text-xl text-white">{c.label}</div>
                  <div className="mt-2 text-sm text-white/70">{c.issue}</div>
                </div>
              </RevealItem>
            ))}
          </Reveal>
        </div>
      </section>
    </div>
  );
}
