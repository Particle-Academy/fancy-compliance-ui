import { useId } from "react";
import { Button, Heading, Text } from "@particle-academy/react-fancy";
import { useConsentInternal } from "./context";
import { ACTION_CLASS, ACTION_SIZE, SOFT_TEXT_CLASS, SURFACE_CLASS, TEXT_CLASS } from "./styles";

export interface ConsentBannerProps {
  className?: string;
}

/**
 * The first-visit banner. A labelled, NON-MODAL region: it does not trap or
 * take focus, and the page behind it stays usable. Place it early in the
 * document so keyboard and screen-reader users meet it first.
 *
 * Accept all, Reject all and Customise are the same component, size and
 * classes, in one row: refusing is exactly as easy as accepting.
 */
export function ConsentBanner({ className }: ConsentBannerProps) {
  const consent = useConsentInternal();
  const titleId = useId();
  const bodyId = useId();
  const { t, value } = consent;

  if (!value.needsConsent) return null;

  const optional = value.categories.filter((c) => !c.required).map((c) => c.key);
  const decide = async (granted: string[]) => {
    if (await consent.decide(granted, "banner")) consent.focusTrigger();
  };

  return (
    <section
      role="region"
      aria-labelledby={titleId}
      aria-describedby={bodyId}
      dir={consent.dir}
      data-fancy-compliance="banner"
      className={[
        "fixed inset-x-0 bottom-0 z-40 border-t p-4 shadow-lg sm:p-6",
        SURFACE_CLASS,
        className ?? "",
      ].join(" ")}
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex max-w-2xl flex-col gap-2 text-start">
          <Heading as="h2" size="md" id={titleId} className={TEXT_CLASS}>
            {t("fancy-compliance.banner.title")}
          </Heading>
          <Text as="p" size="md" id={bodyId} className={SOFT_TEXT_CLASS}>
            {t("fancy-compliance.banner.body")}
          </Text>
        </div>
        <div data-fancy-compliance="banner-actions" className="grid shrink-0 grid-cols-1 gap-2 sm:grid-cols-3 lg:w-[30rem]">
          <Button
            type="button"
            size={ACTION_SIZE}
            data-fancy-compliance-size={ACTION_SIZE}
            data-fancy-compliance-action="accept-all"
            className={ACTION_CLASS}
            disabled={consent.pending}
            onClick={() => decide(optional)}
          >
            {t("fancy-compliance.action.accept-all")}
          </Button>
          <Button
            type="button"
            size={ACTION_SIZE}
            data-fancy-compliance-size={ACTION_SIZE}
            data-fancy-compliance-action="reject-all"
            className={ACTION_CLASS}
            disabled={consent.pending}
            onClick={() => decide([])}
          >
            {t("fancy-compliance.action.reject-all")}
          </Button>
          <Button
            type="button"
            size={ACTION_SIZE}
            data-fancy-compliance-size={ACTION_SIZE}
            data-fancy-compliance-action="customise"
            className={ACTION_CLASS}
            disabled={consent.pending}
            onClick={consent.openPreferences}
          >
            {t("fancy-compliance.action.customise")}
          </Button>
        </div>
      </div>
      {consent.error && !consent.preferencesOpen ? (
        <Text as="p" size="md" role="alert" data-fancy-compliance="error" className="mx-auto mt-3 max-w-5xl font-medium text-red-800 dark:text-red-200">
          {consent.error}
        </Text>
      ) : null}
    </section>
  );
}
