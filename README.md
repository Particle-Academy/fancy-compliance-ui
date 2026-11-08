# @particle-academy/fancy-compliance-ui

A consent banner, a preferences dialog and script gating for React, built from
[react-fancy](https://github.com/Particle-Academy/react-fancy). It pairs with the
Laravel package [`particle-academy/fancy-compliance`](https://github.com/Particle-Academy/fancy-compliance),
and works with any backend that serves the same JSON.

- **Reject is as easy as accept.** Accept all, Reject all and Customise are the same
  component, size and classes, side by side. A test fails if one becomes more prominent.
- **Nothing is pre-ticked.** Before a decision every optional category is off.
- **Withdrawal at any time** from an exported trigger, recorded as a withdrawal.
- **Script blocking that tells the truth** about what it can and cannot stop.
- **AAA:** a non-modal banner that never traps or takes focus, a modal dialog that does,
  keyboard throughout, 44px targets, text contrast above 7:1, and RTL.
- **Every string is a translation key** with English defaults; you supply the rest.

Peers: `@particle-academy/react-fancy >=6.9.0 <7.0.0`, React 19. No runtime
dependencies. Inertia is not required.

## Install

```bash
npm install @particle-academy/fancy-compliance-ui
```

Tailwind v4 must scan both packages:

```css
@import "tailwindcss";
@import "@particle-academy/react-fancy/styles.css";
@source "../node_modules/@particle-academy/react-fancy/dist/**/*.js";
@source "../node_modules/@particle-academy/fancy-compliance-ui/dist/**/*.js";
```

## Use

With Inertia and the Laravel package, the props are already on every page:

```tsx
import { usePage } from "@inertiajs/react";
import {
  ConsentProvider, ConsentBanner, ConsentPreferences, ConsentPreferencesTrigger,
  ConsentReloadNotice, ConsentGate, ConsentScript, useConsentController,
} from "@particle-academy/fancy-compliance-ui";

export function Layout({ children }) {
  const consent = useConsentController(usePage().props.fancyCompliance);

  return (
    <ConsentProvider {...consent} messages={myMessages} dir={isRtl ? "rtl" : "ltr"}>
      {/* reserveSpace pads the page so the bar never covers the footer below */}
      <ConsentBanner reserveSpace />
      {children}
      <ConsentScript category="analytics" src="https://analytics.example/script.js" />
      <footer>
        <ConsentReloadNotice />
        <ConsentPreferencesTrigger />
      </footer>
      <ConsentPreferences />
    </ConsentProvider>
  );
}
```

On a Blade page, print the props with `@fancyComplianceProps` and read them with
`readConsentProps()`.

`useConsentController` posts to the package's routes with Laravel's `X-XSRF-TOKEN`
(or the `csrf-token` meta tag) and replaces the state with the server's answer. To
own the state yourself, pass `value`, `onDecide` and `onWithdraw` to `ConsentProvider`
directly: it is fully controlled and never invents state.

#### The props never arrive

If `usePage().props.fancyCompliance` is `undefined` (or `null`), `useConsentController`
does not throw: it holds a snapshot with no categories and `needsConsent: false`, so no
banner shows and nothing optional is allowed, and it logs one `console.warn` in development.
The usual cause is the server share not running on that request. With
`particle-academy/fancy-compliance` older than 0.1.2 under Octane, or an in-process browser
test server, the prop went missing after the first request: upgrade it. On 0.1.2 and later,
check the page's route is in the `web` group, or add
`FancyCompliance\Http\ShareInertiaProps` to its group.

### Components

| Export | What it does | Handle |
|---|---|---|
| `ConsentProvider` | Controlled state: `value`, `onDecide`, `onWithdraw`, `messages`, `dir`, `onActivity`, `preferencesOpen` / `onPreferencesOpenChange`, `onReload` | |
| `ConsentBanner` | Shows while `value.needsConsent` (first visit, or a new policy version) | `data-fancy-compliance="banner"` |
| `ConsentPreferences` | The dialog: a switch per category with its description and purposes | `data-fancy-compliance="preferences"`, rows `data-fancy-compliance-category="<key>"` |
| `ConsentPreferencesTrigger` | Opens the dialog at any time. The footer is the usual place; reserve the banner's space so it is never covered (see [Keeping the page clear of the banner](#keeping-the-page-clear-of-the-banner)) | `data-fancy-compliance="trigger"` |
| `ConsentGate` | Renders children only while the category is allowed; optional `fallback` | `data-fancy-compliance-gate="<key>"` + `data-fancy-compliance-state` |
| `ConsentScript` / `useConsentScript` | Loads a script once allowed | `script[data-fancy-compliance-script="<key>"]` |
| `ConsentReloadNotice` | Offers a reload when a withdrawn script could not be stopped | `data-fancy-compliance="reload-notice"` |
| `useConsent` | `allows(key)`, `needsConsent`, `openPreferences()`, and more | |

Every action button carries `data-fancy-compliance-action` (`accept-all`, `reject-all`,
`customise`, `save`, `close`, `reload`).

### Banner variants

```tsx
<ConsentBanner />                                         // a full-width bar at the bottom
<ConsentBanner variant="bar" position="top" />            // a bar across the top
<ConsentBanner variant="card" />                          // a floating card, bottom-start
<ConsentBanner variant="card" position="bottom-end" />
<ConsentBanner variant="corner" position="top-end" />     // a compact card in a corner
```

| `variant` | Looks like | `position` (default first) |
|---|---|---|
| `bar` (default) | Full width, rule on the inner edge; actions in one row wherever the row is at least 17rem (272px) wide, so on a 320px phone too | `bottom`, `top` |
| `card` | A react-fancy `Card`, up to 28rem, 1.5rem from the edges; actions in a row from `sm` | `bottom-start`, `bottom-end`, `top-start`, `top-end` |
| `corner` | A compact `Card`, up to 20rem, 1rem from the edges; actions always stacked | the same four |

`start` and `end` are logical: `bottom-end` is the bottom right in a left-to-right page and
the bottom left under `dir="rtl"`. On a phone, `card` and `corner` span the width less a 1rem
margin, with the actions stacked. The banner's handle carries the layout in use:
`data-fancy-compliance-variant` and `data-fancy-compliance-position`.

**On a phone** (below Tailwind's `sm`, 640px) every variant shows a short body,
`fancy-compliance.banner.body-short`, instead of the full `fancy-compliance.banner.body`.
Both are rendered, on the server too, and a media query shows one, so there is no width
sniffing and no hydration mismatch; the hidden one is `display: none` and is not read out.
The full text is always in the preferences dialog, above its introduction. In the `bar`,
the three actions sit in one row at 320px (about 91px each, 44px tall), and stack only
where the row is under 17rem. Measured in headless Chromium, the default bar is 199px tall
at 375x667 (30% of the screen; 355px, 53%, before 0.3.0) and 197px at 320x568 (35%; was
379px, 67%).

### Keeping the page clear of the banner

Every variant is `position: fixed`, so on a short page it sits over the page's last
content: the footer, and the `ConsentPreferencesTrigger` in it. A pointer cannot reach a
covered trigger, and a keyboard user tabbing to it finds it focused behind the banner
(WCAG 2.4.11, Focus Not Obscured). So while it shows, the banner publishes the space it
covers on `<html>`, measured with a `ResizeObserver`:

| Variable | Set by |
|---|---|
| `--fancy-consent-banner-h` | a banner anchored to the bottom (`bar` at `bottom`, `card` / `corner` at `bottom-*`) |
| `--fancy-consent-banner-top-h` | a banner anchored to the top (`bar` at `top`, `card` / `corner` at `top-*`) |

The value is the distance the banner reaches in from that edge, in whole pixels (a card's
height plus its inset). It is **removed** when the banner hides or unmounts, so always read
it with a `0px` fallback. Nothing is set during render, so server rendering is unaffected.

The simple case: `<ConsentBanner reserveSpace />` pads `<body>` by it (bottom padding for a
bottom banner, top for a top one, added to the padding the body already has) and restores
the body when the banner goes. It is off by default, so an existing layout does not move.

If your layout does not scroll the body, use the variable yourself:

```css
/* a page whose own wrapper scrolls */
.page { padding-bottom: var(--fancy-consent-banner-h, 0px); }

/* a full-height app shell, so the banner does not cover a chat composer at the bottom */
.app-shell { height: calc(100dvh - var(--fancy-consent-banner-h, 0px)); }
```

With Tailwind: `pb-[var(--fancy-consent-banner-h,0px)]` or
`h-[calc(100dvh-var(--fancy-consent-banner-h,0px))]`.

#### Keyboard focus behind the banner: `scroll-padding`

Reserving space keeps the page's *end* clear, but a link in the middle of a long page can
still be scrolled into view right behind a bottom banner when someone tabs to it (WCAG
2.4.11). Pair the variable with `scroll-padding`, which tells the browser to keep that
strip clear when it scrolls something into view:

```css
html {
  scroll-padding-bottom: var(--fancy-consent-banner-h, 0px);
  scroll-padding-top: var(--fancy-consent-banner-top-h, 0px); /* for a top banner */
}
```

With Tailwind, on the root element: `scroll-pb-[var(--fancy-consent-banner-h,0px)]`.

What was measured (0.3.0, a page of 30 links 90px apart under the default bottom bar,
pressing Tab 24 times and checking whether the focused link ended up behind the banner):

| Browser | Without `scroll-padding` | With it |
|---|---|---|
| Chromium 151 (headless shell), 375x667 | 11 of 24 focused links behind the banner | 0 of 24 |
| Chromium 151 (headless shell), 320x568 | 16 of 24 | 0 of 24 |
| Firefox | not measured | not measured |
| WebKit / Safari | not measured | not measured |

Firefox and WebKit could not be driven on the machine this was measured on: the installed
Playwright browser builds did not match the Playwright version available, and both failed
at page creation. Test them on your own target browsers before relying on it there.

### Styling parts: `classNames`

Every styled component takes `className` (its root) and `classNames`, one key per part. Your
classes are merged after ours with react-fancy's `cn` (tailwind-merge), so a conflicting class
of yours replaces the default rather than competing with it: `classNames.action =
"justify-start"` removes our `justify-center`.

| Component | Keys |
|---|---|
| `ConsentBanner` | `surface`, `layout`, `content`, `title`, `body`, `actions`, `action`, `error` |
| `ConsentPreferences` | `surface`, `header`, `title`, `content`, `body`, `categories`, `category`, `categoryLabel`, `categoryDescription`, `categoryPurposes`, `alwaysOn`, `switch`, `actions`, `action`, `error` |
| `ConsentPreferencesTrigger` | `trigger` |
| `ConsentReloadNotice` | `surface`, `body`, `action` |

**There is one `action` key, and no key per button.** It applies to Accept all, Reject all
and Customise alike (Reject all, Accept all and Save in the dialog), so whatever you do to one
you do to all three. That is deliberate: refusing must stay exactly as easy as accepting. If
you need the buttons to differ, build your own banner (below) and take on that duty.

`classNames.surface` is merged after `className`. Dark-mode classes are their own utilities:
`title: "text-amber-950"` replaces our light-mode title colour and leaves the dark one, so
add `dark:text-amber-50` as well, or theme with the tokens instead.

### Theming

The banner and dialog use react-fancy's theme tokens, the same CSS variables its `Card`,
`Modal` and `Button` read, so set them once and every surface follows:

```css
:root {
  --fancy-surface: var(--color-stone-50);      --fancy-surface-dark: var(--color-stone-900);
  --fancy-border-strong: var(--color-stone-300); --fancy-border-strong-dark: var(--color-stone-700);
  --fancy-text: var(--color-stone-950);         --fancy-text-dark: var(--color-stone-50);
  --fancy-text-soft: var(--color-stone-700);    --fancy-text-soft-dark: var(--color-stone-300);
}
```

The `card` and `corner` variants ARE a react-fancy `Card` (`variant="outlined"`), and the
dialog is its `Modal`. Unset, every token falls back to react-fancy's default (the
`THEME_TOKENS` table it exports), and those defaults are AAA: body text is above 10:1 in both
light and dark mode. **If you set the tokens, the contrast is yours to check**: keep body
text at 7:1 or more against the surface. Dark mode follows your `dark:` variant; import
`@particle-academy/react-fancy/dark-variant.css` to drive it from a `.dark` class or
`[data-theme="dark"]`.

### Build your own banner on `useConsent()`

If no variant fits, render your own UI on the public hook. Keep `ConsentPreferences` and
`ConsentPreferencesTrigger` for the dialog and withdrawal:

```tsx
import { useConsent } from "@particle-academy/fancy-compliance-ui";
import { Button } from "@particle-academy/react-fancy";

function MyBanner() {
  const consent = useConsent();
  if (!consent.needsConsent) return null;
  const optional = consent.value.categories.filter((c) => !c.required).map((c) => c.key);
  const action = { type: "button", size: "lg", className: "min-h-11", disabled: consent.pending } as const;

  return (
    <section role="region" dir={consent.dir} aria-label={consent.t("fancy-compliance.banner.title")}>
      <p>{consent.t("fancy-compliance.banner.body")}</p>
      <Button {...action} onClick={() => consent.decide(optional, "banner")}>
        {consent.t("fancy-compliance.action.accept-all")}
      </Button>
      <Button {...action} onClick={() => consent.decide([], "banner")}>
        {consent.t("fancy-compliance.action.reject-all")}
      </Button>
      <Button {...action} onClick={consent.openPreferences}>
        {consent.t("fancy-compliance.action.customise")}
      </Button>
    </section>
  );
}
```

**Once you render the buttons, equal prominence is your duty, not this package's.** The
built-in banner guarantees, and tests, that accept, reject and customise are the same
component, size, classes and container. Your banner has no such test unless you write one.
Keep reject as visible and as easy to reach as accept: same style, same size, no extra click,
no colour that makes one the obvious choice. That is what regulators look for, and it is why
`classNames` has no per-button key. The same goes for the rest of what the built-in banner
does for you: a non-modal labelled region, 44px targets, AAA contrast, and `dir`.

### What is blocked, and what is not

- `ConsentGate` renders nothing of its children until consent, never under an outdated
  policy, and never for a category the server did not send. On withdrawal they unmount.
- `useConsentScript` inserts its `<script>` only once the category is allowed. On
  withdrawal it removes the tag, and then:
  - with an `onWithdraw` cleanup (the vendor's opt-out call, clearing its timers), it runs
    it and reports `stopped`;
  - without one, it reports `reload-required` and `ConsentReloadNotice` offers a reload.
    **Removing a script tag does not undo code that already ran**, and an async script
    still downloading runs when it arrives, so it does not pretend otherwise. Render
    `ConsentReloadNotice` somewhere on the page (the dialog closes on save).
- **Scripts you inject anywhere else are not blocked**: a tag in your HTML, a tag manager,
  a third party's loader. Load them through `useConsentScript`, or gate them on the server
  with `@consent` / `Consent::allows()`.

### Translations

Every string is looked up by key. Pass `messages`; anything missing falls back to the
English in `DEFAULT_MESSAGES`, never to the raw key. Category text resolves as: your
`messages[key]`, then the server's `labelText` / `descriptionText`, then the English
defaults for the stock categories, then the key.

The banner has two texts: `fancy-compliance.banner.body` (the full text, shown from `sm` up
and in the preferences dialog) and `fancy-compliance.banner.body-short` (shown on a phone).
Translate both. If you override only the full text, a phone still shows the English short
one.

### Accessibility

- The banner is a labelled `role="region"`, **non-modal**: it never traps or takes focus.
  Put it early in the document so keyboard and screen-reader users reach it first.
- The dialog is modal: focus moves in, Tab and Shift+Tab stay inside, Escape closes, and
  focus returns to whatever opened it. After a decision from the banner, focus goes to the
  trigger. (The dialog manages focus itself: react-fancy 6.9.0's `Modal` does not when it
  is opened after mount.)
- Targets are at least 44px. A switch's track is 52x28; its 44px+ target is the label bound
  to it, which covers the whole category row.
- With react-fancy's default tokens, text is zinc-900 / zinc-700 on white, and zinc-100 /
  zinc-300 on zinc-900 in dark mode: above 10:1 either way, past AAA's 7:1.
- `dir` goes on the banner and the portalled dialog; react-fancy 6.9.0 mirrors the rest.

## Agents (Human+)

**An agent may read consent state. It must never grant, record or withdraw consent on a
person's behalf.** Consent is the person's own act; one an agent gave for them is not
consent. `useConsent()` exposes `decide` and `withdraw` only so a host can build its own
consent UI for the person to use. If a bridge is ever added for this surface, it is
read-only: it may report `allows`, the categories and the current decision, and nothing
else. `onActivity` events always say `actor: "human"`.

**The rule is enforced in the markup, not left to each host.** The banner (every variant:
`bar`, `card`, `corner`), the preferences dialog and the preferences trigger each carry
`data-agent-off-limits="consent"` on their root. That is the kit's fence for agents:
`@particle-academy/agent-integrations` 0.58.0 or later refuses every agent action whose
target resolves inside such an element (click, field set, submit, focus, scroll, and a label
or button outside that would activate a control inside), refuses it before a `pendingMode`
confirm can stage it, and describes the area to the agent only as "consent region" or
"consent dialog", with no labels or values. A person approving an agent's click on
"Accept all" would still be the agent's act, which is why a staged confirm is not enough.
The full marker spec is in agent-integrations' README, under "Off-limits areas".

This package does not import agent-integrations: the attribute is the whole contract, so any
agent tool that honours it gets the rule. The `data-fancy-compliance*` handles are unchanged.
If you build your own consent control from `useConsent()`, or put one in a `ConsentGate`
`fallback`, spread the exported `AGENT_OFF_LIMITS` onto its root:

```tsx
import { AGENT_OFF_LIMITS } from "@particle-academy/fancy-compliance-ui";

<div {...AGENT_OFF_LIMITS}>{/* your consent switch */}</div>
```

`ConsentReloadNotice` is not marked on its own: its one action reloads the page, which
records nothing. Inside the dialog it is fenced with the rest.

## License

MIT
