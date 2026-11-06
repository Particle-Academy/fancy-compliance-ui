import { useEffect, useId, useRef, useState } from "react";
import { Button, Heading, Modal, Switch, Text } from "@particle-academy/react-fancy";
import { useConsentInternal } from "./context";
import { categoryText, purposeText } from "./messages";
import { ACTION_CLASS, ACTION_SIZE, BORDER_STRONG_CLASS, DIVIDE_CLASS, merge, SOFT_TEXT_CLASS, TEXT_CLASS } from "./styles";
import { ConsentReloadNotice } from "./ConsentReloadNotice";
import type { ConsentCategory } from "./types";

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * One key per part, merged after ours so a conflicting app class wins. As on
 * the banner, ONE `action` key covers Reject all, Accept all and Save: there
 * is no per-button key, so no choice can be made more prominent than another.
 */
export interface ConsentPreferencesClassNames {
  /** The dialog panel (react-fancy `Modal`). Merged after `className`. */
  surface?: string;
  /** The row holding the title and the close button. */
  header?: string;
  title?: string;
  /** The column inside the scrolling body. */
  content?: string;
  /** The introduction paragraph. */
  body?: string;
  /** The list of categories. */
  categories?: string;
  /** Each category row. */
  category?: string;
  categoryLabel?: string;
  categoryDescription?: string;
  categoryPurposes?: string;
  /** The "Always on" note beside a required category. */
  alwaysOn?: string;
  /** Each react-fancy `Switch` (its wrapper element). */
  switch?: string;
  /** The container of the three actions. */
  actions?: string;
  /** Every action: reject, accept and save share it. */
  action?: string;
  error?: string;
}

export interface ConsentPreferencesProps {
  className?: string;
  classNames?: ConsentPreferencesClassNames;
}

/**
 * The preferences dialog: one switch per category, with its description and
 * purposes. A real modal (react-fancy `Modal`): focus moves in, is trapped,
 * Escape closes, and focus returns to whatever opened it.
 *
 * Nothing optional is pre-ticked: before a decision every optional switch is
 * off. Turning categories off after consenting is recorded as a withdrawal.
 */
export function ConsentPreferences({ className, classNames = {} }: ConsentPreferencesProps) {
  const consent = useConsentInternal();
  const titleId = useId();
  const { t, value, messages } = consent;
  const optional = value.categories.filter((c) => !c.required).map((c) => c.key);
  const current = value.consent?.current ? optional.filter((key) => value.consent!.granted.includes(key)) : [];
  const [draft, setDraft] = useState<string[]>(current);
  const open = consent.preferencesOpen;

  // Re-read the person's current choices every time the dialog opens.
  const currentKey = current.join(" ");
  useEffect(() => {
    if (open) setDraft(currentKey === "" ? [] : currentKey.split(" "));
  }, [open, currentKey]);

  const finish = (ok: boolean) => {
    if (!ok) return;
    consent.closePreferences();
    consent.focusTrigger();
  };

  const save = async () => {
    const after = optional.filter((key) => draft.includes(key));
    const removed = current.filter((key) => !after.includes(key));
    const added = after.filter((key) => !current.includes(key));
    if (value.consent?.current && added.length === 0 && removed.length > 0) {
      finish(await consent.withdraw(removed, "preferences"));
    } else {
      finish(await consent.decide(after, "preferences"));
    }
  };

  const rejectAll = async () => {
    if (value.consent?.current && current.length > 0) {
      finish(await consent.withdraw(null, "preferences"));
    } else {
      finish(await consent.decide([], "preferences"));
    }
  };

  // Focus management, done here rather than left to Modal. react-fancy 6.9.0's
  // Modal runs its focus trap in an effect while its enter animation has not
  // mounted the panel yet, and never re-runs it, so a Modal that starts closed
  // neither moves focus in, nor traps Tab, nor restores focus on close. If
  // Modal is fixed, this still behaves: the second Tab handler sees focus
  // already wrapped and does nothing.
  const opener = useRef<HTMLElement | null>(null);
  const [header, setHeader] = useState<HTMLElement | null>(null);
  useEffect(() => {
    if (open) {
      opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      return;
    }
    const back = opener.current;
    opener.current = null;
    if (back && back.isConnected) back.focus();
  }, [open]);
  useEffect(() => {
    if (!open || !header) return;
    const dialog = header.closest<HTMLElement>('[role="dialog"]') ?? header;
    const focusables = () => Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE));
    if (!dialog.contains(document.activeElement)) focusables()[0]?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const items = focusables();
      const first = items[0];
      const last = items[items.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    dialog.addEventListener("keydown", onKeyDown);

    return () => dialog.removeEventListener("keydown", onKeyDown);
  }, [open, header]);

  const actionClass = merge(ACTION_CLASS, classNames.action);

  const toggle = (key: string, on: boolean) =>
    setDraft((keys) => (on ? [...keys.filter((k) => k !== key), key] : keys.filter((k) => k !== key)));

  return (
    <Modal
      open={open}
      onClose={consent.closePreferences}
      size="lg"
      aria-labelledby={titleId}
      dir={consent.dir}
      data-fancy-compliance="preferences"
      className={merge(className, classNames.surface) || undefined}
    >
      <div
        ref={setHeader}
        data-fancy-compliance="preferences-header"
        className={merge("flex items-center justify-between gap-4 border-b px-6 py-3", BORDER_STRONG_CLASS, classNames.header)}
      >
        <Heading as="h2" size="md" id={titleId} data-fancy-compliance="preferences-title" className={merge(TEXT_CLASS, classNames.title)}>
          {t("fancy-compliance.preferences.title")}
        </Heading>
        <Button
          type="button"
          variant="ghost"
          icon="x"
          aria-label={t("fancy-compliance.action.close")}
          data-fancy-compliance-action="close"
          className="min-h-11 min-w-11 justify-center"
          onClick={consent.closePreferences}
        />
      </div>
      <Modal.Body>
        <div data-fancy-compliance="preferences-content" className={merge("flex flex-col gap-4 text-start", classNames.content)}>
          <Text as="p" size="md" data-fancy-compliance="preferences-body" className={merge(SOFT_TEXT_CLASS, classNames.body)}>
            {t("fancy-compliance.preferences.intro")}
          </Text>
          <div data-fancy-compliance="preferences-categories" className={merge("flex flex-col divide-y", DIVIDE_CLASS, classNames.categories)}>
            {value.categories.map((category) => (
              <CategoryRow
                key={category.key}
                classNames={classNames}
                category={category}
                checked={category.required || draft.includes(category.key)}
                onChange={(on) => toggle(category.key, on)}
                alwaysOn={t("fancy-compliance.preferences.always-on")}
                purposesLabel={t("fancy-compliance.preferences.purposes")}
                label={categoryText(category, "label", messages)}
                description={categoryText(category, "description", messages)}
                purposes={category.purposes.map((p) => purposeText(p, messages))}
              />
            ))}
          </div>
          <ConsentReloadNotice />
          {consent.error ? (
            <Text as="p" size="md" role="alert" data-fancy-compliance="error" className={merge("font-medium text-red-800 dark:text-red-200", classNames.error)}>
              {consent.error}
            </Text>
          ) : null}
        </div>
      </Modal.Body>
      <Modal.Footer>
        <div data-fancy-compliance="preferences-actions" className={merge("grid w-full grid-cols-1 gap-2 sm:grid-cols-3", classNames.actions)}>
          <Button type="button" size={ACTION_SIZE} data-fancy-compliance-size={ACTION_SIZE} data-fancy-compliance-action="reject-all" className={actionClass} disabled={consent.pending} onClick={rejectAll}>
            {t("fancy-compliance.action.reject-all")}
          </Button>
          <Button type="button" size={ACTION_SIZE} data-fancy-compliance-size={ACTION_SIZE} data-fancy-compliance-action="accept-all" className={actionClass} disabled={consent.pending} onClick={async () => finish(await consent.decide(optional, "preferences"))}>
            {t("fancy-compliance.action.accept-all")}
          </Button>
          <Button type="button" size={ACTION_SIZE} data-fancy-compliance-size={ACTION_SIZE} data-fancy-compliance-action="save" className={actionClass} disabled={consent.pending} onClick={save}>
            {t("fancy-compliance.action.save")}
          </Button>
        </div>
      </Modal.Footer>
    </Modal>
  );
}

interface CategoryRowProps {
  category: ConsentCategory;
  checked: boolean;
  onChange: (on: boolean) => void;
  alwaysOn: string;
  purposesLabel: string;
  label: string;
  description: string;
  purposes: string[];
  classNames: ConsentPreferencesClassNames;
}

function CategoryRow({ category, checked, onChange, alwaysOn, purposesLabel, label, description, purposes, classNames }: CategoryRowProps) {
  const switchId = useId();
  const labelId = useId();
  const descriptionId = useId();

  return (
    <div data-fancy-compliance-category={category.key} className={merge("flex items-start justify-between gap-4 py-3", classNames.category)}>
      {/* The whole label is the 44px+ target for the switch it names. */}
      <label htmlFor={switchId} className="flex min-h-11 flex-1 cursor-pointer flex-col justify-center gap-1 text-start">
        <span id={labelId} data-fancy-compliance="category-label" className={merge("font-semibold", TEXT_CLASS, classNames.categoryLabel)}>
          {label}
        </span>
        <span id={descriptionId} data-fancy-compliance="category-description" className={merge("block text-sm", SOFT_TEXT_CLASS, classNames.categoryDescription)}>
          {description}
        </span>
        {purposes.length > 0 ? (
          <span data-fancy-compliance="category-purposes" className={merge("block text-sm", SOFT_TEXT_CLASS, classNames.categoryPurposes)}>
            {purposesLabel}: {purposes.join("; ")}
          </span>
        ) : null}
      </label>
      <div className="flex min-h-11 shrink-0 items-center gap-2">
        {category.required ? (
          <span data-fancy-compliance="always-on" className={merge("text-sm font-medium", TEXT_CLASS, classNames.alwaysOn)}>{alwaysOn}</span>
        ) : null}
        <Switch
          className={classNames.switch}
          id={switchId}
          size="xl"
          checked={checked}
          disabled={category.required}
          onCheckedChange={onChange}
          aria-labelledby={labelId}
          aria-describedby={descriptionId}
          data-fancy-compliance-switch={category.key}
        />
      </div>
    </div>
  );
}
