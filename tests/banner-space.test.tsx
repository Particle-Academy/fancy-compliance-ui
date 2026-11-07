import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { ConsentBanner, ConsentProvider, type ConsentBannerProps } from "../src";
import { cleanupDom, decided, mount, q, snapshot } from "./helpers";

// jsdom has no layout and no ResizeObserver. This one records every observer so a
// test can report a new size, the way a browser would when the banner's text wraps.
class FakeResizeObserver {
  static instances: FakeResizeObserver[] = [];
  observed = new Set<Element>();
  constructor(private readonly callback: ResizeObserverCallback) {
    FakeResizeObserver.instances.push(this);
  }
  observe(target: Element) {
    this.observed.add(target);
  }
  unobserve(target: Element) {
    this.observed.delete(target);
  }
  disconnect() {
    this.observed.clear();
  }
  fire() {
    this.callback([], this as unknown as ResizeObserver);
  }
}

let bannerHeight = 120;

beforeEach(() => {
  FakeResizeObserver.instances = [];
  bannerHeight = 120;
  vi.stubGlobal("ResizeObserver", FakeResizeObserver);
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
    const height = this.matches('[data-fancy-compliance="banner"]') ? bannerHeight : 0;
    return { x: 0, y: 0, top: 0, left: 0, right: 0, bottom: height, width: 0, height, toJSON: () => ({}) } as DOMRect;
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  cleanupDom();
  document.documentElement.style.removeProperty("--fancy-consent-banner-h");
  document.documentElement.style.removeProperty("--fancy-consent-banner-top-h");
  document.body.removeAttribute("style");
});

const root = () => document.documentElement.style;

function Banner({ value = snapshot(), ...props }: ConsentBannerProps & { value?: ReturnType<typeof snapshot> }) {
  return (
    <ConsentProvider value={value} onDecide={vi.fn()} onWithdraw={vi.fn()}>
      <ConsentBanner {...props} />
    </ConsentProvider>
  );
}

async function resizeTo(height: number) {
  bannerHeight = height;
  await act(async () => FakeResizeObserver.instances.forEach((o) => o.fire()));
}

describe("ConsentBanner publishes the space it covers", () => {
  it("sets --fancy-consent-banner-h to a bottom bar's height while it shows", async () => {
    await mount(<Banner />);

    expect(q('[data-fancy-compliance="banner"]')).not.toBeNull();
    expect(root().getPropertyValue("--fancy-consent-banner-h")).toBe("120px");
    expect(root().getPropertyValue("--fancy-consent-banner-top-h")).toBe("");
  });

  it("follows the banner's size through a ResizeObserver", async () => {
    await mount(<Banner />);
    const observed = FakeResizeObserver.instances.flatMap((o) => [...o.observed]);
    expect(observed).toContain(q('[data-fancy-compliance="banner"]'));

    await resizeTo(184.4);
    expect(root().getPropertyValue("--fancy-consent-banner-h")).toBe("185px");
  });

  it("publishes a top bar as --fancy-consent-banner-top-h", async () => {
    await mount(<Banner position="top" />);

    expect(root().getPropertyValue("--fancy-consent-banner-top-h")).toBe("120px");
    expect(root().getPropertyValue("--fancy-consent-banner-h")).toBe("");
  });

  it("publishes a floating card by the edge it is anchored to", async () => {
    await mount(<Banner variant="corner" position="top-end" />);
    expect(root().getPropertyValue("--fancy-consent-banner-top-h")).toBe("120px");
  });

  it("removes the variable once the person has decided", async () => {
    const m = await mount(<Banner />);
    expect(root().getPropertyValue("--fancy-consent-banner-h")).toBe("120px");

    await m.rerender(<Banner value={decided([])} />);
    expect(q('[data-fancy-compliance="banner"]')).toBeNull();
    expect(root().getPropertyValue("--fancy-consent-banner-h")).toBe("");
  });

  it("removes the variable and stops observing on unmount", async () => {
    const m = await mount(<Banner />);
    await m.unmount();

    expect(root().getPropertyValue("--fancy-consent-banner-h")).toBe("");
    expect(FakeResizeObserver.instances.every((o) => o.observed.size === 0)).toBe(true);
  });

  it("publishes nothing when the banner is not shown", async () => {
    await mount(<Banner value={decided(["analytics"])} />);
    expect(root().getPropertyValue("--fancy-consent-banner-h")).toBe("");
  });
});

describe("ConsentBanner reserveSpace", () => {
  it("leaves the body alone by default", async () => {
    await mount(<Banner />);
    expect(document.body.style.paddingBottom).toBe("");
  });

  it("pads the body by the bottom banner's height and restores it afterwards", async () => {
    document.body.style.paddingBottom = "8px";
    const m = await mount(<Banner reserveSpace />);

    const padding = document.body.style.getPropertyValue("padding-bottom");
    expect(padding).toContain("var(--fancy-consent-banner-h, 0px)");
    expect(padding).toContain("8px");

    await m.rerender(<Banner reserveSpace value={decided([])} />);
    expect(document.body.style.paddingBottom).toBe("8px");
  });

  it("pads the top for a top bar", async () => {
    const m = await mount(<Banner variant="bar" position="top" reserveSpace />);
    expect(document.body.style.getPropertyValue("padding-top")).toContain("var(--fancy-consent-banner-top-h, 0px)");
    expect(document.body.style.paddingBottom).toBe("");

    await m.unmount();
    expect(document.body.style.paddingTop).toBe("");
  });
});
