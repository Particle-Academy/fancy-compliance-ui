import type { ConsentCategory, ConsentMessages, ConsentPurpose } from "./types";

/**
 * English defaults. Every visible string is looked up by key, so a host
 * passes `messages` with its own translations and anything it leaves out
 * falls back to English here, never to the raw key.
 *
 * The `fancy-compliance::categories.*` keys match the server package's
 * defaults, so its three stock categories read correctly with no messages.
 */
export const DEFAULT_MESSAGES: Readonly<ConsentMessages> = Object.freeze({
  "fancy-compliance.banner.title": "Your privacy choices",
  "fancy-compliance.banner.body":
    "We use cookies and similar technologies. The necessary ones keep the site working. With your permission we would also use others, which you can review in the settings. You can change your mind at any time.",
  // Shown instead of the body below the sm breakpoint (640px), where the full
  // text took 6 or 7 lines. The full text stays in the preferences dialog.
  "fancy-compliance.banner.body-short":
    "We use necessary cookies, and others only if you allow them. You can change your mind at any time.",
  "fancy-compliance.action.accept-all": "Accept all",
  "fancy-compliance.action.reject-all": "Reject all",
  "fancy-compliance.action.customise": "Customise",
  "fancy-compliance.action.save": "Save choices",
  "fancy-compliance.action.close": "Close",
  "fancy-compliance.action.reload": "Reload page",
  "fancy-compliance.preferences.title": "Privacy settings",
  "fancy-compliance.preferences.intro":
    "Choose which kinds of cookies and similar technologies we may use. The necessary ones are always on, because the site cannot work without them.",
  "fancy-compliance.preferences.always-on": "Always on",
  "fancy-compliance.preferences.purposes": "Used for",
  "fancy-compliance.trigger": "Privacy settings",
  "fancy-compliance.error.save": "Your choice could not be saved. Please try again.",
  "fancy-compliance.status.saving": "Saving your choice",
  "fancy-compliance.reload.body":
    "Some features you turned off were already running. Reload the page to stop them completely.",

  "fancy-compliance.history.title": "Your consent history",
  "fancy-compliance.history.empty": "You have not made a choice yet.",
  "fancy-compliance.history.action.decision": "Choice saved",
  "fancy-compliance.history.action.withdrawal": "Consent withdrawn",
  "fancy-compliance.history.action.link": "Carried over when you signed in",
  "fancy-compliance.history.action.unknown": "Change recorded",
  "fancy-compliance.history.source.banner": "From the banner",
  "fancy-compliance.history.source.preferences": "From privacy settings",
  "fancy-compliance.history.source.api": "Through the app",
  "fancy-compliance.history.source.login": "At sign-in",
  "fancy-compliance.history.source.unknown": "Recorded",
  "fancy-compliance.history.granted": "Allowed",
  "fancy-compliance.history.refused": "Refused",
  "fancy-compliance.history.none": "None",
  "fancy-compliance.history.policy": "Policy version",
  "fancy-compliance.history.load-more": "Show older choices",
  "fancy-compliance.history.error": "Your history could not be loaded. Please try again.",

  "fancy-compliance.export.title": "Download your data",
  "fancy-compliance.export.intro":
    "Ask for a copy of the data this site holds about you. When it is ready, you can download it here while you are signed in.",
  "fancy-compliance.export.request.json": "Request a copy (JSON)",
  "fancy-compliance.export.request.zip": "Request a copy (ZIP)",
  "fancy-compliance.export.remaining": "{remaining} of {perDay} exports left today",
  "fancy-compliance.export.empty": "You have not asked for a copy yet.",
  "fancy-compliance.export.requested": "Requested",
  "fancy-compliance.export.expires": "Available until",
  "fancy-compliance.export.download": "Download",
  "fancy-compliance.export.format.json": "JSON",
  "fancy-compliance.export.format.zip": "ZIP",
  "fancy-compliance.export.status.pending": "Being prepared",
  "fancy-compliance.export.status.ready": "Ready to download",
  "fancy-compliance.export.status.failed": "Could not be prepared",
  "fancy-compliance.export.status.downloaded": "Downloaded",
  "fancy-compliance.export.status.expired": "Expired",
  "fancy-compliance.export.status.unknown": "Status unknown",
  "fancy-compliance.export.failure.too_large": "The copy was larger than this site allows. Please contact us.",
  "fancy-compliance.export.failure.too_many_files": "The copy had more files than this site allows. Please contact us.",
  "fancy-compliance.export.failure.registrant_failed": "Part of your data could not be collected. Please try again later.",
  "fancy-compliance.export.failure.zip_unavailable": "ZIP copies are not available here. Please ask for JSON.",
  "fancy-compliance.export.failure.build_failed": "The copy could not be prepared. Please try again later.",
  "fancy-compliance.export.failure.unknown": "The copy could not be prepared.",
  "fancy-compliance.export.size.b": "{n} B",
  "fancy-compliance.export.size.kb": "{n} KB",
  "fancy-compliance.export.size.mb": "{n} MB",
  "fancy-compliance.export.error.reauth_required": "Please confirm it is you (sign in again), then ask once more.",
  "fancy-compliance.export.error.rate_limited": "You have asked for as many copies as allowed today. Please try again tomorrow.",
  "fancy-compliance.export.error.export_in_progress": "A copy is already being prepared.",
  "fancy-compliance.export.error.unauthenticated": "Please sign in to ask for a copy of your data.",
  "fancy-compliance.export.error.forbidden": "You cannot ask for this copy.",
  "fancy-compliance.export.error.generic": "Your request could not be sent. Please try again.",

  "fancy-compliance.erasure.title": "Delete your account",
  "fancy-compliance.erasure.intro":
    "When you ask, your account and data are deleted after {days} days. Until then you can cancel.",
  "fancy-compliance.erasure.intro-immediate":
    "When you confirm, your account and data are deleted straight away. This cannot be undone.",
  "fancy-compliance.erasure.kept-note": "Some records may be kept where the site must keep them. You will see which, and why.",
  "fancy-compliance.erasure.request": "Delete my account",
  "fancy-compliance.erasure.confirm-title": "Are you sure?",
  "fancy-compliance.erasure.confirm-body": "Your account and data will be deleted. Records the site must keep are listed afterwards.",
  "fancy-compliance.erasure.confirm": "Yes, delete my account",
  "fancy-compliance.erasure.keep": "Keep my account",
  "fancy-compliance.erasure.cancel": "Cancel the deletion",
  "fancy-compliance.erasure.due": "Scheduled for",
  "fancy-compliance.erasure.countdown": "{days} days left to cancel",
  "fancy-compliance.erasure.countdown-one": "1 day left to cancel",
  "fancy-compliance.erasure.countdown-none": "Less than a day left to cancel",
  "fancy-compliance.erasure.executed-at": "Completed",
  "fancy-compliance.erasure.state.pending": "Your account is scheduled for deletion.",
  "fancy-compliance.erasure.state.cancelled": "You cancelled this request. Nothing was deleted.",
  "fancy-compliance.erasure.state.executing": "Your account is being deleted now.",
  "fancy-compliance.erasure.state.executed": "Your account and data were deleted.",
  "fancy-compliance.erasure.state.partially_executed":
    "Most of your data was deleted, but part of it could not be removed yet. The site will try again.",
  "fancy-compliance.erasure.state.unknown": "Your request was recorded.",
  "fancy-compliance.erasure.registrants": "What happened, part by part",
  "fancy-compliance.erasure.registrant.waiting": "Waiting",
  "fancy-compliance.erasure.registrant.done": "Done",
  "fancy-compliance.erasure.registrant.failed": "Not finished yet",
  "fancy-compliance.erasure.registrant.unknown": "Recorded",
  "fancy-compliance.erasure.retained-title": "Kept, and why",
  "fancy-compliance.erasure.retained.rows": "{rows} kept",
  "fancy-compliance.erasure.retained.rekeyed": "No longer linked to your name.",
  "fancy-compliance.erasure.retained.unchanged": "Kept unchanged.",
  "fancy-compliance.erasure.error.reauth_required": "Please confirm it is you (sign in again), then ask once more.",
  "fancy-compliance.erasure.error.rate_limited": "You have made as many requests as allowed today. Please try again tomorrow.",
  "fancy-compliance.erasure.error.erasure_pending": "A deletion is already scheduled.",
  "fancy-compliance.erasure.error.erasure_blocked": "Your account cannot be deleted yet.",
  "fancy-compliance.erasure.error.not_cancellable": "This request can no longer be cancelled.",
  "fancy-compliance.erasure.error.erasure_not_configured": "Account deletion is not available here yet. Please contact us.",
  "fancy-compliance.erasure.error.unauthenticated": "Please sign in to delete your account.",
  "fancy-compliance.erasure.error.forbidden": "You cannot make this request.",
  "fancy-compliance.erasure.error.generic": "Your request could not be sent. Please try again.",

  "fancy-compliance::categories.necessary.label": "Strictly necessary",
  "fancy-compliance::categories.necessary.description": "Needed for the site to work and to remember your choices. Always on.",
  "fancy-compliance::categories.necessary.purposes.session": "Keeping you signed in and your session working",
  "fancy-compliance::categories.necessary.purposes.security": "Protecting forms against forgery and abuse",
  "fancy-compliance::categories.necessary.purposes.consent": "Remembering the choices you make here",
  "fancy-compliance::categories.analytics.label": "Analytics",
  "fancy-compliance::categories.analytics.description": "Helps us understand how the site is used, so we can improve it.",
  "fancy-compliance::categories.analytics.purposes.usage": "Measuring which pages are visited and how they perform",
  "fancy-compliance::categories.marketing.label": "Marketing",
  "fancy-compliance::categories.marketing.description": "Used to show and measure advertising.",
  "fancy-compliance::categories.marketing.purposes.ads": "Showing relevant ads and measuring them",
});

export type Translate = (key: string) => string;

export function createTranslator(messages: ConsentMessages | undefined): Translate {
  return (key) => messages?.[key] ?? DEFAULT_MESSAGES[key] ?? key;
}

/** Replaces each `{name}` in a looked-up message. Unknown names are left as written. */
export function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{([a-zA-Z]+)\}/g, (match, name: string) => (name in values ? String(values[name]) : match));
}

/** A message for `<prefix>.<code>` when the code is one we know, else `<prefix>.<fallback>`. */
export function codeKey(prefix: string, code: string | null | undefined, known: readonly string[], fallback: string): string {
  return `${prefix}.${code && known.includes(code) ? code : fallback}`;
}

/** Host messages first, then the server's text, then the English defaults, then the key. */
export function categoryText(
  category: ConsentCategory,
  field: "label" | "description",
  messages: ConsentMessages | undefined,
): string {
  const key = category[field];
  const serverText = field === "label" ? category.labelText : category.descriptionText;

  return messages?.[key] ?? serverText ?? DEFAULT_MESSAGES[key] ?? key;
}

export function purposeText(purpose: ConsentPurpose, messages: ConsentMessages | undefined): string {
  return messages?.[purpose.key] ?? purpose.text ?? DEFAULT_MESSAGES[purpose.key] ?? purpose.key;
}
