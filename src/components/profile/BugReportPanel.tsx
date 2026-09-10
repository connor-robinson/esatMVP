"use client";

import { Button } from "@/components/ui/Button";
import { useOptionalSupport } from "@/components/support/SupportProvider";
import { trackEvent } from "@/lib/ga/trackEvent";
import {
  SUPPORT_PUBLIC_EMAIL,
  SUPPORT_RESPONSE_COPY,
} from "@/lib/support/constants";

interface BugReportPanelProps {
  subject?: string;
}

/**
 * Settings/help entry that opens the shared support panel (Technical problem).
 */
export function BugReportPanel({ subject }: BugReportPanelProps) {
  const support = useOptionalSupport();

  return (
    <div className="space-y-4">
      <p className="text-sm text-text-muted">
        Found something broken or confusing? Open the support form and we will
        look into it. {SUPPORT_RESPONSE_COPY}
      </p>
      <div className="flex flex-wrap gap-3">
        <Button
          type="button"
          variant="primary"
          size="sm"
          onClick={() => {
            trackEvent("support_opened", { placement: "bug_report_panel" });
            support?.openSupport({
              category: "technical_problem",
              subject: subject || undefined,
            });
          }}
        >
          Open support form
        </Button>
        <a
          href={`mailto:${SUPPORT_PUBLIC_EMAIL}`}
          className="inline-flex items-center text-sm font-medium text-text-muted underline-offset-2 hover:text-text hover:underline"
        >
          {SUPPORT_PUBLIC_EMAIL}
        </a>
      </div>
    </div>
  );
}
