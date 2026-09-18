import "server-only";

import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";

/**
 * The one place any code in the app writes to AuditLog — admin actions
 * and user-initiated actions on their own data alike (e.g. a seller
 * editing their own listing). Rows here are never updated or deleted;
 * always include whatever the caller already has of the previous state
 * in `metadata`, since that's the whole point of an audit trail.
 */
export async function writeAuditLog(
  userId: string,
  action: string,
  resourceType: string,
  resourceId: string,
  metadata: Record<string, unknown> = {}
) {
  await db.auditLog.create({
    data: { action, resourceType, resourceId, userId, metadata: metadata as Prisma.InputJsonValue },
  });
}
