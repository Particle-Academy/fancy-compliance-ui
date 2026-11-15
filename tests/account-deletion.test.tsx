import { afterEach, describe, expect, it, vi } from "vitest";
import { renderToString } from "react-dom/server";
import { AccountDeletionPanel, DEFAULT_MESSAGES } from "../src";
import { TEXT_CLASS } from "../src/styles";
import { action, cleanupDom, click, mount, q } from "./helpers";
import { ERASURE_CANCELLED, ERASURE_EXECUTED, ERASURE_PARTIAL, ERASURE_PENDING } from "./data-rights-fixtures";

/*
 * AccountDeletionPanel (CC-fancy-0038 phase 4): a controlled view of a
 * person's erasure request, as fancy-compliance's `GET /fancy-compliance/erasure`
 * serves it. The request is a staged write: propose, then confirm.
 */

afterEach(cleanupDom);

function root(): HTMLElement {
  return q('[data-fancy-compliance="account-deletion"]')!;
}

describe("AccountDeletionPanel", () => {
  it("with no request, offers one and says how long the grace period is", async () => {
    await mount(<AccountDeletionPanel erasure={null} graceDays={30} />);

    expect(root().getAttribute("data-erasure-status")).toBe("none");
    expect(root().hasAttribute("data-erasure-id")).toBe(false);
    expect(action("erasure-request")).not.toBeNull();
    expect(q('[data-fancy-compliance="erasure-intro"]')!.textContent).toBe(
      "When you ask, your account and data are deleted after 30 days. Until then you can cancel.",
    );
  });

  it("says deletion is immediate when the grace period is 0", async () => {
    await mount(<AccountDeletionPanel erasure={null} graceDays={0} />);

    expect(q('[data-fancy-compliance="erasure-intro"]')!.textContent).toBe(DEFAULT_MESSAGES["fancy-compliance.erasure.intro-immediate"]);
  });

  it("stages the request: the first click proposes, only confirm calls onRequest", async () => {
    const onRequest = vi.fn();
    await mount(<AccountDeletionPanel erasure={null} graceDays={30} onRequest={onRequest} />);

    await click(action("erasure-request"));
    expect(onRequest).not.toHaveBeenCalled();
    expect(q('[data-fancy-compliance="erasure-confirm-step"]')).not.toBeNull();
    expect(action("erasure-request")).toBeNull();

    await click(action("erasure-confirm"));
    expect(onRequest).toHaveBeenCalledTimes(1);
  });

  it("lets the person keep the account from the confirm step", async () => {
    const onRequest = vi.fn();
    await mount(<AccountDeletionPanel erasure={null} graceDays={30} onRequest={onRequest} />);

    await click(action("erasure-request"));
    await click(action("erasure-keep"));
    expect(onRequest).not.toHaveBeenCalled();
    expect(q('[data-fancy-compliance="erasure-confirm-step"]')).toBeNull();
    expect(action("erasure-request")).not.toBeNull();
  });

  it("calls onRequest on one click when pendingMode is off", async () => {
    const onRequest = vi.fn();
    await mount(<AccountDeletionPanel erasure={null} graceDays={30} pendingMode={false} onRequest={onRequest} />);

    await click(action("erasure-request"));
    expect(onRequest).toHaveBeenCalledTimes(1);
    expect(q('[data-fancy-compliance="erasure-confirm-step"]')).toBeNull();
  });

  it("can hold the confirm step as a controlled prop", async () => {
    const onConfirmingChange = vi.fn();
    const mounted = await mount(<AccountDeletionPanel erasure={null} graceDays={30} confirming={false} onConfirmingChange={onConfirmingChange} />);

    await click(action("erasure-request"));
    expect(onConfirmingChange).toHaveBeenCalledWith(true);
    expect(q('[data-fancy-compliance="erasure-confirm-step"]')).toBeNull();

    await mounted.rerender(<AccountDeletionPanel erasure={null} graceDays={30} confirming onConfirmingChange={onConfirmingChange} />);
    expect(q('[data-fancy-compliance="erasure-confirm-step"]')).not.toBeNull();
  });

  it("disables confirm while requesting", async () => {
    const onRequest = vi.fn();
    await mount(<AccountDeletionPanel erasure={null} graceDays={30} confirming requesting onRequest={onRequest} />);

    expect(action("erasure-confirm")!.disabled).toBe(true);
    await click(action("erasure-confirm"));
    expect(onRequest).not.toHaveBeenCalled();
  });

  it("shows a pending request with its due date, the days left, and a cancel", async () => {
    const onCancel = vi.fn();
    await mount(<AccountDeletionPanel erasure={ERASURE_PENDING} graceDays={30} now="2026-11-20T09:30:00Z" onCancel={onCancel} />);

    expect(root().getAttribute("data-erasure-status")).toBe("pending");
    expect(root().getAttribute("data-erasure-id")).toBe(ERASURE_PENDING.id);
    expect(action("erasure-request")).toBeNull();
    expect(q('[data-fancy-compliance="erasure-due"] time')!.getAttribute("dateTime")).toBe(ERASURE_PENDING.dueAt);
    expect(q('[data-fancy-compliance="erasure-countdown"]')!.textContent).toBe("25 days left to cancel");

    await click(action("erasure-cancel"));
    expect(onCancel).toHaveBeenCalledWith(ERASURE_PENDING.id);
  });

  it("shows only the due date when it is not told the time", async () => {
    await mount(<AccountDeletionPanel erasure={ERASURE_PENDING} graceDays={30} />);

    expect(q('[data-fancy-compliance="erasure-due"]')).not.toBeNull();
    expect(q('[data-fancy-compliance="erasure-countdown"]')).toBeNull();
  });

  it("disables cancel while cancelling", async () => {
    const onCancel = vi.fn();
    await mount(<AccountDeletionPanel erasure={ERASURE_PENDING} graceDays={30} cancelling onCancel={onCancel} />);

    expect(action("erasure-cancel")!.disabled).toBe(true);
    await click(action("erasure-cancel"));
    expect(onCancel).not.toHaveBeenCalled();
  });

  it("says a cancelled request deleted nothing, and offers a new one", async () => {
    await mount(<AccountDeletionPanel erasure={ERASURE_CANCELLED} graceDays={30} />);

    expect(root().getAttribute("data-erasure-status")).toBe("cancelled");
    expect(q('[data-fancy-compliance="erasure-state"]')!.textContent).toBe(DEFAULT_MESSAGES["fancy-compliance.erasure.state.cancelled"]);
    expect(action("erasure-request")).not.toBeNull();
    expect(action("erasure-cancel")).toBeNull();
  });

  it("after execution, lists what was kept and why, per table", async () => {
    await mount(<AccountDeletionPanel erasure={ERASURE_EXECUTED} graceDays={30} />);

    expect(root().getAttribute("data-erasure-status")).toBe("executed");
    expect(action("erasure-request")).toBeNull();
    const retained = Array.from(document.querySelectorAll("[data-erasure-retained]"));
    expect(retained.map((r) => r.getAttribute("data-erasure-retained"))).toEqual(["fancy_compliance_consents", "council_events"]);
    const consents = q('[data-erasure-retained="fancy_compliance_consents"]')!;
    expect(consents.getAttribute("data-erasure-registrant")).toBe("fancy-compliance.consents");
    expect(consents.getAttribute("data-erasure-rekeyed")).toBe("true");
    expect(consents.textContent).toContain("Evidence of consent, kept under a pseudonym.");
    expect(consents.textContent).toContain("4");
    expect(q('[data-erasure-retained="council_events"]')!.textContent).toContain(DEFAULT_MESSAGES["fancy-compliance.erasure.retained.unchanged"]);
  });

  it("marks a partial execution, and names each registrant's status", async () => {
    await mount(<AccountDeletionPanel erasure={ERASURE_PARTIAL} graceDays={30} />);

    expect(root().getAttribute("data-erasure-status")).toBe("partially_executed");
    expect(q('[data-fancy-compliance="erasure-state"]')!.textContent).toBe(DEFAULT_MESSAGES["fancy-compliance.erasure.state.partially_executed"]);
    expect(q('[data-erasure-registrant-status="failed"]')!.getAttribute("data-erasure-registrant")).toBe("fancy-mlm");
    expect(action("erasure-request")).toBeNull();
  });

  it.each(["reauth_required", "rate_limited", "erasure_pending", "not_cancellable", "erasure_not_configured"])(
    "explains the %s error as an alert",
    async (code) => {
      await mount(<AccountDeletionPanel erasure={null} graceDays={30} error={code} />);

      const alert = q('[data-fancy-compliance="erasure-error"]')!;
      expect(alert.getAttribute("role")).toBe("alert");
      expect(alert.getAttribute("data-erasure-error")).toBe(code);
      expect(alert.textContent).toBe(DEFAULT_MESSAGES[`fancy-compliance.erasure.error.${code}`]);
    },
  );

  it("shows the host's reason when it blocked the request", async () => {
    await mount(<AccountDeletionPanel erasure={null} graceDays={30} error="erasure_blocked" blockedReason="An invoice is still open." />);

    const alert = q('[data-fancy-compliance="erasure-error"]')!;
    expect(alert.textContent).toContain(DEFAULT_MESSAGES["fancy-compliance.erasure.error.erasure_blocked"]);
    expect(alert.textContent).toContain("An invoice is still open.");
  });

  it("sets dir, the AAA text classes and app classes, and 44px targets", async () => {
    await mount(<AccountDeletionPanel erasure={ERASURE_PENDING} graceDays={30} dir="rtl" className="p-9" classNames={{ title: "text-xs" }} />);

    expect(root().getAttribute("dir")).toBe("rtl");
    expect(root().className).toContain("p-9");
    for (const cls of TEXT_CLASS.split(" ")) expect(root().className).toContain(cls);
    expect(q('[data-fancy-compliance="erasure-title"]')!.className).toContain("text-xs");
    expect(action("erasure-cancel")!.className).toContain("min-h-11");
  });

  it("is controlled: it never fetches", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const mounted = await mount(<AccountDeletionPanel erasure={null} graceDays={30} />);
    await mounted.rerender(<AccountDeletionPanel erasure={ERASURE_PENDING} graceDays={30} />);

    expect(root().getAttribute("data-erasure-status")).toBe("pending");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("renders the same markup on the server twice", () => {
    const html = renderToString(<AccountDeletionPanel erasure={ERASURE_PENDING} graceDays={30} now="2026-11-20T09:30:00Z" />);
    expect(html).toContain('data-erasure-status="pending"');
    expect(renderToString(<AccountDeletionPanel erasure={ERASURE_PENDING} graceDays={30} now="2026-11-20T09:30:00Z" />)).toBe(html);
  });
});
