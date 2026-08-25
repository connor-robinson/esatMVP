import React from "react";
import { Arrow, DoubleArrow } from "./_svg";

export default function DiagramB22() {
  return (
    <svg
      viewBox="0 0 480 220"
      className="h-auto w-full max-w-md"
      role="img"
      aria-label="A person standing 2.0 m initially from a plane mirror. The person walks 0.75 m towards the mirror, while the mirror moves 0.25 m towards the person."
      fill="none"
      stroke="currentColor"
    >
      {/* Stick figure */}
      <circle cx="100" cy="55" r="12" strokeWidth={2} />
      <line x1="100" y1="67" x2="100" y2="120" strokeWidth={2} />
      <line x1="100" y1="85" x2="75" y2="105" strokeWidth={2} />
      <line x1="100" y1="85" x2="125" y2="105" strokeWidth={2} />
      <line x1="100" y1="120" x2="80" y2="155" strokeWidth={2} />
      <line x1="100" y1="120" x2="120" y2="155" strokeWidth={2} />

      {/* Person's movement arrow: 0.75 m right */}
      <Arrow x1={140} y1={30} x2={200} y2={30} strokeWidth={2} />
      <text x="170" y="22" textAnchor="middle" fontSize="12" fill="currentColor" stroke="none" fontFamily="sans-serif">
        0.75 m
      </text>

      {/* Plane mirror (thick vertical bar) */}
      <rect x="360" y="40" width="10" height="130" fill="currentColor" stroke="none" />
      <text x="365" y="30" textAnchor="middle" fontSize="13" fontWeight="bold" fill="currentColor" stroke="none" fontFamily="sans-serif">
        plane mirror
      </text>

      {/* Mirror movement arrow: 0.25 m left */}
      <Arrow x1={345} y1={42} x2={305} y2={42} strokeWidth={2} />
      <text x="325" y="55" textAnchor="middle" fontSize="12" fill="currentColor" stroke="none" fontFamily="sans-serif">
        0.25 m
      </text>

      {/* 2.0 m initially dimension */}
      <DoubleArrow x1={100} y1={185} x2={365} y2={185} strokeWidth={1.5} />
      <text x="230" y="205" textAnchor="middle" fontSize="13" fill="currentColor" stroke="none" fontFamily="sans-serif" fontStyle="italic">
        2.0 m initially
      </text>
    </svg>
  );
}
