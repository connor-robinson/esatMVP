"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Container } from "@/components/layout/Container";
import {
  MOCK_BUILDER_SUBJECTS,
  type MockBlueprintConfig,
  type MockBuilderSubject,
} from "@/lib/mockBuilder/types";

export default function AdminMockBlueprintsPage() {
  const [forbidden, setForbidden] = useState(false);
  const [subject, setSubject] = useState<MockBuilderSubject>("Math 1");
  const [config, setConfig] = useState<MockBlueprintConfig | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/mock-builder/blueprints", {
      cache: "no-store",
    });
    if (res.status === 401 || res.status === 403) {
      setForbidden(true);
      return;
    }
    const data = await res.json();
    setConfig(data.defaults?.[subject] ?? null);
  }, [subject]);

  useEffect(() => {
    load();
  }, [load]);

  async function save() {
    if (!config) return;
    setSaving(true);
    setMessage(null);
    const res = await fetch("/api/admin/mock-builder/blueprints", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject, config }),
    });
    setSaving(false);
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error || "Save failed");
      return;
    }
    setMessage("Saved default blueprint for " + subject);
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
      <Container size="md">
        <Link href="/admin/mock-builder" className="text-sm text-stone-600 underline">
          ← Mock builder
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">Blueprint settings</h1>
        <p className="mt-1 text-sm text-stone-600">
          Soft targets for paper assembly. Advanced JSON editor for full control.
        </p>

        <label className="mt-6 block text-sm">
          Subject
          <select
            className="mt-1 block rounded border border-stone-300 px-2 py-1.5"
            value={subject}
            onChange={(e) => setSubject(e.target.value as MockBuilderSubject)}
          >
            {MOCK_BUILDER_SUBJECTS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>

        {config && (
          <>
            <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <label>
                Questions
                <input
                  type="number"
                  className="mt-1 w-full rounded border px-2 py-1"
                  value={config.questionCount}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      questionCount: Number(e.target.value),
                    })
                  }
                />
              </label>
              <label>
                Duration (minutes)
                <input
                  type="number"
                  className="mt-1 w-full rounded border px-2 py-1"
                  value={config.timeLimitMinutes}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      timeLimitMinutes: Number(e.target.value),
                    })
                  }
                />
              </label>
              <label>
                Timing ideal (sec)
                <input
                  type="number"
                  className="mt-1 w-full rounded border px-2 py-1"
                  value={config.estimatedTimingSeconds.ideal}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      estimatedTimingSeconds: {
                        ...config.estimatedTimingSeconds,
                        ideal: Number(e.target.value),
                      },
                    })
                  }
                />
              </label>
              <label>
                Max repeated reasoning type
                <input
                  type="number"
                  className="mt-1 w-full rounded border px-2 py-1"
                  value={config.maxRepeatedReasoningType}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      maxRepeatedReasoningType: Number(e.target.value),
                    })
                  }
                />
              </label>
              <label>
                Answer max per letter
                <input
                  type="number"
                  className="mt-1 w-full rounded border px-2 py-1"
                  value={config.answerDistributionTolerance.hardMaxPerLetter}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      answerDistributionTolerance: {
                        ...config.answerDistributionTolerance,
                        hardMaxPerLetter: Number(e.target.value),
                      },
                    })
                  }
                />
              </label>
            </div>

            <label className="mt-4 block text-sm">
              Full config (JSON)
              <textarea
                className="mt-1 h-64 w-full rounded border border-stone-300 p-2 font-mono text-xs"
                value={JSON.stringify(config, null, 2)}
                onChange={(e) => {
                  try {
                    setConfig(JSON.parse(e.target.value));
                  } catch {
                    // keep typing
                  }
                }}
              />
            </label>

            <button
              type="button"
              disabled={saving}
              onClick={save}
              className="mt-4 rounded bg-stone-900 px-4 py-2 text-sm text-white"
            >
              {saving ? "Saving…" : "Save default"}
            </button>
            {message && <p className="mt-2 text-sm text-stone-600">{message}</p>}
          </>
        )}
      </Container>
    </main>
  );
}
