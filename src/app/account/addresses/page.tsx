import Link from "next/link";
import { notFound } from "next/navigation";
import { MapPin, Plus } from "lucide-react";
import { requireUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { setDefaultAddressAction } from "@/actions/addresses";
import { Breadcrumbs } from "@/components/product/breadcrumbs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AddressForm } from "@/components/account/address-form";
import { DeleteAddressButton } from "@/components/account/delete-address";

export const metadata = { title: "Addresses" };

export default async function AddressesPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string; edit?: string }>;
}) {
  const user = await requireUser();
  const { new: isNew, edit } = await searchParams;

  const addresses = await prisma.address.findMany({
    where: { userId: user.id },
    orderBy: { isDefault: "desc" },
  });

  let editing = false;
  if (edit) {
    const address = addresses.find((a) => a.id === edit);
    if (!address) notFound();
    editing = true;
  }

  const showForm = isNew === "1" || editing;

  return (
    <div>
      <Breadcrumbs
        items={[{ label: "Account", href: "/account" }, { label: "Addresses" }]}
      />
      <div className="mt-3 flex items-center justify-between">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">Addresses</h1>
        {!showForm && addresses.length > 0 && (
          <Link href="/account/addresses?new=1">
            <Button variant="secondary">
              <Plus className="size-4" aria-hidden="true" />
              Add address
            </Button>
          </Link>
        )}
      </div>

      {showForm && (
        <div className="mt-6">
          <AddressForm
            key={editing ? edit : "new"}
            addressId={editing ? edit : undefined}
            initial={
              editing
                ? {
                    name: addresses.find((a) => a.id === edit)!.name,
                    phone: addresses.find((a) => a.id === edit)!.phone,
                    division: addresses.find((a) => a.id === edit)!.division,
                    district: addresses.find((a) => a.id === edit)!.district,
                    area: addresses.find((a) => a.id === edit)!.area,
                    addressLine: addresses.find((a) => a.id === edit)!.addressLine,
                    postalCode: addresses.find((a) => a.id === edit)!.postalCode,
                    isDefault: addresses.find((a) => a.id === edit)!.isDefault,
                  }
                : undefined
            }
          />
          <div className="mt-3">
            <Link
              href="/account/addresses"
              className="text-primary text-sm hover:underline"
            >
              Cancel
            </Link>
          </div>
        </div>
      )}

      {addresses.length === 0 && !showForm ? (
        <div className="border-border mt-8 flex flex-col items-center gap-4 rounded-xl border border-dashed px-6 py-16 text-center">
          <MapPin className="text-muted-foreground size-10" aria-hidden="true" />
          <div>
            <h2 className="text-lg font-semibold">No saved addresses</h2>
            <p className="text-muted-foreground mt-1 text-sm">
              Save a delivery address to speed up checkout.
            </p>
          </div>
          <Link href="/account/addresses?new=1">
            <Button variant="secondary">
              <Plus className="size-4" aria-hidden="true" />
              Add address
            </Button>
          </Link>
        </div>
      ) : (
        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {addresses.map((address) => (
            <li
              key={address.id}
              className="border-border bg-card flex flex-col gap-3 rounded-xl border p-4"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-semibold">{address.name}</p>
                {address.isDefault && (
                  <Badge className="bg-primary/10 text-primary shrink-0">Default</Badge>
                )}
              </div>
              <p className="text-muted-foreground text-sm">
                {address.addressLine}, {address.area}, {address.district},{" "}
                {address.division}
                {address.postalCode ? ` · ${address.postalCode}` : ""}
              </p>
              <p className="text-muted-foreground text-xs">{address.phone}</p>
              <div className="flex flex-wrap items-center gap-1 pt-1">
                {!address.isDefault && (
                  <form action={setDefaultAddressAction}>
                    <input type="hidden" name="addressId" value={address.id} />
                    <button
                      type="submit"
                      className="text-primary text-sm font-medium hover:underline"
                    >
                      Make default
                    </button>
                  </form>
                )}
                <Link
                  href={`/account/addresses?edit=${address.id}`}
                  className="text-muted-foreground text-sm font-medium hover:underline"
                >
                  Edit
                </Link>
              </div>
              <div className="mt-auto">
                <DeleteAddressButton addressId={address.id} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
