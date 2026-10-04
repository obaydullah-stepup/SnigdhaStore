import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { access, rm } from "node:fs/promises";
import path from "node:path";

const role = vi.fn<() => string>();
const signedIn = vi.fn<() => boolean>();

vi.mock("@/lib/auth/session", () => ({
  getSessionUser: async () =>
    signedIn() ? { id: "u1", name: "A", email: "a@b.c", role: role() } : null,
}));

const { PUT } = await import("@/app/api/uploads/route");

const PNG_BYTES = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
const NAME = "1700000000000-0123456789abcdef";
const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "products");

function put(body: Buffer, opts: { mime: string; filename: string }) {
  const req = new NextRequest(
    `http://localhost/api/uploads?folder=products&filename=${opts.filename}`,
    {
      method: "PUT",
      headers: {
        "content-type": opts.mime,
        "content-length": String(body.byteLength),
      },
      body: new Uint8Array(body),
    }
  );
  return PUT(req);
}

beforeEach(() => {
  signedIn.mockReturnValue(true);
  role.mockReturnValue("ADMIN");
});

afterEach(async () => {
  await rm(UPLOAD_DIR, { recursive: true, force: true });
});

describe("PUT /api/uploads (rejects active content)", () => {
  it("rejects an .html filename, which used to become same-origin stored XSS", async () => {
    const res = await put(Buffer.from("<script>alert(1)</script>"), {
      mime: "image/png",
      filename: `${NAME}.html`,
    });
    expect(res.status).toBe(400);
    await expect(access(path.join(UPLOAD_DIR, `${NAME}.html`))).rejects.toThrow();
  });

  it("rejects an .svg filename", async () => {
    const res = await put(PNG_BYTES, { mime: "image/png", filename: `${NAME}.svg` });
    expect(res.status).toBe(400);
  });

  it("rejects an SVG declared as its own Content-Type", async () => {
    const res = await put(Buffer.from("<svg/>"), {
      mime: "image/svg+xml",
      filename: `${NAME}.svg`,
    });
    expect(res.status).toBe(400);
  });

  it("rejects HTML bytes wearing an image Content-Type", async () => {
    const res = await put(Buffer.from("<html><script>alert(1)</script></html>"), {
      mime: "image/png",
      filename: `${NAME}.png`,
    });
    expect(res.status).toBe(400);
    await expect(access(path.join(UPLOAD_DIR, `${NAME}.png`))).rejects.toThrow();
  });

  it("rejects a filename whose extension does not match the MIME", async () => {
    const res = await put(PNG_BYTES, { mime: "image/jpeg", filename: `${NAME}.png` });
    expect(res.status).toBe(400);
  });
});

describe("PUT /api/uploads (accepts real images)", () => {
  it("stores a genuine PNG and returns its URL", async () => {
    const res = await put(PNG_BYTES, { mime: "image/png", filename: `${NAME}.png` });
    expect(res.status).toBe(200);
    await expect(await res.json()).toEqual({ url: `/uploads/products/${NAME}.png` });
    await expect(access(path.join(UPLOAD_DIR, `${NAME}.png`))).resolves.toBeUndefined();
  });

  it("tolerates a charset parameter on the Content-Type", async () => {
    const res = await put(PNG_BYTES, {
      mime: "image/png; charset=binary",
      filename: `${NAME}.png`,
    });
    expect(res.status).toBe(200);
  });

  it("rejects an empty body", async () => {
    const res = await put(Buffer.alloc(0), {
      mime: "image/png",
      filename: `${NAME}.png`,
    });
    expect(res.status).toBe(413);
  });

  it("rejects an oversized body before writing it", async () => {
    const big = Buffer.concat([PNG_BYTES, Buffer.alloc(5 * 1024 * 1024 + 1)]);
    const res = await put(big, { mime: "image/png", filename: `${NAME}.png` });
    expect(res.status).toBe(413);
    await expect(access(path.join(UPLOAD_DIR, `${NAME}.png`))).rejects.toThrow();
  });
});

describe("PUT /api/uploads (authorization)", () => {
  it("rejects an anonymous request", async () => {
    signedIn.mockReturnValue(false);
    const res = await put(PNG_BYTES, { mime: "image/png", filename: `${NAME}.png` });
    expect(res.status).toBe(401);
  });
});
