import { NextRequest, NextResponse } from "next/server";
import { getProductSummariesBySlugs } from "@/lib/data/products";

export async function GET(request: NextRequest) {
  const slugsRaw = request.nextUrl.searchParams.get("slugs") ?? "";
  const slugs = slugsRaw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && s.length <= 120)
    .slice(0, 8);

  if (slugs.length === 0) return NextResponse.json([]);

  try {
    const products = await getProductSummariesBySlugs(slugs);
    return NextResponse.json(products);
  } catch {
    return NextResponse.json([], { status: 500 });
  }
}
