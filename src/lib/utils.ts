export { cn } from "cn";
import { getCurrencySymbol } from "@/lib/currency";

export function formatPrice(value: number): string {
  return `${getCurrencySymbol()}${value.toLocaleString("en-US")}`;
}

export type ShippingAddressFields = {
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  addressLine?: string | null;
  area?: string | null;
  district?: string | null;
  division?: string | null;
  postalCode?: string | null;
};

export function formatShippingAddress(
  address: ShippingAddressFields | null | undefined
): string {
  if (!address) return "";
  return [address.addressLine, address.area, address.district, address.division, address.postalCode]
    .filter((v): v is string => typeof v === "string" && v.trim().length > 0)
    .join(", ");
}
