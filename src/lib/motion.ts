import type { Transition,Variants } from "framer-motion";

/* ------------------------------------------------------------------ */
/*  Reduced motion — returns static values when user prefers less      */
/* ------------------------------------------------------------------ */

/**
 *
 */
function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Wraps variants to return identity transforms when reduced motion is on
 * @param v
 */
export function safeVariants(v: Variants): Variants {
  if (prefersReducedMotion()) {
    const safe: Variants = {};
    for (const key of Object.keys(v)) {
      safe[key] = { opacity: key === "initial" || key === "exit" ? 0 : 1 };
    }
    return safe;
  }
  return v;
}

/* ------------------------------------------------------------------ */
/*  Shared spring config — snappy but not harsh                        */
/* ------------------------------------------------------------------ */

export const snappy: Transition = { type: "spring", stiffness: 400, damping: 30 };
export const gentle: Transition = { type: "spring", stiffness: 260, damping: 25 };

/* ------------------------------------------------------------------ */
/*  Page-level transitions                                             */
/* ------------------------------------------------------------------ */

export const pageTransition: Variants = {
  initial: { opacity: 0, y: 16, filter: "blur(4px)" },
  animate: { opacity: 1, y: 0, filter: "blur(0px)" },
  exit: { opacity: 0, y: -12, filter: "blur(4px)" },
};

export const pageTransitionConfig: Transition = {
  duration: 0.35,
  ease: [0.25, 0.1, 0.25, 1],
};

/* ------------------------------------------------------------------ */
/*  Component entrance variants                                        */
/* ------------------------------------------------------------------ */

export const fadeInUp: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

export const fadeIn: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
};

export const scaleIn: Variants = {
  initial: { scale: 0.92, opacity: 0 },
  animate: { scale: 1, opacity: 1 },
};

export const slideInLeft: Variants = {
  initial: { x: -24, opacity: 0 },
  animate: { x: 0, opacity: 1 },
};

export const slideInRight: Variants = {
  initial: { x: 24, opacity: 0 },
  animate: { x: 0, opacity: 1 },
};

/* ------------------------------------------------------------------ */
/*  Stagger containers                                                 */
/* ------------------------------------------------------------------ */

export const staggerContainer: Variants = {
  initial: {},
  animate: {
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};

export const staggerFast: Variants = {
  initial: {},
  animate: {
    transition: { staggerChildren: 0.05 },
  },
};

/* ------------------------------------------------------------------ */
/*  Interactive micro-interactions                                     */
/* ------------------------------------------------------------------ */

export const tapScale = { whileTap: { scale: 0.97 } } as const;
export const hoverLift = { whileHover: { y: -2 } } as const;
export const hoverGlow = {
  whileHover: {
    boxShadow: "0 0 20px rgba(99, 102, 241, 0.15), 0 4px 16px rgba(0, 0, 0, 0.08)",
  },
} as const;
