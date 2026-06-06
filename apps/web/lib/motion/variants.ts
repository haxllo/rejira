import type { Transition, Variants } from "motion/react";

/**
 * Motion variants used across the app.
 * Spring physics only — no linear easings.
 */

const spring: Transition = {
  type: "spring",
  stiffness: 380,
  damping: 32,
  mass: 0.8,
};

const springSnap: Transition = {
  type: "spring",
  stiffness: 500,
  damping: 38,
  mass: 0.7,
};

const springBounce: Transition = {
  type: "spring",
  stiffness: 260,
  damping: 18,
  mass: 0.6,
};

/* -- Fade & slide --------------------------------------------------- */

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.16, ease: "easeOut" } },
  exit: { opacity: 0, transition: { duration: 0.1, ease: "easeIn" } },
};

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 6 },
  show: { opacity: 1, y: 0, transition: springSnap },
  exit: { opacity: 0, y: -4, transition: { duration: 0.12 } },
};

export const fadeDown: Variants = {
  hidden: { opacity: 0, y: -6 },
  show: { opacity: 1, y: 0, transition: springSnap },
  exit: { opacity: 0, y: -4, transition: { duration: 0.12 } },
};

export const fadeRight: Variants = {
  hidden: { opacity: 0, x: -8 },
  show: { opacity: 1, x: 0, transition: springSnap },
  exit: { opacity: 0, x: -4, transition: { duration: 0.12 } },
};

/* -- Drawer (right slide) ------------------------------------------- */

export const drawerSlide: Variants = {
  hidden: { x: "100%" },
  show: { x: 0, transition: spring },
  exit: { x: "100%", transition: { ...spring, stiffness: 300, damping: 30 } },
};

export const overlayFade: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.16 } },
  exit: { opacity: 0, transition: { duration: 0.12 } },
};

/* -- Popover (scale + fade) ----------------------------------------- */

export const popover: Variants = {
  hidden: { opacity: 0, scale: 0.96, y: -4 },
  show: { opacity: 1, scale: 1, y: 0, transition: springSnap },
  exit: { opacity: 0, scale: 0.97, y: -2, transition: { duration: 0.1 } },
};

export const dialogContent: Variants = {
  hidden: { opacity: 0, scale: 0.98, y: 8 },
  show: { opacity: 1, scale: 1, y: 0, transition: springSnap },
  exit: { opacity: 0, scale: 0.99, y: 4, transition: { duration: 0.12 } },
};

/* -- Command palette ------------------------------------------------ */

export const commandPalette: Variants = {
  hidden: { opacity: 0, scale: 0.98, y: -12 },
  show: { opacity: 1, scale: 1, y: 0, transition: springSnap },
  exit: { opacity: 0, scale: 0.99, y: -6, transition: { duration: 0.1 } },
};

/* -- Staggered list ------------------------------------------------- */

export const listContainer: Variants = {
  hidden: { opacity: 1 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.018, delayChildren: 0.04 },
  },
};

export const listItem: Variants = {
  hidden: { opacity: 0, y: 4 },
  show: { opacity: 1, y: 0, transition: springSnap },
};

/* -- Press / hover -------------------------------------------------- */

export const pressable = {
  whileTap: { scale: 0.97 },
  whileHover: { y: -1 },
  transition: springSnap,
};

export const bounceIn: Variants = {
  hidden: { opacity: 0, scale: 0.6 },
  show: { opacity: 1, scale: 1, transition: springBounce },
  exit: { opacity: 0, scale: 0.8, transition: { duration: 0.12 } },
};

/* -- Status pill pop ----------------------------------------------- */

export const statusPill: Variants = {
  initial: { scale: 1 },
  pulse: { scale: [1, 1.08, 1], transition: { duration: 0.36 } },
};

/* -- Layout transitions --------------------------------------------- */

export const layoutSpring: Transition = spring;
