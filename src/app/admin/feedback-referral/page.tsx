"use client";

import { useEffect, useState } from "react";
import { Container } from "@/components/layout/Container";

interface Row {
  code: string;
  createdAt: string;
  redeemedAt: string | null;
  ownerEmail: string | null;
  ownerUsername: string | null;
  redeemedByEmail: string | null;
}

export default function AdminFeedbackReferralPage() {
  const [forbidden, setForbidden] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    void fetch("/api/admin/feedback-referral").then(async (res) => {
      if (res.status === 403 || res.status === 401) {
        setForbidden(true);
        return;
      }
      const data = await res.json();
      setRows(data.rows ?? []);
    });
  }, []);

  if (forbidden) {
    return (
      <Container size="md" className="py-16">
        <p className="text-sm text-text-muted">Admin only.</p>
      </Container>
    );
  }

  return (
    <Container size="lg" className="py-12">
      <h1 className="text-2xl font-bold text-text">Feedback referral codes</h1>
      <p className="mt-2 text-sm text-text-muted">
        Preview only until FEEDBACK_REFERRAL_LIVE is on.
      </p>
      <div className="mt-8 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-xs uppercase tracking-[0.12em] text-text-muted">
            <tr>
              <th className="py-2 font-medium">Code</th>
              <th className="py-2 font-medium">Owner</th>
              <th className="py-2 font-medium">Created</th>
              <th className="py-2 font-medium">Redeemed</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.code} className="bg-surface-elevated/40">
                <td className="py-3 font-mono font-semibold">{row.code}</td>
                <td className="py-3 text-text-muted">
                  {row.ownerUsername ?? row.ownerEmail ?? "—"}
                </td>
                <td className="py-3 text-text-muted">
                  {new Date(row.createdAt).toLocaleString("en-GB")}
                </td>
                <td className="py-3 text-text-muted">
                  {row.redeemedAt
                    ? `${row.redeemedByEmail ?? "used"} · ${new Date(
                        row.redeemedAt,
                      ).toLocaleString("en-GB")}`
                    : "unused"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 ? (
          <p className="mt-6 text-sm text-text-muted">No codes yet.</p>
        ) : null}
      </div>
    </Container>
  );
}
