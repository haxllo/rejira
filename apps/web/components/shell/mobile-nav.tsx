'use client';

import * as React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { MenuIcon, XIcon } from '@/components/icons';
import { PrimaryNav } from './primary-nav';

export function MobileNavToggle() {
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
    return () => document.removeEventListener('keydown', close);
  }, [open]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex size-7 items-center justify-center rounded-md text-[var(--color-text-muted)] hover:bg-[var(--color-hover)] hover:text-[var(--color-text)] md:hidden"
        aria-label="Open navigation"
      >
        <MenuIcon size={16} />
      </button>
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              className="fixed inset-0 z-50 bg-[var(--color-overlay)] md:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.16 }}
              onClick={() => setOpen(false)}
            />
            <motion.aside
              className="fixed left-0 top-0 z-50 h-full md:hidden"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 380, damping: 36 }}
            >
              <div className="flex h-full">
                <PrimaryNav />
                <button
                  onClick={() => setOpen(false)}
                  className="flex size-10 items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                  aria-label="Close navigation"
                >
                  <XIcon size={16} />
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
