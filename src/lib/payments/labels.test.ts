import { describe, expect, it } from "vitest";
import { paymentMethodLabel } from "@/lib/payments/labels";

describe("paymentMethodLabel", () => {
  it("renders spaces instead of underscores", () => {
    expect(paymentMethodLabel("CASH_ON_DELIVERY")).toBe("CASH ON DELIVERY");
    expect(paymentMethodLabel("SSL_COMMERZ")).toBe("SSL COMMERZ");
  });

  it("leaves single-word methods unchanged", () => {
    expect(paymentMethodLabel("BKASH")).toBe("BKASH");
    expect(paymentMethodLabel("NAGAD")).toBe("NAGAD");
    expect(paymentMethodLabel("STRIPE")).toBe("STRIPE");
  });

  it("never leaks an underscore to the UI", () => {
    for (const m of [
      "CASH_ON_DELIVERY",
      "BKASH",
      "NAGAD",
      "SSL_COMMERZ",
      "STRIPE",
    ]) {
      expect(paymentMethodLabel(m)).not.toContain("_");
    }
  });

  it("returns Bengali labels on request", () => {
    expect(paymentMethodLabel("CASH_ON_DELIVERY", "bn")).toBe("ক্যাশ অন ডেলিভারি");
    expect(paymentMethodLabel("SSL_COMMERZ", "bn")).toBe("এসএসএল কমার্স");
  });

  it("handles missing and unknown values", () => {
    expect(paymentMethodLabel(null)).toBe("—");
    expect(paymentMethodLabel(undefined)).toBe("—");
    // Reports bucket legacy rows as UNKNOWN.
    expect(paymentMethodLabel("UNKNOWN")).toBe("Unknown");
    // An unmapped value passes through rather than blanking the cell.
    expect(paymentMethodLabel("SOMETHING_NEW")).toBe("SOMETHING_NEW");
  });
});