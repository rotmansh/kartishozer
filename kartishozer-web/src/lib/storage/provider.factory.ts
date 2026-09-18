import "server-only";

import type { FileStorageProvider } from "./types";
import { vercelBlobProvider } from "./vercel-blob-provider";
import { localDiskProvider } from "./local-disk-provider";

const BLOB_TOKEN = process.env.BLOB_READ_WRITE_TOKEN?.trim();

/**
 * Returns null when no real storage backend is configured in production —
 * callers must surface a clear error rather than silently accepting an
 * upload that would vanish (a local-disk fallback in production would do
 * exactly that, since a serverless filesystem doesn't persist). The
 * local-disk fallback only ever applies outside production, purely for
 * developing/testing this feature without a Vercel Blob store.
 */
export function getFileStorageProvider(): FileStorageProvider | null {
  if (BLOB_TOKEN) return vercelBlobProvider;
  if (process.env.NODE_ENV !== "production") return localDiskProvider;
  return null;
}
