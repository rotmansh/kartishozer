import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getAppUser } from "@/lib/auth/server";
import { getConversationForUser } from "@/lib/queries/messages";
import { fmtDate, fmtTime } from "@/lib/format";
import { ORDER_STATUS_LABELS, ORDER_STATUS_TONE } from "@/lib/status-labels";
import { TopBar } from "@/components/layout/TopBar";
import { Badge } from "@/components/ui/Badge";
import { MessageComposer } from "@/components/MessageComposer";
import { cn } from "@/lib/cn";

export default async function ConversationPage({
  params,
}: {
  params: { conversationId: string };
}) {
  const user = await getAppUser();
  if (!user) redirect(`/sign-in?redirect=/messages/${params.conversationId}`);

  const conversation = await getConversationForUser(params.conversationId, user.id);
  if (!conversation) notFound();

  return (
    <div className="flex flex-col min-h-[calc(100dvh-4rem)]">
      <TopBar title={conversation.counterpart.fullName} />

      <Link
        href={`/event/${conversation.order.eventId}`}
        className="tap block mx-4 mt-3 mb-2 rounded-2xl bg-white border border-ink-900/5 shadow-card p-3.5"
      >
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-bold text-ink-900 truncate">{conversation.order.event.nameHe}</p>
          <Badge tone={ORDER_STATUS_TONE[conversation.order.status] ?? "neutral"}>
            {ORDER_STATUS_LABELS[conversation.order.status] ?? conversation.order.status}
          </Badge>
        </div>
      </Link>

      <div className="flex-1 px-4 py-2 space-y-2.5">
        {conversation.messages.length === 0 ? (
          <p className="text-center text-xs text-ink-400 mt-8">
            עוד אין הודעות — כתבו לצד השני כדי לתאם את מסירת הכרטיס
          </p>
        ) : (
          conversation.messages.map((m) => {
            const isMine = m.senderId === user.id;
            return (
              <div key={m.id} className={cn("flex", isMine ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[78%] rounded-2xl px-3.5 py-2.5",
                    isMine ? "bg-brand text-white" : "bg-white border border-ink-900/5 shadow-card text-ink-900"
                  )}
                >
                  <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{m.body}</p>
                  <p className={cn("text-[10px] mt-1", isMine ? "text-white/70" : "text-ink-400")}>
                    {fmtDate(m.createdAt.toISOString())} · {fmtTime(m.createdAt.toISOString())}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      <MessageComposer conversationId={conversation.id} />
    </div>
  );
}
