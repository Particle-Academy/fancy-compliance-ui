import { afterEach, describe, expect, it, vi } from "vitest";
import { THEME_TOKENS } from "@particle-academy/react-fancy";
import {
  ConsentBanner,
  ConsentPreferences,
  ConsentPreferencesTrigger,
  ConsentProvider,
  ConsentReloadNotice,
  type ConsentBannerProps,
} from "../src";
import { SOFT_TEXT_CLASS, SURFACE_CLASS, TEXT_CLASS } from "../src/styles";
import { action, cleanupDom, mount, q, snapshot } from "./helpers";

afterEach(cleanupDom);

async function banner(props: ConsentBannerProps = {}) {
  await mount(
    <ConsentProvider value={snapshot()} onDecide={vi.fn()} onWithdraw={vi.fn()}>
      <ConsentBanner {...props} />
    </ConsentProvider>,
  );
  return q('[data-fancy-compliance="banner"]')!;
}

function classes(element: Element | null): string[] {
  return (element?.getAttribute("class") ?? "").split(" ").filter(Boolean);
}

// A colour utility that names a fixed palette colour instead of a theme token.
const FIXED_COLOUR = /^(dark:)?(bg|text|border|divide)-(zinc|white|gray|neutral|slate|stone)(-|$)/;

describe("ConsentBanner variants", () => {
  it("defaults to today's full-width bar at the bottom, in a <section>", async () => {
    const root = await banner();
    expect(root.tagName).toBe("SECTION");
    expect(root.getAttribute("data-fancy-compliance-variant")).toBe("bar");
    expect(root.getAttribute("data-fancy-compliance-position")).toBe("bottom");
    expect(classes(root)).toEqual(expect.arrayContaining(["fixed", "inset-x-0", "bottom-0", "border-t", "z-40"]));
  });

  it("puts a bar at the top with its rule on the bottom edge", async () => {
    const root = await banner({ variant: "bar", position: "top" });
    expect(root.getAttribute("data-fancy-compliance-position")).toBe("top");
    expect(classes(root)).toEqual(expect.arrayContaining(["top-0", "border-b"]));
    expect(classes(root)).not.toContain("bottom-0");
    expect(classes(root)).not.toContain("border-t");
  });

  it("renders the card as a floating react-fancy Card, bottom-start by default", async () => {
    const root = await banner({ variant: "card" });
    expect(root.hasAttribute("data-react-fancy-card")).toBe(true);
    expect(root.getAttribute("data-fancy-compliance-variant")).toBe("card");
    expect(root.getAttribute("data-fancy-compliance-position")).toBe("bottom-start");
    expect(classes(root)).toContain("fixed");
    expect(classes(root)).not.toContain("inset-x-0");
    expect(root.className).toMatch(/max-w-(md|\[3[02]rem\]|lg)/);
  });

  it("renders the corner as a compact react-fancy Card whose actions always stack", async () => {
    const root = await banner({ variant: "corner" });
    expect(root.hasAttribute("data-react-fancy-card")).toBe(true);
    expect(root.getAttribute("data-fancy-compliance-variant")).toBe("corner");
    const actions = q('[data-fancy-compliance="banner-actions"]')!;
    expect(classes(actions)).toContain("grid-cols-1");
    expect(actions.className).not.toMatch(/:grid-cols-[23]/);
  });

  it.each([
    ["card", "bottom-start", ["bottom-4", "start-4"]],
    ["card", "bottom-end", ["bottom-4", "end-4"]],
    ["card", "top-start", ["top-4", "start-4"]],
    ["card", "top-end", ["top-4", "end-4"]],
    ["corner", "bottom-start", ["bottom-4", "start-4"]],
    ["corner", "top-end", ["top-4", "end-4"]],
  ] as const)("anchors a %s at %s with logical sides, so RTL mirrors", async (variant, position, expected) => {
    const root = await banner({ variant, position });
    expect(root.getAttribute("data-fancy-compliance-position")).toBe(position);
    expect(classes(root)).toEqual(expect.arrayContaining([...expected]));
    // No physical side: left/right would not mirror under dir="rtl".
    expect(root.className).not.toMatch(/(^|\s|:)(left|right)-/);
  });

  it("gives every part a stable handle", async () => {
    await banner({ variant: "card" });
    for (const part of ["banner", "banner-layout", "banner-content", "banner-title", "banner-body", "banner-actions"]) {
      expect(q(`[data-fancy-compliance="${part}"]`), part).not.toBeNull();
    }
  });
});

describe("classNames", () => {
  it("lets the app's classes win over the banner's own", async () => {
    const root = await banner({
      className: "shadow-none",
      classNames: {
        surface: "bg-amber-50 z-50",
        layout: "max-w-3xl",
        content: "gap-1",
        title: "text-amber-950",
        body: "text-amber-900",
        actions: "gap-4",
        action: "justify-start",
      },
    });
    // Merged, not appended: the conflicting default is gone.
    expect(classes(root)).toEqual(expect.arrayContaining(["bg-amber-50", "z-50", "shadow-none"]));
    expect(classes(root)).not.toContain("z-40");
    expect(classes(root)).not.toContain("shadow-lg");
    expect(classes(root).filter((c) => c.startsWith("bg-[")).length).toBe(0);

    expect(classes(q('[data-fancy-compliance="banner-layout"]'))).toContain("max-w-3xl");
    expect(classes(q('[data-fancy-compliance="banner-layout"]'))).not.toContain("max-w-5xl");
    expect(classes(q('[data-fancy-compliance="banner-content"]'))).toContain("gap-1");
    expect(classes(q('[data-fancy-compliance="banner-content"]'))).not.toContain("gap-2");

    const title = classes(q('[data-fancy-compliance="banner-title"]'));
    expect(title).toContain("text-amber-950");
    expect(title.filter((c) => c.startsWith("text-[color:"))).toEqual([]);
    const body = classes(q('[data-fancy-compliance="banner-body"]'));
    expect(body).toContain("text-amber-900");
    expect(body.filter((c) => c.startsWith("text-[color:"))).toEqual([]);

    expect(classes(q('[data-fancy-compliance="banner-actions"]'))).toContain("gap-4");
    expect(classes(q('[data-fancy-compliance="banner-actions"]'))).not.toContain("gap-2");
    for (const name of ["accept-all", "reject-all", "customise"]) {
      expect(classes(action(name))).toContain("justify-start");
      expect(classes(action(name))).not.toContain("justify-center");
    }
  });

  it("lets classNames.surface win over className", async () => {
    const root = await banner({ className: "z-30", classNames: { surface: "z-50" } });
    expect(classes(root)).toContain("z-50");
    expect(classes(root)).not.toContain("z-30");
  });

  it("styles the preferences dialog by part, with one action class for every choice", async () => {
    await mount(
      <ConsentProvider value={snapshot()} onDecide={vi.fn()} onWithdraw={vi.fn()} preferencesOpen onPreferencesOpenChange={vi.fn()}>
        <ConsentPreferences
          classNames={{
            surface: "rounded-none",
            header: "bg-amber-50",
            title: "text-amber-950",
            content: "gap-8",
            body: "text-amber-900",
            categories: "divide-amber-200",
            category: "py-5",
            categoryLabel: "uppercase",
            categoryDescription: "italic",
            categoryPurposes: "text-xs",
            alwaysOn: "tracking-wide",
            switch: "ring-1",
            actions: "gap-4",
            action: "bg-emerald-700",
          }}
        />
      </ConsentProvider>,
    );
    const has = (selector: string, cls: string) => expect(classes(q(selector)), selector).toContain(cls);
    has('[data-fancy-compliance="preferences"]', "rounded-none");
    expect(classes(q('[data-fancy-compliance="preferences"]'))).not.toContain("rounded-2xl");
    has('[data-fancy-compliance="preferences-header"]', "bg-amber-50");
    has('[data-fancy-compliance="preferences-title"]', "text-amber-950");
    has('[data-fancy-compliance="preferences-content"]', "gap-8");
    expect(classes(q('[data-fancy-compliance="preferences-content"]'))).not.toContain("gap-4");
    has('[data-fancy-compliance="preferences-body"]', "text-amber-900");
    has('[data-fancy-compliance="preferences-categories"]', "divide-amber-200");
    has('[data-fancy-compliance-category="analytics"]', "py-5");
    expect(classes(q('[data-fancy-compliance-category="analytics"]'))).not.toContain("py-3");
    has('[data-fancy-compliance-category="analytics"] [data-fancy-compliance="category-label"]', "uppercase");
    has('[data-fancy-compliance-category="analytics"] [data-fancy-compliance="category-description"]', "italic");
    has('[data-fancy-compliance-category="necessary"] [data-fancy-compliance="category-purposes"]', "text-xs");
    has('[data-fancy-compliance="always-on"]', "tracking-wide");
    has('[data-fancy-compliance-switch="analytics"]', "ring-1");
    has('[data-fancy-compliance="preferences-actions"]', "gap-4");

    const reject = action("reject-all")!;
    for (const other of [action("accept-all")!, action("save")!]) {
      expect(other.className).toBe(reject.className);
      expect(other.parentElement).toBe(reject.parentElement);
    }
    expect(classes(reject)).toContain("bg-emerald-700");
    expect(classes(reject)).toContain("min-h-11");
  });

  it("styles the trigger and the reload notice by part", async () => {
    await mount(
      <ConsentProvider value={snapshot()} onDecide={vi.fn()} onWithdraw={vi.fn()} preferencesOpen={false} onPreferencesOpenChange={vi.fn()}>
        <ConsentPreferencesTrigger className="text-sm" classNames={{ trigger: "no-underline" }} />
      </ConsentProvider>,
    );
    const trigger = classes(q('[data-fancy-compliance="trigger"]'));
    expect(trigger).toEqual(expect.arrayContaining(["text-sm", "no-underline", "min-h-11"]));
    expect(trigger).not.toContain("underline");
    // The reload notice renders only after a failed withdrawal; its part keys are typed.
    const noticeKeys: Parameters<typeof ConsentReloadNotice>[0]["classNames"] = { surface: "a", body: "b", action: "c" };
    expect(noticeKeys).toBeDefined();
  });

  it("has no per-button class key: one action class is all an app can set", () => {
    // @ts-expect-error accept is not a part; the three choices share `action`.
    const banner: ConsentBannerProps = { classNames: { accept: "bg-emerald-700" } };
    // @ts-expect-error reject is not a part either.
    const banner2: ConsentBannerProps = { classNames: { reject: "hidden" } };
    // @ts-expect-error a bar position does not apply to a card.
    const banner3: ConsentBannerProps = { variant: "card", position: "top" };
    // @ts-expect-error a corner position does not apply to a bar.
    const banner4: ConsentBannerProps = { variant: "bar", position: "top-end" };
    expect([banner, banner2, banner3, banner4]).toHaveLength(4);
  });
});

describe("theme", () => {
  it("draws surface, border and text from react-fancy's theme tokens, not fixed zinc", async () => {
    const root = await banner();
    const parts = [
      root,
      q('[data-fancy-compliance="banner-title"]'),
      q('[data-fancy-compliance="banner-body"]'),
    ];
    for (const part of parts) {
      expect(classes(part).filter((c) => FIXED_COLOUR.test(c)), part?.getAttribute("data-fancy-compliance") ?? "").toEqual([]);
    }
    expect(root.className).toContain("var(--fancy-surface,");
    expect(root.className).toContain("var(--fancy-surface-dark,");
    expect(root.className).toContain("var(--fancy-border-strong,");
    expect(q('[data-fancy-compliance="banner-title"]')!.className).toContain("var(--fancy-text,");
    expect(q('[data-fancy-compliance="banner-body"]')!.className).toContain("var(--fancy-text-soft,");
  });

  it("uses react-fancy's own defaults as the fallbacks, so the table is the contract", () => {
    const expectToken = (cls: string, role: keyof typeof THEME_TOKENS) => {
      const token = THEME_TOKENS[role];
      expect(cls).toContain(`var(${token.variable},${token.light})`);
      expect(cls).toContain(`var(${token.darkVariable},${token.dark})`);
    };
    expectToken(SURFACE_CLASS, "surface");
    expectToken(SURFACE_CLASS, "border-strong");
    expectToken(SURFACE_CLASS, "text");
    expectToken(TEXT_CLASS, "text");
    expectToken(SOFT_TEXT_CLASS, "text-soft");
  });

  // Tailwind CSS 4.3.3, node_modules/tailwindcss/theme.css.
  const TAILWIND: Record<string, [number, number, number] | string> = {
    "var(--color-white)": "#ffffff",
    "var(--color-zinc-100)": [0.967, 0.001, 286.375],
    "var(--color-zinc-300)": [0.871, 0.006, 286.286],
    "var(--color-zinc-700)": [0.37, 0.013, 285.805],
    "var(--color-zinc-900)": [0.21, 0.006, 285.885],
  };

  function luminance(value: string): number {
    const colour = TAILWIND[value];
    if (colour === undefined) throw new Error(`no Tailwind value recorded for ${value}`);
    let r: number;
    let g: number;
    let b: number;
    if (typeof colour === "string") {
      const lin = (hex: string) => {
        const c = parseInt(hex, 16) / 255;
        return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
      };
      [r, g, b] = [lin(colour.slice(1, 3)), lin(colour.slice(3, 5)), lin(colour.slice(5, 7))];
    } else {
      // OKLCH to linear sRGB (Ottosson's matrices). Luminance needs linear values.
      const [L, C, H] = colour;
      const a = C * Math.cos((H * Math.PI) / 180);
      const bb = C * Math.sin((H * Math.PI) / 180);
      const l = (L + 0.3963377774 * a + 0.2158037573 * bb) ** 3;
      const m = (L - 0.1055613458 * a - 0.0638541728 * bb) ** 3;
      const s = (L - 0.0894841775 * a - 1.291485548 * bb) ** 3;
      const clamp = (x: number) => Math.min(1, Math.max(0, x));
      r = clamp(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s);
      g = clamp(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s);
      b = clamp(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s);
    }
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  function contrast(fg: string, bg: string): number {
    const [hi, lo] = [luminance(fg), luminance(bg)].sort((x, y) => y - x) as [number, number];
    return (hi + 0.05) / (lo + 0.05);
  }

  it.each([
    ["light", "light"],
    ["dark", "dark"],
  ] as const)("meets AAA (7:1) for title and body text on the default %s surface", (_mode, side) => {
    const surface = THEME_TOKENS.surface[side];
    expect(contrast(THEME_TOKENS.text[side], surface)).toBeGreaterThanOrEqual(7);
    expect(contrast(THEME_TOKENS["text-soft"][side], surface)).toBeGreaterThanOrEqual(7);
  });

  it("checks the contrast arithmetic against a known pair", () => {
    // Black on white is 21:1 by definition; zinc-700 on white is about 10.4:1.
    TAILWIND["#000"] = "#000000";
    expect(contrast("#000", "var(--color-white)")).toBeCloseTo(21, 1);
    expect(contrast("var(--color-zinc-700)", "var(--color-white)")).toBeGreaterThan(10);
    expect(contrast("var(--color-zinc-700)", "var(--color-white)")).toBeLessThan(11);
  });
});
