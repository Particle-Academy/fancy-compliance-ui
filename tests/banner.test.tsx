import { afterEach, describe, expect, it, vi } from "vitest";
import { ConsentBanner, ConsentProvider } from "../src";
import { action, cleanupDom, click, decided, mount, q, snapshot } from "./helpers";

afterEach(cleanupDom);

describe("ConsentBanner", () => {
  it("shows on a first visit and not once the person has decided", async () => {
    const m = await mount(
      <ConsentProvider value={snapshot()} onDecide={vi.fn()} onWithdraw={vi.fn()}>
        <ConsentBanner />
      </ConsentProvider>,
    );
    expect(q('[data-fancy-compliance="banner"]')).not.toBeNull();

    await m.rerender(
      <ConsentProvider value={decided([])} onDecide={vi.fn()} onWithdraw={vi.fn()}>
        <ConsentBanner />
      </ConsentProvider>,
    );
    expect(q('[data-fancy-compliance="banner"]')).toBeNull();
  });

  it("shows again when the policy version changed", async () => {
    const stale = decided(["analytics"], { needsConsent: true });
    stale.consent!.current = false;
    await mount(
      <ConsentProvider value={stale} onDecide={vi.fn()} onWithdraw={vi.fn()}>
        <ConsentBanner />
      </ConsentProvider>,
    );
    expect(q('[data-fancy-compliance="banner"]')).not.toBeNull();
  });

  it("accepts all optional categories", async () => {
    const onDecide = vi.fn();
    await mount(
      <ConsentProvider value={snapshot()} onDecide={onDecide} onWithdraw={vi.fn()}>
        <ConsentBanner />
      </ConsentProvider>,
    );
    await click(action("accept-all"));
    expect(onDecide).toHaveBeenCalledWith({ granted: ["analytics", "marketing"], source: "banner" });
  });

  it("rejects all optional categories in one click", async () => {
    const onDecide = vi.fn();
    await mount(
      <ConsentProvider value={snapshot()} onDecide={onDecide} onWithdraw={vi.fn()}>
        <ConsentBanner />
      </ConsentProvider>,
    );
    await click(action("reject-all"));
    expect(onDecide).toHaveBeenCalledWith({ granted: [], source: "banner" });
  });

  it("makes reject exactly as prominent as accept", async () => {
    await mount(
      <ConsentProvider value={snapshot()} onDecide={vi.fn()} onWithdraw={vi.fn()}>
        <ConsentBanner />
      </ConsentProvider>,
    );
    const accept = action("accept-all")!;
    const reject = action("reject-all")!;
    const customise = action("customise")!;

    for (const other of [reject, customise]) {
      expect(other.tagName).toBe(accept.tagName);
      expect(other.className).toBe(accept.className);
      expect(other.getAttribute("data-fancy-compliance-size")).toBe(accept.getAttribute("data-fancy-compliance-size"));
      expect(other.parentElement).toBe(accept.parentElement);
      expect(other.hasAttribute("disabled")).toBe(false);
    }
    expect(accept.className).toContain("min-h-11");
    expect(accept.textContent).toBe("Accept all");
    expect(reject.textContent).toBe("Reject all");
  });

  it("is a labelled, non-modal region that does not take focus", async () => {
    const before = document.activeElement;
    await mount(
      <ConsentProvider value={snapshot()} onDecide={vi.fn()} onWithdraw={vi.fn()}>
        <ConsentBanner />
      </ConsentProvider>,
    );
    const banner = q('[data-fancy-compliance="banner"]')!;
    expect(banner.getAttribute("role")).toBe("region");
    expect(banner.hasAttribute("aria-modal")).toBe(false);
    const labelledBy = banner.getAttribute("aria-labelledby")!;
    expect(document.getElementById(labelledBy)?.textContent).toBe("Your privacy choices");
    expect(document.activeElement).toBe(before);
  });

  it("uses the host's messages and direction", async () => {
    await mount(
      <ConsentProvider
        value={snapshot()}
        onDecide={vi.fn()}
        onWithdraw={vi.fn()}
        dir="rtl"
        messages={{ "fancy-compliance.action.accept-all": "قبول الكل", "fancy-compliance.action.reject-all": "رفض الكل" }}
      >
        <ConsentBanner />
      </ConsentProvider>,
    );
    expect(q('[data-fancy-compliance="banner"]')!.getAttribute("dir")).toBe("rtl");
    expect(action("accept-all")!.textContent).toBe("قبول الكل");
    expect(action("reject-all")!.textContent).toBe("رفض الكل");
    // Untranslated keys fall back to English, never to the raw key.
    expect(action("customise")!.textContent).toBe("Customise");
  });

  it("says so when a decision cannot be saved, and lets the person try again", async () => {
    const onDecide = vi.fn().mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce(undefined);
    await mount(
      <ConsentProvider value={snapshot()} onDecide={onDecide} onWithdraw={vi.fn()}>
        <ConsentBanner />
      </ConsentProvider>,
    );
    await click(action("reject-all"));
    expect(q('[data-fancy-compliance="error"]')?.getAttribute("role")).toBe("alert");
    expect(action("reject-all")!.hasAttribute("disabled")).toBe(false);

    await click(action("reject-all"));
    expect(onDecide).toHaveBeenCalledTimes(2);
    expect(q('[data-fancy-compliance="error"]')).toBeNull();
  });

  it("reports what the person did as observable activity", async () => {
    const onActivity = vi.fn();
    await mount(
      <ConsentProvider value={snapshot()} onDecide={vi.fn()} onWithdraw={vi.fn()} onActivity={onActivity}>
        <ConsentBanner />
      </ConsentProvider>,
    );
    await click(action("accept-all"));
    expect(onActivity).toHaveBeenCalledWith({ type: "consent.decided", actor: "human", source: "banner", granted: ["analytics", "marketing"] });
  });
});
