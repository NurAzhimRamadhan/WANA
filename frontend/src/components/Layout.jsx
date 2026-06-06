import React, { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { Menu, X, Trees, ArrowUpRight } from 'lucide-react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import LanguageToggle from '@/components/LanguageToggle';
import NotificationCenter from '@/components/NotificationCenter';
import ForestAmbience from '@/components/ForestAmbience';
import { WANA } from '@/constants/testIds/wana';
import { Toaster } from '@/components/ui/sonner';

const navItems = [
  { to: '/monitor', key: 'monitor', testId: WANA.nav.monitor },
  { to: '/brief', key: 'brief', testId: WANA.nav.brief },
  { to: '/alerts', key: 'alerts', testId: WANA.nav.alerts },
  { to: '/spatial', key: 'spatial', testId: WANA.nav.spatial },
  { to: '/evidence', key: 'evidence', testId: WANA.nav.evidence },
  { to: '/intel', key: 'intel', testId: 'nav-intel' },
  { to: '/theory', key: 'theory', testId: WANA.nav.theory },
  { to: '/about', key: 'about', testId: WANA.nav.about },
  { to: '/contact', key: 'contact', testId: WANA.nav.contact },
];

export default function Layout() {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const loc = useLocation();
  const { scrollYProgress } = useScroll();
  const progressX = useTransform(scrollYProgress, [0, 1], ['0%', '100%']);

  useEffect(() => { setOpen(false); window.scrollTo({ top: 0, behavior: 'instant' }); }, [loc.pathname]);

  return (
    <div className="relative min-h-screen flex flex-col bg-wana-bg text-wana-ink">
      <ForestAmbience variant="light" />

      {/* scroll progress */}
      <motion.div
        style={{ scaleX: scrollYProgress, transformOrigin: '0% 50%' }}
        className="fixed top-0 left-0 right-0 z-50 h-[2px] bg-gradient-to-r from-wana-glow via-wana-moss to-wana-gold pointer-events-none"
      />

      {/* glass navbar */}
      <header className="sticky top-0 z-40 glass-cream border-b border-wana-border/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center gap-6">
          <Link to="/" data-testid={WANA.nav.home} className="group flex items-center gap-2.5 shrink-0">
            <span className="relative h-9 w-9 rounded-md bg-wana-forest text-white flex items-center justify-center overflow-hidden">
              <Trees className="h-5 w-5" strokeWidth={2} />
              <span className="absolute inset-0 bg-gradient-to-tr from-wana-glow/0 via-wana-glow/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            </span>
            <span className="font-display font-bold text-lg tracking-tight text-wana-ink">WANA</span>
          </Link>

          <nav className="hidden xl:flex items-center gap-0.5 ml-2">
            {navItems.map((item) => (
              <NavLink
                key={item.key}
                to={item.to}
                data-testid={item.testId}
                className={({ isActive }) =>
                  `relative px-3 py-2 rounded-md text-[13px] font-medium transition-all duration-300 ${
                    isActive
                      ? 'text-wana-forest'
                      : 'text-wana-soil hover:text-wana-forest'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <span>{t(`nav.${item.key}`)}</span>
                    {isActive && (
                      <motion.span
                        layoutId="navActive"
                        className="absolute inset-0 -z-10 rounded-md bg-wana-forest/8 ring-1 ring-wana-forest/15"
                        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                      />
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2.5">
            <NotificationCenter />
            <LanguageToggle />
            <button
              type="button"
              className="xl:hidden p-2 rounded-md border border-wana-border bg-white text-wana-ink hover:border-wana-forest/30 transition-colors"
              onClick={() => setOpen((o) => !o)}
              data-testid={WANA.nav.mobileMenu}
              aria-label="Toggle menu"
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="xl:hidden border-t border-wana-border glass-light"
          >
            <div className="px-4 py-3 flex flex-col gap-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.key}
                  to={item.to}
                  data-testid={`${item.testId}-mobile`}
                  className={({ isActive }) =>
                    `px-3 py-2.5 rounded-md text-sm font-medium ${
                      isActive ? 'bg-wana-forest text-white' : 'text-wana-ink hover:bg-wana-border/40'
                    }`
                  }
                >
                  {t(`nav.${item.key}`)}
                </NavLink>
              ))}
            </div>
          </motion.div>
        )}
      </header>

      <main className="relative flex-1">
        <Outlet />
      </main>

      {/* Cinematic footer */}
      <footer className="relative overflow-hidden">
        <div className="absolute inset-0 bg-forest-radial" />
        <div className="absolute inset-0 grain opacity-60" />
        {/* glow divider */}
        <div className="relative divider-glow" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 grid grid-cols-1 md:grid-cols-12 gap-10 text-white/85">
          <div className="md:col-span-5">
            <div className="flex items-center gap-3">
              <span className="h-9 w-9 rounded-md bg-white/10 ring-1 ring-white/15 flex items-center justify-center">
                <Trees className="h-5 w-5 text-wana-glow" />
              </span>
              <span className="font-display font-bold text-xl text-white">WANA</span>
              <span className="text-[11px] uppercase tracking-[0.2em] text-white/55 hidden sm:inline">
                Indigenous Governance Intelligence
              </span>
            </div>
            <p className="mt-5 max-w-md text-[15px] leading-relaxed text-white/75">
              {t('brand_full')} — {t('tagline')}
            </p>
            <div className="mt-7 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-wana-glow/12 ring-1 ring-wana-glow/30 text-[11px] font-semibold text-wana-glow tracking-wider uppercase">
              <span className="relative inline-flex h-2 w-2">
                <span className="absolute inset-0 rounded-full bg-wana-glow animate-ping opacity-60" />
                <span className="relative h-2 w-2 rounded-full bg-wana-glow" />
              </span>
              {t('nav.home') === 'Home' ? 'Monitoring active' : 'Monitoring aktif'}
            </div>
          </div>

          <div className="md:col-span-3 text-sm">
            <div className="font-display font-semibold text-white/95 mb-3">{t('nav.about')}</div>
            <ul className="space-y-2 text-white/65">
              <li><Link className="hover:text-white transition-colors inline-flex items-center gap-1" to="/about">{t('nav.about')} <ArrowUpRight className="h-3 w-3 opacity-0 group-hover:opacity-100" /></Link></li>
              <li><Link className="hover:text-white transition-colors" to="/theory">{t('nav.theory')}</Link></li>
              <li><Link className="hover:text-white transition-colors" to="/intel">{t('nav.intel')}</Link></li>
              <li><Link className="hover:text-white transition-colors" to="/contact">{t('nav.contact')}</Link></li>
            </ul>
          </div>
          <div className="md:col-span-4 text-sm">
            <div className="font-display font-semibold text-white/95 mb-3">Tools</div>
            <ul className="space-y-2 text-white/65 grid grid-cols-2 gap-x-4">
              <li><Link className="hover:text-white transition-colors" to="/monitor">{t('nav.monitor')}</Link></li>
              <li><Link className="hover:text-white transition-colors" to="/brief">{t('nav.brief')}</Link></li>
              <li><Link className="hover:text-white transition-colors" to="/alerts">{t('nav.alerts')}</Link></li>
              <li><Link className="hover:text-white transition-colors" to="/spatial">{t('nav.spatial')}</Link></li>
              <li><Link className="hover:text-white transition-colors" to="/evidence">{t('nav.evidence')}</Link></li>
            </ul>
          </div>
        </div>
        <div className="relative divider-glow opacity-50" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 text-[11px] text-white/45 flex flex-wrap items-center justify-between gap-3">
          <div>© {new Date().getFullYear()} WANA — Wilayah Adat Nusantara Accountability.</div>
          <div className="text-white/35">{t('landing.footer_note')}</div>
        </div>
      </footer>
      <Toaster richColors position="top-right" />
    </div>
  );
}
