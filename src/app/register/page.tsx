import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthCard } from "@/components/auth/auth-card";
import { RegisterForm } from "@/app/register/register-form";
import { getCurrentUser } from "@/lib/auth/guards";
import { getCachedStoreName } from "@/lib/settings";

type RegisterPageProps = {
  searchParams: Promise<{ next?: string }>;
};

export default async function RegisterPage({ searchParams }: RegisterPageProps) {
  const params = await searchParams;
  const [user, storeName] = await Promise.all([getCurrentUser(), getCachedStoreName()]);
  if (user) redirect("/");

  const next = params.next && params.next.startsWith("/") ? params.next : undefined;

  return (
    <AuthCard
      title="Create your account"
      description={`Join ${storeName} for faster checkout, order tracking, and exclusive offers.`}
      footer={
        <>
          Already have an account?{" "}
          <Link
            href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"}
            className="text-primary font-medium hover:underline"
          >
            Sign in
          </Link>
          .
        </>
      }
    >
      <RegisterForm next={next} />
    </AuthCard>
  );
}
