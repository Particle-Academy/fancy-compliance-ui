import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ConsentBanner,
  ConsentPreferences,
  ConsentPreferencesTrigger,
  ConsentProvider,
  type ConsentBannerProps,
} from "../src";
import { action, cleanupDom, mount, q, snapshot } from "./helpers";

/**
 * Every consent control carries `data-agent-off-limits="consent"`, the kit's
 * plain-attribute fence: agent-integrations' DOM navigation refuses any agent
 * action inside it, and describes the area only as "consent <role>". The
 * attribute is the whole contract, so this package imports nothing to get it.
 */
const MARKER = "data-agent-off-limits";

afterEach(cleanupDom);

/** Every control a person could use, in `root`: all of them must sit inside the fence. */
function controls(root: Element): Element[] {
  return Array.from(root.querySelectorAll("button, input, select, textarea, a[href], [role=switch], [role=checkbox], [role=button]"));
}

function expectFenced(root: Element | null) {
  expect(root).not.toBeNull();
  expect(root!.getAttribute(MARKER)).toBe("consent");
  const inside = controls(root!);
  expect(inside.length).toBeGreaterThan(0);
  for (const el of inside) expect(el.closest(`[${MARKER}]`)).toBe(root);
}

describe("consent controls are off-limits to agents", () => {
  const variants: Array<{ name: string; props: ConsentBannerProps }> = [
    { name: "bar (default)", props: {} },
    { name: "bar top", props: { variant: "bar", position: "top" } },
    { name: "card", props: { variant: "card" } },
    { name: "card top-end", props: { variant: "card", position: "top-end" } },
    { name: "corner", props: { variant: "corner" } },
    { name: "corner bottom-end", props: { variant: "corner", position: "bottom-end" } },
  ];

  for (const { name, props } of variants) {
    it(`the ${name} banner marks itself and fences all three choices`, async () => {
      await mount(
        <ConsentProvider value={snapshot()} onDecide={vi.fn()} onWithdraw={vi.fn()}>
          <ConsentBanner {...props} />
        </ConsentProvider>,
      );
      const banner = q('[data-fancy-compliance="banner"]');
      expectFenced(banner);
      for (const choice of ["accept-all", "reject-all", "customise"]) {
        expect(action(choice)!.closest(`[${MARKER}]`)).toBe(banner);
      }
      // The existing handles stay.
      expect(banner!.getAttribute("data-fancy-compliance-variant")).toBe(props.variant ?? "bar");
    });
  }

  it("the preferences dialog marks itself and fences every switch and button", async () => {
    await mount(
      <ConsentProvider value={snapshot()} onDecide={vi.fn()} onWithdraw={vi.fn()} preferencesOpen onPreferencesOpenChange={vi.fn()}>
        <ConsentPreferences />
      </ConsentProvider>,
    );
    const dialog = q('[data-fancy-compliance="preferences"]');
    expectFenced(dialog);
    expect(dialog!.getAttribute("role")).toBe("dialog");
    for (const el of Array.from(document.querySelectorAll("[data-fancy-compliance-switch], [data-fancy-compliance-action]"))) {
      expect(el.closest(`[${MARKER}]`)).toBe(dialog);
    }
  });

  it("the preferences trigger is marked", async () => {
    await mount(
      <ConsentProvider value={snapshot()} onDecide={vi.fn()} onWithdraw={vi.fn()}>
        <ConsentPreferencesTrigger />
      </ConsentProvider>,
    );
    const trigger = q('[data-fancy-compliance="trigger"]');
    expect(trigger).not.toBeNull();
    expect(trigger!.getAttribute(MARKER)).toBe("consent");
  });

  it("no control any component renders sits outside the fence", async () => {
    await mount(
      <ConsentProvider value={snapshot()} onDecide={vi.fn()} onWithdraw={vi.fn()} preferencesOpen onPreferencesOpenChange={vi.fn()}>
        <ConsentBanner />
        <ConsentPreferences />
        <ConsentPreferencesTrigger />
      </ConsentProvider>,
    );
    const all = controls(document.body);
    expect(all.length).toBeGreaterThan(5);
    for (const el of all) expect(el.closest(`[${MARKER}]`)).not.toBeNull();
  });
});
// That no source imports agent-integrations is checked in packaging.test.ts,
// the one test with Node types.
