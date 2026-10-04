import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const q = (request.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 60);
  if (q.length === 0) return NextResponse.json([]);

  try {
    const rows = await prisma.product.findMany({
      where: {
        published: true,
        status: "ACTIVE",
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { brand: { contains: q, mode: "insensitive" } },
        ],
      },
      select: {
        slug: true,
        name: true,
        price: true,
        category: { select: { name: true } },
        images: {
          orderBy: { sortOrder: "asc" },
          select: { url: true },
          take: 1,
        },
      },
      orderBy: { soldCount: "desc" },
      take: 6,
    });
    return NextResponse.json(
      rows.map((row) => ({
        slug: row.slug,
        name: row.name,
        price: row.price,
        categoryName: row.category?.name ?? null,
        image: row.images[0]?.url ?? null,
      }))
    );
  } catch {
    return NextResponse.json([], { status: 500 });
  }
}
