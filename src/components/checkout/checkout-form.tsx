"use client";

import { useEffect, useRef, useState, useActionState, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Loader2,
  MapPin,
  ShieldCheck,
  ShoppingBag,
  Truck,
} from "lucide-react";
import { toast } from "sonner";
import { placeOrderAction } from "@/actions/checkout";
import { captureIncompleteOrderAction } from "@/actions/incomplete-orders";
import type { CartSnapshotLine } from "@/lib/data/cart";
import type { PaymentProvider } from "@/lib/payments/provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { formatPrice } from "@/lib/utils";

type SavedAddress = {
  id: string;
  fullName: string;
  phone: string;
  address: string;
};

type CheckoutFormProps = {
  items: CartSnapshotLine[];
  subtotal: number;
  discount: number;
  couponCode: string | null;
  deliveryZones: { id: string; name: string; description: string; fee: number }[];
  paymentProviders: PaymentProvider[];
  canSaveAddress: boolean;
  savedAddresses: SavedAddress[];
  defaults: {
    fullName: string;
    phone: string;
    email: string;
    address: string;
  };
};

const PHONE_RE = /^01[3-9][0-9]{8}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type CapturePayload = {
  fullName: string;
  phone: string;
  email: string;
  address: string;
  deliveryZone: string;
};

const DRAFT_KEY = "snigdha_checkout_draft";

type CheckoutValues = CheckoutFormProps["defaults"];

type CheckoutDraft = {
  values: CheckoutValues;
  deliveryZone: string;
  paymentMethod: string;
  notes: string;
  saveAddress: boolean;
};

function loadDraft(): CheckoutDraft | null {
  try {
    const raw =
      typeof window === "undefined" ? null : window.localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CheckoutDraft;
    if (!parsed || typeof parsed !== "object" || !parsed.values) return null;
    const values = parsed.values as Partial<CheckoutValues>;
    return {
      values: {
        fullName: typeof values.fullName === "string" ? values.fullName : "",
        phone: typeof values.phone === "string" ? values.phone : "",
        email: typeof values.email === "string" ? values.email : "",
        address: typeof values.address === "string" ? values.address : "",
      },
      deliveryZone:
        typeof parsed.deliveryZone === "string" ? parsed.deliveryZone : "",
      paymentMethod:
        typeof parsed.paymentMethod === "string" ? parsed.paymentMethod : "COD",
      notes: typeof parsed.notes === "string" ? parsed.notes : "",
      saveAddress:
        typeof parsed.saveAddress === "boolean" ? parsed.saveAddress : true,
    };
  } catch {
    return null;
  }
}

function saveDraft(draft: CheckoutDraft) {
  try {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    }
  } catch {
    // localStorage unavailable (private mode) — degrade gracefully
  }
}

function clearDraft() {
  try {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(DRAFT_KEY);
    }
  } catch {
    // ignore
  }
}

const REQUIRED_KEYS = ["fullName", "phone", "address"] as const;

export function CheckoutForm({
  items,
  subtotal,
  discount,
  couponCode,
  deliveryZones,
  paymentProviders,
  canSaveAddress,
  savedAddresses,
  defaults,
}: CheckoutFormProps) {
  const router = useRouter();
  const [values, setValues] = useState(defaults);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [deliveryZone, setDeliveryZone] = useState<string>(
    deliveryZones[0]?.id ?? "default"
  );
  const [paymentMethod, setPaymentMethod] = useState<string>(
    paymentProviders[0]?.id ?? "COD"
  );
  const [notes, setNotes] = useState("");
  const [saveAddress, setSaveAddress] = useState(true);
  const [state, formAction, isActionPending] = useActionState(placeOrderAction, null);
  const [isPending, startTransition] = useTransition();
  const draftRestored = useRef(false);

  const deliveryFee =
    deliveryZones.find((z) => z.id === deliveryZone)?.fee ?? 0;
  const total = subtotal - discount + deliveryFee;

  const serverPrefilled = Boolean(
    defaults.fullName || defaults.phone || defaults.address
  );

  const [selectedSavedId, setSelectedSavedId] = useState<string | null>(() => {
    const match = savedAddresses.find(
      (a) =>
        a.fullName === defaults.fullName &&
        a.phone === defaults.phone &&
        a.address === defaults.address
    );
    return match?.id ?? null;
  });

  useEffect(() => {
    if (state?.ok && state.orderNumber) {
      clearDraft();
      router.push(`/order-success/${state.orderNumber}`);
    } else if (state?.error) {
      toast.error(state.error.en);
    }
  }, [state, router]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (draftRestored.current || serverPrefilled) return;
      const draft = loadDraft();
      if (!draft) return;
      draftRestored.current = true;
      setValues((prev) => ({ ...prev, ...draft.values }));
      if (deliveryZones.some((z) => z.id === draft.deliveryZone)) {
        setDeliveryZone(draft.deliveryZone);
      }
      setPaymentMethod(draft.paymentMethod);
      setNotes(draft.notes);
      setSaveAddress(draft.saveAddress);
      toast.info("We filled in your details from your last order.");
    }, 0);
    return () => clearTimeout(timer);
  }, [serverPrefilled, deliveryZones]);

  useEffect(() => {
    const timer = setTimeout(() => {
      saveDraft({ values, deliveryZone, paymentMethod, notes, saveAddress });
    }, 150);
    return () => clearTimeout(timer);
  }, [values, deliveryZone, paymentMethod, notes, saveAddress]);

  // Capture checkout intent so the admin panel can convert it into a real
  // order. Upserted server-side on the cart, so repeat visits update one row
  // and re-sending the same payload is a no-op. Fire-and-forget: this must
  // never interfere with placing the order.
  const attemptedKey = useRef<string | null>(null);
  const confirmedKey = useRef<string | null>(null);
  const beaconKey = useRef<string | null>(null);
  const latestValid = useRef<{ key: string; payload: CapturePayload } | null>(null);

  // Used while the page is still alive, where we can wait for the server to
  // confirm and retry if it didn't land.
  function captureByAction() {
    const target = latestValid.current;
    if (!target || attemptedKey.current === target.key) return;
    attemptedKey.current = target.key;
    void captureIncompleteOrderAction(target.payload).then(
      (result) => {
        if (result.ok) {
          confirmedKey.current = target.key;
        } else {
          // Let a failed call retry on the next interaction rather than
          // dropping the lead silently.
          attemptedKey.current = null;
        }
      },
      () => {
        attemptedKey.current = null;
      }
    );
  }

  // Used when the customer might already be on their way out. A server action
  // is a plain fetch, and the browser aborts those the moment the document is
  // torn down — precisely when the lead is most likely to be lost — so this
  // goes out as a beacon, which is built to outlive the page.
  function captureOnExit() {
    const target = latestValid.current;
    if (!target) return;
    if (confirmedKey.current === target.key || beaconKey.current === target.key) return;
    beaconKey.current = target.key;
    const body = new Blob([JSON.stringify(target.payload)], { type: "application/json" });
    if (!navigator.sendBeacon("/api/incomplete-orders", body)) {
      beaconKey.current = null;
    }
  }

  useEffect(() => {
    const fullName = values.fullName.trim();
    const phone = values.phone.trim();
    if (fullName.length < 2 || !PHONE_RE.test(phone)) {
      latestValid.current = null;
      return;
    }

    const email = values.email.trim();
    const payload: CapturePayload = {
      fullName,
      phone,
      email: EMAIL_RE.test(email) ? email : "",
      address: values.address.trim(),
      deliveryZone,
    };
    const key = JSON.stringify(payload);
    latestValid.current = { key, payload };

    const timer = setTimeout(captureByAction, 1200);

    // Backstop for a customer who closes the tab or hits back the instant they
    // finish typing.
    function onVisibilityChange() {
      if (document.visibilityState === "hidden") captureOnExit();
    }
    window.addEventListener("pagehide", captureOnExit);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("pagehide", captureOnExit);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [values.fullName, values.phone, values.email, values.address, deliveryZone]);

  function set<K extends keyof typeof values>(key: K, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }));
    setSelectedSavedId(null);
  }

  function applySavedAddress(a: SavedAddress) {
    setValues((prev) => ({
      ...prev,
      fullName: a.fullName,
      phone: a.phone,
      address: a.address,
    }));
    setSelectedSavedId(a.id);
  }

  function blur(key: string) {
    setTouched((prev) => (prev[key] ? prev : { ...prev, [key]: true }));
    // Leaving a field is a natural pause in filling the form, and the customer
    // may well be on their way out, so send it as a beacon.
    captureOnExit();
  }

  function fieldErrors(): Record<string, string> {
    const errors: Record<string, string> = {};
    if (!values.fullName.trim() || values.fullName.trim().length < 2)
      errors.fullName = "Enter your full name.";
    if (!PHONE_RE.test(values.phone.trim()))
      errors.phone = "Enter a valid Bangladeshi number (01XXXXXXXXX).";
    if (values.email.trim() && !EMAIL_RE.test(values.email.trim()))
      errors.email = "Enter a valid email.";
    if (values.address.trim().length < 10)
      errors.address = "Enter your full address (house, road, area, district).";
    return errors;
  }

  function submit() {
    const errors = fieldErrors();
    if (Object.keys(errors).length > 0) {
      setTouched((prev) => {
        const next = { ...prev };
        for (const key of REQUIRED_KEYS) next[key] = true;
        return next;
      });
      toast.error("Please complete the highlighted fields.");
      return;
    }
    setTouched((prev) => {
      const next = { ...prev };
      for (const key of REQUIRED_KEYS) next[key] = true;
      return next;
    });
    const fd = new FormData();
    fd.set("fullName", values.fullName);
    fd.set("phone", values.phone);
    fd.set("email", values.email);
    fd.set("address", values.address);
    fd.set("deliveryZone", deliveryZone);
    fd.set("paymentMethod", paymentMethod);
    fd.set("notes", notes);
    fd.set("saveAddress", String(saveAddress));
    startTransition(() => formAction(fd));
  }

  const showError = (key: string) =>
    touched[key] ? fieldErrors()[key] : undefined;
  const inputError = (key: string) =>
    touched[key] && fieldErrors()[key] ? "border-destructive" : "";

  return (
    <div className="mt-8 grid items-start gap-8 lg:grid-cols-[1fr_360px]">
      <div className="flex flex-col gap-6">
        <section className="border-border bg-card rounded-xl border p-5">
          <h2 className="font-heading flex items-center gap-2 text-lg font-semibold">
            <MapPin className="size-4" aria-hidden="true" />
            Contact & address
          </h2>
          <p className="text-muted-foreground mt-0.5 text-sm">
            Where should we deliver?
          </p>

          {savedAddresses.length > 0 && (
            <div className="mt-4 flex flex-col gap-3">
              <p className="text-muted-foreground text-sm font-medium">
                Use a saved address
              </p>
              {savedAddresses.map((a) => (
                <label
                  key={a.id}
                  className={`border-border flex cursor-pointer items-start gap-4 rounded-xl border p-4 transition-colors ${
                    selectedSavedId === a.id
                      ? "border-primary bg-primary/5"
                      : "bg-muted/40"
                  }`}
                >
                  <input
                    type="radio"
                    name="savedAddress"
                    checked={selectedSavedId === a.id}
                    onChange={() => applySavedAddress(a)}
                    className="mt-1 accent-(--primary)"
                  />
                  <span className="flex-1">
                    <span className="font-medium">
                      {a.fullName}, {a.phone}
                    </span>
                    <span className="text-muted-foreground mt-0.5 block text-sm">
                      {a.address}
                    </span>
                  </span>
                </label>
              ))}
              <label
                className={`border-border flex cursor-pointer items-start gap-4 rounded-xl border p-4 transition-colors ${
                  selectedSavedId === null ? "border-primary bg-primary/5" : "bg-muted/40"
                }`}
              >
                <input
                  type="radio"
                  name="savedAddress"
                  checked={selectedSavedId === null}
                  onChange={() => setSelectedSavedId(null)}
                  className="mt-1 accent-(--primary)"
                />
                <span className="flex-1 text-sm font-medium">
                  Enter a different address
                </span>
              </label>
            </div>
          )}

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="fullName" className="mb-1.5 block">
                Full name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="fullName"
                value={values.fullName}
                onChange={(e) => set("fullName", e.target.value)}
                onBlur={() => blur("fullName")}
                placeholder="Rahim Uddin"
                autoComplete="name"
                className={inputError("fullName")}
                aria-invalid={Boolean(showError("fullName"))}
              />
              {showError("fullName") && (
                <p className="text-destructive mt-1 text-xs">{showError("fullName")}</p>
              )}
            </div>
            <div>
              <Label htmlFor="phone" className="mb-1.5 block">
                Mobile number <span className="text-destructive">*</span>
              </Label>
              <Input
                id="phone"
                type="tel"
                inputMode="tel"
                value={values.phone}
                onChange={(e) => set("phone", e.target.value)}
                onBlur={() => blur("phone")}
                placeholder="01XXXXXXXXX"
                autoComplete="tel"
                className={inputError("phone")}
                aria-invalid={Boolean(showError("phone"))}
              />
              {showError("phone") && (
                <p className="text-destructive mt-1 text-xs">{showError("phone")}</p>
              )}
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="email" className="mb-1.5 block">
                Email{" "}
                <span className="text-muted-foreground font-normal">
                  (optional — for order updates)
                </span>
              </Label>
              <Input
                id="email"
                type="email"
                value={values.email}
                onChange={(e) => set("email", e.target.value)}
                onBlur={() => blur("email")}
                placeholder="you@example.com"
                autoComplete="email"
                className={inputError("email")}
                aria-invalid={Boolean(showError("email"))}
              />
              {showError("email") && (
                <p className="text-destructive mt-1 text-xs">{showError("email")}</p>
              )}
            </div>

            <div className="sm:col-span-2">
              <Label htmlFor="address" className="mb-1.5 block">
                Full address <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="address"
                rows={2}
                value={values.address}
                onChange={(e) => set("address", e.target.value)}
                onBlur={() => blur("address")}
                autoComplete="street-address"
                placeholder="House 12, Road 7, Block C, Dhanmondi, Dhaka 1206"
                className={inputError("address")}
                aria-invalid={Boolean(showError("address"))}
                aria-describedby="address-hint"
              />
              <p id="address-hint" className="text-muted-foreground mt-1 text-xs">
                Apartment/flat, house, road, area or thana, city, postal code.
              </p>
              {showError("address") && (
                <p className="text-destructive mt-1 text-xs">{showError("address")}</p>
              )}
            </div>

            <div className="sm:col-span-2">
              <Label htmlFor="notes" className="mb-1.5 block">
                Delivery notes{" "}
                <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Apartment number, landmarks, call before delivery…"
              />
            </div>

            {canSaveAddress && (
              <div className="flex items-center gap-2 sm:col-span-2">
                <Checkbox
                  id="saveAddress"
                  checked={saveAddress}
                  onCheckedChange={(c) => setSaveAddress(Boolean(c))}
                />
                <Label htmlFor="saveAddress" className="text-muted-foreground text-sm">
                  Save this address to my account for next time
                </Label>
              </div>
            )}
          </div>
        </section>

        <section className="border-border bg-card rounded-xl border p-5">
          <h2 className="font-heading flex items-center gap-2 text-lg font-semibold">
            <Truck className="size-4" aria-hidden="true" />
            Delivery Zone
          </h2>
          <p className="text-muted-foreground mt-0.5 text-sm">
            Where are we delivering?
          </p>
          <div className="mt-4 flex flex-col gap-3">
            {deliveryZones.map((z) => (
              <label
                key={z.id}
                className={`border-border flex cursor-pointer items-start gap-4 rounded-xl border p-4 transition-colors ${
                  deliveryZone === z.id ? "border-primary bg-primary/5" : "bg-muted/40"
                }`}
              >
                <input
                  type="radio"
                  name="deliveryZone"
                  value={z.id}
                  checked={deliveryZone === z.id}
                  onChange={() => setDeliveryZone(z.id)}
                  className="mt-1 accent-(--primary)"
                />
                <span className="flex-1">
                  <span className="font-medium">{z.name}</span>
                  {z.description && (
                    <span className="text-muted-foreground mt-0.5 block text-sm">
                      {z.description}
                    </span>
                  )}
                  {z.fee === 0 && (
                    <span className="mt-1 block text-sm font-medium text-emerald-600">
                      Free delivery
                    </span>
                  )}
                </span>
                <span className="font-semibold">
                  {z.fee === 0 ? "Free" : formatPrice(z.fee)}
                </span>
              </label>
            ))}
          </div>
        </section>

        <section className="border-border bg-card rounded-xl border p-5">
          <h2 className="font-heading flex items-center gap-2 text-lg font-semibold">
            <ShieldCheck className="size-4" aria-hidden="true" />
            Payment
          </h2>
          <p className="text-muted-foreground mt-0.5 text-sm">
            Cash on delivery for now
          </p>
          <div className="mt-4 flex flex-col gap-3">
            {paymentProviders.map((p) => (
              <label
                key={p.id}
                className={`border-border flex cursor-pointer items-start gap-4 rounded-xl border p-4 transition-colors ${
                  paymentMethod === p.id ? "border-primary bg-primary/5" : "bg-muted/40"
                }`}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value={p.id}
                  checked={paymentMethod === p.id}
                  onChange={() => setPaymentMethod(p.id)}
                  className="mt-1 accent-(--primary)"
                />
                <span className="flex-1">
                  <span className="font-medium">{p.name}</span>
                  <span className="text-muted-foreground mt-0.5 block text-sm">
                    {p.description}
                  </span>
                </span>
                <span className="text-sm font-medium text-emerald-600">
                  No extra charge
                </span>
              </label>
            ))}
            <p className="text-muted-foreground text-xs">
              Digital payments (bKash, Nagad, cards) are on the way in a future phase.
            </p>
          </div>
        </section>

        <Button
          onClick={submit}
          disabled={isPending || isActionPending}
          className="h-12 w-full text-base"
        >
          {(isPending || isActionPending) && (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          )}
          Place order · {formatPrice(total)}
        </Button>

        <p className="text-muted-foreground text-xs leading-5">
          By placing this order you agree to pay on delivery. We&apos;ll call you on{" "}
          <span className="font-medium">{values.phone || "your number"}</span> to
          confirm.
        </p>
      </div>

      <aside className="border-border bg-card h-fit rounded-xl border p-5 lg:sticky lg:top-24">
        <h2 className="font-heading text-sm font-semibold tracking-wide uppercase">
          Order summary
        </h2>
        <ul className="divide-border mt-4 flex flex-col divide-y">
          {items.map((item) => (
            <li key={item.id} className="flex items-center gap-3 py-3">
              <div className="bg-muted relative block aspect-square w-12 shrink-0 overflow-hidden rounded-lg">
                {item.image ? (
                  <Image
                    src={item.image}
                    alt={item.name}
                    fill
                    sizes="48px"
                    className="object-cover"
                  />
                ) : (
                  <ShoppingBag
                    className="text-muted-foreground absolute inset-0 m-auto size-5"
                    aria-hidden="true"
                  />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="line-clamp-1 text-xs font-medium">{item.name}</p>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  {item.quantity} × {formatPrice(item.price)}
                </p>
              </div>
              <p className="text-xs font-semibold">
                {formatPrice(item.price * item.quantity)}
              </p>
            </li>
          ))}
        </ul>
        <div className="mt-2 flex flex-col gap-1.5 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="font-medium">{formatPrice(subtotal)}</span>
          </div>
          {discount > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Discount</span>
              <span className="font-medium text-emerald-600">
                −{formatPrice(discount)}
              </span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-muted-foreground">Delivery</span>
            <span
              className={
                deliveryFee === 0 ? "font-medium text-emerald-600" : "font-medium"
              }
            >
              {deliveryFee === 0 ? "Free" : formatPrice(deliveryFee)}
            </span>
          </div>
          <div className="mt-2 flex justify-between border-t pt-3 text-base">
            <span className="font-heading font-semibold">Total</span>
            <span className="font-heading font-semibold">
              {formatPrice(total)}
            </span>
          </div>
        </div>
        <div className="border-border mt-4 flex flex-col gap-1.5 border-t pt-4 text-xs">
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Deliver to</span>
            <span className="text-right font-medium">
              {values.fullName || "—"}, {values.phone || "—"}
            </span>
          </div>
          {values.address && (
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Address</span>
              <span className="max-w-64 text-right">{values.address}</span>
            </div>
          )}
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Pay via</span>
            <span className="text-right font-medium">
              {paymentProviders.find((p) => p.id === paymentMethod)?.name ??
                "Cash on Delivery"}
            </span>
          </div>
          {couponCode && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Coupon</span>
              <span className="text-primary font-medium">{couponCode}</span>
            </div>
          )}
        </div>
        <p className="text-muted-foreground mt-4 text-xs leading-5">
          Prices are final. Cash on delivery — pay nothing until it reaches your door.
        </p>
        <Link
          href="/cart"
          className="text-primary mt-3 block text-center text-sm hover:underline"
        >
          Back to cart
        </Link>
      </aside>
    </div>
  );
}