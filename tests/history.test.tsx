import { afterEach, describe, expect, it, vi } from "vitest";
import { renderToString } from "react-dom/server";
import { ConsentHistory, DEFAULT_MESSAGES, type ConsentHistoryEntry } from "../src";
import { SOFT_TEXT_CLASS, TEXT_CLASS } from "../src/styles";
import { action, cleanupDom, click, mount, q, snapshot } from "./helpers";

/*
 * ConsentHistory (CC-fancy-0038 phase 1): a controlled, read-only list of a
 * person's consent ledger rows, as served by fancy-compliance's
 * `GET /fancy-compliance/history`. Stable handles on every entry.
 */

afterEach(cleanupDom);

const FIRST: ConsentHistoryEntry = {
  id: 7,
  action: "withdrawal",
  granted: ["necessary"],
  refused: ["analytics", "marketing"],
  policyVersion: "2",
  source: "preferences",
  at: "2026-11-06T09:30:00Z",
  linked: false,
};

const ENTRIES: ConsentHistoryEntry[] = [
  FIRST,
  {
    id: 3,
    action: "link",
    granted: ["necessary", "analytics"],
    refused: ["marketing"],
    policyVersion: "1",
    source: "login",
    at: "2026-11-05T12:00:00Z",
    linked: true,
  },
];

const categories = snapshot().categories;

function entry(id: number): HTMLElement | null {
  return q(`[data-consent-history-entry="${id}"]`);
}

describe("ConsentHistory", () => {
  it("renders one entry per row, in the order given, with stable handles", async () => {
    await mount(<ConsentHistory entries={ENTRIES} categories={categories} />);

    const root = q('[data-fancy-compliance="history"]');
    expect(root).not.toBeNull();
    const rows = Array.from(document.querySelectorAll("[data-consent-history-entry]"));
    expect(rows.map((r) => r.getAttribute("data-consent-history-entry"))).toEqual(["7", "3"]);
    expect(entry(7)!.getAttribute("data-consent-history-action")).toBe("withdrawal");
    expect(entry(7)!.getAttribute("data-consent-history-policy")).toBe("2");
    expect(entry(3)!.getAttribute("data-consent-history-linked")).toBe("true");
    expect(entry(7)!.getAttribute("data-consent-history-linked")).toBe("false");
  });

  it("names the action, the source, the policy version and the time", async () => {
    await mount(<ConsentHistory entries={ENTRIES} categories={categories} />);

    const row = entry(7)!;
    expect(row.querySelector('[data-fancy-compliance="history-action"]')!.textContent).toBe(
      DEFAULT_MESSAGES["fancy-compliance.history.action.withdrawal"],
    );
    expect(row.querySelector('[data-fancy-compliance="history-source"]')!.textContent).toBe(
      DEFAULT_MESSAGES["fancy-compliance.history.source.preferences"],
    );
    expect(row.querySelector('[data-fancy-compliance="history-policy"]')!.textContent).toContain("2");
    const time = row.querySelector("time")!;
    expect(time.getAttribute("dateTime")).toBe("2026-11-06T09:30:00Z");
    expect(time.textContent).toContain("2026");
    expect(entry(3)!.querySelector('[data-fancy-compliance="history-action"]')!.textContent).toBe(
      DEFAULT_MESSAGES["fancy-compliance.history.action.link"],
    );
  });

  it("lists allowed and refused categories by their label, with the key as a handle", async () => {
    await mount(<ConsentHistory entries={ENTRIES} categories={categories} />);

    const granted = Array.from(entry(3)!.querySelectorAll('[data-fancy-compliance="history-granted"] [data-consent-category]'));
    const refused = Array.from(entry(3)!.querySelectorAll('[data-fancy-compliance="history-refused"] [data-consent-category]'));
    expect(granted.map((g) => g.getAttribute("data-consent-category"))).toEqual(["necessary", "analytics"]);
    expect(granted.map((g) => g.textContent)).toEqual(["Strictly necessary", "Analytics"]);
    expect(refused.map((g) => g.textContent)).toEqual(["Marketing"]);
  });

  it("falls back to English text, then the raw key, for a category it was not told about", async () => {
    await mount(<ConsentHistory entries={[{ ...FIRST, refused: ["analytics", "retired_category"] }]} />);

    const refused = Array.from(entry(7)!.querySelectorAll('[data-fancy-compliance="history-refused"] [data-consent-category]'));
    expect(refused.map((r) => r.textContent)).toEqual(["Analytics", "retired_category"]);
  });

  it("says when a list is empty instead of rendering nothing", async () => {
    await mount(<ConsentHistory entries={[{ ...FIRST, refused: [] }]} categories={categories} />);

    expect(entry(7)!.querySelector('[data-fancy-compliance="history-refused"]')!.textContent).toContain(
      DEFAULT_MESSAGES["fancy-compliance.history.none"],
    );
  });

  it("shows an empty state when there are no entries", async () => {
    await mount(<ConsentHistory entries={[]} />);

    expect(q('[data-fancy-compliance="history-empty"]')!.textContent).toBe(DEFAULT_MESSAGES["fancy-compliance.history.empty"]);
    expect(document.querySelectorAll("[data-consent-history-entry]")).toHaveLength(0);
  });

  it("is controlled: it shows exactly the entries it is given, and nothing it fetched", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const mounted = await mount(<ConsentHistory entries={[FIRST]} />);
    expect(document.querySelectorAll("[data-consent-history-entry]")).toHaveLength(1);

    await mounted.rerender(<ConsentHistory entries={ENTRIES} />);
    expect(document.querySelectorAll("[data-consent-history-entry]")).toHaveLength(2);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("offers older entries only when hasMore, and asks the host for them", async () => {
    const onLoadMore = vi.fn();
    const mounted = await mount(<ConsentHistory entries={ENTRIES} onLoadMore={onLoadMore} />);
    expect(action("history-load-more")).toBeNull();

    await mounted.rerender(<ConsentHistory entries={ENTRIES} hasMore onLoadMore={onLoadMore} />);
    await click(action("history-load-more"));
    expect(onLoadMore).toHaveBeenCalledTimes(1);
  });

  it("disables load-more while loading and announces it", async () => {
    const onLoadMore = vi.fn();
    await mount(<ConsentHistory entries={ENTRIES} hasMore loading onLoadMore={onLoadMore} />);

    const button = action("history-load-more")!;
    expect(button.disabled).toBe(true);
    expect(q('[data-fancy-compliance="history"]')!.getAttribute("aria-busy")).toBe("true");
    await click(button);
    expect(onLoadMore).not.toHaveBeenCalled();
  });

  it("shows an error as an alert", async () => {
    await mount(<ConsentHistory entries={ENTRIES} error />);

    const alert = q('[data-fancy-compliance="history-error"]')!;
    expect(alert.getAttribute("role")).toBe("alert");
    expect(alert.textContent).toBe(DEFAULT_MESSAGES["fancy-compliance.history.error"]);
  });

  it("uses the host's messages first", async () => {
    await mount(
      <ConsentHistory
        entries={ENTRIES}
        messages={{ "fancy-compliance.history.title": "Historique", "fancy-compliance.history.action.withdrawal": "Retrait" }}
      />,
    );

    expect(q('[data-fancy-compliance="history-title"]')!.textContent).toBe("Historique");
    expect(entry(7)!.querySelector('[data-fancy-compliance="history-action"]')!.textContent).toBe("Retrait");
  });

  it("lets the host format the time", async () => {
    await mount(<ConsentHistory entries={ENTRIES} formatDate={(iso) => `at ${iso}`} />);

    expect(entry(7)!.querySelector("time")!.textContent).toBe("at 2026-11-06T09:30:00Z");
  });

  it("renders the same markup on the server, with no locale or timezone drift", () => {
    const html = renderToString(<ConsentHistory entries={ENTRIES} />);
    expect(html).toContain('data-consent-history-entry="7"');
    expect(renderToString(<ConsentHistory entries={ENTRIES} />)).toBe(html);
  });

  it("sets dir for RTL, and uses the AAA text classes", async () => {
    await mount(<ConsentHistory entries={ENTRIES} dir="rtl" />);

    const root = q('[data-fancy-compliance="history"]')!;
    expect(root.getAttribute("dir")).toBe("rtl");
    const title = q('[data-fancy-compliance="history-title"]')!;
    for (const cls of TEXT_CLASS.split(" ")) expect(title.className).toContain(cls);
    const source = entry(7)!.querySelector('[data-fancy-compliance="history-source"]')!;
    for (const cls of SOFT_TEXT_CLASS.split(" ")) expect(source.className).toContain(cls);
  });

  it("merges app classes after its own", async () => {
    await mount(<ConsentHistory entries={ENTRIES} className="p-9" classNames={{ entry: "gap-9", title: "text-xs" }} />);

    expect(q('[data-fancy-compliance="history"]')!.className).toContain("p-9");
    expect(entry(7)!.className).toContain("gap-9");
    expect(q('[data-fancy-compliance="history-title"]')!.className).toContain("text-xs");
  });

  // Agents may READ consent history (CC-fancy-0038): it records nothing, so it
  // sits outside the consent fence on purpose. Recording stays fenced.
  it("is readable by agents: not inside the consent fence", async () => {
    await mount(<ConsentHistory entries={ENTRIES} hasMore onLoadMore={vi.fn()} />);

    expect(q('[data-fancy-compliance="history"]')!.closest("[data-agent-off-limits]")).toBeNull();
  });
});
