# fancy-compliance-ui code map

React 19 consent UI built only from `@particle-academy/react-fancy` (peer, `>=6.9.0 <7.0.0`).
The data contract is `ConsentSnapshot` in `src/types.ts`, which mirrors
`particle-academy/fancy-compliance`'s `ConsentManager::props()`.

## Where things are

- `src/context.tsx`: `ConsentProvider` (controlled) and `useConsent`. `allows()` is the one
  rule: required is always true, unknown is false, otherwise a CURRENT decision granting it.
- `src/ConsentBanner.tsx`: non-modal region. The three actions share `ACTION_CLASS` and
  `ACTION_SIZE` from `src/styles.ts`.
- `src/ConsentPreferences.tsx`: `Modal` plus its own focus management (react-fancy 6.9.0's
  `Modal` runs `useFocusTrap` before `useAnimation` mounts the panel, so a Modal that starts
  closed never moves, traps or restores focus). Saving only removals sends a withdrawal.
- `src/ConsentGate.tsx`, `src/script.tsx` (`useConsentScript`), `src/ConsentReloadNotice.tsx`.
- `src/client.ts`: fetch client for the Laravel routes, `useConsentController`, `readConsentProps`.
- `src/messages.ts`: `DEFAULT_MESSAGES` and the lookup order.

## Invariants a change must keep

- **Accept, reject and customise are equally prominent**: same component, `size`, classes and
  container. `tests/banner.test.tsx` compares them.
- **No optional category is pre-ticked** before a decision.
- **`ConsentGate` never renders children before consent**, under a stale policy, or for an
  unknown category.
- **Script withdrawal is honest**: without a cleanup it reports `reload-required`, including for
  a script still loading. Never claim a removed tag stopped anything.
- **Agents read, never grant.** No export may record consent without the person acting, and any
  future bridge is read-only. Activity events say `actor: "human"`.
- **Every visible string goes through `t()`** or the category text lookup. No literals in JSX.
- Targets `min-h-11`; text zinc-900/zinc-700 on white (AAA); `dir` on the banner and the dialog.

## Tests

vitest + jsdom with `createRoot`/`act` (`tests/helpers.tsx`). `npm run lint` is `tsc` + the
rules-of-hooks ESLint.
