'use client';

import { motion } from 'motion/react';

export function SessionLoadingSkeleton() {
  return (
    <div className="flex h-dvh items-center justify-center bg-[var(--color-bg)]">
      <motion.div
        className="flex flex-col items-center gap-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.15 }}
      >
        <motion.div
          className="size-10 rounded-lg bg-[var(--color-surface-2)]"
          animate={{ opacity: [0.4, 0.8, 0.4] }}
          transition={{
            duration: 1.6,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
        <motion.div
          className="h-2.5 w-24 rounded bg-[var(--color-surface-2)]"
          animate={{ opacity: [0.3, 0.7, 0.3] }}
          transition={{
            duration: 1.6,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: 0.2,
          }}
        />
      </motion.div>
    </div>
  );
}
