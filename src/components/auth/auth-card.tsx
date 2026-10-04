import Link from "next/link";
import { Leaf } from "lucide-react";
import { getCachedStoreName } from "@/lib/settings";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type AuthCardProps = {
  title: string;
  description?: string;
  footer?: React.ReactNode;
  children: React.ReactNode;
};

export async function AuthCard({ title, description, footer, children }: AuthCardProps) {
  const storeName = await getCachedStoreName();

  return (
    <div className="bg-warm-white flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <Link href="/" className="mb-6 flex items-center gap-2">
        <span className="bg-primary text-primary-foreground flex size-9 items-center justify-center rounded-full">
          <Leaf className="size-5" aria-hidden="true" />
        </span>
        <span className="font-heading text-primary text-xl font-semibold">
          {storeName}
        </span>
      </Link>

      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          {description ? <CardDescription>{description}</CardDescription> : null}
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>

      {footer ? <div className="text-muted-foreground mt-4 text-sm">{footer}</div> : null}
    </div>
  );
}
