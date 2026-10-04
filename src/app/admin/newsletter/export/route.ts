import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";

export async function GET() {
  await requireAdmin();
  const subscribers = await prisma.newsletterSubscriber.findMany({
    select: { email: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });

  const escapeCsv = (value: string) => `"${value.replace(/"/g, '""')}"`;

  const rows = [
    "email,subscribed_at",
    ...subscribers.map(
      (s) =>
        `${escapeCsv(s.email)},${s.createdAt.toISOString()}`
    ),
  ];

  return new NextResponse("\uFEFF" + rows.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="newsletter-subscribers-${new Date()
        .toISOString()
        .slice(0, 10)}.csv"`,
    },
  });
}