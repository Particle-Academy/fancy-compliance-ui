/**
 * The shape `particle-academy/fancy-compliance` shares (Inertia prop
 * `fancyCompliance`, `@fancyComplianceProps`, `GET /fancy-compliance/consent`).
 * Any backend that produces it can drive these components.
 */
export interface ConsentPurpose {
  /** Translation key. */
  key: string;
  /** The server's text for the current locale, when it had one. */
  text?: string | null;
}

export interface ConsentCategory {
  key: string;
  /** Translation key. */
  label: string;
  labelText?: string | null;
  /** Translation key. */
  description: string;
  descriptionText?: string | null;
  purposes: ConsentPurpose[];
  /** Required categories are always on and cannot be refused. */
  required: boolean;
}

export interface ConsentRecordView {
  granted: string[];
  refused: string[];
  policyVersion: string | null;
  decidedAt: string | null;
  source: string | null;
  /** False when the decision was made under an older policy version. */
  current: boolean;
}

export interface ConsentRoutes {
  show: string;
  record: string;
  withdraw: string;
}

export interface ConsentSnapshot {
  policyVersion: string;
  categories: ConsentCategory[];
  /** Null until the person has decided. */
  consent: ConsentRecordView | null;
  /** True on a first visit and after a policy change: the banner shows. */
  needsConsent: boolean;
  routes?: ConsentRoutes | null;
}

export type ConsentSource = "banner" | "preferences" | "api";

/** A decision: the optional categories the person accepted. Every other optional category is refused. */
export interface ConsentDecision {
  granted: string[];
  source: ConsentSource;
}

/** A withdrawal: these categories (all optional ones when null). */
export interface ConsentWithdrawal {
  categories: string[] | null;
  source: ConsentSource;
}

/**
 * What happened, for presence, audit and coaching layers. `actor` is always
 * `human`: nothing in this package records consent for anyone else.
 */
export type ConsentActivity =
  | { type: "consent.decided"; actor: "human"; source: ConsentSource; granted: string[] }
  | { type: "consent.withdrawn"; actor: "human"; source: ConsentSource; categories: string[] | null }
  | { type: "consent.preferences.opened"; actor: "human" }
  | { type: "consent.preferences.closed"; actor: "human" };

/** How a ledger row came about. `link` is a guest decision carried over at sign-in. */
export type ConsentHistoryAction = "decision" | "withdrawal" | "link";

/**
 * One consent ledger row, as `particle-academy/fancy-compliance` serves it
 * (`GET /fancy-compliance/history`, `ConsentHistoryEntry::toArray()`). It never
 * carries the subject key or a guest hash.
 */
export interface ConsentHistoryEntry {
  /** The ledger row id: stable, and the `before` cursor for older pages. */
  id: number;
  action: ConsentHistoryAction | (string & {});
  granted: string[];
  refused: string[];
  policyVersion: string;
  /** `banner`, `preferences`, `api` or `login`. */
  source: string;
  /** ISO 8601, UTC. */
  at: string;
  /** True for a decision carried over from a guest at sign-in. */
  linked: boolean;
}

/** A page of history: newest first; pass `nextBefore` as `before` for the next, older page. */
export interface ConsentHistoryPage {
  entries: ConsentHistoryEntry[];
  nextBefore: number | null;
}

export type ConsentMessages = Record<string, string>;

export type Direction = "ltr" | "rtl";
