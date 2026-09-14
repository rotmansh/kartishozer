// ============================================================
// Payment provider abstraction.
//
// Mirrors the interface the admin panel already expects
// (getPaymentProvider().refund(...) in admin.actions.ts) so a real
// provider (Stripe, an Israeli acquirer, etc.) can be dropped in
// later without changing call sites. No real provider is wired up
// in Phase 1 — MockPaymentProvider never touches real money.
// ============================================================

export type CreateIntentInput = {
  amountAgorot: number;
  currency: "ILS";
  metadata: Record<string, string>;
};

export type CreateIntentResult = {
  providerIntentId: string;
  status: "REQUIRES_CONFIRMATION" | "SUCCEEDED";
};

export type RefundInput = {
  providerIntentId: string;
  amountAgorot: number;
  reason: string;
  idempotencyKey: string;
};

export interface PaymentProvider {
  name: string;
  createIntent(input: CreateIntentInput): Promise<CreateIntentResult>;
  confirmIntent(providerIntentId: string): Promise<{ status: "SUCCEEDED" | "FAILED" }>;
  refund(input: RefundInput): Promise<{ refunded: boolean }>;
}
