import { requireUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { Breadcrumbs } from "@/components/product/breadcrumbs";
import { ProfileForm } from "@/components/account/profile-form";

export const metadata = { title: "Profile settings" };

export default async function ProfilePage() {
  const user = await requireUser();

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { name: true, email: true, phone: true },
  });

  return (
    <div>
      <Breadcrumbs
        items={[{ label: "Account", href: "/account" }, { label: "Profile" }]}
      />
      <h1 className="font-heading mt-3 text-2xl font-semibold tracking-tight">
        Profile settings
      </h1>
      <div className="mt-6">
        <ProfileForm
          initial={{
            name: dbUser?.name ?? user.name,
            email: dbUser?.email ?? user.email,
            phone: dbUser?.phone ?? null,
          }}
        />
      </div>
    </div>
  );
}
