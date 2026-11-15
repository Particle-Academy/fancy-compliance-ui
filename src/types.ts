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

/*
 * Data rights (CC-fancy-0038 phases 3 and 4). These mirror
 * particle-academy/fancy-compliance's docs/data-rights-protocol.md, version 1.
 * Any backend serving that protocol can drive the panels.
 */

export type DataExportFormat = "json" | "zip";

export type DataExportStatus = "pending" | "ready" | "failed" | "downloaded" | "expired";

/** One export request, as `GET /fancy-compliance/exports/{id}` serves it. */
export interface DataExportView {
  /** A ULID: stable, and the handle `data-data-export`. */
  id: string;
  format: DataExportFormat | (string & {});
  status: DataExportStatus | (string & {});
  /** ISO 8601, UTC. */
  requestedAt: string;
  readyAt: string | null;
  expiresAt: string | null;
  bytes: number | null;
  /** `too_large`, `too_many_files`, `registrant_failed`, `zip_unavailable` or `build_failed` when `failed`. */
  error: string | null;
  /** Only while `ready`. The URL carries a single-use token and still needs the person signed in. */
  download: { url: string } | null;
}

export interface DataExportLimits {
  perDay: number;
  remainingToday: number;
}

/** `GET /fancy-compliance/exports`. */
export interface DataExportList {
  exports: DataExportView[];
  /** What this host can build: `zip` only when the server has ext-zip and allows it. */
  formats: DataExportFormat[];
  limits: DataExportLimits;
}

export type DataErasureStatus = "pending" | "cancelled" | "executing" | "executed" | "partially_executed";

/** Rows a registrant kept, and why. `rekeyed` true: kept under a pseudonym; false: kept unchanged. */
export interface DataErasureRetained {
  table: string;
  rows: number;
  reason: string;
  rekeyed: boolean;
}

/** What one package (a registrant) did, or has yet to do, for an erasure. */
export interface DataErasureRegistrantView {
  key: string;
  status: "waiting" | "done" | "failed" | (string & {});
  /** Rows deleted, per table. */
  deleted: Record<string, number>;
  /** Rows anonymised in place, per table. */
  anonymised: Record<string, number>;
  retained: DataErasureRetained[];
}

/** One erasure request, as `GET /fancy-compliance/erasure/{id}` serves it. */
export interface DataErasureView {
  id: string;
  status: DataErasureStatus | (string & {});
  requestedAt: string;
  /** When the grace period ends and the request executes. */
  dueAt: string;
  cancelledAt: string | null;
  executedAt: string | null;
  registrants: DataErasureRegistrantView[];
}

/** `GET /fancy-compliance/erasure`: the latest request, or null, and the host's grace period. */
export interface DataErasureState {
  erasure: DataErasureView | null;
  graceDays: number;
}

/** Someone other than the caller, named for a staff path the host's authoriser allows. */
export interface DataSubjectRef {
  type: string;
  id: string;
}
