import { afterEach, describe, expect, it, vi } from "vitest";
import { ConsentGate, ConsentProvider, useConsent } from "../src";
import { cleanupDom, decided, mount, q, snapshot } from "./helpers";

afterEach(cleanupDom);

const tracker = <span data-testid="tracker">tracking pixel</span>;

describe("ConsentGate", () => {
  it("renders nothing of its children before consent", async () => {
    await mount(
      <ConsentProvider value={snapshot()} onDecide={vi.fn()} onWithdraw={vi.fn()}>
        <ConsentGate category="analytics">{tracker}</ConsentGate>
      </ConsentProvider>,
    );
    expect(q('[data-testid="tracker"]')).toBeNull();
    expect(q('[data-fancy-compliance-gate="analytics"]')!.getAttribute("data-fancy-compliance-state")).toBe("blocked");
  });

  it("renders the fallback instead, if one is given", async () => {
    await mount(
      <ConsentProvider value={snapshot()} onDecide={vi.fn()} onWithdraw={vi.fn()}>
        <ConsentGate category="analytics" fallback={<em data-testid="fallback">Enable analytics to see this</em>}>
          {tracker}
        </ConsentGate>
      </ConsentProvider>,
    );
    expect(q('[data-testid="tracker"]')).toBeNull();
    expect(q('[data-testid="fallback"]')).not.toBeNull();
  });

  it("renders its children once the category is granted, and removes them on withdrawal", async () => {
    const m = await mount(
      <ConsentProvider value={decided(["analytics"])} onDecide={vi.fn()} onWithdraw={vi.fn()}>
        <ConsentGate category="analytics">{tracker}</ConsentGate>
      </ConsentProvider>,
    );
    expect(q('[data-testid="tracker"]')).not.toBeNull();
    expect(q('[data-fancy-compliance-gate="analytics"]')!.getAttribute("data-fancy-compliance-state")).toBe("granted");

    await m.rerender(
      <ConsentProvider value={decided([])} onDecide={vi.fn()} onWithdraw={vi.fn()}>
        <ConsentGate category="analytics">{tracker}</ConsentGate>
      </ConsentProvider>,
    );
    expect(q('[data-testid="tracker"]')).toBeNull();
  });

  it("stays closed when the decision was made under an older policy", async () => {
    const stale = decided(["analytics"], { needsConsent: true });
    stale.consent!.current = false;
    await mount(
      <ConsentProvider value={stale} onDecide={vi.fn()} onWithdraw={vi.fn()}>
        <ConsentGate category="analytics">{tracker}</ConsentGate>
      </ConsentProvider>,
    );
    expect(q('[data-testid="tracker"]')).toBeNull();
  });

  it("stays closed for a category the host never configured", async () => {
    const value = decided(["analytics"]);
    value.consent!.granted.push("adtech");
    await mount(
      <ConsentProvider value={value} onDecide={vi.fn()} onWithdraw={vi.fn()}>
        <ConsentGate category="adtech">{tracker}</ConsentGate>
      </ConsentProvider>,
    );
    expect(q('[data-testid="tracker"]')).toBeNull();
  });

  it("always renders the required category", async () => {
    await mount(
      <ConsentProvider value={snapshot()} onDecide={vi.fn()} onWithdraw={vi.fn()}>
        <ConsentGate category="necessary">{tracker}</ConsentGate>
      </ConsentProvider>,
    );
    expect(q('[data-testid="tracker"]')).not.toBeNull();
  });
});

describe("useConsent", () => {
  it("reads consent; it has no way to grant without the person", async () => {
    let api: ReturnType<typeof useConsent> | undefined;
    function Probe() {
      api = useConsent();
      return null;
    }
    await mount(
      <ConsentProvider value={decided(["analytics"])} onDecide={vi.fn()} onWithdraw={vi.fn()}>
        <Probe />
      </ConsentProvider>,
    );
    expect(api!.allows("analytics")).toBe(true);
    expect(api!.allows("marketing")).toBe(false);
    expect(api!.needsConsent).toBe(false);
    expect(Object.keys(api!).filter((k) => /grant|accept/i.test(k))).toEqual([]);
  });
});
