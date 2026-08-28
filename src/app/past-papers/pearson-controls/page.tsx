import Link from "next/link";
import { PearsonControlsCoach } from "@/components/pearson/PearsonControlsCoach";

export const metadata = {
  title: "Pearson / ESAT controls | Past papers",
  description:
    "Get familiar with the real ESAT controls: verified Pearson VUE shortcuts only.",
};

export default function PearsonControlsPage() {
  return (
    <main
      style={{
        maxWidth: 640,
        margin: "0 auto",
        padding: "32px 20px 64px",
        fontFamily: 'Tahoma, "Segoe UI", Arial, sans-serif',
        color: "#111",
        lineHeight: 1.45,
      }}
    >
      <p style={{ margin: "0 0 16px", fontSize: 13 }}>
        <Link href="/past-papers/library" style={{ color: "#026bac" }}>
          Back to library
        </Link>
      </p>

      <h1 style={{ fontSize: 22, margin: "0 0 8px", fontWeight: 700 }}>
        Get familiar with the real ESAT controls
      </h1>
      <p style={{ margin: "0 0 8px", fontSize: 14 }}>
        Real ESAT interface simulation. Short, skippable lessons using only
        controls verified against Pearson Platform Navigation Guides.
      </p>
      <p style={{ margin: "0 0 16px", fontSize: 13, color: "#555" }}>
        Conversion Studio reviewed past papers open in this player in strict
        simulation mode.
      </p>

      <PearsonControlsCoach />
    </main>
  );
}
