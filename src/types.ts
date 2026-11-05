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

export type ConsentMessages = Record<string, string>;

export type Direction = "ltr" | "rtl";
