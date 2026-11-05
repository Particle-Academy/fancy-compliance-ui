import { act } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ConsentProvider, ConsentReloadNotice, ConsentScript, useConsentScript, type ConsentScriptStatus } from "../src";
import { action, cleanupDom, decided, mount, q, snapshot } from "./helpers";

afterEach(cleanupDom);

function scripts(): HTMLScriptElement[] {
  return Array.from(document.head.querySelectorAll<HTMLScriptElement>('script[data-fancy-compliance-script="analytics"]'));
}

describe("useConsentScript", () => {
  it("does not insert the script before consent", async () => {
    await mount(
      <ConsentProvider value={snapshot()} onDecide={vi.fn()} onWithdraw={vi.fn()}>
        <ConsentScript category="analytics" src="https://analytics.example/tag.js" />
      </ConsentProvider>,
    );
    expect(scripts()).toHaveLength(0);
  });

  it("inserts it once consent is given, once only", async () => {
    const m = await mount(
      <ConsentProvider value={snapshot()} onDecide={vi.fn()} onWithdraw={vi.fn()}>
        <ConsentScript category="analytics" src="https://analytics.example/tag.js" />
      </ConsentProvider>,
    );
    await m.rerender(
      <ConsentProvider value={decided(["analytics"])} onDecide={vi.fn()} onWithdraw={vi.fn()}>
        <ConsentScript category="analytics" src="https://analytics.example/tag.js" />
        <ConsentScript category="analytics" src="https://analytics.example/tag.js" />
      </ConsentProvider>,
    );
    expect(scripts()).toHaveLength(1);
    expect(scripts()[0]!.src).toBe("https://analytics.example/tag.js");
    expect(scripts()[0]!.async).toBe(true);
  });

  it("stops a script that can be stopped, on withdrawal", async () => {
    const stop = vi.fn();
    let status: ConsentScriptStatus | undefined;
    function Probe({ on }: { on: boolean }) {
      status = useConsentScript({ category: "analytics", src: "https://analytics.example/tag.js", onWithdraw: stop }).status;
      return on ? null : null;
    }
    const m = await mount(
      <ConsentProvider value={decided(["analytics"])} onDecide={vi.fn()} onWithdraw={vi.fn()}>
        <Probe on />
      </ConsentProvider>,
    );
    await act(async () => scripts()[0]!.dispatchEvent(new Event("load")));
    expect(status).toBe("loaded");

    await m.rerender(
      <ConsentProvider value={decided([])} onDecide={vi.fn()} onWithdraw={vi.fn()}>
        <Probe on={false} />
      </ConsentProvider>,
    );
    expect(stop).toHaveBeenCalledTimes(1);
    expect(scripts()).toHaveLength(0);
    expect(status).toBe("stopped");
    expect(q('[data-fancy-compliance="reload-notice"]')).toBeNull();
  });

  it("says honestly when a script that already ran cannot be stopped, and offers a reload", async () => {
    const onReload = vi.fn();
    let status: ConsentScriptStatus | undefined;
    function Probe() {
      status = useConsentScript({ category: "analytics", src: "https://analytics.example/tag.js" }).status;
      return null;
    }
    const m = await mount(
      <ConsentProvider value={decided(["analytics"])} onDecide={vi.fn()} onWithdraw={vi.fn()} onReload={onReload}>
        <Probe />
        <ConsentReloadNotice />
      </ConsentProvider>,
    );
    await act(async () => scripts()[0]!.dispatchEvent(new Event("load")));

    await m.rerender(
      <ConsentProvider value={decided([])} onDecide={vi.fn()} onWithdraw={vi.fn()} onReload={onReload}>
        <Probe />
        <ConsentReloadNotice />
      </ConsentProvider>,
    );
    expect(status).toBe("reload-required");
    expect(scripts()).toHaveLength(0);
    const notice = q('[data-fancy-compliance="reload-notice"]')!;
    expect(notice.getAttribute("role")).toBe("status");
    expect(notice.textContent).toContain("Reload the page to stop them completely.");
    action("reload")!.click();
    expect(onReload).toHaveBeenCalledTimes(1);
  });

  // Removing an async <script> that is still downloading does not stop it from
  // running when it arrives, so "still loading" is not "never ran".
  it("asks for a reload for a script that was still loading, too", async () => {
    let status: ConsentScriptStatus | undefined;
    function Probe() {
      status = useConsentScript({ category: "analytics", src: "https://analytics.example/tag.js" }).status;
      return null;
    }
    const m = await mount(
      <ConsentProvider value={decided(["analytics"])} onDecide={vi.fn()} onWithdraw={vi.fn()}>
        <Probe />
        <ConsentReloadNotice />
      </ConsentProvider>,
    );
    expect(status).toBe("loading");
    await m.rerender(
      <ConsentProvider value={decided([])} onDecide={vi.fn()} onWithdraw={vi.fn()}>
        <Probe />
        <ConsentReloadNotice />
      </ConsentProvider>,
    );
    expect(status).toBe("reload-required");
    expect(q('[data-fancy-compliance="reload-notice"]')).not.toBeNull();
  });

  it("reports blocked, and asks for no reload, when the script was never inserted", async () => {
    let status: ConsentScriptStatus | undefined;
    function Probe() {
      status = useConsentScript({ category: "analytics", src: "https://analytics.example/tag.js" }).status;
      return null;
    }
    const m = await mount(
      <ConsentProvider value={snapshot()} onDecide={vi.fn()} onWithdraw={vi.fn()}>
        <Probe />
        <ConsentReloadNotice />
      </ConsentProvider>,
    );
    await m.rerender(
      <ConsentProvider value={decided([])} onDecide={vi.fn()} onWithdraw={vi.fn()}>
        <Probe />
        <ConsentReloadNotice />
      </ConsentProvider>,
    );
    expect(status).toBe("blocked");
    expect(scripts()).toHaveLength(0);
    expect(q('[data-fancy-compliance="reload-notice"]')).toBeNull();
  });
});
