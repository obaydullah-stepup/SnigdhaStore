export const CURRENCY_SYMBOLS: Record<string, string> = {
  BDT: "৳",
  USD: "$",
  EUR: "€",
  GBP: "£",
  INR: "₹",
  PKR: "₨",
  NPR: "₨",
  LKR: "₨",
  MYR: "RM",
  SGD: "S$",
  AUD: "A$",
  CAD: "C$",
  JPY: "¥",
  CNY: "¥",
  SAR: "﷼",
  AED: "د.إ",
  QAR: "﷼",
};

let currentCode = "BDT";
let currentSymbol = CURRENCY_SYMBOLS.BDT;

export function setCurrency(code?: string | null): void {
  if (code && CURRENCY_SYMBOLS[code]) {
    currentCode = code;
    currentSymbol = CURRENCY_SYMBOLS[code];
  }
}

export function getCurrencyCode(): string {
  return currentCode;
}

export function getCurrencySymbol(): string {
  return currentSymbol;
}