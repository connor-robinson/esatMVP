"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Container } from "@/components/layout/Container";
import type { PartnerListStats } from "@/lib/partners/adminStats";

function pct(n: number | null): string {
  if (n == null) return "—";
  return `${Math.round(n * 100)}%`;
}

function formatDate(iso: string): string {
  return iso.slice(0, 10);
}

export default function AdminPartnersPage() {
  const [forbidden, setForbidden] = useState(false);
  const [loading, setLoading] = useState(true);
  const [partners, setPartners] = useState<PartnerListStats[]>([]);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    slug: "",
    name: "",
    displayName: "",
    accessEndsAt: "2027-01-10",
  });

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/partners", { cache: "no-store" });
    if (res.status === 403 || res.status === 401) {
      setForbidden(true);
      setLoading(false);
      return;
    }
    const data = await res.json();
    setPartners(data.partners ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function createPartner() {
    setCreating(true);
    const res = await fetch("/api/admin/partners", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "create",
        slug: form.slug,
        name: form.name,
        displayName: form.displayName || form.name,
        accessEndsAt: form.accessEndsAt,
      }),
    });
    setCreating(false);
    if (!res.ok) {
      const data = await res.json();
      window.alert(data.error || "Failed to create partner");
      return;
    }
    setForm({ slug: "", name: "", displayName: "", accessEndsAt: "2027-01-10" });
    await load();
  }

  if (forbidden) {
    return (
      <main className="py-16">
        <Container size="md">
          <p className="text-stone-600">You do not have admin access.</p>
        </Container>
      </main>
    );
  }

  return (
    <main className="py-10">
      <Container size="lg">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-stone-900">Partners</h1>
            <p className="mt-1 text-sm text-stone-500">
              Institution and programme complimentary access
            </p>
          </div>
          <Link
            href="/admin/founding-tester"
            className="text-sm text-stone-500 underline-offset-2 hover:underline"
          >
            Founding tester
          </Link>
        </div>

        {loading ? (
          <p className="mt-8 text-stone-500">Loading…</p>
        ) : (
          <div className="mt-8 overflow-x-auto">
            <table className="w-full min-w-[800px] text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-stone-500">
                <tr>
                  <th className="py-2 pr-3 font-medium">Institution</th>
                  <th className="py-2 pr-3 font-medium">Status</th>
                  <th className="py-2 pr-3 font-medium">Access end</th>
                  <th className="py-2 pr-3 font-medium">Invites</th>
                  <th className="py-2 pr-3 font-medium">Redeemed</th>
                  <th className="py-2 pr-3 font-medium">Active</th>
                  <th className="py-2 pr-3 font-medium">Activated</th>
                  <th className="py-2 pr-3 font-medium">Questions</th>
                </tr>
              </thead>
              <tbody>
                {partners.map((p) => (
                  <tr key={p.id} className="border-t border-stone-100">
                    <td className="py-3 pr-3">
                      <Link
                        href={`/admin/partners/${p.id}`}
                        className="font-medium text-stone-900 underline-offset-2 hover:underline"
                      >
                        {p.name}
                      </Link>
                      <div className="text-xs text-stone-400">{p.slug}</div>
                    </td>
                    <td className="py-3 pr-3">{p.status}</td>
                    <td className="py-3 pr-3">{formatDate(p.accessEndsAt)}</td>
                    <td className="py-3 pr-3">{p.invitesGenerated}</td>
                    <td className="py-3 pr-3">
                      {p.invitesRedeemed}
                      {p.invitesGenerated > 0
                        ? ` (${pct(p.invitesRedeemed / p.invitesGenerated)})`
                        : ""}
                    </td>
                    <td className="py-3 pr-3">{p.activeEntitledUsers}</td>
                    <td className="py-3 pr-3">
                      {p.activatedUsers}
                      {p.activationRate != null ? ` (${pct(p.activationRate)})` : ""}
                    </td>
                    <td className="py-3 pr-3">
                      {p.totalQuestions.toLocaleString()}
                    </td>
                  </tr>
                ))}
                {partners.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-8 text-stone-500">
                      No partners yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        <section className="mt-12 max-w-lg">
          <h2 className="text-lg font-semibold text-stone-900">Create partner</h2>
          <div className="mt-4 space-y-3">
            <input
              className="w-full rounded-lg bg-stone-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400"
              placeholder="Slug (e.g. arkwright-2026)"
              value={form.slug}
              onChange={(e) => setForm({ ...form, slug: e.target.value })}
            />
            <input
              className="w-full rounded-lg bg-stone-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400"
              placeholder="Name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <input
              className="w-full rounded-lg bg-stone-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400"
              placeholder="Display name (optional)"
              value={form.displayName}
              onChange={(e) =>
                setForm({ ...form, displayName: e.target.value })
              }
            />
            <label className="block text-sm text-stone-600">
              Access ends
              <input
                type="date"
                className="mt-1 w-full rounded-lg bg-stone-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400"
                value={form.accessEndsAt}
                onChange={(e) =>
                  setForm({ ...form, accessEndsAt: e.target.value })
                }
              />
            </label>
            <button
              type="button"
              disabled={creating}
              onClick={createPartner}
              className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              {creating ? "Creating…" : "Create partner"}
            </button>
          </div>
        </section>
      </Container>
    </main>
  );
}
