# Using @particle-academy/fancy-compliance-ui — guide for agents

How an agent installs and uses this package in a consumer app. What the package
is, is in [README.md](./README.md). Notes for working ON this repo's code are in
[CONTRIBUTING.md](./CONTRIBUTING.md).

## Install

```bash
npm install @particle-academy/fancy-compliance-ui
```

- **Peers:** `@particle-academy/react-fancy >=6.9.0 <7.0.0`, React 19. No
  runtime dependencies; Inertia is not required.
- Tailwind v4 must scan both packages:

  ```css
  @import "tailwindcss";
  @import "@particle-academy/react-fancy/styles.css";
  @source "../node_modules/@particle-academy/react-fancy/dist/**/*.js";
  @source "../node_modules/@particle-academy/fancy-compliance-ui/dist/**/*.js";
  ```

- The server half is the Laravel package `particle-academy/fancy-compliance`;
  any backend serving the same JSON works.

## Find it on the Fancy MCP server

The catalog server is `https://ui.particle.academy/mcp` (streamable HTTP, no API
key; MCP id `fancy-ui`). This package's registry entries are
`fancy-compliance-ui`, `consent-banner`, `consent-gate` and
`consent-preferences`. Find them with `search-components` and get exact commands
with `install-instructions`. The Laravel half is the entry `fancy-compliance`,
found with `search-backend-packages` (stack `php`).

## API essentials

- `useConsentController(usePage().props.fancyCompliance)` (Inertia) or
  `readConsentProps()` (Blade, after `@fancyComplianceProps`) feeds
  `ConsentProvider`. To own the state, pass `value`, `onDecide` and `onWithdraw`
  to `ConsentProvider` directly: it is fully controlled.
- Mount `ConsentBanner`, `ConsentPreferences`, `ConsentPreferencesTrigger`
  (usually in the footer) and `ConsentReloadNotice` inside the provider.
- Gate content with `ConsentGate category="..."` and scripts with
  `ConsentScript` / `useConsentScript`.
- `useConsent()` gives `allows(key)`, `needsConsent`, `openPreferences()` and more.
- Read-only and data-rights surfaces: `ConsentHistory`, `DataExportPanel`,
  `AccountDeletionPanel`.
- Stable handles: `data-fancy-compliance="banner" | "preferences" | "trigger" | ...`,
  and every action button carries `data-fancy-compliance-action` (`accept-all`,
  `reject-all`, `customise`, `save`, `close`, `reload`).
- Every string is a translation key; pass `messages` to the provider.

## Traps

- **If `fancyCompliance` props are missing**, `useConsentController` does not
  throw: no banner shows, nothing optional is allowed, and one dev warning is
  logged. Check the route is in the `web` group (or add
  `FancyCompliance\Http\ShareInertiaProps`), and use `fancy-compliance` 0.1.2 or
  later under Octane.
- **A script that already ran cannot be stopped.** On withdrawal without a
  cleanup it reports `reload-required`; show `ConsentReloadNotice`.
- **Never grant consent for the person** (see below). The consent and
  data-rights controls are fenced against agents in the markup.

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

`ConsentHistory` is deliberately **not** fenced: agents may read a person's consent
history. Its only control loads older entries, and nothing in it records consent.

**Data rights are fenced the same way, with `data-agent-off-limits="legal"`**
(`DATA_RIGHTS_OFF_LIMITS`). In `DataExportPanel` the request buttons and the download link
sit inside it; in `AccountDeletionPanel` the request, the confirm step and cancel do. An
agent may read export and erasure status (those rows are outside the fence); it may never
ask for, confirm, cancel or download anything on a person's behalf.
