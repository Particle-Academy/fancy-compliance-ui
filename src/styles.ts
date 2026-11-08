import { cn } from "@particle-academy/react-fancy";

/**
 * Shared classes. Every consent action uses the SAME classes and size, so no
 * choice is more prominent than another; a test asserts it.
 *
 * Colours are react-fancy's theme tokens (`THEME_TOKENS`), written exactly as
 * react-fancy's own surfaces write them: a CSS custom property with the kit's
 * default as its fallback, and a separate dark variable under `dark:`. Set
 * nothing and you get the defaults; set `--fancy-surface` (and friends) and the
 * banner follows the rest of your react-fancy UI. `tests/styling.test.tsx`
 * fails if a fallback here disagrees with `THEME_TOKENS`.
 *
 * The defaults are AAA: text zinc-900 / zinc-700 on white, zinc-100 / zinc-300
 * on zinc-900 in dark mode, all above 7:1 (asserted in the same test).
 * min-h-11 is 44px: WCAG 2.5.5 (AAA) target size.
 *
 * The strings are literal on purpose: Tailwind finds classes by scanning
 * `dist/`, so a class built at runtime would never be generated.
 */
export const ACTION_SIZE = "lg" as const;

// break-words: a long translated label wraps inside its button, never out of it.
export const ACTION_CLASS = "min-h-11 w-full justify-center whitespace-normal break-words";

const BG = "bg-[color:var(--fancy-surface,var(--color-white))] dark:bg-[color:var(--fancy-surface-dark,var(--color-zinc-900))]";

export const BORDER_STRONG_CLASS =
  "border-[color:var(--fancy-border-strong,var(--color-zinc-300))] dark:border-[color:var(--fancy-border-strong-dark,var(--color-zinc-700))]";

export const DIVIDE_CLASS =
  "divide-[color:var(--fancy-border,var(--color-zinc-200))] dark:divide-[color:var(--fancy-border-dark,var(--color-zinc-700))]";

export const TEXT_CLASS =
  "text-[color:var(--fancy-text,var(--color-zinc-900))] dark:text-[color:var(--fancy-text-dark,var(--color-zinc-100))]";

export const SOFT_TEXT_CLASS =
  "text-[color:var(--fancy-text-soft,var(--color-zinc-700))] dark:text-[color:var(--fancy-text-soft-dark,var(--color-zinc-300))]";

export const SURFACE_CLASS = `${BORDER_STRONG_CLASS} ${BG} ${TEXT_CLASS}`;

/**
 * Merge classes so the LAST conflicting utility wins: react-fancy's `cn`
 * (tailwind-merge). Ours go first, the app's after, so an app class replaces
 * the default it conflicts with instead of fighting it in the cascade.
 */
export const merge = cn;
