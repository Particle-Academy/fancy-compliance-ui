# Changelog

Notable changes to `@particle-academy/fancy-compliance-ui`.

**Pre-1.0: breaking changes land in MINOR releases.** Read those entries before upgrading.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

---

## [Unreleased]

## [0.2.1] - 2026-11-07

### Fixed

- **An agent could use the consent controls.** The README promised that an agent may read
  consent and never grant, record or withdraw it, but nothing in the markup said so, and
  agent-integrations' DOM navigation let an agent click "Accept all", flip a category switch
  or save the dialog. A `pendingMode` confirm did not fix it: a person approving an agent's
  click is still the agent's act. The banner (every variant), the preferences dialog and the
  preferences trigger now carry `data-agent-off-limits="consent"`, which
  `@particle-academy/agent-integrations` 0.58.0 refuses on every action path, before
  staging, and describes only as "consent region" / "consent dialog". This package still
  imports nothing from agent-integrations; the attribute is the contract. Found by PS Mapper.
  The `data-fancy-compliance*` handles are unchanged. **Consumer action:** update both
  packages. Hosts that wrote their own guard for these controls can drop it.
- **The fixed banner covered the page's last content.** On a short page the banner sat over
  the footer, where this README said to put `ConsentPreferencesTrigger`: a pointer could not
  reach it, and with keyboard focus it was hidden behind the banner (WCAG 2.4.11, Focus Not
  Obscured). In a full-height app shell it covered the bottom of the shell. While it shows,
  the banner now publishes the space it covers (see **Added**), and the README's placement
  advice says to reserve it. **Consumer action:** add `reserveSpace`, or use the variable in
  your layout. Without either, nothing moves.
- **`useConsentController` threw when its props were missing.** Given `undefined` or `null`
  (the `fancyCompliance` Inertia prop absent, as under Octane or Pest's in-process browser
  server with fancy-compliance before 0.1.2),
  it threw "Cannot read properties of undefined (reading 'routes')" and took the page down.
  It now holds a snapshot with no categories and `needsConsent: false`, so no banner shows
  and nothing optional is allowed, and logs one development-mode `console.warn` naming the
  missing prop and pointing to the README. Its parameter type is now
  `ConsentSnapshot | null | undefined`. **Consumer action:** none; fix the missing prop if
  you see the warning (fancy-compliance 0.1.2 fixes the Octane and browser-test cases).

### Added

- `AGENT_OFF_LIMITS` (`{ "data-agent-off-limits": "consent" }`), to spread onto a consent
  control you build yourself from `useConsent()` or put in a `ConsentGate` `fallback`.
- **The banner publishes the space it covers** as CSS custom properties on `<html>`:
  `--fancy-consent-banner-h` for a banner anchored to the bottom, and
  `--fancy-consent-banner-top-h` for one anchored to the top, in whole pixels, measured
  with a `ResizeObserver` (a card's inset included). Removed when the banner hides or
  unmounts; read them with a fallback, `var(--fancy-consent-banner-h, 0px)`. Set in effects
  only, so server rendering is unchanged. The names are exported as
  `CONSENT_BANNER_SPACE_VARS`.
- **`ConsentBanner` `reserveSpace`** (default `false`): pads `<body>` by that height while
  the banner shows, on top of the body's own padding, and restores it afterwards.

## [0.2.0] - 2026-11-06

A styling pass. **With no new props, the banner and dialog look the same as 0.1.0 in light
mode and keep their layout in both modes.** The markup is not byte-identical: see
**Changed** for exactly what differs. Nothing was renamed or removed.

### Added

- **`ConsentBanner` `variant`**: `"bar"` (the default, the 0.1.0 full-width bar), `"card"`
  (a floating react-fancy `Card`, up to 28rem wide, inset from the edges) and `"corner"` (a
  compact `Card`, up to 20rem, with the three actions always stacked). On a phone both
  floating variants span the width less a 1rem margin, with the actions stacked.
  **Consumer action:** none. Pass `variant="card"` or `variant="corner"` to opt in.
- **`ConsentBanner` `position`**: `"top"` / `"bottom"` for a bar (default `"bottom"`);
  `"bottom-start"` / `"bottom-end"` / `"top-start"` / `"top-end"` for a card or corner
  (default `"bottom-start"`, clear of react-fancy's toast stack at `bottom-end`). `start` and
  `end` are logical, so they mirror under `dir="rtl"`. The props type is a union, so a bar
  position on a card is a type error. **Consumer action:** none.
- **`classNames` on every styled component**, one key per part, merged after the package's
  own classes with react-fancy's `cn` (tailwind-merge), so a conflicting app class replaces
  the default instead of fighting it in the cascade:
  - `ConsentBanner`: `surface`, `layout`, `content`, `title`, `body`, `actions`, `action`, `error`.
  - `ConsentPreferences`: `surface`, `header`, `title`, `content`, `body`, `categories`,
    `category`, `categoryLabel`, `categoryDescription`, `categoryPurposes`, `alwaysOn`,
    `switch`, `actions`, `action`, `error`.
  - `ConsentPreferencesTrigger`: `trigger`. `ConsentReloadNotice`: `surface`, `body`, `action`.

  There is **one `action` key** for accept, reject and customise (and reject, accept and save
  in the dialog), and no per-button key: a per-button class would let a page make accepting
  easier than refusing. A type test fails if one is added. **Consumer action:** none.
- **Handles for the new parts**: `data-fancy-compliance-variant` and
  `data-fancy-compliance-position` on the banner; `banner-layout`, `banner-content`,
  `banner-title`, `banner-body`, `preferences-header`, `preferences-title`,
  `preferences-content`, `preferences-body`, `preferences-categories`, `category-label`,
  `category-description`, `category-purposes`, `always-on` and `reload-body` as values of
  `data-fancy-compliance`. **Consumer action:** none.
- Exported types: `ConsentBannerVariant`, `ConsentBannerPosition`, `ConsentBannerBarPosition`,
  `ConsentBannerFloatingPosition`, `ConsentBannerClassNames`, `ConsentPreferencesClassNames`,
  `ConsentPreferencesTriggerClassNames`, `ConsentReloadNoticeClassNames`,
  `ConsentReloadNoticeProps`. **Consumer action:** none.

### Changed

- **Colours come from react-fancy's theme tokens** (`--fancy-surface`, `--fancy-border-strong`,
  `--fancy-border`, `--fancy-text`, `--fancy-text-soft` and their `-dark` twins), written the
  way react-fancy's own `Card` and `Modal` write them, instead of fixed zinc classes. Set
  those variables and the banner and dialog follow the rest of your react-fancy UI.
  With none set, the fallbacks are react-fancy's defaults, and the rendered colours are:
  - **Light mode: identical** (white surface, zinc-300 border, zinc-900 title, zinc-700 body).
  - **Dark mode: two text colours move one step**, to react-fancy's dark defaults: titles
    zinc-50 to zinc-100, body text zinc-200 to zinc-300. Surface (zinc-900), border
    (zinc-700) and dividers are unchanged. Measured in Chromium: lowest text contrast 10.08:1
    in dark mode, 10.43:1 in light, both above AAA's 7:1.

  **Consumer action:** none. If you want 0.1.0's brighter dark text, set
  `--fancy-text-dark: var(--color-zinc-50)` and `--fancy-text-soft-dark: var(--color-zinc-200)`.
- **The markup differs from 0.1.0 in these ways, and only these**: the colour classes above;
  the new `data-fancy-compliance*` attributes listed under Added; class strings are now
  produced by `cn`, so the trailing space 0.1.0 left on the banner and trigger when no
  `className` was passed is gone. **Consumer action:** only if a snapshot test of yours
  stores this markup: update the snapshot.
- **`className` now merges instead of appending**, on every component. A `className` that
  conflicts with a default (say `z-50` on the banner, or `no-underline` on the trigger) now
  replaces it; in 0.1.0 both classes were present and whichever Tailwind emitted later won.
  **Consumer action:** none, unless you relied on a conflicting class losing.
- `tsc` now typechecks `tests/` too (except `packaging.test.ts`, which needs Node types this
  repo does not carry), so type-level guards in tests are enforced. **Consumer action:** none.

## [0.1.0] - 2026-11-05

### Added

- **`ConsentProvider`**: controlled consent state (`value`, `onDecide`, `onWithdraw`),
  translations by key with English defaults, `dir`, observable `onActivity` events
  (always `actor: "human"`), and an optionally controlled preferences dialog.
- **`ConsentBanner`**: a labelled, non-modal region for the first visit and after a policy
  change. Accept all, Reject all and Customise are the same component, size and classes.
- **`ConsentPreferences`**: a modal dialog with a switch per category, its description and
  purposes. Nothing optional is pre-ticked; necessary is always on. Switching categories off
  after consenting is sent as a withdrawal. It manages its own focus (in, trapped, restored),
  because react-fancy 6.9.0's `Modal` does not when opened after mount.
- **`ConsentPreferencesTrigger`**: opens the dialog at any time, for withdrawal.
- **`ConsentGate`**: renders children only while a category is allowed.
- **`useConsentScript` / `ConsentScript`**: loads a script once allowed; on withdrawal
  removes it and runs your cleanup, or reports that a reload is needed.
  **`ConsentReloadNotice`** offers that reload.
- **`useConsentController`**, **`createConsentClient`** and **`readConsentProps`** for
  `particle-academy/fancy-compliance`'s routes, Inertia prop and Blade directive.
- Stable `data-fancy-compliance-*` handles throughout.

**Consumer action:** new package. Add both `@source` lines for Tailwind, and render
`ConsentReloadNotice` somewhere on the page if you use `useConsentScript` without cleanups.
