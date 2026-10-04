import { describe, expect, it } from "vitest";
import path from "node:path";
import { access, writeFile, rm, mkdir } from "node:fs/promises";
import { LocalProvider } from "@/lib/storage/local";
import { safeFolder, uniqueName } from "@/lib/storage/extensions";

describe("LocalProvider.createUploadTicket", () => {
  it("returns a local upload endpoint and public URL", async () => {
    const ticket = await new LocalProvider().createUploadTicket({
      filename: "photo.jpg",
      mime: "image/jpeg",
      folder: "products",
    });

    expect(ticket.uploadUrl).toMatch(/^\/api\/uploads\?folder=products&filename=/);
    expect(ticket.publicUrl).toMatch(/^\/uploads\/products\/\d+-[a-f0-9]{16}\.jpg$/);
  });

  it("santizes the folder name", async () => {
    const ticket = await new LocalProvider().createUploadTicket({
      filename: "x.png",
      mime: "image/png",
      folder: "../products/../..",
    });
    expect(ticket.uploadUrl).not.toContain("..");
    expect(ticket.publicUrl).toMatch(/^\/uploads\/[a-zA-Z0-9-_]+\//);
  });
});

describe("LocalProvider.deleteFiles", () => {
  it("ignores non-local URLs and never throws", async () => {
    await expect(
      new LocalProvider().deleteFiles([
        "https://picsum.photos/seed/x/900/1100",
        "https://yoljlsvbmmjebmwelifp.supabase.co/storage/v1/object/public/snigdha/products/a.jpg",
      ])
    ).resolves.toBeUndefined();
  });

  it("removes matching files from public/uploads", async () => {
    const root = path.join(process.cwd(), "public", "uploads", "products");
    const name = uniqueName("image/png");
    const file = path.join(root, name);
    await mkdir(root, { recursive: true });
    await writeFile(file, "x");

    try {
      await new LocalProvider().deleteFiles([`/uploads/products/${name}`]);
      await expect(access(file)).rejects.toThrow();
    } finally {
      await rm(file, { force: true });
    }
  });
});

describe("storage helpers", () => {
  it("uniqueName picks the extension from the mime type", () => {
    const name = uniqueName("image/webp");
    expect(name).toMatch(/^\d+-[a-f0-9]{16}\.webp$/);
  });

  it("uniqueName falls back to bin for unknown mime types", () => {
    expect(uniqueName("application/octet-stream")).toMatch(/\.bin$/);
  });

  it("safeFolder strips traversal and stays short", () => {
    expect(safeFolder("products")).toBe("products");
    expect(safeFolder("../secret")).toBe("secret");
    expect(safeFolder("").length).toBeLessThanOrEqual(64);
  });
});
