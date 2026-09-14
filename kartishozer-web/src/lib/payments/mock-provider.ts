import type { PaymentProvider } from "./types";

// Simulated provider — no network call, no real charge, no card data
// ever collected. Used only so the checkout UI has something to call.
export const mockPaymentProvider: PaymentProvider = {
  name: "mock",

  async createIntent(input) {
    return {
      providerIntentId: `mock_${Date.now()}_${Math.round(Math.random() * 1e6)}`,
      status: "REQUIRES_CONFIRMATION",
    };
  },

  async confirmIntent(providerIntentId) {
    return { status: "SUCCEEDED" };
  },

  async refund(input) {
    return { refunded: true };
  },
};
