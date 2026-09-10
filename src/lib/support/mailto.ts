import {
  SUPPORT_CATEGORY_LABELS,
  SUPPORT_PUBLIC_EMAIL,
  type SupportCategory,
} from "./constants";

export function buildSupportMailto(opts: {
  category: SupportCategory | string;
  subject: string;
  message: string;
  replyEmail?: string;
  pageUrl?: string | null;
}): string {
  const categoryLabel =
    opts.category in SUPPORT_CATEGORY_LABELS
      ? SUPPORT_CATEGORY_LABELS[opts.category as SupportCategory]
      : opts.category;

  const lines = [
    `Category: ${categoryLabel}`,
    opts.replyEmail ? `Reply email: ${opts.replyEmail}` : null,
    opts.pageUrl ? `Page: ${opts.pageUrl}` : null,
    "",
    opts.message.trim(),
  ].filter((line) => line !== null);

  const subject = encodeURIComponent(
    `[ESAT Camp Support] ${opts.subject.trim() || categoryLabel}`.slice(0, 150),
  );
  const body = encodeURIComponent(lines.join("\n"));
  return `mailto:${SUPPORT_PUBLIC_EMAIL}?subject=${subject}&body=${body}`;
}
