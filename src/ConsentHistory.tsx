import { useId } from "react";
import { Button, Heading, Text } from "@particle-academy/react-fancy";
import { categoryText, createTranslator, DEFAULT_MESSAGES } from "./messages";
import { ACTION_CLASS, ACTION_SIZE, BORDER_STRONG_CLASS, DIVIDE_CLASS, merge, SOFT_TEXT_CLASS, TEXT_CLASS } from "./styles";
import type { ConsentCategory, ConsentHistoryEntry, ConsentMessages, Direction } from "./types";

/** One key per part, merged after ours so a conflicting app class wins. */
export interface ConsentHistoryClassNames {
  /** The root. Merged after `className`. */
  surface?: string;
  title?: string;
  /** The list of entries. */
  list?: string;
  /** Each entry. */
  entry?: string;
  /** The action line of an entry ("Choice saved"). */
  action?: string;
  /** The time, source and policy line. */
  meta?: string;
  /** The allowed and refused lists. */
  categories?: string;
  empty?: string;
  error?: string;
  /** The load-more button. */
  loadMore?: string;
}

export interface ConsentHistoryProps {
  /** The rows to show, newest first, as `GET /fancy-compliance/history` serves them. */
  entries: ConsentHistoryEntry[];
  /** The host's categories (the consent snapshot's), for labels. Unknown keys fall back to English, then the key. */
  categories?: ConsentCategory[];
  messages?: ConsentMessages;
  /** Whether older entries exist (the page's `nextBefore` is not null). */
  hasMore?: boolean;
  /** Older entries are being fetched: load-more is disabled and the list is `aria-busy`. */
  loading?: boolean;
  /** The last fetch failed: an alert is shown. */
  error?: boolean;
  /** Called when the person asks for older entries. Fetching is the host's. */
  onLoadMore?: () => void;
  /** BCP 47 locale for the default time format. Defaults to `en`, so server and client agree. */
  locale?: string;
  /** IANA zone for the default time format. Defaults to `UTC`, so server and client agree. */
  timeZone?: string;
  /** Replace the time format entirely. */
  formatDate?: (iso: string) => string;
  /** Heading level of the title. */
  headingLevel?: "h2" | "h3" | "h4";
  dir?: Direction;
  className?: string;
  classNames?: ConsentHistoryClassNames;
}

const KNOWN_ACTIONS = ["decision", "withdrawal", "link"];
const KNOWN_SOURCES = ["banner", "preferences", "api", "login"];

/**
 * A person's consent history: every decision, withdrawal and sign-in link, as
 * the server's ledger recorded it. Controlled and read-only: it renders the
 * `entries` it is given and asks the host for more through `onLoadMore`; it
 * never fetches and never records anything.
 *
 * Agents may read it, so it sits OUTSIDE the consent fence (`AGENT_OFF_LIMITS`);
 * it has no control that changes consent. Handles: `data-consent-history-entry`
 * (the row id) with `-action`, `-policy` and `-linked`, and
 * `data-consent-category` on each listed category.
 */
export function ConsentHistory({
  entries,
  categories = [],
  messages,
  hasMore = false,
  loading = false,
  error = false,
  onLoadMore,
  locale = "en",
  timeZone = "UTC",
  formatDate,
  headingLevel = "h2",
  dir,
  className,
  classNames = {},
}: ConsentHistoryProps) {
  const titleId = useId();
  const t = createTranslator(messages);
  const byKey = new Map(categories.map((c) => [c.key, c]));

  const label = (key: string): string => {
    const category = byKey.get(key);
    if (category) return categoryText(category, "label", messages);
    const fallbackKey = `fancy-compliance::categories.${key}.label`;

    return messages?.[fallbackKey] ?? DEFAULT_MESSAGES[fallbackKey] ?? key;
  };

  const time = (iso: string): string => {
    if (formatDate) return formatDate(iso);
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return iso;

    return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short", timeZone }).format(date);
  };

  const list = (keys: string[], part: "granted" | "refused") => (
    <div data-fancy-compliance={`history-${part}`} className={merge("flex flex-wrap items-baseline gap-x-2 gap-y-1", classNames.categories)}>
      <Text as="span" size="sm" weight="medium" className={TEXT_CLASS}>
        {t(`fancy-compliance.history.${part}`)}
      </Text>
      {keys.length === 0 ? (
        <Text as="span" size="sm" className={SOFT_TEXT_CLASS}>
          {t("fancy-compliance.history.none")}
        </Text>
      ) : (
        <ul className="flex flex-wrap gap-x-2 gap-y-1">
          {keys.map((key) => (
            <li key={key} data-consent-category={key} className={merge("text-sm", SOFT_TEXT_CLASS)}>
              {label(key)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  return (
    <section
      dir={dir}
      aria-labelledby={titleId}
      aria-busy={loading ? "true" : undefined}
      data-fancy-compliance="history"
      className={merge("flex flex-col gap-3 text-start", TEXT_CLASS, className, classNames.surface)}
    >
      <Heading as={headingLevel} size="md" id={titleId} data-fancy-compliance="history-title" className={merge(TEXT_CLASS, classNames.title)}>
        {t("fancy-compliance.history.title")}
      </Heading>

      {error ? (
        <Text as="p" size="md" role="alert" data-fancy-compliance="history-error" className={merge("font-medium text-red-800 dark:text-red-200", classNames.error)}>
          {t("fancy-compliance.history.error")}
        </Text>
      ) : null}

      {entries.length === 0 ? (
        <Text as="p" size="md" data-fancy-compliance="history-empty" className={merge(SOFT_TEXT_CLASS, classNames.empty)}>
          {t("fancy-compliance.history.empty")}
        </Text>
      ) : (
        <ol data-fancy-compliance="history-list" className={merge("flex flex-col divide-y rounded-lg border", BORDER_STRONG_CLASS, DIVIDE_CLASS, classNames.list)}>
          {entries.map((row) => (
            <li
              key={row.id}
              data-consent-history-entry={String(row.id)}
              data-consent-history-action={row.action}
              data-consent-history-policy={row.policyVersion}
              data-consent-history-linked={row.linked ? "true" : "false"}
              className={merge("flex flex-col gap-2 p-3", classNames.entry)}
            >
              <Text as="p" size="md" weight="semibold" data-fancy-compliance="history-action" className={merge(TEXT_CLASS, classNames.action)}>
                {t(`fancy-compliance.history.action.${KNOWN_ACTIONS.includes(row.action) ? row.action : "unknown"}`)}
              </Text>
              <div className={merge("flex flex-wrap gap-x-3 gap-y-1 text-sm", SOFT_TEXT_CLASS, classNames.meta)}>
                <time dateTime={row.at}>{time(row.at)}</time>
                <Text as="span" size="sm" data-fancy-compliance="history-source" className={SOFT_TEXT_CLASS}>
                  {t(`fancy-compliance.history.source.${KNOWN_SOURCES.includes(row.source) ? row.source : "unknown"}`)}
                </Text>
                <Text as="span" size="sm" data-fancy-compliance="history-policy" className={SOFT_TEXT_CLASS}>
                  {t("fancy-compliance.history.policy")} <bdi>{row.policyVersion}</bdi>
                </Text>
              </div>
              {list(row.granted, "granted")}
              {list(row.refused, "refused")}
            </li>
          ))}
        </ol>
      )}

      {hasMore ? (
        <Button
          type="button"
          size={ACTION_SIZE}
          disabled={loading}
          data-fancy-compliance-action="history-load-more"
          className={merge(ACTION_CLASS, "sm:w-auto sm:self-start", classNames.loadMore)}
          onClick={() => {
            if (!loading) onLoadMore?.();
          }}
        >
          {t("fancy-compliance.history.load-more")}
        </Button>
      ) : null}
    </section>
  );
}
