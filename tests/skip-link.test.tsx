import { afterEach, describe, expect, it, vi } from "vitest";
import { renderToString } from "react-dom/server";
import { ConsentBanner, ConsentProvider, type ConsentBannerProps } from "../src";
import { cleanupDom, mount, snapshot } from "./helpers";

/**
 * `skipLink`: a slot rendered BEFORE the banner, so a page's "Skip to content"
 * link stays its first tab stop even though the banner (placed early, as its
 * docs ask) would otherwise put Accept / Reject / Customise first (WCAG 2.4.1).
 *
 * It is a ReactNode, not a hard dependency on react-fancy's SkipLink: pass that
 * (`<SkipLink />`, react-fancy 6.22 and later) or any link of your own. The slot
 * sits OUTSIDE the banner's agent fence: a skip link is page navigation, not a
 * consent control.
 */

afterEach(cleanupDom);

const FOCUSABLE = "a[href], button, input, select, textarea, [tabindex]:not([tabindex='-1'])";

const skip = (
  <a href="#main" data-skip-link="">
    Skip to content
  </a>
);

function firstFocusable(root: Element): Element | null {
  return root.querySelector(FOCUSABLE);
}

describe("ConsentBanner skipLink slot", () => {
  const variants: Array<{ name: string; props: ConsentBannerProps }> = [
    { name: "bar (default)", props: {} },
    { name: "bar top", props: { variant: "bar", position: "top" } },
    { name: "card", props: { variant: "card" } },
    { name: "corner", props: { variant: "corner", position: "bottom-end" } },
  ];

  for (const { name, props } of variants) {
    it(`${name}: the skip link is the first focusable element, before every banner button`, async () => {
      const { container } = await mount(
        <ConsentProvider value={snapshot()} onDecide={vi.fn()} onWithdraw={vi.fn()}>
          <ConsentBanner {...props} skipLink={skip} />
        </ConsentProvider>,
      );
      const first = firstFocusable(container);
      expect(first?.hasAttribute("data-skip-link")).toBe(true);
      const banner = container.querySelector('[data-fancy-compliance="banner"]')!;
      expect(banner).not.toBeNull();
      // Before the banner in document order, and not inside it.
      expect(first!.compareDocumentPosition(banner) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(banner.contains(first)).toBe(false);
    });
  }

  it("is outside the agent fence: it is page navigation, not a consent control", async () => {
    const { container } = await mount(
      <ConsentProvider value={snapshot()} onDecide={vi.fn()} onWithdraw={vi.fn()}>
        <ConsentBanner skipLink={skip} />
      </ConsentProvider>,
    );
    expect(container.querySelector("[data-skip-link]")!.closest("[data-agent-off-limits]")).toBeNull();
  });

  it("still renders once consent is decided and the banner is gone", async () => {
    const { container } = await mount(
      <ConsentProvider value={snapshot({ needsConsent: false })} onDecide={vi.fn()} onWithdraw={vi.fn()}>
        <ConsentBanner skipLink={skip} />
      </ConsentProvider>,
    );
    expect(container.querySelector('[data-fancy-compliance="banner"]')).toBeNull();
    expect(firstFocusable(container)?.hasAttribute("data-skip-link")).toBe(true);
  });

  it("without the slot, the banner renders exactly as before", async () => {
    const { container } = await mount(
      <ConsentProvider value={snapshot()} onDecide={vi.fn()} onWithdraw={vi.fn()}>
        <ConsentBanner />
      </ConsentProvider>,
    );
    expect(container.firstElementChild?.getAttribute("data-fancy-compliance")).toBe("banner");
    expect(container.children.length).toBe(1);
  });

  it("server-renders the slot first", () => {
    const html = renderToString(
      <ConsentProvider value={snapshot()} onDecide={vi.fn()} onWithdraw={vi.fn()}>
        <ConsentBanner skipLink={skip} />
      </ConsentProvider>,
    );
    expect(html.indexOf("data-skip-link")).toBeGreaterThanOrEqual(0);
    expect(html.indexOf("data-skip-link")).toBeLessThan(html.indexOf('data-fancy-compliance="banner"'));
  });
});
