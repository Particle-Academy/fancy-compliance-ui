/**
 * Shared classes. Every consent action uses the SAME classes and size, so no
 * choice is more prominent than another; a test asserts it.
 *
 * min-h-11 is 44px: WCAG 2.5.5 (AAA) target size. Text is zinc-900/zinc-700
 * on white (zinc-50/zinc-200 on zinc-900 in dark mode): above 7:1, AAA.
 */
export const ACTION_SIZE = "lg" as const;

export const ACTION_CLASS = "min-h-11 w-full justify-center whitespace-normal";

export const SURFACE_CLASS =
  "border-zinc-300 bg-white text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50";

export const TEXT_CLASS = "text-zinc-900 dark:text-zinc-50";

export const SOFT_TEXT_CLASS = "text-zinc-700 dark:text-zinc-200";
