"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Trash2 } from "lucide-react";
import { delistListingAction } from "@/lib/actions/listings.actions";
import { Button } from "@/components/ui/Button";

// Shown instead of the buyer's "buy now" CTA when the viewer is this
// listing's own seller — the buyer flow already blocks self-purchase
// server-side, but nothing on this page previously told an owner that,
// or gave them any way to change their mind and take the listing down
// without a detour through their profile page.
export function ListingOwnerActions({ listingId, canManage }: { listingId: string; canManage: boolean }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (!confirm("להסיר את הכרטיס מהמכירה? לא ניתן לשחזר את המודעה אחרי ההסרה.")) return;
    startTransition(async () => {
      const res = await delistListingAction(listingId);
      if (!("error" in res)) router.push("/profile");
    });
  }

  return (
    <div className="flex gap-2.5">
      {canManage ? (
        <button
          onClick={handleDelete}
          disabled={isPending}
          className="tap h-14 w-14 flex-shrink-0 rounded-2xl bg-brand-50 flex items-center justify-center"
          aria-label="הסרת המודעה"
        >
          <Trash2 size={20} className="text-brand-600" />
        </button>
      ) : null}
      <Link href="/profile" className="flex-1">
        <Button size="lg" fullWidth variant="outline">
          זו המודעה שלכם — לניהול בפרופיל
        </Button>
      </Link>
    </div>
  );
}
