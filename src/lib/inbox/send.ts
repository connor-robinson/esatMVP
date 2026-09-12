import type { SupabaseClient } from "@supabase/supabase-js";
import { INBOX_LIMITS } from "./types";

type SendOutboundArgs = {
  service: SupabaseClient;
  adminUserId: string;
  recipientUserId: string;
  subject: string;
  body: string;
  supportRequestId?: string | null;
  legacyBugReportId?: string | null;
  parentId?: string | null;
  allowReply?: boolean;
};

/**
 * Create a personal outbound inbox message and attach one recipient.
 */
export async function sendPersonalInboxMessage(
  args: SendOutboundArgs,
): Promise<{ id: string } | { error: string }> {
  const subject = args.subject.trim().slice(0, INBOX_LIMITS.subjectMax);
  const body = args.body.trim().slice(0, INBOX_LIMITS.bodyMax);
  if (!subject || !body) {
    return { error: "Subject and body are required" };
  }

  const { data: inserted, error: insertError } = await args.service
    .from("inbox_messages")
    .insert({
      subject,
      body,
      audience: "personal",
      direction: "outbound",
      created_by: args.adminUserId,
      parent_id: args.parentId ?? null,
      support_request_id: args.supportRequestId ?? null,
      legacy_bug_report_id: args.legacyBugReportId ?? null,
      allow_reply: args.allowReply !== false,
    })
    .select("id")
    .single();

  if (insertError || !inserted) {
    return { error: "Failed to create inbox message" };
  }

  const { error: recipError } = await args.service
    .from("inbox_message_recipients")
    .insert({
      message_id: inserted.id,
      user_id: args.recipientUserId,
    });

  if (recipError) {
    await args.service.from("inbox_messages").delete().eq("id", inserted.id);
    return { error: "Failed to attach recipient" };
  }

  return { id: inserted.id };
}
