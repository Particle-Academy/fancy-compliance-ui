import type { ReactNode } from "react";
import { useConsentInternal } from "./context";

export interface ConsentGateProps {
  category: string;
  children?: ReactNode;
  /** Rendered instead of the children until consent, e.g. a "turn on analytics to see this" note. */
  fallback?: ReactNode;
}

/**
 * Renders its children only while the category is allowed: never before a
 * decision, never under an outdated policy, never for an unknown category.
 * On withdrawal they unmount. What the children already did (a script that
 * ran) is not undone by unmounting; use `useConsentScript` for scripts.
 */
export function ConsentGate({ category, children, fallback = null }: ConsentGateProps) {
  const consent = useConsentInternal();
  const allowed = consent.allows(category);

  return (
    <div className="contents" data-fancy-compliance-gate={category} data-fancy-compliance-state={allowed ? "granted" : "blocked"}>
      {allowed ? children : fallback}
    </div>
  );
}
