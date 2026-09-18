-- Additive enum value only — supports the new "confirm ticket received"
-- action (see confirmTicketReceivedAction), which is the first code path
-- that ever sets OrderStatus.TICKET_DELIVERED.
ALTER TYPE "AnalyticsEventType" ADD VALUE 'TICKET_RECEIVED_CONFIRMED';
