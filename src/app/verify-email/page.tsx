import { Mail } from "lucide-react";
import { AuthCard } from "@/components/auth/auth-card";
import { VerifyEmailForm } from "@/app/verify-email/verify-email-form";
import { getCachedStoreName } from "@/lib/settings";

type VerifyEmailPageProps = {
  searchParams: Promise<{ token?: string }>;
};

export default async function VerifyEmailPage({ searchParams }: VerifyEmailPageProps) {
  const { token } = await searchParams;
  const storeName = await getCachedStoreName();

  if (!token) {
    return (
      <AuthCard
        title="Verify your email"
        description="You need a valid link from your inbox to verify your email."
        footer={
          <span className="flex items-center justify-center gap-1.5">
            <Mail className="size-4" aria-hidden="true" /> Check your email inbox
          </span>
        }
      >
        <p className="text-muted-foreground text-sm">
          We couldn&apos;t find a verification token in this link. Check your email for
          the link we sent when you registered.
        </p>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Verify your email"
      description={`Confirm your email address to activate your ${storeName} account.`}
    >
      <VerifyEmailForm token={token} storeName={storeName} />
    </AuthCard>
  );
}
