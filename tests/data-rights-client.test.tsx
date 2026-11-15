import { afterEach, describe, expect, it, vi } from "vitest";
import { ConsentRequestError, createDataRightsClient } from "../src";
import { ERASURE_PENDING, PENDING, READY } from "./data-rights-fixtures";

/*
 * createDataRightsClient: fancy-compliance's data-rights routes
 * (docs/data-rights-protocol.md, version 1). It has no download call on
 * purpose: a download is a link the signed-in person follows.
 */

afterEach(() => {
  document.cookie = "XSRF-TOKEN=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
});

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

describe("createDataRightsClient", () => {
  it("lists exports from the default route", async () => {
    const list = { exports: [READY], formats: ["json", "zip"], limits: { perDay: 3, remainingToday: 2 } };
    const fetcher = vi.fn().mockResolvedValue(jsonResponse(list));
    const client = createDataRightsClient({ fetch: fetcher });

    expect(await client.listExports()).toEqual(list);
    const [url, init] = fetcher.mock.calls[0]!;
    expect(url).toBe("/fancy-compliance/exports");
    expect(init.method).toBe("GET");
    expect(init.credentials).toBe("same-origin");
  });

  it("requests an export with the CSRF header, and unwraps the view", async () => {
    document.cookie = "XSRF-TOKEN=abc%3D%3D; path=/";
    const fetcher = vi.fn().mockResolvedValue(jsonResponse({ export: PENDING }, 202));
    const client = createDataRightsClient({ fetch: fetcher });

    expect(await client.requestExport("zip")).toEqual(PENDING);
    const [url, init] = fetcher.mock.calls[0]!;
    expect(url).toBe("/fancy-compliance/exports");
    expect(init.method).toBe("POST");
    expect(init.headers["X-XSRF-TOKEN"]).toBe("abc==");
    expect(JSON.parse(init.body)).toEqual({ format: "zip" });
  });

  it("names a target only when asked, for a staff path the host authorises", async () => {
    const fetcher = vi.fn().mockResolvedValue(jsonResponse({ export: PENDING }, 202));
    const client = createDataRightsClient({ fetch: fetcher });

    await client.requestExport("json", { type: "member", id: "a1" });
    expect(JSON.parse(fetcher.mock.calls[0]![1].body)).toEqual({ format: "json", subject_type: "member", subject_id: "a1" });
  });

  it("reads one export, escaping the id", async () => {
    const fetcher = vi.fn().mockResolvedValue(jsonResponse({ export: READY }));
    const client = createDataRightsClient({ fetch: fetcher, routes: { exports: "/privacy/exports", erasure: "/privacy/erasure" } });

    expect(await client.getExport("a/b")).toEqual(READY);
    expect(fetcher.mock.calls[0]![0]).toBe("/privacy/exports/a%2Fb");
  });

  it("reads, requests and cancels an erasure", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ erasure: null, graceDays: 30 }))
      .mockResolvedValueOnce(jsonResponse({ erasure: ERASURE_PENDING }, 202))
      .mockResolvedValueOnce(jsonResponse({ erasure: ERASURE_PENDING }))
      .mockResolvedValueOnce(jsonResponse({ erasure: { ...ERASURE_PENDING, status: "cancelled" } }));
    const client = createDataRightsClient({ fetch: fetcher });

    expect(await client.getErasure()).toEqual({ erasure: null, graceDays: 30 });
    expect(await client.requestErasure()).toEqual(ERASURE_PENDING);
    expect(await client.getErasureRequest(ERASURE_PENDING.id)).toEqual(ERASURE_PENDING);
    expect((await client.cancelErasure(ERASURE_PENDING.id)).status).toBe("cancelled");
    expect(fetcher.mock.calls.map((c) => [c[1].method, c[0]])).toEqual([
      ["GET", "/fancy-compliance/erasure"],
      ["POST", "/fancy-compliance/erasure"],
      ["GET", `/fancy-compliance/erasure/${ERASURE_PENDING.id}`],
      ["POST", `/fancy-compliance/erasure/${ERASURE_PENDING.id}/cancel`],
    ]);
  });

  it("throws the server's code, with the rest of the error body as detail", async () => {
    const fetcher = vi.fn().mockResolvedValue(jsonResponse({ error: "erasure_blocked", reason: "Open invoice." }, 409));
    const client = createDataRightsClient({ fetch: fetcher });

    const error = await client.requestErasure().catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ConsentRequestError);
    expect(error).toMatchObject({ code: "erasure_blocked", status: 409, detail: { reason: "Open invoice." } });
  });

  it("reports reauth_required as its code", async () => {
    const fetcher = vi.fn().mockResolvedValue(jsonResponse({ error: "reauth_required" }, 423));
    const client = createDataRightsClient({ fetch: fetcher });

    await expect(client.requestExport("json")).rejects.toMatchObject({ code: "reauth_required", status: 423 });
  });

  it("has no download call: a download is a signed-in link", () => {
    const client = createDataRightsClient({ fetch: vi.fn() });

    expect(Object.keys(client).filter((k) => /download/i.test(k))).toEqual([]);
  });
});
