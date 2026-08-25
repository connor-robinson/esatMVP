import React from "react";
import { Arrow, DoubleArrow } from "./_svg";

export default function DiagramB4() {
  return (
    <svg
      viewBox="0 0 540 200"
      className="h-auto w-full max-w-lg"
      role="img"
      aria-label="A cyclist travelling at 10 m s^-1 towards a wall 175 m away. Sound travels from cyclist to wall."
      fill="none"
      stroke="currentColor"
    >
      {/* Ground line */}
      <line x1="30" y1="140" x2="510" y2="140" strokeWidth={2} />

      {/* Cyclist stick figure (simplified bicycle) */}
      <circle cx="95" cy="125" r="15" strokeWidth={1.5} />
      <circle cx="135" cy="125" r="15" strokeWidth={1.5} />
      <line x1="95" y1="110" x2="115" y2="80" strokeWidth={2} />
      <line x1="135" y1="110" x2="115" y2="80" strokeWidth={2} />
      <line x1="115" y1="80" x2="115" y2="65" strokeWidth={2} />
      <circle cx="115" cy="58" r="7" strokeWidth={1.5} />

      <text x="80" y="95" fontSize="13" fontWeight="bold" fill="currentColor" stroke="none" fontFamily="sans-serif">
        cyclist
      </text>

      {/* Wall */}
      <rect x="475" y="50" width="12" height="90" fill="currentColor" stroke="none" />
      <text x="480" y="45" textAnchor="middle" fontSize="14" fontWeight="bold" fill="currentColor" stroke="none" fontFamily="sans-serif">
        wall
      </text>

      {/* Sound arrow (top, solid thick) */}
      <Arrow x1={200} y1={35} x2={470} y2={35} strokeWidth={2.5} />
      <text x="335" y="28" textAnchor="middle" fontSize="13" fill="currentColor" stroke="none" fontFamily="sans-serif">
        sound
      </text>

      {/* Cyclist velocity arrow */}
      <Arrow x1={170} y1={95} x2={280} y2={95} strokeWidth={2} />
      <text x="220" y="85" textAnchor="middle" fontSize="13" fill="currentColor" stroke="none" fontFamily="sans-serif">
        {"10 m s\u207B\u00B9"}
      </text>

      {/* 175 m dimension */}
      <DoubleArrow x1={115} y1={170} x2={480} y2={170} strokeWidth={1.5} />
      <text x="300" y="188" textAnchor="middle" fontSize="13" fill="currentColor" stroke="none" fontFamily="sans-serif">
        175 m
      </text>
    </svg>
  );
}
