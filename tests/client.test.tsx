import { afterEach, describe, expect, it, vi } from "vitest";
import { ConsentBanner, ConsentProvider, ConsentRequestError, createConsentClient, readConsentProps, useConsentController } from "../src";
import { cleanupDom, decided, mount, snapshot } from "./helpers";

afterEach(() => {
  cleanupDom();
  document.cookie = "XSRF-TOKEN=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
});

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

describe("createConsentClient", () => {
  it("posts a decision as JSON with Laravel's XSRF header and returns the new snapshot", async () => {
    document.cookie = "XSRF-TOKEN=abc%3D%3D; path=/";
    const fetcher = vi.fn().mockResolvedValue(jsonResponse(decided(["analytics"])));
    const client = createConsentClient({ routes: snapshot().routes!, fetch: fetcher });

    const next = await client.decide({ granted: ["analytics"], source: "banner" });

    expect(next.consent!.granted).toEqual(["necessary", "analytics"]);
    const [url, init] = fetcher.mock.calls[0]!;
    expect(url).toBe("/fancy-compliance/consent");
    expect(init.method).toBe("POST");
    expect(init.credentials).toBe("same-origin");
    expect(init.headers["X-XSRF-TOKEN"]).toBe("abc==");
    expect(init.headers["Content-Type"]).toBe("application/json");
    expect(JSON.parse(init.body)).toEqual({ granted: ["analytics"], source: "banner" });
  });

  it("posts a withdrawal to the withdraw route", async () => {
    const fetcher = vi.fn().mockResolvedValue(jsonResponse(decided([])));
    const client = createConsentClient({ routes: snapshot().routes!, fetch: fetcher });

    await client.withdraw({ categories: ["analytics"], source: "preferences" });

    expect(fetcher.mock.calls[0]![0]).toBe("/fancy-compliance/consent/withdraw");
    expect(JSON.parse(fetcher.mock.calls[0]![1].body)).toEqual({ categories: ["analytics"], source: "preferences" });
  });

  it("throws the server's error code on a refusal", async () => {
    const fetcher = vi.fn().mockResolvedValue(jsonResponse({ error: "unknown_category" }, 422));
    const client = createConsentClient({ routes: snapshot().routes!, fetch: fetcher });

    await expect(client.decide({ granted: ["adtech"], source: "banner" })).rejects.toMatchObject({ name: "ConsentRequestError", code: "unknown_category", status: 422 });
    expect(new ConsentRequestError("x", 500)).toBeInstanceOf(Error);
  });
});

describe("useConsentController", () => {
  it("holds the snapshot and replaces it with what the server answers", async () => {
    const fetcher = vi.fn().mockResolvedValue(jsonResponse(decided(["analytics"])));
    let controller: ReturnType<typeof useConsentController> | undefined;
    function Probe() {
      controller = useConsentController(snapshot(), { fetch: fetcher });
      return null;
    }
    await mount(<Probe />);
    expect(controller!.value.needsConsent).toBe(true);

    const { act } = await import("react");
    await act(async () => {
      await controller!.onDecide({ granted: ["analytics"], source: "banner" });
    });
    expect(controller!.value.needsConsent).toBe(false);
  });

  // The Inertia prop goes missing when the host's share does not run, for
  // example under Octane before fancy-compliance 0.1.1. That must not take the
  // page down with "Cannot read properties of undefined (reading 'routes')".
  for (const missing of [undefined, null]) {
    it(`fails soft when initial is ${String(missing)}: no banner, one warning`, async () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      let controller: ReturnType<typeof useConsentController> | undefined;
      function Probe() {
        controller = useConsentController(missing);
        return (
          <ConsentProvider {...controller}>
            <ConsentBanner />
          </ConsentProvider>
        );
      }

      const m = await mount(<Probe />);
      await m.rerender(<Probe />);

      expect(controller!.value.needsConsent).toBe(false);
      expect(controller!.value.categories).toEqual([]);
      expect(controller!.value.consent).toBeNull();
      expect(document.querySelector('[data-fancy-compliance="banner"]')).toBeNull();
      expect(warn).toHaveBeenCalledTimes(1);
      const message = String(warn.mock.calls[0]![0]);
      expect(message).toContain("fancyCompliance");
      expect(message).toContain("README");
      await m.unmount();
    });
  }

  it("picks up the snapshot once it arrives after a missing one", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    let controller: ReturnType<typeof useConsentController> | undefined;
    function Probe({ initial }: { initial: ReturnType<typeof snapshot> | undefined }) {
      controller = useConsentController(initial);
      return null;
    }
    const m = await mount(<Probe initial={undefined} />);
    expect(controller!.value.needsConsent).toBe(false);

    await m.rerender(<Probe initial={snapshot()} />);
    expect(controller!.value.needsConsent).toBe(true);
  });
});

describe("readConsentProps", () => {
  it("reads the JSON the Blade directive prints", () => {
    const script = document.createElement("script");
    script.type = "application/json";
    script.id = "fancy-compliance-props";
    script.textContent = JSON.stringify(snapshot());
    document.body.appendChild(script);

    expect(readConsentProps()?.policyVersion).toBe("1");
    script.remove();
    expect(readConsentProps()).toBeNull();
  });
});
