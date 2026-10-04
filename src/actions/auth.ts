"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { createSession, destroySession, getSessionUser } from "@/lib/auth/session";
import {
  claimVerificationToken,
  createVerificationToken,
  InvalidVerificationTokenError,
} from "@/lib/auth/verification";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { AUTH_RATE_LIMITS } from "@/lib/auth/constants";
import { safeRedirectPath } from "@/lib/auth/utils";
import { sendPasswordResetEmail, sendVerificationEmail } from "@/lib/email/emails";
import {
  localized,
  fieldErrorsFromIssues,
  loginSchema,
  registerSchema,
  passwordResetRequestSchema,
  passwordResetSchema,
  verifyEmailSchema,
  type AuthActionResult,
} from "@/validators/auth";

async function requestIp(): Promise<string> {
  return clientIp(await headers());
}

function tooManyAttempts(): AuthActionResult {
  return { ok: false, error: localized.tooManyAttempts };
}

function genericError(): AuthActionResult {
  return { ok: false, error: localized.generic };
}

export async function loginAction(
  _prev: AuthActionResult,
  formData: FormData
): Promise<AuthActionResult> {
  const ip = await requestIp();
  if (
    !rateLimit(
      `login:${ip}`,
      AUTH_RATE_LIMITS.login.limit,
      AUTH_RATE_LIMITS.login.windowMs
    ).ok
  ) {
    return tooManyAttempts();
  }

  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { ok: false, fieldErrors: fieldErrorsFromIssues(parsed.error.issues) };
  }

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
    select: { id: true, passwordHash: true },
  });

  if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
    return { ok: false, error: localized.invalidCredentials };
  }

  await createSession(user.id);
  redirect(safeRedirectPath(formData.get("next")?.toString()));
}

export async function registerAction(
  _prev: AuthActionResult,
  formData: FormData
): Promise<AuthActionResult> {
  const ip = await requestIp();
  if (
    !rateLimit(
      `register:${ip}`,
      AUTH_RATE_LIMITS.register.limit,
      AUTH_RATE_LIMITS.register.windowMs
    ).ok
  ) {
    return tooManyAttempts();
  }

  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { ok: false, fieldErrors: fieldErrorsFromIssues(parsed.error.issues) };
  }

  const existing = await prisma.user.findUnique({
    where: { email: parsed.data.email },
    select: { id: true },
  });
  if (existing) {
    return { ok: false, error: localized.emailTaken };
  }

  try {
    const user = await prisma.user.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email,
        phone: parsed.data.phone,
        passwordHash: await hashPassword(parsed.data.password),
        role: "CUSTOMER",
      },
    });

    const token = await createVerificationToken(user.id, "EMAIL_VERIFICATION");
    await sendVerificationEmail(user.email, token);

    await createSession(user.id);
  } catch {
    return genericError();
  }

  redirect(safeRedirectPath(formData.get("next")?.toString()));
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect("/");
}

export async function requestPasswordResetAction(
  _prev: AuthActionResult,
  formData: FormData
): Promise<AuthActionResult> {
  const ip = await requestIp();
  if (
    !rateLimit(
      `pw-reset:${ip}`,
      AUTH_RATE_LIMITS.passwordReset.limit,
      AUTH_RATE_LIMITS.passwordReset.windowMs
    ).ok
  ) {
    return tooManyAttempts();
  }

  const parsed = passwordResetRequestSchema.safeParse({
    email: formData.get("email"),
  });
  if (!parsed.success) {
    return { ok: false, fieldErrors: fieldErrorsFromIssues(parsed.error.issues) };
  }

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
    select: { id: true, email: true },
  });

  if (user) {
    const token = await createVerificationToken(user.id, "PASSWORD_RESET");
    await sendPasswordResetEmail(user.email, token);
  }

  return { ok: true };
}

export async function resetPasswordAction(
  _prev: AuthActionResult,
  formData: FormData
): Promise<AuthActionResult> {
  const ip = await requestIp();
  if (
    !rateLimit(
      `pw-reset-token:${ip}`,
      AUTH_RATE_LIMITS.passwordResetToken.limit,
      AUTH_RATE_LIMITS.passwordResetToken.windowMs
    ).ok
  ) {
    return tooManyAttempts();
  }

  const parsed = passwordResetSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { ok: false, fieldErrors: fieldErrorsFromIssues(parsed.error.issues) };
  }

  // Hash before opening the transaction so the slow work never runs while the
  // row lock is held.
  const passwordHash = await hashPassword(parsed.data.password);

  try {
    await prisma.$transaction(async (tx) => {
      // Claims the token atomically; throws if it is already used or expired,
      // which rolls the whole transaction back.
      const record = await claimVerificationToken(
        tx,
        parsed.data.token,
        "PASSWORD_RESET"
      );

      await tx.user.update({
        where: { id: record.userId },
        data: { passwordHash },
      });
      await tx.session.deleteMany({ where: { userId: record.userId } });
    });
  } catch (error) {
    if (error instanceof InvalidVerificationTokenError) {
      return { ok: false, error: localized.invalidToken };
    }
    throw error;
  }

  redirect("/login?reset=1");
}

export async function verifyEmailAction(
  _prev: AuthActionResult,
  formData: FormData
): Promise<AuthActionResult> {
  const parsed = verifyEmailSchema.safeParse({
    token: formData.get("token"),
  });
  if (!parsed.success) {
    return { ok: false, fieldErrors: fieldErrorsFromIssues(parsed.error.issues) };
  }

  try {
    await prisma.$transaction(async (tx) => {
      const record = await claimVerificationToken(
        tx,
        parsed.data.token,
        "EMAIL_VERIFICATION"
      );
      await tx.user.update({
        where: { id: record.userId },
        data: { emailVerified: new Date() },
      });
    });
  } catch (error) {
    if (error instanceof InvalidVerificationTokenError) {
      return { ok: false, error: localized.invalidToken };
    }
    throw error;
  }

  return { ok: true };
}

export async function resendVerificationEmailAction(): Promise<AuthActionResult> {
  const ip = await requestIp();
  if (
    !rateLimit(
      `resend-verify:${ip}`,
      AUTH_RATE_LIMITS.resendVerification.limit,
      AUTH_RATE_LIMITS.resendVerification.windowMs
    ).ok
  ) {
    return tooManyAttempts();
  }

  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }

  const token = await createVerificationToken(user.id, "EMAIL_VERIFICATION");
  await sendVerificationEmail(user.email, token);
  return { ok: true };
}
