import { afterEach, describe, expect, it, vi } from "vitest";
import { ConsentBanner, ConsentPreferences, ConsentProvider, DEFAULT_MESSAGES, type ConsentBannerProps } from "../src";
import { action, cleanupDom, click, mount, q, snapshot } from "./helpers";

afterEach(cleanupDom);

// CC-fancy-0016: on a 375x667 phone the bar covered 53% of the screen, on a
// 320x568 one 67%. jsdom does no layout and evaluates no media or container
// queries, so these tests pin the CSS contract (which class does what); the
// real heights were measured in headless Chromium and are in the CHANGELOG.

const SHORT_KEY = "fancy-compliance.banner.body-short";
const FULL_KEY = "fancy-compliance.banner.body";

const classes = (selector: string) => (q(selector)?.className ?? "").split(/\s+/);

async function banner(props: ConsentBannerProps = {}, messages?: Record<string, string>) {
  return mount(
    <ConsentProvider value={snapshot()} onDecide={vi.fn()} onWithdraw={vi.fn()} messages={messages}>
      <ConsentBanner {...props} />
      <ConsentPreferences />
    </ConsentProvider>,
  );
}

const variants: Array<{ name: string; props: ConsentBannerProps }> = [
  { name: "bar", props: {} },
  { name: "bar top", props: { variant: "bar", position: "top" } },
  { name: "card", props: { variant: "card" } },
  { name: "corner", props: { variant: "corner" } },
];

describe("narrow viewports (CC-fancy-0016)", () => {
  it("has a short English default that is shorter than the full text", () => {
    expect(DEFAULT_MESSAGES[SHORT_KEY]).toBeTruthy();
    expect(DEFAULT_MESSAGES[SHORT_KEY]!.length).toBeLessThan(DEFAULT_MESSAGES[FULL_KEY]!.length / 2);
  });

  it.each(variants)("swaps to the short text below the sm breakpoint, with CSS only ($name)", async ({ props }) => {
    await banner(props);
    const short = q('[data-fancy-compliance="banner-body-short"]');
    const full = q('[data-fancy-compliance="banner-body-full"]');

    expect(short?.textContent).toBe(DEFAULT_MESSAGES[SHORT_KEY]);
    expect(full?.textContent).toBe(DEFAULT_MESSAGES[FULL_KEY]);
    // Short shows by default and hides from sm (640px) up; full is the reverse.
    // A media query, not JS width sniffing, so the server renders both.
    expect(classes('[data-fancy-compliance="banner-body-short"]')).toContain("sm:hidden");
    expect(classes('[data-fancy-compliance="banner-body-full"]')).toEqual(expect.arrayContaining(["hidden", "sm:inline"]));
    // Both sit inside the element the region is described by, and the hidden
    // one is display:none, so a screen reader hears exactly the visible text.
    const body = q('[data-fancy-compliance="banner-body"]')!;
    expect(body.contains(short)).toBe(true);
    expect(body.contains(full)).toBe(true);
    expect(q('[data-fancy-compliance="banner"]')!.getAttribute("aria-describedby")).toBe(body.id);
  });

  it("keeps the full text in the preferences dialog", async () => {
    await banner();
    await click(action("customise"));
    const summary = q('[role="dialog"] [data-fancy-compliance="preferences-summary"]');
    expect(summary?.textContent).toBe(DEFAULT_MESSAGES[FULL_KEY]);
  });

  it("takes both texts from the host's messages", async () => {
    await banner({}, { [SHORT_KEY]: "Kurz gesagt.", [FULL_KEY]: "Die ganze Geschichte." });
    expect(q('[data-fancy-compliance="banner-body-short"]')?.textContent).toBe("Kurz gesagt.");
    expect(q('[data-fancy-compliance="banner-body-full"]')?.textContent).toBe("Die ganze Geschichte.");
    await click(action("customise"));
    expect(q('[data-fancy-compliance="preferences-summary"]')?.textContent).toBe("Die ganze Geschichte.");
  });

  it("puts the bar's three actions in one row at a 320px viewport", async () => {
    await banner();
    // The bar is p-4 (16px a side) below sm, so at 320px its actions get 288px.
    expect(classes('[data-fancy-compliance="banner"]')).toContain("p-4");
    // The actions go three across once their container is 17rem (272px) wide,
    // and stack below that: a container query, so it follows the width the
    // actions really have, whatever padding the app adds.
    expect(classes('[data-fancy-compliance="banner-layout"]')).toContain("@container");
    const actions = classes('[data-fancy-compliance="banner-actions"]');
    expect(actions).toEqual(expect.arrayContaining(["grid-cols-1", "@min-[17rem]:grid-cols-3", "gap-2"]));
    const available = 320 - 2 * 16;
    expect(available).toBeGreaterThanOrEqual(17 * 16);
    // Each action at 320px: (288 - two 8px gaps) / 3, about 91px.
    expect((available - 2 * 8) / 3).toBeGreaterThan(90);
  });

  it("still stacks the corner's actions, which do not fit three across in 20rem", async () => {
    await banner({ variant: "corner" });
    const actions = classes('[data-fancy-compliance="banner-actions"]');
    expect(actions).toContain("grid-cols-1");
    expect(actions.some((c) => c.includes("grid-cols-3"))).toBe(false);
  });

  it.each(variants)("keeps every action at least 44px tall, at every width ($name)", async ({ props }) => {
    await banner(props);
    for (const name of ["accept-all", "reject-all", "customise"]) {
      const cls = action(name)!.className.split(/\s+/);
      expect(cls).toContain("min-h-11");
      // No responsive variant may lower the minimum height.
      expect(cls.filter((c) => /(^|:)min-h-/.test(c) && c !== "min-h-11")).toEqual([]);
      expect(cls.filter((c) => /(^|:)(h|max-h)-/.test(c))).toEqual([]);
    }
  });

  it("gives the three bar actions identical classes on a phone too", async () => {
    await banner();
    const accept = action("accept-all")!.className;
    const reject = action("reject-all")!.className;
    const customise = action("customise")!.className;
    expect(reject).toBe(accept);
    expect(customise).toBe(accept);
    // Long translated words wrap inside the button instead of spilling out.
    expect(accept.split(/\s+/)).toContain("break-words");
    // Under 20rem of row (a 320px phone) the labels drop to the md button
    // text size so each stays on one line; all three alike.
    expect(accept.split(/\s+/)).toContain("@max-[20rem]:text-sm");
  });
});
