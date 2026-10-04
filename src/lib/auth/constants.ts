export const SESSION_COOKIE = "snigdha_session";

export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;

export const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;

export const EMAIL_VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;

export const AUTH_RATE_LIMITS = {
  login: { limit: 10, windowMs: 15 * 60 * 1000 },
  register: { limit: 5, windowMs: 60 * 60 * 1000 },
  passwordReset: { limit: 5, windowMs: 15 * 60 * 1000 },
  passwordResetToken: { limit: 10, windowMs: 60 * 60 * 1000 },
  resendVerification: { limit: 5, windowMs: 60 * 60 * 1000 },
} as const;
