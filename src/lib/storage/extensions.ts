import { randomBytes } from "node:crypto";

/**
 * Upload MIME -> file extension, for raster images only.
 *
 * This is the authoritative list of what may be written to storage. SVG, PDF
 * and text are deliberately absent: they are active content that a browser will
 * happily execute when served from our own origin, so accepting them turns an
 * upload into stored XSS. `uniqueName` falls back to `.bin` for anything not
 * listed, which is inert.
 */
export const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
  "image/gif": "gif",
};

export function uniqueName(mime: string): string {
  const ext = EXTENSIONS[mime] ?? "bin";
  return `${Date.now()}-${randomBytes(8).toString("hex")}.${ext}`;
}

export function safeFolder(folder: string): string {
  const cleaned = folder
    .replace(/[^a-z0-9-_]/gi, "")
    .replace(/\.+/g, "")
    .slice(0, 64);
  return cleaned || "misc";
}

function matches(buffer: Buffer, signature: number[], offset = 0): boolean {
  if (buffer.length < offset + signature.length) return false;
  return signature.every((byte, i) => buffer[offset + i] === byte);
}

/**
 * Identify an image from its leading bytes, ignoring any declared MIME.
 *
 * A request's Content-Type is attacker-controlled, so it cannot be trusted to
 * describe the body. This returns the type the bytes actually are, or null if
 * they are not one of the raster formats in EXTENSIONS.
 */
export function sniffImageMime(buffer: Buffer): string | null {
  if (matches(buffer, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (matches(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
    return "image/png";
  if (matches(buffer, [0x47, 0x49, 0x46, 0x38])) return "image/gif";
  if (
    matches(buffer, [0x52, 0x49, 0x46, 0x46]) &&
    matches(buffer, [0x57, 0x45, 0x42, 0x50], 8)
  ) {
    return "image/webp";
  }

  // ISO base media (AVIF): a `ftyp` box at offset 4 whose major or compatible
  // brand list contains avif.
  if (matches(buffer, [0x66, 0x74, 0x79, 0x70], 4)) {
    const boxSize = buffer.readUInt32BE(0);
    const end = Math.min(buffer.length, boxSize || buffer.length);
    for (let i = 8; i + 4 <= end; i += 4) {
      const brand = buffer.subarray(i, i + 4).toString("latin1");
      if (brand === "avif" || brand === "avis") return "image/avif";
    }
  }

  return null;
}
