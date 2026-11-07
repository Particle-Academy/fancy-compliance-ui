import { useCallback, type ReactNode } from "react";
import { Button } from "@particle-academy/react-fancy";
import { useConsentInternal } from "./context";
import { merge } from "./styles";
import { AGENT_OFF_LIMITS } from "./agents";

export interface ConsentPreferencesTriggerClassNames {
  /** The trigger button. Merged after `className`. */
  trigger?: string;
}

export interface ConsentPreferencesTriggerProps {
  className?: string;
  classNames?: ConsentPreferencesTriggerClassNames;
  /** Replaces the default "Privacy settings" label. */
  children?: ReactNode;
}

/**
 * Opens the preferences dialog at any time, which is how a person withdraws.
 * Put it somewhere permanent, like the footer. Focus returns here when the
 * dialog closes, and after a banner decision.
 */
export function ConsentPreferencesTrigger({ className, classNames, children }: ConsentPreferencesTriggerProps) {
  const consent = useConsentInternal();
  const { registerTrigger } = consent;
  const ref = useCallback((element: HTMLButtonElement | null) => registerTrigger(element), [registerTrigger]);

  return (
    <Button
      ref={ref}
      type="button"
      variant="ghost"
      data-fancy-compliance="trigger"
      {...AGENT_OFF_LIMITS}
      aria-haspopup="dialog"
      aria-expanded={consent.preferencesOpen}
      className={merge("min-h-11 underline", className, classNames?.trigger)}
      onClick={consent.openPreferences}
    >
      {children ?? consent.t("fancy-compliance.trigger")}
    </Button>
  );
}
