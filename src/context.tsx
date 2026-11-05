import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { createTranslator, type Translate } from "./messages";
import type {
  ConsentActivity,
  ConsentDecision,
  ConsentMessages,
  ConsentSnapshot,
  ConsentSource,
  ConsentWithdrawal,
  Direction,
} from "./types";

export interface ConsentProviderProps {
  /** The current consent, from the server. Controlled: the provider never invents state. */
  value: ConsentSnapshot;
  /** Persist a decision. Resolve when saved (update `value`); reject to show the error. */
  onDecide: (decision: ConsentDecision) => unknown;
  /** Persist a withdrawal. Resolve when saved (update `value`); reject to show the error. */
  onWithdraw: (withdrawal: ConsentWithdrawal) => unknown;
  /** Translations by key. Anything missing falls back to English. */
  messages?: ConsentMessages;
  /** Writing direction for the banner and the dialog. The dialog is portalled, so set it here, not only on a wrapper. */
  dir?: Direction;
  /** Every human action, for presence, undo and audit layers. */
  onActivity?: (event: ConsentActivity) => void;
  /** Control the preferences dialog yourself; leave both unset to let the provider do it. */
  preferencesOpen?: boolean;
  onPreferencesOpenChange?: (open: boolean) => void;
  /** Called by the reload notice. Defaults to `window.location.reload()`. */
  onReload?: () => void;
  children?: ReactNode;
}

export interface ConsentApi {
  value: ConsentSnapshot;
  /** Whether a category may be used now. Required categories: always. Unknown categories: never. */
  allows: (category: string) => boolean;
  needsConsent: boolean;
  preferencesOpen: boolean;
  openPreferences: () => void;
  closePreferences: () => void;
  /** For a host's own consent UI, driven by the person. Never call it on someone's behalf. */
  decide: (granted: string[], source: ConsentSource) => Promise<boolean>;
  /** For a host's own consent UI, driven by the person. Never call it on someone's behalf. */
  withdraw: (categories: string[] | null, source: ConsentSource) => Promise<boolean>;
  pending: boolean;
  error: string | null;
  /** Categories whose scripts had already run when they were withdrawn, and could not be stopped. */
  reloadRequired: string[];
  t: Translate;
  messages: ConsentMessages | undefined;
  dir: Direction | undefined;
}

interface InternalApi extends ConsentApi {
  requireReload: (category: string) => void;
  reload: () => void;
  registerTrigger: (element: HTMLElement | null) => void;
  focusTrigger: () => void;
}

const ConsentContext = createContext<InternalApi | null>(null);

export function ConsentProvider({
  value,
  onDecide,
  onWithdraw,
  messages,
  dir,
  onActivity,
  preferencesOpen,
  onPreferencesOpenChange,
  onReload,
  children,
}: ConsentProviderProps) {
  const [ownOpen, setOwnOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadRequired, setReloadRequired] = useState<string[]>([]);
  const trigger = useRef<HTMLElement | null>(null);

  const t = useMemo(() => createTranslator(messages), [messages]);
  const open = preferencesOpen ?? ownOpen;

  const setOpen = useCallback(
    (next: boolean) => {
      if (preferencesOpen === undefined) setOwnOpen(next);
      onPreferencesOpenChange?.(next);
      onActivity?.({ type: next ? "consent.preferences.opened" : "consent.preferences.closed", actor: "human" });
    },
    [preferencesOpen, onPreferencesOpenChange, onActivity],
  );

  const allows = useCallback(
    (category: string) => {
      const config = value.categories.find((c) => c.key === category);
      if (!config) return false;
      if (config.required) return true;

      return value.consent?.current === true && value.consent.granted.includes(category);
    },
    [value],
  );

  const run = useCallback(
    async (write: () => unknown, activity: ConsentActivity) => {
      setPending(true);
      setError(null);
      try {
        await write();
        onActivity?.(activity);

        return true;
      } catch {
        setError(t("fancy-compliance.error.save"));

        return false;
      } finally {
        setPending(false);
      }
    },
    [onActivity, t],
  );

  const decide = useCallback(
    (granted: string[], source: ConsentSource) =>
      run(() => onDecide({ granted, source }), { type: "consent.decided", actor: "human", source, granted }),
    [run, onDecide],
  );

  const withdraw = useCallback(
    (categories: string[] | null, source: ConsentSource) =>
      run(() => onWithdraw({ categories, source }), { type: "consent.withdrawn", actor: "human", source, categories }),
    [run, onWithdraw],
  );

  const requireReload = useCallback((category: string) => {
    setReloadRequired((current) => (current.includes(category) ? current : [...current, category]));
  }, []);

  const api = useMemo<InternalApi>(
    () => ({
      value,
      allows,
      needsConsent: value.needsConsent,
      preferencesOpen: open,
      openPreferences: () => setOpen(true),
      closePreferences: () => setOpen(false),
      decide,
      withdraw,
      pending,
      error,
      reloadRequired,
      t,
      messages,
      dir,
      requireReload,
      reload: () => (onReload ? onReload() : window.location.reload()),
      registerTrigger: (element) => {
        trigger.current = element;
      },
      // After a decision closes the banner, focus has nowhere to go; the
      // trigger is where the person changes their mind later, so it goes there.
      focusTrigger: () => {
        window.setTimeout(() => {
          if (trigger.current && trigger.current.isConnected) trigger.current.focus();
        }, 0);
      },
    }),
    [value, allows, open, setOpen, decide, withdraw, pending, error, reloadRequired, t, messages, dir, requireReload, onReload],
  );

  return <ConsentContext.Provider value={api}>{children}</ConsentContext.Provider>;
}

export function useConsentInternal(): InternalApi {
  const api = useContext(ConsentContext);
  if (!api) throw new Error("fancy-compliance-ui: wrap the app in <ConsentProvider>.");

  return api;
}

/** Read consent, and drive a host's own consent UI. */
export function useConsent(): ConsentApi {
  const api = useConsentInternal();

  return {
    value: api.value,
    allows: api.allows,
    needsConsent: api.needsConsent,
    preferencesOpen: api.preferencesOpen,
    openPreferences: api.openPreferences,
    closePreferences: api.closePreferences,
    decide: api.decide,
    withdraw: api.withdraw,
    pending: api.pending,
    error: api.error,
    reloadRequired: api.reloadRequired,
    t: api.t,
    messages: api.messages,
    dir: api.dir,
  };
}
