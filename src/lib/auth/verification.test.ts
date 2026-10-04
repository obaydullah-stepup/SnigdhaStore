import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  claimVerificationToken,
  createVerificationToken,
  InvalidVerificationTokenError,
} from "@/lib/auth/verification";

let userId: string;
let email: string;

beforeEach(async () => {
  email = `pwreset-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
  const user = await prisma.user.create({
    data: { email, passwordHash: "x", name: "Reset Tester" },
  });
  userId = user.id;
});

afterEach(async () => {
  await prisma.verificationToken.deleteMany({ where: { userId } });
  await prisma.user.deleteMany({ where: { id: userId } });
});

const claim = (
  token: string,
  type: "PASSWORD_RESET" | "EMAIL_VERIFICATION" = "PASSWORD_RESET"
) => prisma.$transaction((tx) => claimVerificationToken(tx, token, type));

describe("claimVerificationToken", () => {
  it("claims a fresh token and marks it used", async () => {
    const token = await createVerificationToken(userId, "PASSWORD_RESET");
    const record = await claim(token);

    expect(record.userId).toBe(userId);
    const stored = await prisma.verificationToken.findUnique({
      where: { id: record.id },
    });
    expect(stored?.usedAt).toBeInstanceOf(Date);
  });

  it("rejects a token that has already been used", async () => {
    const token = await createVerificationToken(userId, "PASSWORD_RESET");
    await claim(token);

    // The core replay bug: the same link must not work a second time.
    await expect(claim(token)).rejects.toBeInstanceOf(InvalidVerificationTokenError);
  });

  it("rejects an unknown token", async () => {
    await expect(claim("nope")).rejects.toBeInstanceOf(InvalidVerificationTokenError);
  });

  it("rejects a token presented as the wrong type", async () => {
    const token = await createVerificationToken(userId, "EMAIL_VERIFICATION");
    await expect(claim(token, "PASSWORD_RESET")).rejects.toBeInstanceOf(
      InvalidVerificationTokenError
    );
  });

  it("rejects an expired token", async () => {
    const token = await createVerificationToken(userId, "PASSWORD_RESET");
    await prisma.verificationToken.updateMany({
      where: { userId },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    await expect(claim(token)).rejects.toBeInstanceOf(InvalidVerificationTokenError);
  });

  it("allows exactly one winner when the same token is claimed concurrently", async () => {
    // Regression for the read-then-write race: the old implementation marked
    // `usedAt` only after validating in a separate round trip, so N parallel
    // requests could all pass validation and all reset the password.
    const token = await createVerificationToken(userId, "PASSWORD_RESET");

    const results = await Promise.allSettled([claim(token), claim(token), claim(token)]);

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(2);
    for (const r of rejected) {
      expect((r as PromiseRejectedResult).reason).toBeInstanceOf(
        InvalidVerificationTokenError
      );
    }
  }, 20000);

  it("rolls back the transaction when the claim fails, leaving no partial write", async () => {
    const token = await createVerificationToken(userId, "PASSWORD_RESET");
    await claim(token);

    const before = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

    // Simulate the action body: it tries to update the password and delete
    // sessions after claiming. The claim must throw before any of that runs.
    await expect(
      prisma.$transaction(async (tx) => {
        await claimVerificationToken(tx, token, "PASSWORD_RESET");
        await tx.user.update({
          where: { id: userId },
          data: { name: "Should Not Persist" },
        });
      })
    ).rejects.toBeInstanceOf(InvalidVerificationTokenError);

    const after = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    expect(after.name).toBe(before.name);
  });

  it("invalidates an older token when a new one is issued", async () => {
    const first = await createVerificationToken(userId, "PASSWORD_RESET");
    const second = await createVerificationToken(userId, "PASSWORD_RESET");

    await expect(claim(first)).rejects.toBeInstanceOf(InvalidVerificationTokenError);
    await expect(claim(second)).resolves.toMatchObject({ userId });
  });
});
