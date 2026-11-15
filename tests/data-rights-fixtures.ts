import type { DataErasureView, DataExportView } from "../src";

/*
 * Fixtures in the shapes of fancy-compliance's docs/data-rights-protocol.md
 * (version 1): ExportView and ErasureView, exactly as the server serves them.
 */

export const READY: DataExportView = {
  id: "01JD3READY",
  format: "zip",
  status: "ready",
  requestedAt: "2026-11-15T09:30:00Z",
  readyAt: "2026-11-15T09:30:02Z",
  expiresAt: "2026-11-16T09:30:02Z",
  bytes: 18234,
  error: null,
  download: { url: "/fancy-compliance/exports/01JD3READY/download?token=abc" },
};

export const PENDING: DataExportView = {
  id: "01JD3PENDING",
  format: "json",
  status: "pending",
  requestedAt: "2026-11-15T10:00:00Z",
  readyAt: null,
  expiresAt: null,
  bytes: null,
  error: null,
  download: null,
};

export const FAILED: DataExportView = {
  id: "01JD3FAILED",
  format: "json",
  status: "failed",
  requestedAt: "2026-11-14T08:00:00Z",
  readyAt: null,
  expiresAt: null,
  bytes: null,
  error: "too_large",
  download: null,
};

export const EXPIRED: DataExportView = {
  id: "01JD3EXPIRED",
  format: "json",
  status: "expired",
  requestedAt: "2026-11-10T08:00:00Z",
  readyAt: "2026-11-10T08:00:01Z",
  expiresAt: "2026-11-11T08:00:01Z",
  bytes: 900,
  error: null,
  // A server never sends this for a non-ready export; the panel must not trust it if one did.
  download: { url: "/fancy-compliance/exports/01JD3EXPIRED/download?token=stale" },
};

export const ERASURE_PENDING: DataErasureView = {
  id: "01JD3ERASE",
  status: "pending",
  requestedAt: "2026-11-15T09:30:00Z",
  dueAt: "2026-12-15T09:30:00Z",
  cancelledAt: null,
  executedAt: null,
  registrants: [
    { key: "fancy-compliance.consents", status: "waiting", deleted: {}, anonymised: {}, retained: [] },
  ],
};

export const ERASURE_CANCELLED: DataErasureView = {
  ...ERASURE_PENDING,
  status: "cancelled",
  cancelledAt: "2026-11-16T09:30:00Z",
};

export const ERASURE_EXECUTED: DataErasureView = {
  ...ERASURE_PENDING,
  status: "executed",
  executedAt: "2026-12-15T09:31:00Z",
  registrants: [
    {
      key: "fancy-compliance.consents",
      status: "done",
      deleted: {},
      anonymised: {},
      retained: [
        { table: "fancy_compliance_consents", rows: 4, reason: "Evidence of consent, kept under a pseudonym.", rekeyed: true },
      ],
    },
    {
      key: "fancy-compliance.exports",
      status: "done",
      deleted: { fancy_compliance_exports: 2 },
      anonymised: {},
      retained: [],
    },
    {
      key: "change-council",
      status: "done",
      deleted: {},
      anonymised: {},
      retained: [{ table: "council_events", rows: 7, reason: "Hash-chained audit log.", rekeyed: false }],
    },
  ],
};

export const ERASURE_PARTIAL: DataErasureView = {
  ...ERASURE_EXECUTED,
  status: "partially_executed",
  registrants: [
    ERASURE_EXECUTED.registrants[0]!,
    { key: "fancy-mlm", status: "failed", deleted: {}, anonymised: {}, retained: [] },
  ],
};
