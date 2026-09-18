// A browser's reported File.type is just a claim (the multipart request's
// Content-Type field for that part) — trivially spoofable by anyone
// crafting the upload request by hand. This checks the actual bytes
// instead, for the three types this app ever accepts, so "upload a PDF
// labeled as image/png" (or anything else) gets caught here rather than
// relying solely on however the file later gets served back.
const SIGNATURES: { mimeType: string; magic: number[] }[] = [
  { mimeType: "application/pdf", magic: [0x25, 0x50, 0x44, 0x46] }, // "%PDF"
  { mimeType: "image/jpeg", magic: [0xff, 0xd8, 0xff] },
  { mimeType: "image/png", magic: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
];

function matchesSignature(buffer: Buffer, magic: number[]): boolean {
  if (buffer.length < magic.length) return false;
  return magic.every((byte, i) => buffer[i] === byte);
}

/**
 * True only if the claimed MIME type is one of the three this app
 * accepts AND the file's actual leading bytes match that type's known
 * signature. Never returns true for a type not in SIGNATURES, even if
 * the bytes happen to match something else.
 */
export function fileContentMatchesClaimedType(buffer: Buffer, claimedMimeType: string): boolean {
  const spec = SIGNATURES.find((s) => s.mimeType === claimedMimeType);
  if (!spec) return false;
  return matchesSignature(buffer, spec.magic);
}
