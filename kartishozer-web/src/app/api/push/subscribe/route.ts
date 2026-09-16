import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getAppUser } from "@/lib/auth/server";

export const dynamic = "force-dynamic";

const subscribeSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({ p256dh: z.string().min(1), auth: z.string().min(1) }),
});

export async function POST(req: Request) {
  const user = await getAppUser();
  if (!user) return NextResponse.json({ error: "יש להתחבר" }, { status: 401 });

  const parsed = subscribeSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "בקשה לא תקינה" }, { status: 400 });
  const { endpoint, keys } = parsed.data;

  // A browser reusing the same endpoint (re-subscribing on the same
  // device) should just refresh the keys/owner rather than fail on the
  // unique constraint.
  await db.pushSubscription.upsert({
    where: { endpoint },
    create: { userId: user.id, endpoint, p256dh: keys.p256dh, auth: keys.auth },
    update: { userId: user.id, p256dh: keys.p256dh, auth: keys.auth },
  });

  return NextResponse.json({ success: true });
}

export async function DELETE(req: Request) {
  const user = await getAppUser();
  if (!user) return NextResponse.json({ error: "יש להתחבר" }, { status: 401 });

  const parsed = z.object({ endpoint: z.string().url() }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "בקשה לא תקינה" }, { status: 400 });

  await db.pushSubscription.deleteMany({ where: { endpoint: parsed.data.endpoint, userId: user.id } });
  return NextResponse.json({ success: true });
}
