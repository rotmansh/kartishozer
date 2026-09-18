import "server-only";

import { put } from "@vercel/blob";
import type { FileStorageProvider } from "./types";

// addRandomSuffix keeps the URL unguessable — ticket files are never
// linked to from anywhere public, only fetched server-side by the
// authorization-gated route in /api/tickets/[listingId], but an
// unguessable path is a reasonable extra layer regardless.
export const vercelBlobProvider: FileStorageProvider = {
  name: "vercel-blob",

  async upload({ key, buffer, contentType }) {
    const blob = await put(key, buffer, { access: "public", contentType, addRandomSuffix: true });
    return { url: blob.url };
  },

  async fetch(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch blob (${res.status}): ${url}`);
    return Buffer.from(await res.arrayBuffer());
  },
};
