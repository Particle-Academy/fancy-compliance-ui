import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import type { ConsentSnapshot } from "../src";

// React 19 wants this flag set for act() outside a test renderer.
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

export interface Mounted {
  container: HTMLElement;
  root: Root;
  rerender: (ui: ReactNode) => Promise<void>;
  unmount: () => Promise<void>;
}

export async function mount(ui: ReactNode): Promise<Mounted> {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => root.render(ui));

  return {
    container,
    root,
    rerender: async (next) => act(async () => root.render(next)),
    unmount: async () => {
      await act(async () => root.unmount());
      container.remove();
    },
  };
}

export async function click(element: Element | null): Promise<void> {
  if (!element) throw new Error("click(): element not found");
  await act(async () => {
    (element as HTMLElement).click();
  });
}

export async function key(element: Element | null | undefined, keyName: string): Promise<void> {
  const target = element ?? document.activeElement ?? document.body;
  await act(async () => {
    target.dispatchEvent(new KeyboardEvent("keydown", { key: keyName, bubbles: true }));
  });
}

/** Everything rendered, including portals (the dialog renders into <body>). */
export function q<T extends Element = HTMLElement>(selector: string): T | null {
  return document.body.querySelector<T>(selector);
}

export function action(name: string): HTMLButtonElement | null {
  return q<HTMLButtonElement>(`[data-fancy-compliance-action="${name}"]`);
}

export function snapshot(overrides: Partial<ConsentSnapshot> = {}): ConsentSnapshot {
  return {
    policyVersion: "1",
    categories: [
      {
        key: "necessary",
        label: "fancy-compliance::categories.necessary.label",
        labelText: "Strictly necessary",
        description: "fancy-compliance::categories.necessary.description",
        descriptionText: "Needed for the site to work.",
        purposes: [{ key: "fancy-compliance::categories.necessary.purposes.session", text: "Keeping you signed in" }],
        required: true,
      },
      {
        key: "analytics",
        label: "fancy-compliance::categories.analytics.label",
        labelText: "Analytics",
        description: "fancy-compliance::categories.analytics.description",
        descriptionText: "Helps us understand how the site is used.",
        purposes: [{ key: "fancy-compliance::categories.analytics.purposes.usage", text: "Measuring page visits" }],
        required: false,
      },
      {
        key: "marketing",
        label: "fancy-compliance::categories.marketing.label",
        labelText: "Marketing",
        description: "fancy-compliance::categories.marketing.description",
        descriptionText: "Used to show and measure advertising.",
        purposes: [],
        required: false,
      },
    ],
    consent: null,
    needsConsent: true,
    routes: { show: "/fancy-compliance/consent", record: "/fancy-compliance/consent", withdraw: "/fancy-compliance/consent/withdraw" },
    ...overrides,
  };
}

/** A snapshot as if the person had already decided. */
export function decided(granted: string[], extra: Partial<ConsentSnapshot> = {}): ConsentSnapshot {
  const base = snapshot();
  const optional = base.categories.filter((c) => !c.required).map((c) => c.key);

  return {
    ...base,
    consent: {
      granted: ["necessary", ...granted],
      refused: optional.filter((k) => !granted.includes(k)),
      policyVersion: "1",
      decidedAt: "2026-11-05T12:00:00Z",
      source: "banner",
      current: true,
    },
    needsConsent: false,
    ...extra,
  };
}

export function cleanupDom(): void {
  document.body.innerHTML = "";
  document.head.querySelectorAll("[data-fancy-compliance-script]").forEach((node) => node.remove());
}
