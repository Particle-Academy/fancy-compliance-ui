import { useId } from "react";
import { Button, Heading, Text } from "@particle-academy/react-fancy";
import { DATA_RIGHTS_OFF_LIMITS } from "./agents";
import { codeKey, createTranslator, fill, type Translate } from "./messages";
import { ACTION_CLASS, ACTION_SIZE, BORDER_STRONG_CLASS, DIVIDE_CLASS, merge, SOFT_TEXT_CLASS, TEXT_CLASS } from "./styles";
import type { ConsentMessages, DataExportFormat, DataExportLimits, DataExportView, Direction } from "./types";

/** One key per part, merged after ours so a conflicting app class wins. */
export interface DataExportPanelClassNames {
  /** The root. Merged after `className`. */
  surface?: string;
  title?: string;
  intro?: string;
  /** The fenced group of request buttons. */
  actions?: string;
  /** Every button and the download link. */
  action?: string;
  remaining?: string;
  list?: string;
  /** Each export. */
  row?: string;
  status?: string;
  meta?: string;
  empty?: string;
  error?: string;
}

export interface DataExportPanelProps {
  /** The person's exports, newest first, as `GET /fancy-compliance/exports` serves them. */
  exports: DataExportView[];
  /** What the host can build (the list's `formats`). Defaults to JSON only. */
  formats?: DataExportFormat[];
  /** The list's `limits`: shows how many are left today, and disables requests at 0. */
  limits?: DataExportLimits | null;
  /** A request is being sent: buttons are disabled and the panel is `aria-busy`. */
  requesting?: boolean;
  /** The last request failed: a server error code (`reauth_required`, `rate_limited`, ...) or `true`. */
  error?: string | boolean | null;
  /** Called with the format the person asked for. Sending it is the host's. */
  onRequest?: (format: DataExportFormat) => void;
  messages?: ConsentMessages;
  /** BCP 47 locale for times and sizes. Defaults to `en`, so server and client agree. */
  locale?: string;
  /** IANA zone for times. Defaults to `UTC`, so server and client agree. */
  timeZone?: string;
  formatDate?: (iso: string) => string;
  headingLevel?: "h2" | "h3" | "h4";
  dir?: Direction;
  className?: string;
  classNames?: DataExportPanelClassNames;
}

const STATUSES = ["pending", "ready", "failed", "downloaded", "expired"];
const FAILURES = ["too_large", "too_many_files", "registrant_failed", "zip_unavailable", "build_failed"];
const ERRORS = ["reauth_required", "rate_limited", "export_in_progress", "unauthenticated", "forbidden"];

function size(bytes: number, locale: string, t: Translate): string {
  const number = (n: number) => new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(n);
  if (bytes < 1024) return fill(t("fancy-compliance.export.size.b"), { n: number(bytes) });
  if (bytes < 1024 * 1024) return fill(t("fancy-compliance.export.size.kb"), { n: number(bytes / 1024) });

  return fill(t("fancy-compliance.export.size.mb"), { n: number(bytes / (1024 * 1024)) });
}

/**
 * A person's data exports: request a copy, follow its status, download it.
 * Controlled: it renders the `exports` it is given and asks the host through
 * `onRequest`; it never fetches.
 *
 * Agents may READ export status, so each row sits outside the fence. Requesting
 * and downloading are the person's own acts: those controls sit inside
 * `DATA_RIGHTS_OFF_LIMITS`. A download is a plain link to the export's
 * `download.url`, which the server honours only for the signed-in person, and
 * only for a `ready` export: any other status never shows a link.
 *
 * Handles: `data-fancy-compliance="data-export"`, rows `data-data-export="<id>"`
 * with `-status` and `-format`, actions `export-request-<format>` and
 * `export-download`.
 */
export function DataExportPanel({
  exports,
  formats = ["json"],
  limits = null,
  requesting = false,
  error = null,
  onRequest,
  messages,
  locale = "en",
  timeZone = "UTC",
  formatDate,
  headingLevel = "h2",
  dir,
  className,
  classNames = {},
}: DataExportPanelProps) {
  const titleId = useId();
  const t = createTranslator(messages);
  const pending = exports.some((e) => e.status === "pending");
  const exhausted = limits !== null && limits.remainingToday <= 0;
  const blocked = requesting || pending || exhausted;

  const time = (iso: string): string => {
    if (formatDate) return formatDate(iso);
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return iso;

    return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short", timeZone }).format(date);
  };

  const errorCode = typeof error === "string" ? error : null;

  return (
    <section
      dir={dir}
      aria-labelledby={titleId}
      aria-busy={requesting ? "true" : undefined}
      data-fancy-compliance="data-export"
      className={merge("flex flex-col gap-3 text-start", TEXT_CLASS, className, classNames.surface)}
    >
      <Heading as={headingLevel} size="md" id={titleId} data-fancy-compliance="data-export-title" className={merge(TEXT_CLASS, classNames.title)}>
        {t("fancy-compliance.export.title")}
      </Heading>
      <Text as="p" size="md" data-fancy-compliance="data-export-intro" className={merge(SOFT_TEXT_CLASS, classNames.intro)}>
        {t("fancy-compliance.export.intro")}
      </Text>

      {error ? (
        <Text
          as="p"
          size="md"
          role="alert"
          data-fancy-compliance="data-export-error"
          data-data-export-error={errorCode ?? "generic"}
          className={merge("font-medium text-red-800 dark:text-red-200", classNames.error)}
        >
          {t(codeKey("fancy-compliance.export.error", errorCode, ERRORS, "generic"))}
        </Text>
      ) : null}

      <div
        {...DATA_RIGHTS_OFF_LIMITS}
        data-fancy-compliance="data-export-actions"
        className={merge("flex flex-col gap-2 sm:flex-row sm:flex-wrap", classNames.actions)}
      >
        {formats.map((format) => (
          <Button
            key={format}
            type="button"
            size={ACTION_SIZE}
            disabled={blocked}
            data-fancy-compliance-action={`export-request-${format}`}
            className={merge(ACTION_CLASS, "sm:w-auto", classNames.action)}
            onClick={() => {
              if (!blocked) onRequest?.(format);
            }}
          >
            {t(`fancy-compliance.export.request.${format}`)}
          </Button>
        ))}
      </div>

      {limits ? (
        <Text as="p" size="sm" data-fancy-compliance="data-export-remaining" className={merge(SOFT_TEXT_CLASS, classNames.remaining)}>
          {fill(t("fancy-compliance.export.remaining"), { remaining: Math.max(0, limits.remainingToday), perDay: limits.perDay })}
        </Text>
      ) : null}

      {exports.length === 0 ? (
        <Text as="p" size="md" data-fancy-compliance="data-export-empty" className={merge(SOFT_TEXT_CLASS, classNames.empty)}>
          {t("fancy-compliance.export.empty")}
        </Text>
      ) : (
        <ol data-fancy-compliance="data-export-list" className={merge("flex flex-col divide-y rounded-lg border", BORDER_STRONG_CLASS, DIVIDE_CLASS, classNames.list)}>
          {exports.map((view) => {
            const downloadable = view.status === "ready" && view.download !== null && typeof view.download?.url === "string";

            return (
              <li
                key={view.id}
                data-data-export={view.id}
                data-data-export-status={view.status}
                data-data-export-format={view.format}
                className={merge("flex flex-col gap-2 p-3", classNames.row)}
              >
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <Text as="span" size="md" weight="semibold" className={TEXT_CLASS}>
                    {t(codeKey("fancy-compliance.export.format", view.format, ["json", "zip"], "json"))}
                  </Text>
                  <Text as="span" size="sm" data-fancy-compliance="data-export-status" className={merge(SOFT_TEXT_CLASS, classNames.status)}>
                    {t(codeKey("fancy-compliance.export.status", view.status, STATUSES, "unknown"))}
                  </Text>
                </div>
                <div className={merge("flex flex-wrap gap-x-3 gap-y-1 text-sm", SOFT_TEXT_CLASS, classNames.meta)}>
                  <Text as="span" size="sm" className={SOFT_TEXT_CLASS}>
                    {t("fancy-compliance.export.requested")} <time dateTime={view.requestedAt}>{time(view.requestedAt)}</time>
                  </Text>
                  {downloadable && view.expiresAt ? (
                    <Text as="span" size="sm" data-fancy-compliance="data-export-expires" className={SOFT_TEXT_CLASS}>
                      {t("fancy-compliance.export.expires")} <time dateTime={view.expiresAt}>{time(view.expiresAt)}</time>
                    </Text>
                  ) : null}
                  {downloadable && view.bytes !== null ? (
                    <Text as="span" size="sm" data-fancy-compliance="data-export-size" className={SOFT_TEXT_CLASS}>
                      {size(view.bytes, locale, t)}
                    </Text>
                  ) : null}
                </div>
                {view.status === "failed" ? (
                  <Text as="p" size="sm" data-fancy-compliance="data-export-failure" className={SOFT_TEXT_CLASS}>
                    {t(codeKey("fancy-compliance.export.failure", view.error, FAILURES, "unknown"))}
                  </Text>
                ) : null}
                {downloadable ? (
                  <div {...DATA_RIGHTS_OFF_LIMITS} className="flex">
                    <Button
                      href={view.download!.url}
                      download
                      size={ACTION_SIZE}
                      data-fancy-compliance-action="export-download"
                      className={merge(ACTION_CLASS, "sm:w-auto", classNames.action)}
                    >
                      {t("fancy-compliance.export.download")}
                    </Button>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
