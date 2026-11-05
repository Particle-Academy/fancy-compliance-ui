import { Button, Text } from "@particle-academy/react-fancy";
import { useConsentInternal } from "./context";
import { ACTION_CLASS, ACTION_SIZE, SOFT_TEXT_CLASS } from "./styles";

/**
 * Shown when a withdrawn category's script had already started and could not
 * be stopped from here. Removing a <script> element does not undo code that
 * ran, so the honest offer is a reload. Renders nothing otherwise.
 */
export function ConsentReloadNotice({ className }: { className?: string }) {
  const consent = useConsentInternal();
  if (consent.reloadRequired.length === 0) return null;

  return (
    <div
      role="status"
      dir={consent.dir}
      data-fancy-compliance="reload-notice"
      data-fancy-compliance-categories={consent.reloadRequired.join(" ")}
      className={["flex flex-col gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 sm:flex-row sm:items-center dark:border-amber-700 dark:bg-amber-950", className ?? ""].join(" ")}
    >
      <Text as="p" size="md" className={["flex-1 text-start", SOFT_TEXT_CLASS].join(" ")}>
        {consent.t("fancy-compliance.reload.body")}
      </Text>
      <Button
        type="button"
        size={ACTION_SIZE}
        data-fancy-compliance-action="reload"
        className={[ACTION_CLASS, "sm:w-auto"].join(" ")}
        onClick={consent.reload}
      >
        {consent.t("fancy-compliance.action.reload")}
      </Button>
    </div>
  );
}
