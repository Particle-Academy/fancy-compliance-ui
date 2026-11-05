# Changelog

Notable changes to `@particle-academy/fancy-compliance-ui`.

**Pre-1.0: breaking changes land in MINOR releases.** Read those entries before upgrading.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

---

## [Unreleased]

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
