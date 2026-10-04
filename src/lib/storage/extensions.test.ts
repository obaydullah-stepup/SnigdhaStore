import { describe, expect, it } from "vitest";
import { EXTENSIONS, sniffImageMime } from "@/lib/storage/extensions";

const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
const GIF = Buffer.from("GIF89a....", "latin1");
const WEBP = Buffer.concat([
  Buffer.from("RIFF", "latin1"),
  Buffer.from([0x1a, 0x00, 0x00, 0x00]),
  Buffer.from("WEBPVP8 ", "latin1"),
]);

function avif(brand: string): Buffer {
  const box = Buffer.concat([
    Buffer.from([0x00, 0x00, 0x00, 0x18]),
    Buffer.from("ftyp", "latin1"),
    Buffer.from(brand, "latin1"),
    Buffer.from([0x00, 0x00, 0x00, 0x00]),
    Buffer.from("avif", "latin1"),
  ]);
  return box;
}

describe("EXTENSIONS (upload allowlist)", () => {
  it("permits only inert raster image types", () => {
    expect(Object.keys(EXTENSIONS).sort()).toEqual([
      "image/avif",
      "image/gif",
      "image/jpeg",
      "image/png",
      "image/webp",
    ]);
  });

  it("does not permit active content", () => {
    // SVG/PDF/text execute or render as documents when served same-origin.
    expect(EXTENSIONS["image/svg+xml"]).toBeUndefined();
    expect(EXTENSIONS["application/pdf"]).toBeUndefined();
    expect(EXTENSIONS["text/plain"]).toBeUndefined();
  });

  it("never maps a type to a web-executable extension", () => {
    for (const ext of Object.values(EXTENSIONS)) {
      expect(ext).toMatch(/^(jpg|png|webp|avif|gif)$/);
    }
  });
});

describe("sniffImageMime (content sniffing)", () => {
  it("identifies each allowed raster type from its magic bytes", () => {
    expect(sniffImageMime(JPEG)).toBe("image/jpeg");
    expect(sniffImageMime(PNG)).toBe("image/png");
    expect(sniffImageMime(GIF)).toBe("image/gif");
    expect(sniffImageMime(WEBP)).toBe("image/webp");
    expect(sniffImageMime(avif("avif"))).toBe("image/avif");
    expect(sniffImageMime(avif("mif1"))).toBe("image/avif");
  });

  it("rejects markup and script served with an image Content-Type", () => {
    // Regression: the route used to trust the client's Content-Type, so these
    // bodies were written to public/uploads and served same-origin.
    const html = Buffer.from("<script>alert(document.cookie)</script>", "latin1");
    const svg = Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>',
      "latin1"
    );
    expect(sniffImageMime(html)).toBeNull();
    expect(sniffImageMime(svg)).toBeNull();
    expect(sniffImageMime(Buffer.from("%PDF-1.7", "latin1"))).toBeNull();
  });

  it("rejects truncated and empty buffers", () => {
    expect(sniffImageMime(Buffer.alloc(0))).toBeNull();
    expect(sniffImageMime(Buffer.from([0x89, 0x50]))).toBeNull();
    expect(sniffImageMime(Buffer.from([0xff]))).toBeNull();
  });
});
