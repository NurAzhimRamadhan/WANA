import React from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';

/**
 * Global cinematic forest ambience that sits BEHIND every page.
 * - Soft layered gradient (deep forest → cream beige)
 * - Drifting fog blobs (parallax with scroll)
 * - Floating particles
 * - Subtle grain
 * Designed to NEVER hurt readability — opacity ≤ 0.5 on content area.
 */
export default function ForestAmbience({ variant = 'light' }) {
  const { scrollY } = useScroll();
  const yFog = useTransform(scrollY, [0, 1200], [0, -160]);
  const yBlob = useTransform(scrollY, [0, 1200], [0, -80]);

  const isDark = variant === 'dark';

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* Base gradient */}
      <div
        className={isDark ? 'absolute inset-0 bg-forest-radial' : 'absolute inset-0'}
        style={isDark ? undefined : {
          background:
            'radial-gradient(at 20% 5%, rgba(111, 191, 139, 0.10) 0%, transparent 40%),' +
            'radial-gradient(at 90% 30%, rgba(212, 154, 54, 0.06) 0%, transparent 45%),' +
            'radial-gradient(at 30% 95%, rgba(28, 63, 43, 0.06) 0%, transparent 55%),' +
            'linear-gradient(180deg, #F7F5F0 0%, #F3EFE4 60%, #EEEADC 100%)',
        }}
      />

      {/* Layered fog blobs */}
      <motion.div
        style={{ y: yFog }}
        className={`absolute -top-32 left-[-10%] h-[55vh] w-[55vh] rounded-full blur-3xl ${
          isDark ? 'bg-wana-glow/15' : 'bg-wana-moss/15'
        }`}
      />
      <motion.div
        style={{ y: yBlob }}
        className={`absolute top-1/3 right-[-15%] h-[60vh] w-[60vh] rounded-full blur-3xl ${
          isDark ? 'bg-wana-forest/40' : 'bg-wana-gold/8'
        }`}
      />
      <motion.div
        style={{ y: yFog }}
        className={`absolute bottom-[-20%] left-[20%] h-[60vh] w-[60vh] rounded-full blur-3xl ${
          isDark ? 'bg-wana-glow/8' : 'bg-wana-moss/10'
        }`}
      />

      {/* Drifting particles */}
      <ParticleField dark={isDark} />

      {/* Grain */}
      <div className="absolute inset-0 grain" />

      {/* Bottom vignette */}
      <div
        className="absolute inset-x-0 bottom-0 h-40"
        style={{
          background: isDark
            ? 'linear-gradient(180deg, transparent, rgba(11, 20, 16, 0.85))'
            : 'linear-gradient(180deg, transparent, rgba(247, 245, 240, 0.6))',
        }}
      />
    </div>
  );
}

function ParticleField({ dark }) {
  const particles = React.useMemo(() => {
    const out = [];
    for (let i = 0; i < 22; i++) {
      out.push({
        left: Math.random() * 100,
        top: 60 + Math.random() * 40,
        size: 2 + Math.random() * 3,
        delay: Math.random() * 14,
        duration: 12 + Math.random() * 10,
      });
    }
    return out;
  }, []);

  return (
    <div className="absolute inset-0">
      {particles.map((p, i) => (
        <span
          key={i}
          className="absolute rounded-full drift-particle"
          style={{
            left: `${p.left}%`,
            top: `${p.top}%`,
            width: p.size,
            height: p.size,
            background: dark ? 'rgba(111, 191, 139, 0.7)' : 'rgba(28, 63, 43, 0.35)',
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            filter: 'blur(0.5px)',
          }}
        />
      ))}
    </div>
  );
}
