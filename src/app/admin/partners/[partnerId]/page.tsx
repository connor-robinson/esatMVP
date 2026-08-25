"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Container } from "@/components/layout/Container";
import type { PartnerDetailStats } from "@/lib/partners/adminStats";

function pct(n: number | null): string {
  if (n == null) return "—";
  return `${Math.round(n * 100)}%`;
}

function downloadCsv(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AdminPartnerDetailPage() {
  const params = useParams();
  const partnerId = String(params.partnerId ?? "");
  const [forbidden, setForbidden] = useState(false);
  const [loading, setLoading] = useState(true);
  const [partner, setPartner] = useState<PartnerDetailStats | null>(null);
  const [genCount, setGenCount] = useState(50);
  const [genExpiry, setGenExpiry] = useState("2027-01-10");
  const [genLabel, setGenLabel] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generatedCsv, setGeneratedCsv] = useState<string | null>(null);
  const [generatedPreview, setGeneratedPreview] = useState<
    Array<{ inviteCode: string; claimUrl: string; tokenPrefix: string }>
  >([]);
  const [statusSaving, setStatusSaving] = useState(false);

  const load = useCallback(async () => {
    if (!partnerId) return;
    setLoading(true);
    const res = await fetch(`/api/admin/partners?id=${partnerId}`, {
      cache: "no-store",
    });
    if (res.status === 403 || res.status === 401) {
      setForbidden(true);
      setLoading(false);
      return;
    }
    const data = await res.json();
    setPartner(data.partner ?? null);
    if (data.partner?.accessEndsAt) {
      setGenExpiry(String(data.partner.accessEndsAt).slice(0, 10));
    }
    setLoading(false);
  }, [partnerId]);

  useEffect(() => {
    load();
  }, [load]);

  async function setStatus(status: string) {
    if (!partner) return;
    setStatusSaving(true);
    await fetch("/api/admin/partners", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update", id: partner.id, status }),
    });
    setStatusSaving(false);
    await load();
  }

  async function generate() {
    setGenerating(true);
    setGeneratedCsv(null);
    setGeneratedPreview([]);
    const res = await fetch(`/api/admin/partners/${partnerId}/invites`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "generate",
        count: genCount,
        accessEndsAt: genExpiry,
        label: genLabel || null,
      }),
    });
    const data = await res.json();
    setGenerating(false);
    if (!res.ok) {
      window.alert(data.error || "Failed to generate");
      return;
    }
    setGeneratedCsv(data.csv);
    setGeneratedPreview(data.invites ?? []);
    await load();
  }

  async function revokeBatch(batchId: string) {
    if (!window.confirm("Revoke all unused invites in this batch?")) return;
    await fetch(`/api/admin/partners/${partnerId}/invites`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "revoke_batch", batchId }),
    });
    await load();
  }

  async function revokeOne(inviteId: string) {
    await fetch(`/api/admin/partners/${partnerId}/invites`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "revoke_invite", inviteId }),
    });
    await load();
  }

  function exportFeedbackCsv() {
    if (!partner) return;
    const header =
      "usefulness,feature,recommendation,contact,created_at,feedback";
    const rows = partner.feedbackRows.map((f) =>
      [
        f.usefulnessRating,
        f.mostUsefulFeature,
        f.recommendationRating ?? "",
        f.contactPermission ? "yes" : "no",
        f.createdAt,
        JSON.stringify(f.improvementFeedback ?? ""),
      ].join(","),
    );
    downloadCsv(
      `${partner.slug}-feedback.csv`,
      [header, ...rows].join("\n"),
    );
  }

  if (forbidden) {
    return (
      <main className="py-16">
        <Container>
          <p className="text-stone-600">You do not have admin access.</p>
        </Container>
      </main>
    );
  }

  if (loading || !partner) {
    return (
      <main className="py-16">
        <Container>
          <p className="text-stone-500">{loading ? "Loading…" : "Not found"}</p>
        </Container>
      </main>
    );
  }

  return (
    <main className="py-10">
      <Container size="lg">
        <Link
          href="/admin/partners"
          className="text-sm text-stone-500 underline-offset-2 hover:underline"
        >
          ← Partners
        </Link>
        <h1 className="mt-4 text-2xl font-semibold text-stone-900">
          {partner.name}
        </h1>
        <p className="text-sm text-stone-500">
          {partner.slug} · {partner.status} · ends{" "}
          {partner.accessEndsAt.slice(0, 10)}
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl bg-stone-100 px-4 py-3">
            <div className="text-2xl font-semibold text-stone-900">
              {partner.invitesRedeemed} / {partner.invitesGenerated}
            </div>
            <div className="text-sm text-stone-500">redeemed</div>
          </div>
          <div className="rounded-xl bg-stone-100 px-4 py-3">
            <div className="text-2xl font-semibold text-stone-900">
              {partner.activatedUsers}
            </div>
            <div className="text-sm text-stone-500">
              activated ({pct(partner.activationRate)})
            </div>
          </div>
          <div className="rounded-xl bg-stone-100 px-4 py-3">
            <div className="text-2xl font-semibold text-stone-900">
              {partner.totalQuestions.toLocaleString()}
            </div>
            <div className="text-sm text-stone-500">questions answered</div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={statusSaving || partner.status === "paused"}
            onClick={() => setStatus("paused")}
            className="rounded-lg bg-stone-200 px-3 py-1.5 text-sm disabled:opacity-50"
          >
            Pause
          </button>
          <button
            type="button"
            disabled={statusSaving || partner.status === "active"}
            onClick={() => setStatus("active")}
            className="rounded-lg bg-stone-200 px-3 py-1.5 text-sm disabled:opacity-50"
          >
            Activate
          </button>
          <button
            type="button"
            disabled={statusSaving || partner.status === "ended"}
            onClick={() => setStatus("ended")}
            className="rounded-lg bg-stone-200 px-3 py-1.5 text-sm disabled:opacity-50"
          >
            End
          </button>
        </div>

        <section className="mt-10">
          <h2 className="text-lg font-semibold text-stone-900">
            Generate invitations
          </h2>
          <p className="mt-1 text-sm text-stone-500">
            Codes are shown once. The date below sets full access end for this
            programme and invite validity. Download the CSV before leaving.
          </p>
          <div className="mt-4 flex flex-wrap items-end gap-3">
            <label className="text-sm text-stone-600">
              Count
              <input
                type="number"
                min={1}
                max={500}
                value={genCount}
                onChange={(e) => setGenCount(Number(e.target.value))}
                className="mt-1 block w-24 rounded-lg bg-stone-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400"
              />
            </label>
            <label className="text-sm text-stone-600">
              Full access until
              <input
                type="date"
                value={genExpiry}
                onChange={(e) => setGenExpiry(e.target.value)}
                className="mt-1 block rounded-lg bg-stone-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400"
              />
            </label>
            <label className="text-sm text-stone-600">
              Batch label
              <input
                type="text"
                value={genLabel}
                onChange={(e) => setGenLabel(e.target.value)}
                placeholder="Y13 September 2026"
                className="mt-1 block w-56 rounded-lg bg-stone-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400"
              />
            </label>
            <button
              type="button"
              disabled={generating}
              onClick={generate}
              className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              {generating ? "Generating…" : "Generate"}
            </button>
          </div>

          {generatedCsv && (
            <div className="mt-6 rounded-xl bg-amber-50 px-4 py-4">
              <p className="text-sm font-medium text-amber-900">
                These codes are only available now. Download the CSV before
                leaving this page.
              </p>
              <button
                type="button"
                className="mt-3 rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white"
                onClick={() =>
                  downloadCsv(`${partner.slug}-invites.csv`, generatedCsv)
                }
              >
                Download CSV
              </button>
              <div className="mt-4 max-h-48 overflow-auto text-xs text-stone-700">
                {generatedPreview.slice(0, 20).map((row) => (
                  <div key={row.tokenPrefix} className="font-mono">
                    {row.inviteCode} · {row.claimUrl}
                  </div>
                ))}
                {generatedPreview.length > 20 && (
                  <p className="mt-2 text-stone-500">
                    +{generatedPreview.length - 20} more in CSV
                  </p>
                )}
              </div>
            </div>
          )}
        </section>

        <section className="mt-10">
          <h2 className="text-lg font-semibold text-stone-900">Usage</h2>
          <ul className="mt-3 space-y-1 text-sm text-stone-700">
            <li>Returned another day: {partner.returnedUsers}</li>
            <li>Active after 7+ days: {partner.activeAfter7Days}</li>
            <li>
              Avg questions / activated:{" "}
              {partner.avgQuestionsPerActivated != null
                ? partner.avgQuestionsPerActivated.toFixed(1)
                : "—"}
            </li>
            <li>Calibrations completed: {partner.calibrationsCompleted}</li>
            <li>Past-paper sessions: {partner.pastPaperSessions}</li>
            <li>
              Invite status: unused {partner.invitesUnused}, expired{" "}
              {partner.invitesExpired}, revoked {partner.invitesRevoked}
            </li>
          </ul>
        </section>

        <section className="mt-10">
          <h2 className="text-lg font-semibold text-stone-900">Batches</h2>
          <div className="mt-3 space-y-2">
            {partner.batches.map((b) => (
              <div
                key={b.batchId}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-stone-50 px-3 py-2 text-sm"
              >
                <div>
                  <div className="font-medium text-stone-900">
                    {b.label || "Untitled batch"}
                  </div>
                  <div className="text-xs text-stone-500">
                    {b.redeemed}/{b.total} redeemed · {b.unused} unused ·{" "}
                    {b.createdAt.slice(0, 10)}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => revokeBatch(b.batchId)}
                  className="rounded-lg bg-stone-200 px-3 py-1.5 text-xs"
                >
                  Revoke unused
                </button>
              </div>
            ))}
            {partner.batches.length === 0 && (
              <p className="text-sm text-stone-500">No batches yet.</p>
            )}
          </div>
        </section>

        <section className="mt-10">
          <h2 className="text-lg font-semibold text-stone-900">
            Invites (prefix only)
          </h2>
          <div className="mt-3 max-h-72 overflow-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-stone-500">
                <tr>
                  <th className="py-1 pr-2">Prefix</th>
                  <th className="py-1 pr-2">Status</th>
                  <th className="py-1 pr-2">Created</th>
                  <th className="py-1 pr-2">Expiry</th>
                  <th className="py-1 pr-2">Redeemed</th>
                  <th className="py-1 pr-2" />
                </tr>
              </thead>
              <tbody>
                {partner.invites.map((i) => (
                  <tr key={i.id} className="border-t border-stone-100">
                    <td className="py-1.5 pr-2 font-mono">
                      {i.tokenPrefix ?? "—"}
                    </td>
                    <td className="py-1.5 pr-2">{i.status}</td>
                    <td className="py-1.5 pr-2">{i.createdAt.slice(0, 10)}</td>
                    <td className="py-1.5 pr-2">{i.expiresAt.slice(0, 10)}</td>
                    <td className="py-1.5 pr-2">
                      {i.redeemedAt?.slice(0, 10) ?? "—"}
                    </td>
                    <td className="py-1.5 pr-2">
                      {i.status === "unused" && (
                        <button
                          type="button"
                          onClick={() => revokeOne(i.id)}
                          className="text-stone-500 underline-offset-2 hover:underline"
                        >
                          Revoke
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-10 mb-16">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-stone-900">Feedback</h2>
            {partner.feedbackCount > 0 && (
              <button
                type="button"
                onClick={exportFeedbackCsv}
                className="rounded-lg bg-stone-200 px-3 py-1.5 text-sm"
              >
                Export CSV
              </button>
            )}
          </div>
          <ul className="mt-3 space-y-1 text-sm text-stone-700">
            <li>Responses: {partner.feedbackCount}</li>
            <li>
              Avg usefulness:{" "}
              {partner.avgUsefulness != null
                ? partner.avgUsefulness.toFixed(2)
                : "—"}
            </li>
            <li>
              Avg recommendation (0–10):{" "}
              {partner.avgRecommendation != null
                ? partner.avgRecommendation.toFixed(2)
                : "—"}
            </li>
          </ul>
          <div className="mt-3 text-sm text-stone-600">
            {Object.entries(partner.featureBreakdown).map(([k, v]) => (
              <div key={k}>
                {k}: {v}
              </div>
            ))}
          </div>
          <div className="mt-4 space-y-3">
            {partner.feedbackRows.map((f) => (
              <div key={f.id} className="rounded-lg bg-stone-50 px-3 py-2 text-sm">
                <div className="text-stone-800">
                  Usefulness {f.usefulnessRating}/5 · Recommend{" "}
                  {f.recommendationRating ?? "—"}/10 · {f.mostUsefulFeature}
                </div>
                {f.improvementFeedback && (
                  <p className="mt-1 whitespace-pre-wrap text-stone-600">
                    {f.improvementFeedback}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      </Container>
    </main>
  );
}
