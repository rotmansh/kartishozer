import "server-only";

import { put, get } from "@vercel/blob";
import type { FileStorageProvider } from "./types";

// TypeScript sees @vercel/blob's ReadableStream<Uint8Array> (from its own
// bundled lib types) as incompatible with node:stream/consumers' expected
// type, even though both are the same object at runtime — reading it by
// hand sidesteps that mismatch instead of casting through `unknown`.
async function webStreamToBuffer(stream: ReadableStream<Uint8Array>): Promise<Buffer> {
  const chunks: Uint8Array[] = [];
  const reader = stream.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) chunks.push(value);
  }
  return Buffer.concat(chunks);
}

// access: "private" means a blob's bytes require BLOB_READ_WRITE_TOKEN to
// read at all — reading it is not just "the URL is hard to guess" (as a
// public blob would be) but actually authenticated, which matters for a
// file as sensitive as someone's ticket. Every read still only ever
// happens from /api/tickets/[listingId], which applies its own
// ownership/purchase check before ever calling this.
export const vercelBlobProvider: FileStorageProvider = {
  name: "vercel-blob",

  async upload({ key, buffer, contentType }) {
    const blob = await put(key, buffer, { access: "private", contentType, addRandomSuffix: true });
    return { url: blob.url };
  },

  async fetch(url) {
    const result = await get(url, { access: "private" });
    // statusCode 304 (stream: null) only happens when a conditional-read
    // option like ifNoneMatch is passed, which this never does.
    if (!result || result.statusCode !== 200) throw new Error(`Blob not found: ${url}`);
    return webStreamToBuffer(result.stream);
  },
};
