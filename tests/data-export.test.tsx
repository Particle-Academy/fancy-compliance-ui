import { afterEach, describe, expect, it, vi } from "vitest";
import { renderToString } from "react-dom/server";
import { DataExportPanel, DEFAULT_MESSAGES } from "../src";
import { SOFT_TEXT_CLASS, TEXT_CLASS } from "../src/styles";
import { action, cleanupDom, click, mount, q } from "./helpers";
import { EXPIRED, FAILED, PENDING, READY } from "./data-rights-fixtures";

/*
 * DataExportPanel (CC-fancy-0038 phase 3): a controlled view of a person's
 * export requests, as fancy-compliance's `GET /fancy-compliance/exports`
 * serves them. It never fetches; it asks the host through `onRequest`.
 */

afterEach(cleanupDom);

function row(id: string): HTMLElement | null {
  return q(`[data-data-export="${id}"]`);
}

describe("DataExportPanel", () => {
  it("renders one row per export, in the order given, with stable handles", async () => {
    await mount(<DataExportPanel exports={[READY, FAILED]} formats={["json", "zip"]} />);

    expect(q('[data-fancy-compliance="data-export"]')).not.toBeNull();
    const rows = Array.from(document.querySelectorAll("[data-data-export]"));
    expect(rows.map((r) => r.getAttribute("data-data-export"))).toEqual([READY.id, FAILED.id]);
    expect(row(READY.id)!.getAttribute("data-data-export-status")).toBe("ready");
    expect(row(READY.id)!.getAttribute("data-data-export-format")).toBe("zip");
    expect(row(FAILED.id)!.getAttribute("data-data-export-status")).toBe("failed");
  });

  it("names each status and the request time", async () => {
    await mount(<DataExportPanel exports={[READY, PENDING, FAILED, EXPIRED]} />);

    for (const view of [READY, PENDING, FAILED, EXPIRED]) {
      expect(row(view.id)!.querySelector('[data-fancy-compliance="data-export-status"]')!.textContent).toBe(
        DEFAULT_MESSAGES[`fancy-compliance.export.status.${view.status}`],
      );
      expect(row(view.id)!.querySelector("time")!.getAttribute("dateTime")).toBe(view.requestedAt);
    }
  });

  it("says why a failed export failed", async () => {
    await mount(<DataExportPanel exports={[FAILED]} />);

    expect(row(FAILED.id)!.querySelector('[data-fancy-compliance="data-export-failure"]')!.textContent).toBe(
      DEFAULT_MESSAGES["fancy-compliance.export.failure.too_large"],
    );
  });

  it("offers a download link, signed-in and as an attachment, for a ready export only", async () => {
    await mount(<DataExportPanel exports={[READY, PENDING, FAILED, EXPIRED]} />);

    const links = Array.from(document.querySelectorAll<HTMLAnchorElement>('[data-fancy-compliance-action="export-download"]'));
    expect(links).toHaveLength(1);
    expect(links[0]!.closest("[data-data-export]")!.getAttribute("data-data-export")).toBe(READY.id);
    expect(links[0]!.getAttribute("href")).toBe(READY.download!.url);
    expect(links[0]!.hasAttribute("download")).toBe(true);
    // An expired export never offers its stale URL, even if one was sent.
    expect(row(EXPIRED.id)!.querySelector("a[href]")).toBeNull();
  });

  it("shows the size of a ready export", async () => {
    await mount(<DataExportPanel exports={[READY]} />);

    expect(row(READY.id)!.querySelector('[data-fancy-compliance="data-export-size"]')!.textContent).toBe("17.8 KB");
  });

  it("has one request button per allowed format, and calls onRequest with it", async () => {
    const onRequest = vi.fn();
    await mount(<DataExportPanel exports={[]} formats={["json", "zip"]} onRequest={onRequest} />);

    expect(action("export-request-json")).not.toBeNull();
    await click(action("export-request-zip"));
    expect(onRequest).toHaveBeenCalledWith("zip");
    expect(onRequest).toHaveBeenCalledTimes(1);
  });

  it("offers JSON only when no formats are given", async () => {
    await mount(<DataExportPanel exports={[]} />);

    expect(action("export-request-json")).not.toBeNull();
    expect(action("export-request-zip")).toBeNull();
  });

  it("disables requests while one is pending, while requesting, and when none are left today", async () => {
    const onRequest = vi.fn();
    const mounted = await mount(<DataExportPanel exports={[PENDING]} onRequest={onRequest} />);
    expect(action("export-request-json")!.disabled).toBe(true);

    await mounted.rerender(<DataExportPanel exports={[]} requesting onRequest={onRequest} />);
    expect(action("export-request-json")!.disabled).toBe(true);
    expect(q('[data-fancy-compliance="data-export"]')!.getAttribute("aria-busy")).toBe("true");

    await mounted.rerender(<DataExportPanel exports={[]} limits={{ perDay: 3, remainingToday: 0 }} onRequest={onRequest} />);
    expect(action("export-request-json")!.disabled).toBe(true);
    await click(action("export-request-json"));
    expect(onRequest).not.toHaveBeenCalled();
  });

  it("shows how many exports are left today", async () => {
    await mount(<DataExportPanel exports={[]} limits={{ perDay: 3, remainingToday: 2 }} />);

    expect(q('[data-fancy-compliance="data-export-remaining"]')!.textContent).toBe("2 of 3 exports left today");
  });

  it.each(["reauth_required", "rate_limited", "export_in_progress"])("explains the %s error as an alert", async (code) => {
    await mount(<DataExportPanel exports={[]} error={code} />);

    const alert = q('[data-fancy-compliance="data-export-error"]')!;
    expect(alert.getAttribute("role")).toBe("alert");
    expect(alert.getAttribute("data-data-export-error")).toBe(code);
    expect(alert.textContent).toBe(DEFAULT_MESSAGES[`fancy-compliance.export.error.${code}`]);
  });

  it("falls back to a generic message for an unknown code or a bare true", async () => {
    const mounted = await mount(<DataExportPanel exports={[]} error="teapot" />);
    expect(q('[data-fancy-compliance="data-export-error"]')!.textContent).toBe(DEFAULT_MESSAGES["fancy-compliance.export.error.generic"]);

    await mounted.rerender(<DataExportPanel exports={[]} error />);
    expect(q('[data-fancy-compliance="data-export-error"]')!.textContent).toBe(DEFAULT_MESSAGES["fancy-compliance.export.error.generic"]);
  });

  it("shows an empty state", async () => {
    await mount(<DataExportPanel exports={[]} />);

    expect(q('[data-fancy-compliance="data-export-empty"]')!.textContent).toBe(DEFAULT_MESSAGES["fancy-compliance.export.empty"]);
  });

  it("is controlled: it renders what it is given and never fetches", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const mounted = await mount(<DataExportPanel exports={[PENDING]} />);
    await mounted.rerender(<DataExportPanel exports={[READY, PENDING]} />);

    expect(document.querySelectorAll("[data-data-export]")).toHaveLength(2);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("uses the host's messages first, and lets the host format times", async () => {
    await mount(
      <DataExportPanel
        exports={[READY]}
        messages={{ "fancy-compliance.export.title": "Vos données", "fancy-compliance.export.status.ready": "Prêt" }}
        formatDate={(iso) => `at ${iso}`}
      />,
    );

    expect(q('[data-fancy-compliance="data-export-title"]')!.textContent).toBe("Vos données");
    expect(row(READY.id)!.querySelector('[data-fancy-compliance="data-export-status"]')!.textContent).toBe("Prêt");
    expect(row(READY.id)!.querySelector("time")!.textContent).toBe(`at ${READY.requestedAt}`);
  });

  it("sets dir, uses the AAA text classes, and merges app classes last", async () => {
    await mount(<DataExportPanel exports={[READY]} dir="rtl" className="p-9" classNames={{ title: "text-xs", row: "gap-9" }} />);

    const root = q('[data-fancy-compliance="data-export"]')!;
    expect(root.getAttribute("dir")).toBe("rtl");
    expect(root.className).toContain("p-9");
    const title = q('[data-fancy-compliance="data-export-title"]')!;
    expect(title.className).toContain("text-xs");
    for (const cls of TEXT_CLASS.split(" ")) expect(root.className).toContain(cls);
    const status = row(READY.id)!.querySelector('[data-fancy-compliance="data-export-status"]')!;
    for (const cls of SOFT_TEXT_CLASS.split(" ")) expect(status.className).toContain(cls);
    expect(row(READY.id)!.className).toContain("gap-9");
  });

  it("uses 44px targets for every control", async () => {
    await mount(<DataExportPanel exports={[READY]} formats={["json", "zip"]} />);

    for (const el of Array.from(document.querySelectorAll("[data-fancy-compliance-action]"))) {
      expect(el.className, el.getAttribute("data-fancy-compliance-action")!).toContain("min-h-11");
    }
  });

  it("renders the same markup on the server twice, with no time drift", () => {
    const html = renderToString(<DataExportPanel exports={[READY, FAILED]} formats={["json", "zip"]} />);
    expect(html).toContain(`data-data-export="${READY.id}"`);
    expect(renderToString(<DataExportPanel exports={[READY, FAILED]} formats={["json", "zip"]} />)).toBe(html);
  });

  it("promises no compliance in any default text", () => {
    for (const [key, text] of Object.entries(DEFAULT_MESSAGES)) {
      if (!key.startsWith("fancy-compliance.export") && !key.startsWith("fancy-compliance.erasure")) continue;
      expect(text, key).not.toMatch(/complian|GDPR|CCPA|guarantee/i);
    }
  });
});
