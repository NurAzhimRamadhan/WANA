import React from 'react';
import { motion } from 'framer-motion';

/** Smooth fade-up with subtle blur-to-clear, premium easing. */
export const FadeUp = ({ children, delay = 0, y = 24, className = '', ...rest }) => (
  <motion.div
    initial={{ opacity: 0, y, filter: 'blur(8px)' }}
    whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
    viewport={{ once: true, margin: '-80px' }}
    transition={{ duration: 0.85, delay, ease: [0.2, 0.8, 0.2, 1] }}
    className={className}
    {...rest}
  >
    {children}
  </motion.div>
);

/** Stagger children reveal. */
export const Reveal = ({ children, stagger = 0.08, className = '', ...rest }) => (
  <motion.div
    initial="hidden"
    whileInView="show"
    viewport={{ once: true, margin: '-80px' }}
    variants={{
      hidden: {},
      show: { transition: { staggerChildren: stagger } },
    }}
    className={className}
    {...rest}
  >
    {children}
  </motion.div>
);

export const RevealItem = ({ children, className = '', y = 18, ...rest }) => (
  <motion.div
    variants={{
      hidden: { opacity: 0, y, filter: 'blur(6px)' },
      show: { opacity: 1, y: 0, filter: 'blur(0px)',
              transition: { duration: 0.7, ease: [0.2, 0.8, 0.2, 1] } },
    }}
    className={className}
    {...rest}
  >
    {children}
  </motion.div>
);
