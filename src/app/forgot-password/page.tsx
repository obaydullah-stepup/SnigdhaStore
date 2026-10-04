import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthCard } from "@/components/auth/auth-card";
import { ForgotPasswordForm } from "@/app/forgot-password/forgot-password-form";
import { getCurrentUser } from "@/lib/auth/guards";

export default async function ForgotPasswordPage() {
  const user = await getCurrentUser();
  if (user) redirect("/");

  return (
    <AuthCard
      title="Reset your password"
      description="Enter the email you registered with and we'll send you a secure reset link."
      footer={
        <>
          Remembered it?{" "}
          <Link href="/login" className="text-primary font-medium hover:underline">
            Back to sign in
          </Link>
          .
        </>
      }
    >
      <ForgotPasswordForm />
    </AuthCard>
  );
}
