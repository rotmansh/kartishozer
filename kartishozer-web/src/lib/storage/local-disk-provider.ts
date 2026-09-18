import "server-only";

import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import type { FileStorageProvider } from "./types";

// Local-dev-only stand-in for when no BLOB_READ_WRITE_TOKEN is set — never
// used in production (see provider.factory.ts), since a serverless
// deploy's filesystem doesn't persist between invocations. This exists
// purely so the upload → duplicate-detection → download flow can be
// developed and tested end-to-end without a real Vercel Blob store.
const STORAGE_DIR = path.join(process.cwd(), ".local-ticket-storage");

function keyToPath(key: string) {
  return path.join(STORAGE_DIR, key.replace(/[/\\]/g, "_"));
}

export const localDiskProvider: FileStorageProvider = {
  name: "local-disk",

  async upload({ key, buffer }) {
    await mkdir(STORAGE_DIR, { recursive: true });
    await writeFile(keyToPath(key), buffer);
    return { url: `local://${key}` };
  },

  async fetch(url) {
    const key = url.replace(/^local:\/\//, "");
    return readFile(keyToPath(key));
  },
};
