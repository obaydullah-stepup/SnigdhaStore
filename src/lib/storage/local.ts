import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import type { StorageProvider, StoredFile, UploadTicket } from "./types";
import { safeFolder, uniqueName } from "./extensions";

const UPLOAD_ROOT = path.join(process.cwd(), "public", "uploads");

export class LocalProvider implements StorageProvider {
  id = "local";

  async putFile(options: {
    buffer: Buffer;
    filename: string;
    mime: string;
    folder?: string;
  }): Promise<StoredFile> {
    const { buffer } = options;
    const folder = safeFolder(options.folder ?? "misc");
    const name = uniqueName(options.mime);
    const dir = path.join(UPLOAD_ROOT, folder);

    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, name), buffer);

    return {
      url: `/uploads/${folder}/${name}`,
      size: buffer.length,
    };
  }

  createUploadTicket(options: {
    filename: string;
    mime: string;
    folder?: string;
  }): Promise<UploadTicket> {
    const folder = safeFolder(options.folder ?? "misc");
    const name = uniqueName(options.mime);
    const publicUrl = `/uploads/${folder}/${name}`;
    const params = new URLSearchParams({ folder, filename: name });
    return Promise.resolve({
      uploadUrl: `/api/uploads?${params.toString()}`,
      publicUrl,
    });
  }

  async deleteFiles(urls: string[]): Promise<void> {
    for (const url of urls) {
      const match = /^\/uploads\/([^/]+)\/([^/]+)$/.exec(url);
      if (!match) continue;
      const [, folder, filename] = match;
      await rm(path.join(UPLOAD_ROOT, folder, filename), { force: true });
    }
  }
}
