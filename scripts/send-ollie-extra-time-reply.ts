/**
 * One-off: send Ollie Nebel the Extra Time / Rest breaks reply
 * (inbox + email attempt via Resend).
 *
 * Usage: npx tsx --env-file=.env.local scripts/send-ollie-extra-time-reply.ts
 */
import { createClient } from "@supabase/supabase-js";

const TICKET_ID = "14cf612b-a889-4ae1-bf96-12af43bb3e89";
const USER_ID = "81f1426a-3129-40fd-b716-6c8f13f43980";
const ADMIN_ID = "79f9cf43-5b01-4980-9bc5-f8b8fa6268c7";
const TO_EMAIL = "ollie.nebel@gmail.com";
const SUBJECT = "Re: Extra Time setting";
const SITE_URL = "https://esatcamp.com";

const BODY = `Hi Ollie,

Thanks for the suggestion, and sorry for the slow reply. We've now implemented your suggestion!

Extra time: turn on Extra Time in Profile (Settings) and set your percentage (e.g. +25%). Timed past papers and question-bank sessions will use that longer limit.

Rest breaks - turn on Rest breaks in the same Access arrangements section. You'll get a Pause control during timed sittings (up to 3 per section), the clock stops, and the questions are hidden until you resume.

This is a new feature, so if you experience any bugs or errors, please reply here and we'll sort it within 24 hours.

Thanks again,
ESAT Camp team`;

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const resendKey = process.env.RESEND_API_KEY?.trim();
  const from =
    process.env.SUPPORT_FROM_EMAIL?.trim() ||
    "ESAT Camp Support <onboarding@resend.dev>";

  if (!url || !serviceKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  const service = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: inserted, error: insertError } = await service
    .from("inbox_messages")
    .insert({
      subject: SUBJECT,
      body: BODY,
      audience: "personal",
      direction: "outbound",
      created_by: ADMIN_ID,
      parent_id: null,
      support_request_id: TICKET_ID,
      legacy_bug_report_id: null,
      allow_reply: true,
    })
    .select("id")
    .single();

  if (insertError || !inserted) {
    console.error("INBOX_FAILED", insertError?.message ?? "no row");
    process.exit(1);
  }

  const { error: recipError } = await service
    .from("inbox_message_recipients")
    .insert({
      message_id: inserted.id,
      user_id: USER_ID,
    });

  if (recipError) {
    await service.from("inbox_messages").delete().eq("id", inserted.id);
    console.error("RECIPIENT_FAILED", recipError.message);
    process.exit(1);
  }

  console.log("INBOX_OK", inserted.id);

  await service
    .from("support_requests")
    .update({ status: "resolved", updated_at: new Date().toISOString() })
    .eq("id", TICKET_ID);

  if (!resendKey) {
    console.error("EMAIL_SKIPPED RESEND_API_KEY missing");
    process.exitCode = 2;
    return;
  }

  const emailText = `${BODY}

---
You can also reply in your ESATcamp inbox: ${SITE_URL}/inbox`;

  const emailResponse = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${resendKey}`,
    },
    body: JSON.stringify({
      from,
      to: [TO_EMAIL],
      subject: SUBJECT,
      text: emailText,
    }),
  });

  const detail = await emailResponse.text();
  console.log("EMAIL_STATUS", emailResponse.status, detail);

  if (!emailResponse.ok) {
    console.error(
      "Email was not delivered. Verify a custom domain at resend.com/domains and set SUPPORT_FROM_EMAIL to an address on that domain (not onboarding@resend.dev).",
    );
    process.exitCode = 2;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
