import { NextRequest, NextResponse } from "next/server";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { getSessionUser } from "@/lib/auth/session";
import { isAllowedRole } from "@/lib/auth/utils";
import { MAX_IMAGE_BYTES } from "@/lib/upload";
import { EXTENSIONS, safeFolder, sniffImageMime } from "@/lib/storage/extensions";

export async function PUT(request: NextRequest) {
  const user = await getSessionUser();
  if (!user || !isAllowedRole(user.role, "ADMIN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const folder = safeFolder(request.nextUrl.searchParams.get("folder") ?? "misc");
  const filename = request.nextUrl.searchParams.get("filename") ?? "";
  const mime = (request.headers.get("content-type") ?? "")
    .split(";")[0]
    .trim()
    .toLowerCase();

  // The stored extension is what the browser later uses to pick a Content-Type,
  // so it is derived from the MIME here rather than read off the request. The
  // filename must carry exactly that extension, which rules out writing e.g.
  // `.html` or `.svg` into a directory we serve.
  const ext = EXTENSIONS[mime];
  if (!ext || !new RegExp(`^[a-z0-9]+-[a-f0-9]{16}\\.${ext}$`).test(filename)) {
    return NextResponse.json(
      { error: "Invalid filename or file type." },
      { status: 400 }
    );
  }

  // Reject an oversized body before buffering it into memory. The header is a
  // hint only, so the real length is re-checked below.
  const declaredLength = Number(request.headers.get("content-length") ?? "");
  if (Number.isFinite(declaredLength) && declaredLength > MAX_IMAGE_BYTES) {
    return NextResponse.json(
      { error: "Images must be 5 MB or smaller." },
      { status: 413 }
    );
  }

  const buffer = Buffer.from(await request.arrayBuffer());
  if (buffer.byteLength === 0 || buffer.byteLength > MAX_IMAGE_BYTES) {
    return NextResponse.json(
      { error: "Images must be 5 MB or smaller." },
      { status: 413 }
    );
  }

  // Content-Type is attacker-controlled, so confirm the bytes are actually the
  // image type they claim to be before persisting them.
  if (sniffImageMime(buffer) !== mime) {
    return NextResponse.json(
      { error: "File content does not match its declared type." },
      { status: 400 }
    );
  }

  const dir = path.join(process.cwd(), "public", "uploads", folder);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, filename), buffer);

  return NextResponse.json({ url: `/uploads/${folder}/${filename}` });
}
