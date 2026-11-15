import { useId, useState } from "react";
import { Button, Heading, Text } from "@particle-academy/react-fancy";
import { DATA_RIGHTS_OFF_LIMITS } from "./agents";
import { codeKey, createTranslator, fill } from "./messages";
import { ACTION_CLASS, ACTION_SIZE, BORDER_STRONG_CLASS, DIVIDE_CLASS, merge, SOFT_TEXT_CLASS, TEXT_CLASS } from "./styles";
import type { ConsentMessages, DataErasureView, Direction } from "./types";

/** One key per part, merged after ours so a conflicting app class wins. */
export interface AccountDeletionPanelClassNames {
  /** The root. Merged after `className`. */
  surface?: string;
  title?: string;
  intro?: string;
  /** The current state line ("Your account is scheduled for deletion."). */
  state?: string;
  /** The fenced group of controls. */
  actions?: string;
  /** Every button. */
  action?: string;
  confirmStep?: string;
  /** The due date and the countdown. */
  due?: string;
  registrants?: string;
  retained?: string;
  error?: string;
}

export interface AccountDeletionPanelProps {
  /** The person's latest erasure request (`GET /fancy-compliance/erasure`'s `erasure`), or null. */
  erasure: DataErasureView | null;
  /** The host's grace period in days (`graceDays`). 0 means deletion is immediate once confirmed. */
  graceDays: number;
  /**
   * The current time, ISO 8601, for the days-left countdown. Pass it from the
   * server so server and client render the same text; without it only the due
   * date is shown.
   */
  now?: string;
  /** A request is being sent: confirm is disabled and the panel is `aria-busy`. */
  requesting?: boolean;
  /** A cancel is being sent: cancel is disabled. */
  cancelling?: boolean;
  /** The last request failed: a server error code (`reauth_required`, `erasure_blocked`, ...) or `true`. */
  error?: string | boolean | null;
  /** The host's reason, for `erasure_blocked` (the 409 body's `reason`). */
  blockedReason?: string | null;
  /** Called when the person confirms. Sending it is the host's. */
  onRequest?: () => void;
  /** Called with the request id when the person cancels during the grace period. */
  onCancel?: (id: string) => void;
  /**
   * Staged write, on by default: the first click shows a confirm step and only
   * confirm calls `onRequest`. Off: one click calls it.
   */
  pendingMode?: boolean;
  /** Control the confirm step. Leave unset to let the panel hold it. */
  confirming?: boolean;
  onConfirmingChange?: (confirming: boolean) => void;
  messages?: ConsentMessages;
  /** BCP 47 locale for the default time format. Defaults to `en`, so server and client agree. */
  locale?: string;
  /** IANA zone for the default time format. Defaults to `UTC`, so server and client agree. */
  timeZone?: string;
  formatDate?: (iso: string) => string;
  headingLevel?: "h2" | "h3" | "h4";
  dir?: Direction;
  className?: string;
  classNames?: AccountDeletionPanelClassNames;
}

const STATES = ["pending", "cancelled", "executing", "executed", "partially_executed"];
const REGISTRANT_STATES = ["waiting", "done", "failed"];
const ERRORS = [
  "reauth_required",
  "rate_limited",
  "erasure_pending",
  "erasure_blocked",
  "not_cancellable",
  "erasure_not_configured",
  "unauthenticated",
  "forbidden",
];
const DAY = 86_400_000;

/**
 * A person's account deletion: request it, see the grace period count down,
 * cancel it, and afterwards see what was kept and why. Controlled: it renders
 * the `erasure` it is given and asks the host through `onRequest` / `onCancel`;
 * it never fetches.
 *
 * The request is a staged write (`pendingMode`, on by default). Every control
 * (request, confirm, keep, cancel) sits inside `DATA_RIGHTS_OFF_LIMITS`: an
 * agent may read the status, never ask for or cancel a deletion.
 *
 * Handles: `data-fancy-compliance="account-deletion"` with `data-erasure-status`
 * (`none` without a request) and `data-erasure-id`; actions `erasure-request`,
 * `erasure-confirm`, `erasure-keep`, `erasure-cancel`; registrants
 * `data-erasure-registrant` with `-status`; kept tables `data-erasure-retained`.
 */
export function AccountDeletionPanel({
  erasure,
  graceDays,
  now,
  requesting = false,
  cancelling = false,
  error = null,
  blockedReason = null,
  onRequest,
  onCancel,
  pendingMode = true,
  confirming: confirmingProp,
  onConfirmingChange,
  messages,
  locale = "en",
  timeZone = "UTC",
  formatDate,
  headingLevel = "h2",
  dir,
  className,
  classNames = {},
}: AccountDeletionPanelProps) {
  const titleId = useId();
  const t = createTranslator(messages);
  const [confirmingState, setConfirmingState] = useState(false);
  const confirming = confirmingProp ?? confirmingState;
  const setConfirming = (next: boolean) => {
    if (confirmingProp === undefined) setConfirmingState(next);
    onConfirmingChange?.(next);
  };

  const status = erasure?.status ?? "none";
  const canRequest = erasure === null || status === "cancelled";
  const errorCode = typeof error === "string" ? error : null;

  const time = (iso: string): string => {
    if (formatDate) return formatDate(iso);
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return iso;

    return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short", timeZone }).format(date);
  };

  const countdown = (): string | null => {
    if (!erasure || now === undefined) return null;
    const left = new Date(erasure.dueAt).getTime() - new Date(now).getTime();
    if (Number.isNaN(left)) return null;
    const days = Math.ceil(left / DAY);
    if (days <= 0) return t("fancy-compliance.erasure.countdown-none");
    if (days === 1) return t("fancy-compliance.erasure.countdown-one");

    return fill(t("fancy-compliance.erasure.countdown"), { days });
  };

  const request = () => {
    if (requesting) return;
    if (pendingMode && !confirming) {
      setConfirming(true);

      return;
    }
    setConfirming(false);
    onRequest?.();
  };

  const left = status === "pending" ? countdown() : null;
  const retained = (erasure?.registrants ?? []).flatMap((r) => r.retained.map((row) => ({ registrant: r.key, ...row })));
  const finished = status === "executed" || status === "partially_executed";

  return (
    <section
      dir={dir}
      aria-labelledby={titleId}
      aria-busy={requesting || cancelling ? "true" : undefined}
      data-fancy-compliance="account-deletion"
      data-erasure-status={status}
      data-erasure-id={erasure?.id}
      className={merge("flex flex-col gap-3 text-start", TEXT_CLASS, className, classNames.surface)}
    >
      <Heading as={headingLevel} size="md" id={titleId} data-fancy-compliance="erasure-title" className={merge(TEXT_CLASS, classNames.title)}>
        {t("fancy-compliance.erasure.title")}
      </Heading>

      {canRequest ? (
        <>
          <Text as="p" size="md" data-fancy-compliance="erasure-intro" className={merge(SOFT_TEXT_CLASS, classNames.intro)}>
            {graceDays > 0 ? fill(t("fancy-compliance.erasure.intro"), { days: graceDays }) : t("fancy-compliance.erasure.intro-immediate")}
          </Text>
          <Text as="p" size="sm" data-fancy-compliance="erasure-kept-note" className={SOFT_TEXT_CLASS}>
            {t("fancy-compliance.erasure.kept-note")}
          </Text>
        </>
      ) : null}

      {erasure ? (
        <Text as="p" size="md" weight="semibold" data-fancy-compliance="erasure-state" className={merge(TEXT_CLASS, classNames.state)}>
          {t(codeKey("fancy-compliance.erasure.state", erasure.status, STATES, "unknown"))}
        </Text>
      ) : null}

      {status === "pending" && erasure ? (
        <div className={merge("flex flex-wrap gap-x-3 gap-y-1", classNames.due)}>
          <Text as="span" size="sm" data-fancy-compliance="erasure-due" className={SOFT_TEXT_CLASS}>
            {t("fancy-compliance.erasure.due")} <time dateTime={erasure.dueAt}>{time(erasure.dueAt)}</time>
          </Text>
          {left !== null ? (
            <Text as="span" size="sm" weight="medium" data-fancy-compliance="erasure-countdown" className={TEXT_CLASS}>
              {left}
            </Text>
          ) : null}
        </div>
      ) : null}

      {finished && erasure?.executedAt ? (
        <Text as="p" size="sm" data-fancy-compliance="erasure-executed-at" className={SOFT_TEXT_CLASS}>
          {t("fancy-compliance.erasure.executed-at")} <time dateTime={erasure.executedAt}>{time(erasure.executedAt)}</time>
        </Text>
      ) : null}

      {error ? (
        <Text
          as="p"
          size="md"
          role="alert"
          data-fancy-compliance="erasure-error"
          data-erasure-error={errorCode ?? "generic"}
          className={merge("font-medium text-red-800 dark:text-red-200", classNames.error)}
        >
          {t(codeKey("fancy-compliance.erasure.error", errorCode, ERRORS, "generic"))}
          {errorCode === "erasure_blocked" && blockedReason ? (
            <>
              {" "}
              <bdi data-fancy-compliance="erasure-blocked-reason">{blockedReason}</bdi>
            </>
          ) : null}
        </Text>
      ) : null}

      {canRequest || status === "pending" ? (
        <div {...DATA_RIGHTS_OFF_LIMITS} data-fancy-compliance="erasure-actions" className={merge("flex flex-col gap-2", classNames.actions)}>
          {canRequest && !(pendingMode && confirming) ? (
            <Button
              type="button"
              size={ACTION_SIZE}
              disabled={requesting}
              data-fancy-compliance-action="erasure-request"
              className={merge(ACTION_CLASS, "sm:w-auto sm:self-start", classNames.action)}
              onClick={request}
            >
              {t("fancy-compliance.erasure.request")}
            </Button>
          ) : null}

          {canRequest && pendingMode && confirming ? (
            <div
              role="group"
              aria-labelledby={`${titleId}-confirm`}
              data-fancy-compliance="erasure-confirm-step"
              className={merge("flex flex-col gap-2 rounded-lg border p-3", BORDER_STRONG_CLASS, classNames.confirmStep)}
            >
              <Text as="p" size="md" weight="semibold" id={`${titleId}-confirm`} className={TEXT_CLASS}>
                {t("fancy-compliance.erasure.confirm-title")}
              </Text>
              <Text as="p" size="sm" className={SOFT_TEXT_CLASS}>
                {graceDays > 0 ? t("fancy-compliance.erasure.confirm-body") : t("fancy-compliance.erasure.intro-immediate")}
              </Text>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  type="button"
                  size={ACTION_SIZE}
                  disabled={requesting}
                  data-fancy-compliance-action="erasure-keep"
                  className={merge(ACTION_CLASS, "sm:w-auto", classNames.action)}
                  onClick={() => setConfirming(false)}
                >
                  {t("fancy-compliance.erasure.keep")}
                </Button>
                <Button
                  type="button"
                  size={ACTION_SIZE}
                      disabled={requesting}
                  data-fancy-compliance-action="erasure-confirm"
                  className={merge(ACTION_CLASS, "sm:w-auto", classNames.action)}
                  onClick={request}
                >
                  {t("fancy-compliance.erasure.confirm")}
                </Button>
              </div>
            </div>
          ) : null}

          {status === "pending" && erasure ? (
            <Button
              type="button"
              size={ACTION_SIZE}
              disabled={cancelling}
              data-fancy-compliance-action="erasure-cancel"
              className={merge(ACTION_CLASS, "sm:w-auto sm:self-start", classNames.action)}
              onClick={() => {
                if (!cancelling) onCancel?.(erasure.id);
              }}
            >
              {t("fancy-compliance.erasure.cancel")}
            </Button>
          ) : null}
        </div>
      ) : null}

      {finished && erasure ? (
        <>
          <Heading as={headingLevel === "h2" ? "h3" : "h4"} size="sm" className={TEXT_CLASS}>
            {t("fancy-compliance.erasure.registrants")}
          </Heading>
          <ul data-fancy-compliance="erasure-registrants" className={merge("flex flex-col divide-y rounded-lg border", BORDER_STRONG_CLASS, DIVIDE_CLASS, classNames.registrants)}>
            {erasure.registrants.map((r) => (
              <li key={r.key} data-erasure-registrant={r.key} data-erasure-registrant-status={r.status} className="flex flex-wrap gap-x-3 p-3">
                <Text as="span" size="sm" weight="medium" className={TEXT_CLASS}>
                  <bdi>{r.key}</bdi>
                </Text>
                <Text as="span" size="sm" className={SOFT_TEXT_CLASS}>
                  {t(codeKey("fancy-compliance.erasure.registrant", r.status, REGISTRANT_STATES, "unknown"))}
                </Text>
              </li>
            ))}
          </ul>
          {retained.length > 0 ? (
            <>
              <Heading as={headingLevel === "h2" ? "h3" : "h4"} size="sm" className={TEXT_CLASS}>
                {t("fancy-compliance.erasure.retained-title")}
              </Heading>
              <ul data-fancy-compliance="erasure-retained" className={merge("flex flex-col divide-y rounded-lg border", BORDER_STRONG_CLASS, DIVIDE_CLASS, classNames.retained)}>
                {retained.map((row) => (
                  <li
                    key={`${row.registrant}:${row.table}`}
                    data-erasure-retained={row.table}
                    data-erasure-registrant={row.registrant}
                    data-erasure-rekeyed={row.rekeyed ? "true" : "false"}
                    className="flex flex-col gap-1 p-3"
                  >
                    <Text as="span" size="sm" weight="medium" className={TEXT_CLASS}>
                      <bdi>{row.table}</bdi>: {fill(t("fancy-compliance.erasure.retained.rows"), { rows: row.rows })}
                    </Text>
                    <Text as="span" size="sm" className={SOFT_TEXT_CLASS}>
                      <bdi>{row.reason}</bdi>{" "}
                      {t(row.rekeyed ? "fancy-compliance.erasure.retained.rekeyed" : "fancy-compliance.erasure.retained.unchanged")}
                    </Text>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
