import Link from "next/link";
import { AuthCard } from "@/components/auth/auth-card";
import { UnsubscribeForm } from "@/app/newsletter/unsubscribe/unsubscribe-form";

type UnsubscribePageProps = {
  searchParams: Promise<{ email?: string }>;
};

export default async function NewsletterUnsubscribePage({
  searchParams,
}: UnsubscribePageProps) {
  const { email } = await searchParams;

  return (
    <AuthCard
      title="Unsubscribe"
      description="We're sorry to see you go. Enter your email to unsubscribe from the newsletter."
      footer={
        <Link href="/" className="text-primary font-medium hover:underline">
          Back to store
        </Link>
      }
    >
      <UnsubscribeForm email={email} />
    </AuthCard>
  );
}