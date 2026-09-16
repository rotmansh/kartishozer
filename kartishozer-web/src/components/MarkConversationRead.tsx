"use client";

import { useEffect } from "react";
import { markConversationReadAction } from "@/lib/actions/messages.actions";

/**
 * Fires once when a conversation thread is opened, so the unread badges
 * elsewhere in the app (profile, homepage) clear for this side of the
 * thread. Renders nothing — this is a Server Component page's only way to
 * trigger a mutation on view without turning the whole page into a client
 * component.
 */
export function MarkConversationRead({ conversationId }: { conversationId: string }) {
  useEffect(() => {
    markConversationReadAction(conversationId);
  }, [conversationId]);

  return null;
}
