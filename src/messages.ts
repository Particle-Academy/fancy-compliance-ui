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
