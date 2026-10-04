import { describe, expect, it } from "vitest";
import {
  ORDER_STATUS,
  ORDER_STATUSES,
  PAYMENT_STATUS,
  PAYMENT_STATUSES,
  paymentStatusLabel,
  paymentStatusLabelBn,
  paymentStatusTone,
  statusLabel,
} from "@/lib/order-status";

describe("payment status labels", () => {
  it("exposes UNPAID, not PENDING", () => {
    // The enum value was renamed from PENDING because it collided with
    // OrderStatus.PENDING: one order showed two unrelated "Pending" badges.
    expect(PAYMENT_STATUSES).toEqual(["UNPAID", "PAID", "FAILED", "REFUNDED"]);
    expect(PAYMENT_STATUSES).not.toContain("PENDING");
    expect(Object.keys(PAYMENT_STATUS)).not.toContain("PENDING");
  });

  it("labels UNPAID as Unpaid / অপরিশোধিত", () => {
    expect(paymentStatusLabel("UNPAID")).toBe("Unpaid");
    expect(paymentStatusLabelBn("UNPAID")).toBe("অপরিশোধিত");
  });

  it("keeps FAILED and REFUNDED unchanged", () => {
    expect(paymentStatusLabel("FAILED")).toBe("Failed");
    expect(paymentStatusLabel("REFUNDED")).toBe("Refunded");
    expect(paymentStatusLabel("PAID")).toBe("Paid");
  });

  it("does not collide with the order status label", () => {
    expect(statusLabel("PENDING")).toBe("Pending");
    expect(paymentStatusLabel("UNPAID")).not.toBe(statusLabel("PENDING"));
  });

  it("falls back safely for a null or unknown status", () => {
    expect(paymentStatusLabel(null)).toBe("—");
    expect(paymentStatusLabelBn(null)).toBe("—");
    expect(paymentStatusTone(null)).toBe("bg-muted text-secondary-foreground");
    // Legacy rows can still surface an unrecognised value; do not blank it.
    expect(paymentStatusLabel("LEGACY" as never)).toBe("LEGACY");
  });

  it("pairs every tone with its own foreground", () => {
    // A light background with white text is unreadable: --muted is a warm
    // cream (#f6f1e7) in light mode, so Unpaid must not use white text.
    for (const status of PAYMENT_STATUSES) {
      const tone = PAYMENT_STATUS[status].tone;
      expect(tone).toMatch(/bg-\S+/);
      expect(tone).toMatch(/text-\S+/);
      if (tone.includes("bg-muted")) {
        expect(tone).not.toContain("text-white");
      }
    }
  });
});

describe("order status is untouched by the payment rename", () => {
  it("still uses PENDING", () => {
    expect(ORDER_STATUSES).toContain("PENDING");
    expect(ORDER_STATUS.PENDING.label).toBe("Pending");
    expect(ORDER_STATUS.PENDING.labelBn).toBe("অপেক্ষমাণ");
  });
});