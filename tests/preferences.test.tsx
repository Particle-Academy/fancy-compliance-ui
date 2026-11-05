import { afterEach, describe, expect, it, vi } from "vitest";
import { ConsentBanner, ConsentPreferences, ConsentPreferencesTrigger, ConsentProvider } from "../src";
import { action, cleanupDom, click, decided, key, mount, q, snapshot } from "./helpers";

afterEach(cleanupDom);

function sw(category: string): HTMLButtonElement | null {
  return q<HTMLButtonElement>(`[data-fancy-compliance-category="${category}"] [role="switch"]`);
}

describe("ConsentPreferences", () => {
  it("opens from the banner as a labelled modal dialog", async () => {
    await mount(
      <ConsentProvider value={snapshot()} onDecide={vi.fn()} onWithdraw={vi.fn()}>
        <ConsentBanner />
        <ConsentPreferences />
      </ConsentProvider>,
    );
    expect(q('[data-fancy-compliance="preferences"]')).toBeNull();

    await click(action("customise"));
    const dialog = q('[data-fancy-compliance="preferences"]')!;
    expect(dialog.getAttribute("role")).toBe("dialog");
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(document.getElementById(dialog.getAttribute("aria-labelledby")!)?.textContent).toBe("Privacy settings");
    expect(dialog.contains(document.activeElement)).toBe(true);
  });

  it("starts every optional category OFF before a decision: nothing is pre-ticked", async () => {
    await mount(
      <ConsentProvider value={snapshot()} onDecide={vi.fn()} onWithdraw={vi.fn()} preferencesOpen onPreferencesOpenChange={vi.fn()}>
        <ConsentPreferences />
      </ConsentProvider>,
    );
    expect(sw("analytics")!.getAttribute("aria-checked")).toBe("false");
    expect(sw("marketing")!.getAttribute("aria-checked")).toBe("false");
  });

  it("shows necessary as always on, and it cannot be switched off", async () => {
    await mount(
      <ConsentProvider value={snapshot()} onDecide={vi.fn()} onWithdraw={vi.fn()} preferencesOpen onPreferencesOpenChange={vi.fn()}>
        <ConsentPreferences />
      </ConsentProvider>,
    );
    const necessary = sw("necessary")!;
    expect(necessary.getAttribute("aria-checked")).toBe("true");
    expect(necessary.hasAttribute("disabled")).toBe(true);
    expect(q('[data-fancy-compliance-category="necessary"]')!.textContent).toContain("Always on");
  });

  it("describes each category and its purposes, named for assistive technology", async () => {
    await mount(
      <ConsentProvider value={snapshot()} onDecide={vi.fn()} onWithdraw={vi.fn()} preferencesOpen onPreferencesOpenChange={vi.fn()}>
        <ConsentPreferences />
      </ConsentProvider>,
    );
    const row = q('[data-fancy-compliance-category="analytics"]')!;
    expect(row.textContent).toContain("Analytics");
    expect(row.textContent).toContain("Helps us understand how the site is used.");
    expect(row.textContent).toContain("Measuring page visits");
    const control = sw("analytics")!;
    expect(document.getElementById(control.getAttribute("aria-labelledby")!)?.textContent).toBe("Analytics");
    expect(document.getElementById(control.getAttribute("aria-describedby")!)?.textContent).toContain("Helps us understand");
    expect(row.querySelector("label")!.className).toContain("min-h-11");
  });

  it("saves the categories the person switched on", async () => {
    const onDecide = vi.fn();
    await mount(
      <ConsentProvider value={snapshot()} onDecide={onDecide} onWithdraw={vi.fn()} preferencesOpen onPreferencesOpenChange={vi.fn()}>
        <ConsentPreferences />
      </ConsentProvider>,
    );
    await click(sw("analytics"));
    await click(action("save"));
    expect(onDecide).toHaveBeenCalledWith({ granted: ["analytics"], source: "preferences" });
  });

  it("records switching a category off as a withdrawal", async () => {
    const onWithdraw = vi.fn();
    const onDecide = vi.fn();
    await mount(
      <ConsentProvider value={decided(["analytics", "marketing"])} onDecide={onDecide} onWithdraw={onWithdraw} preferencesOpen onPreferencesOpenChange={vi.fn()}>
        <ConsentPreferences />
      </ConsentProvider>,
    );
    expect(sw("marketing")!.getAttribute("aria-checked")).toBe("true");
    await click(sw("marketing"));
    await click(action("save"));
    expect(onWithdraw).toHaveBeenCalledWith({ categories: ["marketing"], source: "preferences" });
    expect(onDecide).not.toHaveBeenCalled();
  });

  it("withdraws everything with reject all once the person has consented", async () => {
    const onWithdraw = vi.fn();
    await mount(
      <ConsentProvider value={decided(["analytics"])} onDecide={vi.fn()} onWithdraw={onWithdraw} preferencesOpen onPreferencesOpenChange={vi.fn()}>
        <ConsentPreferences />
      </ConsentProvider>,
    );
    await click(q('[data-fancy-compliance="preferences"] [data-fancy-compliance-action="reject-all"]'));
    expect(onWithdraw).toHaveBeenCalledWith({ categories: null, source: "preferences" });
  });

  it("is reachable at any time from the exported trigger, and Escape returns focus to it", async () => {
    await mount(
      <ConsentProvider value={decided(["analytics"])} onDecide={vi.fn()} onWithdraw={vi.fn()}>
        <ConsentPreferencesTrigger />
        <ConsentPreferences />
      </ConsentProvider>,
    );
    const trigger = q<HTMLButtonElement>('[data-fancy-compliance="trigger"]')!;
    expect(trigger.textContent).toBe("Privacy settings");
    trigger.focus();
    await click(trigger);
    expect(q('[data-fancy-compliance="preferences"]')).not.toBeNull();

    await key(document.activeElement, "Escape");
    expect(q('[data-fancy-compliance="preferences"]')).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it("resolves category text from the host's messages first, then the server, then English", async () => {
    const value = snapshot();
    value.categories[2] = { ...value.categories[2]!, labelText: null };
    value.categories.push({ key: "video", label: "host.consent.video", labelText: null, description: "host.consent.video.d", descriptionText: null, purposes: [], required: false });
    await mount(
      <ConsentProvider value={value} onDecide={vi.fn()} onWithdraw={vi.fn()} preferencesOpen onPreferencesOpenChange={vi.fn()} messages={{ "fancy-compliance::categories.analytics.label": "Statistik" }}>
        <ConsentPreferences />
      </ConsentProvider>,
    );
    expect(q('[data-fancy-compliance-category="analytics"]')!.textContent).toContain("Statistik");
    expect(q('[data-fancy-compliance-category="marketing"]')!.textContent).toContain("Marketing");
    expect(q('[data-fancy-compliance-category="video"]')!.textContent).toContain("host.consent.video");
  });

  it("carries the direction onto the portalled dialog", async () => {
    await mount(
      <ConsentProvider value={snapshot()} onDecide={vi.fn()} onWithdraw={vi.fn()} preferencesOpen onPreferencesOpenChange={vi.fn()} dir="rtl">
        <ConsentPreferences />
      </ConsentProvider>,
    );
    expect(q('[data-fancy-compliance="preferences"]')!.getAttribute("dir")).toBe("rtl");
  });
});
