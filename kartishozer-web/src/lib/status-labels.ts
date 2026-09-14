export const ORDER_STATUS_LABELS: Record<string, string> = {
  PENDING: "ממתין לתשלום",
  PAID: "שולם",
  CONFIRMED: "אושר",
  TICKET_DELIVERED: "הכרטיס הועבר",
  DISPUTED: "בבירור",
  PARTIALLY_REFUNDED: "הוחזר חלקית",
  REFUNDED: "הוחזר",
  CANCELLED: "בוטל",
};

export const ORDER_STATUS_TONE: Record<string, "brand" | "accent" | "neutral" | "warn"> = {
  PENDING: "warn",
  PAID: "accent",
  CONFIRMED: "accent",
  TICKET_DELIVERED: "accent",
  DISPUTED: "brand",
  PARTIALLY_REFUNDED: "warn",
  REFUNDED: "neutral",
  CANCELLED: "neutral",
};

export const LISTING_STATUS_LABELS: Record<string, string> = {
  PENDING_REVIEW: "בבדיקה",
  ACTIVE: "פעיל",
  REJECTED: "נדחה",
  SUSPENDED: "מושעה",
  SOLD: "נמכר",
};

export const LISTING_STATUS_TONE: Record<string, "brand" | "accent" | "neutral" | "warn"> = {
  PENDING_REVIEW: "warn",
  ACTIVE: "accent",
  REJECTED: "brand",
  SUSPENDED: "brand",
  SOLD: "neutral",
};
