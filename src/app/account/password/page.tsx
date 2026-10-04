import { requireUser } from "@/lib/auth/guards";
import { Breadcrumbs } from "@/components/product/breadcrumbs";
import { PasswordForm } from "@/components/account/password-form";

export const metadata = { title: "Change password" };

export default async function PasswordPage() {
  await requireUser();
  return (
    <div>
      <Breadcrumbs
        items={[{ label: "Account", href: "/account" }, { label: "Password" }]}
      />
      <h1 className="font-heading mt-3 text-2xl font-semibold tracking-tight">
        Change password
      </h1>
      <div className="mt-6">
        <PasswordForm />
      </div>
    </div>
  );
}
