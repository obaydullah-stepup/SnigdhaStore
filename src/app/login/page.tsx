import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthCard } from "@/components/auth/auth-card";
import { LoginForm } from "@/app/login/login-form";
import { getCurrentUser } from "@/lib/auth/guards";
import { getCachedStoreName } from "@/lib/settings";

type LoginPageProps = {
  searchParams: Promise<{ next?: string; reset?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const [user, storeName] = await Promise.all([getCurrentUser(), getCachedStoreName()]);
  if (user) redirect("/");

  const next = params.next && params.next.startsWith("/") ? params.next : undefined;

  return (
    <AuthCard
      title="Welcome back"
      description={`Sign in to your account to continue your ${storeName} journey`}
      footer={
        <>
          Don&apos;t have an account?{" "}
          <Link
            href={next ? `/register?next=${encodeURIComponent(next)}` : "/register"}
            className="text-primary font-medium hover:underline"
          >
            Create one
          </Link>
          .
        </>
      }
    >
      {params.reset ? (
        <div
          role="status"
          className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800"
        >
          Your password has been reset. Please sign in.
        </div>
      ) : null}
      <LoginForm next={next} />
      <p className="text-muted-foreground mt-4 text-center text-sm">
        Forgot your password?{" "}
        <Link
          href="/forgot-password"
          className="text-primary font-medium hover:underline"
        >
          Reset it
        </Link>
      </p>
    </AuthCard>
  );
}
