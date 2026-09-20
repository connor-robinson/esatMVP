-- Allow open-tracking events for product email campaigns.

ALTER TABLE public.product_email_events
  DROP CONSTRAINT IF EXISTS product_email_events_event_type_check;

ALTER TABLE public.product_email_events
  ADD CONSTRAINT product_email_events_event_type_check
  CHECK (event_type IN ('click', 'unsubscribe', 'open'));
