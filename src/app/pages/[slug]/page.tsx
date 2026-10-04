import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { renderContent } from "@/lib/content-page";
import { LandingPage } from "@/components/storefront/landing-page";
import { htmlToPlainText } from "@/lib/html-plain-text";

const PAGE_SELECT = {
  title: true,
  type: true,
  content: true,
  html: true,
  css: true,
  js: true,
  useTailwindCdn: true,
} as const;

export default async function ContentPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = await prisma.contentPage.findUnique({
    where: { slug },
    select: PAGE_SELECT,
  });

  if (!page) notFound();

  if (page.type === "LANDING") {
    return (
      <LandingPage
        html={page.html ?? ""}
        css={page.css}
        js={page.js}
        useTailwindCdn={page.useTailwindCdn}
      />
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12">
      <h1 className="font-heading text-3xl font-semibold tracking-tight">{page.title}</h1>
      <div className="text-muted-foreground mt-4 leading-relaxed">
        {renderContent(page.content)}
      </div>
    </div>
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = await prisma.contentPage.findUnique({
    where: { slug },
    select: PAGE_SELECT,
  });
  if (!page) return {};

  const plain =
    page.type === "LANDING"
      ? htmlToPlainText(page.html ?? "")
      : page.content
          .replace(/^##\s+/gm, "")
          .replace(/^- /gm, "")
          .replace(/\s+/g, " ")
          .trim();

  return { title: page.title, description: plain.slice(0, 160) || undefined };
}

export const dynamic = "force-dynamic";
