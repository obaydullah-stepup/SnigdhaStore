import { describe, expect, it } from "vitest";
import {
  loginSchema,
  registerSchema,
  passwordResetRequestSchema,
  passwordResetSchema,
  verifyEmailSchema,
} from "@/validators/auth";

describe("registerSchema", () => {
  it("accepts a valid registration", () => {
    const result = registerSchema.safeParse({
      name: "Tasnim Ahmed",
      email: "TASNIM@Example.com",
      phone: "+8801712345678",
      password: "supersecret1",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe("tasnim@example.com");
      expect(result.data.phone).toBe("+8801712345678");
    }
  });

  it("normalizes an empty phone to undefined", () => {
    const result = registerSchema.safeParse({
      name: "Sadia Islam",
      email: "sadia@example.com",
      phone: "",
      password: "supersecret1",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.phone).toBeUndefined();
  });

  it("rejects an invalid email", () => {
    const result = registerSchema.safeParse({
      name: "Sadia Islam",
      email: "not-an-email",
      password: "supersecret1",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a short password", () => {
    const result = registerSchema.safeParse({
      name: "Sadia Islam",
      email: "sadia@example.com",
      password: "short",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const keys = result.error.issues.map((i) => i.path[0] as string);
      expect(keys).toContain("password");
    }
  });

  it("rejects a two-character name", () => {
    const result = registerSchema.safeParse({
      name: "A",
      email: "a@example.com",
      password: "supersecret1",
    });
    expect(result.success).toBe(false);
  });
});

describe("loginSchema", () => {
  it("accepts valid credentials", () => {
    expect(
      loginSchema.safeParse({ email: "x@y.com", password: "anything" }).success
    ).toBe(true);
  });

  it("rejects a missing password", () => {
    const result = loginSchema.safeParse({ email: "x@y.com", password: "" });
    expect(result.success).toBe(false);
  });
});

describe("passwordResetRequestSchema", () => {
  it("accepts a valid email", () => {
    expect(passwordResetRequestSchema.safeParse({ email: "x@y.com" }).success).toBe(true);
  });

  it("rejects a bad email", () => {
    expect(passwordResetRequestSchema.safeParse({ email: "nope" }).success).toBe(false);
  });
});

describe("passwordResetSchema", () => {
  it("accepts a token and strong password", () => {
    expect(
      passwordResetSchema.safeParse({ token: "tok", password: "newpassword1" }).success
    ).toBe(true);
  });

  it("rejects a blank token and weak password", () => {
    expect(passwordResetSchema.safeParse({ token: "", password: "weak" }).success).toBe(
      false
    );
  });
});

describe("verifyEmailSchema", () => {
  it("accepts a token", () => {
    expect(verifyEmailSchema.safeParse({ token: "abc" }).success).toBe(true);
  });

  it("rejects a blank token", () => {
    expect(verifyEmailSchema.safeParse({ token: " " }).success).toBe(false);
  });
});
