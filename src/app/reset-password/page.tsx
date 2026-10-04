import Link from "next/link";
import { AuthCard } from "@/components/auth/auth-card";
import { ResetPasswordForm } from "@/app/reset-password/reset-password-form";

type ResetPasswordPageProps = {
  searchParams: Promise<{ token?: string }>;
};

export default async function ResetPasswordPage({
  searchParams,
}: ResetPasswordPageProps) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <AuthCard
        title="Invalid reset link"
        description="That link is missing or incomplete. Request a new one."
        footer={
          <Link
            href="/forgot-password"
            className="text-primary font-medium hover:underline"
          >
            Request new link
          </Link>
        }
      >
        <p className="text-muted-foreground text-sm">
          We couldn&apos;t find a reset token in this link.
        </p>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Choose a new password"
      description="Pick a strong password you haven't used before."
      footer={
        <>
          Changed your mind?{" "}
          <Link href="/login" className="text-primary font-medium hover:underline">
            Back to sign in
          </Link>
          .
        </>
      }
    >
      <ResetPasswordForm token={token} />
    </AuthCard>
  );
}
