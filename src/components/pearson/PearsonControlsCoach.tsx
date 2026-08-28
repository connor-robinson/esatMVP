"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { VERIFIED_SHORTCUTS } from "@/lib/pearson/shortcuts";

const COACH_SEEN_KEY = "pearson.controls.coachCompleted.v1";

type Step = "intro" | "alt-n" | "zoom" | "clock" | "done";

export function PearsonControlsCoach() {
  const [step, setStep] = useState<Step>("intro");
  const [altNPressed, setAltNPressed] = useState(false);
  const [zoomPressed, setZoomPressed] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(COACH_SEEN_KEY) === "1") {
        setStep("done");
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (step !== "alt-n" && step !== "zoom") return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (step === "alt-n" && e.altKey && (e.key === "n" || e.key === "N")) {
        e.preventDefault();
        setAltNPressed(true);
      }
      if (
        step === "zoom" &&
        (e.ctrlKey || e.metaKey) &&
        (e.key === "+" || e.key === "=")
      ) {
        e.preventDefault();
        setZoomPressed(true);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [step]);

  const finish = useCallback(() => {
    try {
      localStorage.setItem(COACH_SEEN_KEY, "1");
    } catch {
      // ignore
    }
    setStep("done");
  }, []);

  if (step === "done") {
    return (
      <p style={{ margin: "24px 0 0", fontSize: 13 }}>
        <Link href="/past-papers/library" style={{ color: "#026bac" }}>
          Continue to past papers
        </Link>
        {" · "}
        <button
          type="button"
          onClick={() => {
            setStep("intro");
            setAltNPressed(false);
            setZoomPressed(false);
          }}
          style={{
            background: "none",
            border: "none",
            color: "#026bac",
            cursor: "pointer",
            font: "inherit",
            padding: 0,
          }}
        >
          Replay lessons
        </button>
      </p>
    );
  }

  return (
    <div style={{ marginTop: 24 }}>
      {step === "intro" ? (
        <section style={{ fontSize: 14 }}>
          <p style={{ margin: "0 0 12px" }}>
            <strong>Lesson 1.</strong> Pearson uses keyboard shortcuts. When a
            button shows an underlined letter, you can press{" "}
            <strong>Alt + that letter</strong> instead of clicking.
          </p>
          <button
            type="button"
            onClick={() => setStep("alt-n")}
            style={btnStyle}
          >
            Next lesson
          </button>
          <button type="button" onClick={finish} style={skipStyle}>
            Skip all
          </button>
        </section>
      ) : null}

      {step === "alt-n" ? (
        <section style={{ fontSize: 14 }}>
          <p style={{ margin: "0 0 12px" }}>
            <strong>Lesson 2.</strong> Move forward without your mouse. Press{" "}
            <strong>Alt + N</strong> now.
          </p>
          {altNPressed ? (
            <p style={{ color: "#026bac", margin: "0 0 12px" }}>
              Good. That matches the underlined N on the real Next button.
            </p>
          ) : (
            <p style={{ color: "#666", margin: "0 0 12px" }}>
              Waiting for Alt + N…
            </p>
          )}
          <button
            type="button"
            disabled={!altNPressed}
            onClick={() => {
              setZoomPressed(false);
              setStep("zoom");
            }}
            style={btnStyle}
          >
            Next lesson
          </button>
        </section>
      ) : null}

      {step === "zoom" ? (
        <section style={{ fontSize: 14 }}>
          <p style={{ margin: "0 0 12px" }}>
            <strong>Lesson 3.</strong> Magnification (verified on Pearson
            platform). Press <strong>Ctrl +</strong> (or Cmd + on Mac) now.
          </p>
          {zoomPressed ? (
            <p style={{ color: "#026bac", margin: "0 0 12px" }}>
              Good. Ctrl - zooms back out in the real player (100% to 200%).
            </p>
          ) : (
            <p style={{ color: "#666", margin: "0 0 12px" }}>
              Waiting for Ctrl + …
            </p>
          )}
          <button
            type="button"
            disabled={!zoomPressed}
            onClick={() => setStep("clock")}
            style={btnStyle}
          >
            Next lesson
          </button>
        </section>
      ) : null}

      {step === "clock" ? (
        <section style={{ fontSize: 14 }}>
          <p style={{ margin: "0 0 12px" }}>
            <strong>Lesson 4.</strong> Click the clock icon in the upper-right
            during a module to hide or show the countdown. Time keeps running
            either way.
          </p>
          <button type="button" onClick={finish} style={btnStyle}>
            Finish
          </button>
        </section>
      ) : null}

      <p style={{ margin: "20px 0 0", fontSize: 13, color: "#444" }}>
        Verified shortcuts only:{" "}
        {VERIFIED_SHORTCUTS.map((s) => s.chord).join(", ")}. Others are disabled
        in strict simulation.
      </p>
    </div>
  );
}

const btnStyle: CSSProperties = {
  background: "#026bac",
  color: "#fff",
  border: "none",
  padding: "8px 16px",
  font: "inherit",
  cursor: "pointer",
  marginRight: 8,
};

const skipStyle: CSSProperties = {
  background: "transparent",
  color: "#026bac",
  border: "none",
  padding: "8px 0",
  font: "inherit",
  cursor: "pointer",
};
