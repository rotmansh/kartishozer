// ============================================================
// File storage provider abstraction — mirrors the payments provider
// pattern (src/lib/payments/types.ts): one interface, swappable
// implementation, so call sites never know which backend is behind it.
// ============================================================

export interface FileStorageProvider {
  name: string;
  upload(input: { key: string; buffer: Buffer; contentType: string }): Promise<{ url: string }>;
  // Fetches the raw bytes server-side so a route handler can proxy them to
  // an authorized client without ever handing out the storage URL itself.
  fetch(url: string): Promise<Buffer>;
}
