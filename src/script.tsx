import { useEffect, useRef, useState } from "react";
import { useConsentInternal } from "./context";

/**
 * - `blocked`: not allowed, and never inserted.
 * - `loading` / `loaded` / `error`: inserted after consent.
 * - `stopped`: withdrawn, removed, and your `onWithdraw` cleanup ran.
 * - `reload-required`: withdrawn after it started, with no cleanup. The tag is
 *   removed, but code that already ran keeps running until the page reloads,
 *   and a still-downloading async script runs when it arrives regardless.
 */
export type ConsentScriptStatus = "blocked" | "loading" | "loaded" | "error" | "stopped" | "reload-required";

export interface ConsentScriptOptions {
  category: string;
  src: string;
  /** Extra attributes for the <script> (e.g. `data-domain`, `crossorigin`). */
  attributes?: Record<string, string>;
  /** Default true. */
  async?: boolean;
  /**
   * Stop what the script started (its own opt-out API, clearing its timers).
   * Without it, a withdrawal can only ask for a reload, and says so.
   */
  onWithdraw?: () => void;
}

const MARK = "data-fancy-compliance-script";
const STATE = "data-fancy-compliance-script-state";

function findScript(src: string): HTMLScriptElement | undefined {
  // Compared by attribute rather than built into a selector, so no src needs escaping.
  return Array.from(document.head.querySelectorAll<HTMLScriptElement>(`script[${MARK}]`)).find((el) => el.getAttribute("src") === src);
}

/**
 * Load a script only once its category is allowed, and deal honestly with a
 * withdrawal. Scripts a host injects anywhere else (a tag in the HTML, a tag
 * manager) are NOT blocked by this; only scripts loaded through here are.
 */
export function useConsentScript(options: ConsentScriptOptions): { status: ConsentScriptStatus } {
  const consent = useConsentInternal();
  const allowed = consent.allows(options.category);
  const [status, setStatus] = useState<ConsentScriptStatus>("blocked");
  const inserted = useRef(false);
  const latest = useRef(options);
  latest.current = options;
  const { requireReload } = consent;

  useEffect(() => {
    const { src, category } = latest.current;
    if (allowed) {
      let el = findScript(src);
      if (!el) {
        el = document.createElement("script");
        el.async = latest.current.async ?? true;
        for (const [name, val] of Object.entries(latest.current.attributes ?? {})) el.setAttribute(name, val);
        el.setAttribute(MARK, category);
        el.setAttribute(STATE, "loading");
        el.src = src;
        document.head.appendChild(el);
      }
      inserted.current = true;
      const script = el;
      const sync = () => setStatus((script.getAttribute(STATE) as ConsentScriptStatus | null) ?? "loading");
      const onLoad = () => {
        script.setAttribute(STATE, "loaded");
        sync();
      };
      const onError = () => {
        script.setAttribute(STATE, "error");
        sync();
      };
      script.addEventListener("load", onLoad);
      script.addEventListener("error", onError);
      sync();

      return () => {
        script.removeEventListener("load", onLoad);
        script.removeEventListener("error", onError);
      };
    }

    if (!inserted.current) {
      setStatus("blocked");

      return undefined;
    }
    inserted.current = false;
    findScript(src)?.remove();
    if (latest.current.onWithdraw) {
      latest.current.onWithdraw();
      setStatus("stopped");
    } else {
      requireReload(category);
      setStatus("reload-required");
    }

    return undefined;
  }, [allowed, options.src, requireReload]);

  return { status };
}

/** `useConsentScript` as an element, for markup-style use. Renders nothing. */
export function ConsentScript(props: ConsentScriptOptions) {
  useConsentScript(props);

  return null;
}
