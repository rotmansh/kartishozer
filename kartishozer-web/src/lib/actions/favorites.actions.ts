"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getAppUser } from "@/lib/auth/server";

export async function toggleFavoriteAction(listingId: string): Promise<{ favorited: boolean } | { error: string }> {
  const user = await getAppUser();
  if (!user) return { error: "יש להתחבר כדי לשמור מועדפים" };

  const existing = await db.favorite.findUnique({
    where: { userId_listingId: { userId: user.id, listingId } },
  });

  if (existing) {
    await db.favorite.delete({ where: { id: existing.id } });
    revalidatePath("/favorites");
    return { favorited: false };
  }

  await db.favorite.create({ data: { userId: user.id, listingId } });
  revalidatePath("/favorites");
  return { favorited: true };
}

export async function toggleEventFavoriteAction(
  eventId: string
): Promise<{ favorited: boolean } | { error: string }> {
  const user = await getAppUser();
  if (!user) return { error: "יש להתחבר כדי לשמור מועדפים" };

  const existing = await db.eventFavorite.findUnique({
    where: { userId_eventId: { userId: user.id, eventId } },
  });

  if (existing) {
    await db.eventFavorite.delete({ where: { id: existing.id } });
    revalidatePath("/favorites");
    return { favorited: false };
  }

  await db.eventFavorite.create({ data: { userId: user.id, eventId } });
  revalidatePath("/favorites");
  return { favorited: true };
}
