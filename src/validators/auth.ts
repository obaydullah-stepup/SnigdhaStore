import { z } from "zod";

export type LocalizedMessage = {
  en: string;
  bn: string;
};

export type AuthActionResult =
  | { ok: true }
  | {
      ok: false;
      error?: LocalizedMessage;
      fieldErrors?: Record<string, LocalizedMessage>;
    };

export const localized = {
  invalidCredentials: {
    en: "Invalid email or password.",
    bn: "ইমেইল বা পাসওয়ার্ড সঠিক নয়।",
  },
  emailTaken: {
    en: "An account with this email already exists.",
    bn: "এই ইমেইলে একটি অ্যাকাউন্ট আগে থেকেই আছে।",
  },
  invalidToken: {
    en: "This link is invalid or has expired. Please request a new one.",
    bn: "লিংকটি সঠিক নয় বা মেয়াদ শেষ হয়েছে। অনুগ্রহ করে আবার অনুরোধ করুন।",
  },
  tooManyAttempts: {
    en: "Too many attempts. Please try again later.",
    bn: "অনেকবার চেষ্টা করা হয়েছে। কিছুক্ষণ পর আবার চেষ্টা করুন।",
  },
  generic: {
    en: "Something went wrong. Please try again.",
    bn: "কিছু একটা সমস্যা হয়েছে। আবার চেষ্টা করুন।",
  },
} as const;

const FIELD_MESSAGES: Record<string, LocalizedMessage> = {
  name: {
    en: "Please enter your full name (at least 2 characters).",
    bn: "আপনার পুরো নাম লিখুন (কমপক্ষে ২ অক্ষর)।",
  },
  email: {
    en: "Please enter a valid email address.",
    bn: "একটি সঠিক ইমেইল ঠিকানা লিখুন।",
  },
  phone: {
    en: "Please enter a valid phone number.",
    bn: "একটি সঠিক মোবাইল নম্বর লিখুন।",
  },
  password: {
    en: "Password must be at least 8 characters.",
    bn: "পাসওয়ার্ড কমপক্ষে ৮ অক্ষরের হতে হবে।",
  },
  passwordRequired: {
    en: "Please enter your password.",
    bn: "আপনার পাসওয়ার্ড লিখুন।",
  },
  token: {
    en: "Verification token is required.",
    bn: "ভেরিফিকেশন টোকেন প্রয়োজন।",
  },
};

function messageFor(
  issueKey: string | undefined,
  fallback: LocalizedMessage
): LocalizedMessage {
  if (!issueKey) return fallback;
  return FIELD_MESSAGES[issueKey] ?? fallback;
}

export function fieldErrorsFromIssues(
  issues: Array<{ path: PropertyKey[]; message: string }>
): Record<string, LocalizedMessage> {
  const result: Record<string, LocalizedMessage> = {};
  for (const issue of issues) {
    const key = issue.path[0];
    if (typeof key === "string" && !result[key]) {
      result[key] = messageFor(key, { en: issue.message, bn: issue.message });
    }
  }
  return result;
}

const nameField = z
  .string()
  .trim()
  .min(2, FIELD_MESSAGES.name.en)
  .max(80, FIELD_MESSAGES.name.en);

const emailField = z
  .email(FIELD_MESSAGES.email.en)
  .transform((value) => value.toLowerCase());

const phoneField = z
  .string()
  .optional()
  .transform((value) => {
    const trimmed = value?.trim();
    return trimmed === "" || trimmed === undefined ? undefined : trimmed;
  })
  .refine(
    (value) => value === undefined || /^\+?[0-9][0-9\s-]{9,14}$/.test(value),
    FIELD_MESSAGES.phone.en
  );

const passwordField = z
  .string()
  .min(8, FIELD_MESSAGES.password.en)
  .max(72, FIELD_MESSAGES.password.en);

export const registerSchema = z.object({
  name: nameField,
  email: emailField,
  phone: phoneField,
  password: passwordField,
});

export const loginSchema = z.object({
  email: emailField,
  password: z.string().trim().min(1, FIELD_MESSAGES.passwordRequired.en),
});

export const passwordResetRequestSchema = z.object({
  email: emailField,
});

export const passwordResetSchema = z.object({
  token: z.string().trim().min(1, FIELD_MESSAGES.token.en),
  password: passwordField,
});

export const verifyEmailSchema = z.object({
  token: z.string().trim().min(1, FIELD_MESSAGES.token.en),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
