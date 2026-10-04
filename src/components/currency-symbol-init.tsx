"use client";

import { useLayoutEffect } from "react";
import { setCurrency } from "@/lib/currency";

export function CurrencySymbolInit({ children }: { children: React.ReactNode }) {
  useLayoutEffect(() => {
    const code = document
      .querySelector('meta[name="store-currency"]')
      ?.getAttribute("content");
    if (code) setCurrency(code);
  }, []);

  return <>{children}</>;
}