import "server-only";

import sharp from "sharp";
import jsQR from "jsqr";

/**
 * Decodes a QR code's text content from an image buffer, if one is
 * present — a bonus duplicate-detection signal on top of exact-file
 * hashing (see uploadTicketFileAction), never a hard requirement for a
 * valid upload. PDFs aren't supported (would need rendering to an image
 * first — a deliberate scope limit, not attempted here). Returns null
 * for a PDF, an image with no QR code, or if decoding fails for any
 * reason — a corrupt/unusual image must never block a legitimate
 * upload just because this bonus check couldn't run.
 */
export async function decodeQrContent(buffer: Buffer, mimeType: string): Promise<string | null> {
  if (mimeType !== "image/jpeg" && mimeType !== "image/png") return null;

  try {
    const { data, info } = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const pixels = new Uint8ClampedArray(data.buffer, data.byteOffset, data.length);
    const code = jsQR(pixels, info.width, info.height);
    return code?.data || null;
  } catch (err) {
    console.error("QR decode failed (non-fatal, treated as no QR found):", err);
    return null;
  }
}
