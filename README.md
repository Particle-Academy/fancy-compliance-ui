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
      <ConsentBanner />
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

### Components

| Export | What it does | Handle |
|---|---|---|
| `ConsentProvider` | Controlled state: `value`, `onDecide`, `onWithdraw`, `messages`, `dir`, `onActivity`, `preferencesOpen` / `onPreferencesOpenChange`, `onReload` | |
| `ConsentBanner` | Shows while `value.needsConsent` (first visit, or a new policy version) | `data-fancy-compliance="banner"` |
| `ConsentPreferences` | The dialog: a switch per category with its description and purposes | `data-fancy-compliance="preferences"`, rows `data-fancy-compliance-category="<key>"` |
| `ConsentPreferencesTrigger` | Opens the dialog at any time; put it in the footer | `data-fancy-compliance="trigger"` |
| `ConsentGate` | Renders children only while the category is allowed; optional `fallback` | `data-fancy-compliance-gate="<key>"` + `data-fancy-compliance-state` |
| `ConsentScript` / `useConsentScript` | Loads a script once allowed | `script[data-fancy-compliance-script="<key>"]` |
| `ConsentReloadNotice` | Offers a reload when a withdrawn script could not be stopped | `data-fancy-compliance="reload-notice"` |
| `useConsent` | `allows(key)`, `needsConsent`, `openPreferences()`, and more | |

Every action button carries `data-fancy-compliance-action` (`accept-all`, `reject-all`,
`customise`, `save`, `close`, `reload`).

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

### Accessibility

- The banner is a labelled `role="region"`, **non-modal**: it never traps or takes focus.
  Put it early in the document so keyboard and screen-reader users reach it first.
- The dialog is modal: focus moves in, Tab and Shift+Tab stay inside, Escape closes, and
  focus returns to whatever opened it. After a decision from the banner, focus goes to the
  trigger. (The dialog manages focus itself: react-fancy 6.9.0's `Modal` does not when it
  is opened after mount.)
- Targets are at least 44px. A switch's track is 52x28; its 44px+ target is the label bound
  to it, which covers the whole category row.
- Text is zinc-900 / zinc-700 on white (and the reverse in dark mode), above 7:1.
- `dir` goes on the banner and the portalled dialog; react-fancy 6.9.0 mirrors the rest.

## Agents (Human+)

**An agent may read consent state. It must never grant, record or withdraw consent on a
person's behalf.** Consent is the person's own act; one an agent gave for them is not
consent. `useConsent()` exposes `decide` and `withdraw` only so a host can build its own
consent UI for the person to use. If a bridge is ever added for this surface, it is
read-only: it may report `allows`, the categories and the current decision, and nothing
else. `onActivity` events always say `actor: "human"`.

## License

MIT
