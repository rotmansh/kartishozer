import type { PaymentProvider } from "./types";
import { mockPaymentProvider } from "./mock-provider";

// Always returns the mock provider in Phase 1. A real factory would
// switch on an env var (e.g. PAYMENT_PROVIDER=stripe) — intentionally
// not wired up yet.
export function getPaymentProvider(): PaymentProvider {
  return mockPaymentProvider;
}
