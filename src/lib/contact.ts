export const EMAIL = "adaaanniel@gmail.com";
export const X_HANDLE = "stylessh";
/** Numeric X account ID. When set, the X link opens a DM instead of the profile. */
export const X_USER_ID: string | undefined = undefined;

export const emailHref = `mailto:${EMAIL}`;
export const xDmHref = X_USER_ID
  ? `https://x.com/messages/compose?recipient_id=${X_USER_ID}`
  : `https://x.com/${X_HANDLE}`;
