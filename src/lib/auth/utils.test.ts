import { describe, expect, it } from "vitest";
import { isAllowedRole, safeRedirectPath } from "@/lib/auth/utils";

describe("isAllowedRole (authorization)", () => {
  it("grants a CUSTOMER access to CUSTOMER-only areas", () => {
    expect(isAllowedRole("CUSTOMER", "CUSTOMER")).toBe(true);
  });

  it("denies a CUSTOMER access to ADMIN areas", () => {
    expect(isAllowedRole("CUSTOMER", "ADMIN")).toBe(false);
  });

  it("grants an ADMIN access everywhere", () => {
    expect(isAllowedRole("ADMIN", "ADMIN")).toBe(true);
    expect(isAllowedRole("ADMIN", "CUSTOMER")).toBe(true);
  });
});

describe("safeRedirectPath (open-redirect guard)", () => {
  it("keeps a safe relative path", () => {
    expect(safeRedirectPath("/account/orders")).toBe("/account/orders");
  });

  it("falls back to home for nullish input", () => {
    expect(safeRedirectPath(null)).toBe("/");
    expect(safeRedirectPath(undefined)).toBe("/");
    expect(safeRedirectPath("")).toBe("/");
  });

  it("blocks protocol-relative and absolute URLs", () => {
    expect(safeRedirectPath("//evil.com")).toBe("/");
    expect(safeRedirectPath("https://evil.com")).toBe("/");
    expect(safeRedirectPath("javascript:alert(1)")).toBe("/");
  });
});
