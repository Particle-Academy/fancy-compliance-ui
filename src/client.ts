import { useCallback, useEffect, useMemo, useState } from "react";
import type { ConsentDecision, ConsentRoutes, ConsentSnapshot, ConsentWithdrawal } from "./types";

export class ConsentRequestError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number,
  ) {
    super(`fancy-compliance: ${code} (${status})`);
    this.name = "ConsentRequestError";
  }
}

export interface ConsentClientOptions {
  routes: ConsentRoutes;
  fetch?: typeof fetch;
}

export interface ConsentClient {
  decide: (decision: ConsentDecision) => Promise<ConsentSnapshot>;
  withdraw: (withdrawal: ConsentWithdrawal) => Promise<ConsentSnapshot>;
  refresh: () => Promise<ConsentSnapshot>;
}

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  for (const part of document.cookie.split(";")) {
    const index = part.indexOf("=");
    if (index < 0) continue;
    if (part.slice(0, index).trim() === name) {
      try {
        return decodeURIComponent(part.slice(index + 1).trim());
      } catch {
        return null;
      }
    }
  }

  return null;
}

/**
 * Talks to `particle-academy/fancy-compliance`'s routes. Sends Laravel's
 * `X-XSRF-TOKEN` from the `XSRF-TOKEN` cookie (or `X-CSRF-TOKEN` from
 * `<meta name="csrf-token">`), so the host's CSRF protection applies.
 */
export function createConsentClient({ routes, fetch: fetcher }: ConsentClientOptions): ConsentClient {
  const send = async (method: "GET" | "POST", url: string, body?: unknown): Promise<ConsentSnapshot> => {
    const headers: Record<string, string> = { Accept: "application/json", "X-Requested-With": "XMLHttpRequest" };
    if (body !== undefined) headers["Content-Type"] = "application/json";
    const xsrf = readCookie("XSRF-TOKEN");
    if (xsrf) {
      headers["X-XSRF-TOKEN"] = xsrf;
    } else if (typeof document !== "undefined") {
      const meta = document.querySelector('meta[name="csrf-token"]')?.getAttribute("content");
      if (meta) headers["X-CSRF-TOKEN"] = meta;
    }
    const response = await (fetcher ?? globalThis.fetch)(url, {
      method,
      credentials: "same-origin",
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    let data: unknown = null;
    try {
      data = await response.json();
    } catch {
      data = null;
    }
    if (!response.ok) {
      const code = data && typeof data === "object" && typeof (data as { error?: unknown }).error === "string" ? (data as { error: string }).error : "request_failed";
      throw new ConsentRequestError(code, response.status);
    }

    return data as ConsentSnapshot;
  };

  return {
    decide: (decision) => send("POST", routes.record, decision),
    withdraw: (withdrawal) => send("POST", routes.withdraw, withdrawal),
    refresh: () => send("GET", routes.show),
  };
}

/**
 * State for `<ConsentProvider>` backed by the server routes:
 * `<ConsentProvider {...useConsentController(props.fancyCompliance)}>`.
 * A new `initial` (an Inertia visit) replaces the state.
 */
export function useConsentController(
  initial: ConsentSnapshot,
  options: { routes?: ConsentRoutes; fetch?: typeof fetch } = {},
): { value: ConsentSnapshot; onDecide: (d: ConsentDecision) => Promise<void>; onWithdraw: (w: ConsentWithdrawal) => Promise<void> } {
  const [value, setValue] = useState(initial);
  // Keyed by content, not identity: an `initial` built inline is a new object
  // every render, and replacing state on identity would loop forever.
  const initialKey = JSON.stringify(initial);
  useEffect(() => setValue(JSON.parse(initialKey) as ConsentSnapshot), [initialKey]);
  const routes = options.routes ?? initial.routes ?? null;
  const fetcher = options.fetch;
  const client = useMemo(() => (routes ? createConsentClient({ routes, fetch: fetcher }) : null), [routes, fetcher]);

  const onDecide = useCallback(
    async (decision: ConsentDecision) => {
      if (!client) throw new ConsentRequestError("no_routes", 0);
      setValue(await client.decide(decision));
    },
    [client],
  );
  const onWithdraw = useCallback(
    async (withdrawal: ConsentWithdrawal) => {
      if (!client) throw new ConsentRequestError("no_routes", 0);
      setValue(await client.withdraw(withdrawal));
    },
    [client],
  );

  return { value, onDecide, onWithdraw };
}

/** Reads what `@fancyComplianceProps` printed on a Blade page; null when absent or unreadable. */
export function readConsentProps(id = "fancy-compliance-props"): ConsentSnapshot | null {
  if (typeof document === "undefined") return null;
  const element = document.getElementById(id);
  if (!element?.textContent) return null;
  try {
    return JSON.parse(element.textContent) as ConsentSnapshot;
  } catch {
    return null;
  }
}
