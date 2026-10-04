import { requireUser } from "@/lib/auth/guards";
import { AccountNav } from "@/components/account/account-nav";

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  await requireUser();
  return (
    <div className="bg-background mx-auto w-full max-w-6xl px-4 py-8 md:flex md:gap-8">
      <aside className="md:w-52 md:shrink-0">
        <AccountNav />
      </aside>
      <main className="min-w-0 flex-1 pt-6 md:pt-0">{children}</main>
    </div>
  );
}
