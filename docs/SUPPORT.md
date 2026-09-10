# Customer support (ESAT Camp Help)

Asynchronous support tickets via the floating **Help** button on signed-in pages.
Public contact address: **esatcamp@gmail.com**.

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `RESEND_API_KEY` | For email notify | Resend API key |
| `SUPPORT_NOTIFICATION_EMAIL` | Recommended | Inbox that receives ticket emails (default fallback: `esatcamp@gmail.com`) |
| `SUPPORT_INBOX_EMAIL` / `BUG_REPORT_EMAIL` | Optional legacy | Used if `SUPPORT_NOTIFICATION_EMAIL` is unset |
| `SUPPORT_FROM_EMAIL` | Recommended | Verified Resend from address, e.g. `ESAT Camp Support <support@esatcamp.com>` |
| `SUPABASE_SERVICE_ROLE_KEY` | Required for tickets | Server-only inserts into `support_requests` |
| `NEXT_PUBLIC_SUPABASE_URL` | Required | Supabase project URL |
| `NEXT_PUBLIC_VERCEL_ENV` / `NEXT_PUBLIC_APP_VERSION` | Optional | Attached as `app_version` diagnostics |

Do **not** send from `esatcamp@gmail.com` through Resend unless that sender is verified.
The public destination / Reply-To target for students remains `esatcamp@gmail.com`.

Missing Resend config does **not** block ticket storage. Delivery is recorded as `not_configured` or `failed`.

## Database

Apply migration:

`supabase/migrations/20260910180000_support_requests.sql`

Ordinary users cannot insert/select via the anon key. Writes go through `POST /api/support/request` with the service role. Admins can list open tickets at `/admin/support`.

## Delivery flow

1. Validate payload on the server (never trust client `user_id`).
2. Insert into `support_requests`.
3. On success, email `SUPPORT_NOTIFICATION_EMAIL` with `Reply-To` set to the student’s reply email.
4. If email fails, keep the row and mark `email_delivery_status`.
5. User sees **Request received** whenever the DB insert succeeds.
6. If the DB insert fails, UI shows error + `mailto:esatcamp@gmail.com` fallback with category/subject/message prefilled.
