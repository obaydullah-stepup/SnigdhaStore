import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { generateOpaqueToken, hashToken } from "@/lib/auth/token";
import { EMAIL_VERIFICATION_TTL_MS, PASSWORD_RESET_TTL_MS } from "@/lib/auth/constants";

export type VerificationTokenType = "EMAIL_VERIFICATION" | "PASSWORD_RESET";

const TTL_BY_TYPE: Record<VerificationTokenType, number> = {
  EMAIL_VERIFICATION: EMAIL_VERIFICATION_TTL_MS,
  PASSWORD_RESET: PASSWORD_RESET_TTL_MS,
};

export async function createVerificationToken(
  userId: string,
  type: VerificationTokenType
): Promise<string> {
  await prisma.verificationToken.deleteMany({ where: { userId, type } });

  const token = generateOpaqueToken(24);
  await prisma.verificationToken.create({
    data: {
      userId,
      type,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + TTL_BY_TYPE[type]),
    },
  });

  return token;
}

export type ValidVerificationToken = {
  id: string;
  userId: string;
  type: VerificationTokenType;
};

/** Thrown when a token is missing, expired, wrong-type, or already claimed. */
export class InvalidVerificationTokenError extends Error {
  constructor() {
    super("Invalid verification token");
    this.name = "InvalidVerificationTokenError";
  }
}

/**
 * Atomically claims a single-use token inside the caller's transaction.
 *
 * The claim is a conditional `updateMany` on `usedAt: null`, so exactly one
 * concurrent caller can ever win the row. Checking validity with a plain read
 * and marking `usedAt` later leaves a window in which the same token is
 * accepted twice, which would let an intercepted reset link be replayed after
 * the real user had already used it.
 *
 * Callers must do any slow work (e.g. hashing a password) *before* opening the
 * transaction, then pass `tx` here. Throws `InvalidVerificationTokenError` so
 * the surrounding transaction rolls back rather than committing partial work.
 */
export async function claimVerificationToken(
  tx: Prisma.TransactionClient,
  token: string,
  type: VerificationTokenType
): Promise<ValidVerificationToken> {
  const record = await tx.verificationToken.findUnique({
    where: { tokenHash: hashToken(token) },
    select: { id: true, userId: true, type: true, usedAt: true, expiresAt: true },
  });

  if (
    !record ||
    record.type !== type ||
    record.usedAt !== null ||
    record.expiresAt <= new Date()
  ) {
    throw new InvalidVerificationTokenError();
  }

  const claimed = await tx.verificationToken.updateMany({
    where: { id: record.id, usedAt: null },
    data: { usedAt: new Date() },
  });

  // Lost the race to another request that claimed the same token.
  if (claimed.count !== 1) {
    throw new InvalidVerificationTokenError();
  }

  return { id: record.id, userId: record.userId, type: record.type };
}
