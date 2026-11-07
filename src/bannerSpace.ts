import { useEffect } from "react";

/** The viewport edge a banner is anchored to. */
export type ConsentBannerEdge = "top" | "bottom";

/**
 * The CSS custom properties a shown banner sets on `<html>`: how far it reaches
 * in from the edge it is anchored to, in whole pixels. Absent (not `0px`) when no
 * banner is shown, so read them with a fallback:
 * `padding-bottom: var(--fancy-consent-banner-h, 0px)`.
 */
export const CONSENT_BANNER_SPACE_VARS: Record<ConsentBannerEdge, string> = {
  bottom: "--fancy-consent-banner-h",
  top: "--fancy-consent-banner-top-h",
};

const PADDING: Record<ConsentBannerEdge, "padding-bottom" | "padding-top"> = {
  bottom: "padding-bottom",
  top: "padding-top",
};

/**
 * Publishes the space a fixed banner covers, and optionally pads the body by it.
 * Effects only: nothing here runs during render, so it is safe on the server.
 */
export function useConsentBannerSpace(element: HTMLElement | null, edge: ConsentBannerEdge, reserveSpace: boolean): void {
  const variable = CONSENT_BANNER_SPACE_VARS[edge];

  useEffect(() => {
    if (!element || typeof document === "undefined") return;
    const root = document.documentElement;

    const measure = () => {
      // Height plus the distance to the edge, so a card inset 1.5rem from the
      // bottom reserves its inset too. A bar's offset is 0.
      const offset = Number.parseFloat(getComputedStyle(element)[edge]) || 0;
      const extent = Math.max(0, Math.ceil(element.getBoundingClientRect().height + offset));
      root.style.setProperty(variable, `${extent}px`);
    };

    measure();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
    observer?.observe(element);
    // The inset changes at breakpoints without the element necessarily resizing.
    window.addEventListener("resize", measure);

    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", measure);
      root.style.removeProperty(variable);
    };
  }, [element, edge, variable]);

  useEffect(() => {
    if (!element || !reserveSpace || typeof document === "undefined") return;
    const body = document.body;
    const property = PADDING[edge];
    const previous = body.style.getPropertyValue(property);
    const priority = body.style.getPropertyPriority(property);
    // Keep whatever padding the page already had, and add the banner on top.
    const base = getComputedStyle(body).getPropertyValue(property) || "0px";
    body.style.setProperty(property, `calc(${base} + var(${variable}, 0px))`);

    return () => {
      if (previous) body.style.setProperty(property, previous, priority);
      else body.style.removeProperty(property);
    };
  }, [element, edge, variable, reserveSpace]);
}
