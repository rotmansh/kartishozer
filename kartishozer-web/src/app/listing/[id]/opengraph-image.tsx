import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import bidiFactory from "bidi-js";
import { getListing, getEvent } from "@/lib/queries/catalog";
import { fmtAgorot, fmtEventDate } from "@/lib/format";

export const alt = "כרטיס חוזר";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Satori (what ImageResponse runs on) doesn't implement the Unicode
// bidi algorithm — it lays out each string's characters left-to-right
// regardless of script, so raw Hebrew text renders with words/letters
// in reversed order. bidi-js computes the correct *visual* character
// order up front so Satori's naive LTR placement displays it correctly.
const bidi = bidiFactory();
function toVisualOrder(text: string): string {
  const embeddingLevels = bidi.getEmbeddingLevels(text);
  const segments = bidi.getReorderSegments(text, embeddingLevels);
  const chars = text.split("");
  for (const [start, end] of segments) {
    const reversed = chars.slice(start, end + 1).reverse();
    chars.splice(start, reversed.length, ...reversed);
  }
  return chars.join("");
}

// Rendered once per share (Next caches the result) so a link pasted into
// a Facebook group, WhatsApp or an Instagram bio shows this listing's
// actual event/price instead of a bare URL. Satori ships no Hebrew
// glyphs in its default font either, so Heebo — the same font already
// used in the live app — is loaded from disk and passed in explicitly;
// without it every Hebrew character renders blank.
export default async function Image({ params }: { params: { id: string } }) {
  const listing = await getListing(params.id);
  const event = listing ? await getEvent(listing.eventId) : null;

  const fontData = await readFile(join(process.cwd(), "src/assets/fonts/Heebo-Bold.ttf"));
  // Satori renders outside a browser DOM, so next/image is unusable here —
  // a base64 data URI is the documented way to embed a local image.
  const logoMarkData = await readFile(join(process.cwd(), "public/logo-mark.png"));
  const logoMarkSrc = `data:image/png;base64,${logoMarkData.toString("base64")}`;

  const gradient = event ? event.gradient : ["#E8503A", "#F5876F"];
  const title = toVisualOrder(event?.nameHe ?? "כרטיס חוזר");
  const venueText = event
    ? toVisualOrder(`${event.venue.nameHe}, ${event.venue.city} · ${fmtEventDate(event)}`)
    : "";
  const priceText = listing ? toVisualOrder(fmtAgorot(listing.priceAgorot)) : null;
  const brandLabel = toVisualOrder("כרטיס חוזר");
  const priceLabel = toVisualOrder("החל מ־");

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 64,
          background: `linear-gradient(135deg, ${gradient[0]}, ${gradient[1]})`,
          color: "white",
          fontFamily: "Heebo",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- Satori has no DOM; next/image can't run here */}
          <img src={logoMarkSrc} width={64} height={64} alt="" />
          <div style={{ display: "flex", fontSize: 30, fontWeight: 700 }}>{brandLabel}</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 18, direction: "rtl" }}>
          <div style={{ display: "flex", fontSize: 68, fontWeight: 700, lineHeight: 1.15, textAlign: "right" }}>
            {title}
          </div>
          {venueText && (
            <div style={{ display: "flex", fontSize: 32, opacity: 0.88, textAlign: "right" }}>{venueText}</div>
          )}
        </div>

        {priceText && (
          <div style={{ display: "flex", alignItems: "baseline", gap: 14, direction: "rtl" }}>
            <div style={{ display: "flex", fontSize: 30, opacity: 0.8 }}>{priceLabel}</div>
            <div style={{ display: "flex", fontSize: 60, fontWeight: 700 }}>{priceText}</div>
          </div>
        )}
      </div>
    ),
    {
      ...size,
      fonts: [{ name: "Heebo", data: fontData, style: "normal", weight: 700 }],
    }
  );
}
