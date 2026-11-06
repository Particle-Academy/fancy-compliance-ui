import { useId, type ReactNode } from "react";
import { Button, Card, Heading, Text } from "@particle-academy/react-fancy";
import { useConsentInternal } from "./context";
import { ACTION_CLASS, ACTION_SIZE, merge, SOFT_TEXT_CLASS, SURFACE_CLASS, TEXT_CLASS } from "./styles";

export type ConsentBannerVariant = "bar" | "card" | "corner";

/** Where a `bar` sits: across the top or the bottom of the viewport. */
export type ConsentBannerBarPosition = "top" | "bottom";

/**
 * Where a `card` or `corner` sits. `start` / `end` are logical: `end` is the
 * right in a left-to-right page and the left under `dir="rtl"`.
 */
export type ConsentBannerFloatingPosition = "bottom-start" | "bottom-end" | "top-start" | "top-end";

export type ConsentBannerPosition = ConsentBannerBarPosition | ConsentBannerFloatingPosition;

/**
 * One key per part. There is deliberately ONE `action` key for Accept all,
 * Reject all and Customise alike: a per-button key would let a page make
 * accepting easier than refusing, which is the thing this banner exists to
 * prevent. Each class is merged after ours, so a conflicting app class wins.
 */
export interface ConsentBannerClassNames {
  /** The banner itself (the region). Merged after `className`. */
  surface?: string;
  /** The wrapper that lays out the text and the actions. */
  layout?: string;
  /** The column holding the title and body. */
  content?: string;
  title?: string;
  body?: string;
  /** The container of the three actions. */
  actions?: string;
  /** Every action: accept, reject and customise share it. */
  action?: string;
  /** The message shown when a decision could not be saved. */
  error?: string;
}

interface ConsentBannerCommonProps {
  className?: string;
  classNames?: ConsentBannerClassNames;
}

export type ConsentBannerProps = ConsentBannerCommonProps &
  (
    | {
        /** A full-width bar. The default, and the 0.1.0 layout. */
        variant?: "bar";
        /** Default `"bottom"`. */
        position?: ConsentBannerBarPosition;
      }
    | {
        /** `card`: a floating card, up to 28rem wide. `corner`: a compact card, up to 20rem. */
        variant: "card" | "corner";
        /** Default `"bottom-start"`, clear of react-fancy's toast stack at `bottom-end`. */
        position?: ConsentBannerFloatingPosition;
      }
  );

const BAR_POSITION: Record<ConsentBannerBarPosition, string> = {
  bottom: "fixed inset-x-0 bottom-0 z-40 border-t p-4 shadow-lg sm:p-6",
  top: "fixed inset-x-0 top-0 z-40 border-b p-4 shadow-lg sm:p-6",
};

// Full width less a margin on a phone; anchored to one corner from `sm` up.
// Logical sides only, so the anchor mirrors under dir="rtl".
const CARD_POSITION: Record<ConsentBannerFloatingPosition, string> = {
  "bottom-start": "bottom-4 start-4 end-4 sm:bottom-6 sm:start-6 sm:end-auto",
  "bottom-end": "bottom-4 start-4 end-4 sm:bottom-6 sm:start-auto sm:end-6",
  "top-start": "top-4 start-4 end-4 sm:top-6 sm:start-6 sm:end-auto",
  "top-end": "top-4 start-4 end-4 sm:top-6 sm:start-auto sm:end-6",
};

const CORNER_POSITION: Record<ConsentBannerFloatingPosition, string> = {
  "bottom-start": "bottom-4 start-4 end-4 sm:end-auto",
  "bottom-end": "bottom-4 start-4 end-4 sm:start-auto",
  "top-start": "top-4 start-4 end-4 sm:end-auto",
  "top-end": "top-4 start-4 end-4 sm:start-auto",
};

const LAYOUT = {
  bar: {
    layout: "mx-auto flex max-w-5xl flex-col gap-4 lg:flex-row lg:items-end lg:justify-between",
    content: "flex max-w-2xl flex-col gap-2 text-start",
    actions: "grid shrink-0 grid-cols-1 gap-2 sm:grid-cols-3 lg:w-[30rem]",
    error: "mx-auto mt-3 max-w-5xl font-medium text-red-800 dark:text-red-200",
  },
  card: {
    surface: "fixed z-40 p-5 shadow-xl sm:w-full sm:max-w-md",
    layout: "flex flex-col gap-4",
    content: "flex flex-col gap-2 text-start",
    // Side by side where the card is wide enough; stacked on a phone.
    actions: "grid grid-cols-1 gap-2 sm:grid-cols-3",
    error: "mt-3 font-medium text-red-800 dark:text-red-200",
  },
  corner: {
    surface: "fixed z-40 p-4 shadow-xl sm:w-full sm:max-w-xs",
    layout: "flex flex-col gap-3",
    content: "flex flex-col gap-1 text-start",
    // Always stacked: three 44px targets side by side do not fit in 20rem.
    actions: "grid grid-cols-1 gap-2",
    error: "mt-2 text-sm font-medium text-red-800 dark:text-red-200",
  },
} as const;

/**
 * The first-visit banner. A labelled, NON-MODAL region: it does not trap or
 * take focus, and the page behind it stays usable. Place it early in the
 * document so keyboard and screen-reader users meet it first.
 *
 * Accept all, Reject all and Customise are the same component, size and
 * classes, in one container, in every variant: refusing is exactly as easy as
 * accepting.
 */
export function ConsentBanner(props: ConsentBannerProps) {
  const { className, classNames = {} } = props;
  const variant: ConsentBannerVariant = props.variant ?? "bar";
  const consent = useConsentInternal();
  const titleId = useId();
  const bodyId = useId();
  const { t, value } = consent;

  if (!value.needsConsent) return null;

  const optional = value.categories.filter((c) => !c.required).map((c) => c.key);
  const decide = async (granted: string[]) => {
    if (await consent.decide(granted, "banner")) consent.focusTrigger();
  };

  const layout = LAYOUT[variant];
  const compact = variant === "corner";
  const actionClass = merge(ACTION_CLASS, classNames.action);
  const actionProps = {
    type: "button" as const,
    size: ACTION_SIZE,
    "data-fancy-compliance-size": ACTION_SIZE,
    className: actionClass,
    disabled: consent.pending,
  };

  const inner: ReactNode = (
    <>
      <div data-fancy-compliance="banner-layout" className={merge(layout.layout, classNames.layout)}>
        <div data-fancy-compliance="banner-content" className={merge(layout.content, classNames.content)}>
          <Heading
            as="h2"
            size={compact ? "sm" : "md"}
            id={titleId}
            data-fancy-compliance="banner-title"
            className={merge(TEXT_CLASS, classNames.title)}
          >
            {t("fancy-compliance.banner.title")}
          </Heading>
          <Text
            as="p"
            size={compact ? "sm" : "md"}
            id={bodyId}
            data-fancy-compliance="banner-body"
            className={merge(SOFT_TEXT_CLASS, classNames.body)}
          >
            {t("fancy-compliance.banner.body")}
          </Text>
        </div>
        <div data-fancy-compliance="banner-actions" className={merge(layout.actions, classNames.actions)}>
          <Button {...actionProps} data-fancy-compliance-action="accept-all" onClick={() => decide(optional)}>
            {t("fancy-compliance.action.accept-all")}
          </Button>
          <Button {...actionProps} data-fancy-compliance-action="reject-all" onClick={() => decide([])}>
            {t("fancy-compliance.action.reject-all")}
          </Button>
          <Button {...actionProps} data-fancy-compliance-action="customise" onClick={consent.openPreferences}>
            {t("fancy-compliance.action.customise")}
          </Button>
        </div>
      </div>
      {consent.error && !consent.preferencesOpen ? (
        <Text as="p" size="md" role="alert" data-fancy-compliance="error" className={merge(layout.error, classNames.error)}>
          {consent.error}
        </Text>
      ) : null}
    </>
  );

  const region = {
    role: "region",
    "aria-labelledby": titleId,
    "aria-describedby": bodyId,
    dir: consent.dir,
    "data-fancy-compliance": "banner",
    "data-fancy-compliance-variant": variant,
  };

  if (props.variant === "card" || props.variant === "corner") {
    const position = props.position ?? "bottom-start";
    const anchor = props.variant === "card" ? CARD_POSITION[position] : CORNER_POSITION[position];
    const surface = props.variant === "card" ? LAYOUT.card.surface : LAYOUT.corner.surface;

    // react-fancy's own Card: its surface, border and radius come from the
    // same theme tokens as every other card in the app.
    return (
      <Card
        {...region}
        data-fancy-compliance-position={position}
        variant="outlined"
        size={props.variant === "card" ? "lg" : "md"}
        padding="none"
        className={merge(surface, anchor, TEXT_CLASS, className, classNames.surface)}
      >
        {inner}
      </Card>
    );
  }

  const position: ConsentBannerBarPosition = props.position === "top" ? "top" : "bottom";

  return (
    <section
      {...region}
      data-fancy-compliance-position={position}
      className={merge(BAR_POSITION[position], SURFACE_CLASS, className, classNames.surface)}
    >
      {inner}
    </section>
  );
}
