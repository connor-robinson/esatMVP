"""Fix nsaa-2494 diagram: place A at the tangent-circle contact point."""

from __future__ import annotations

import json
import math
import os
import re
from datetime import datetime, timezone
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
from dotenv import load_dotenv
from matplotlib.patches import Arc, Circle
from supabase import create_client

REPO_ROOT = Path(__file__).resolve().parents[3]
load_dotenv(REPO_ROOT / ".env.local")

QUESTION_ID = "ac05fda8-8630-40af-b5bb-289fd7c3e8b5"
GENERATION_ID = "nsaa-2494"
STROKE = "#1a1a1a"


def _equal_tick(ax, p1, p2, length: float = 0.18) -> None:
    mid = 0.5 * (p1 + p2)
    d = p2 - p1
    n = np.array([-d[1], d[0]], dtype=float)
    n /= np.linalg.norm(n)
    a = mid - n * length
    b = mid + n * length
    ax.plot([a[0], b[0]], [a[1], b[1]], color=STROKE, lw=1.6, solid_capstyle="butt")


def _angle_arc(ax, vertex, p1, p2, radius: float) -> None:
    a1 = math.degrees(math.atan2(p1[1] - vertex[1], p1[0] - vertex[0]))
    a2 = math.degrees(math.atan2(p2[1] - vertex[1], p2[0] - vertex[0]))
    # Draw the minor arc from a1 to a2
    def norm(a: float) -> float:
        while a < 0:
            a += 360
        while a >= 360:
            a -= 360
        return a

    a1n, a2n = norm(a1), norm(a2)
    diff = (a2n - a1n) % 360
    if diff > 180:
        a1n, a2n = a2n, a1n
        diff = (a2n - a1n) % 360
    ax.add_patch(
        Arc(
            (vertex[0], vertex[1]),
            2 * radius,
            2 * radius,
            angle=0,
            theta1=a1n,
            theta2=a1n + diff,
            color=STROKE,
            lw=1.4,
        )
    )


def render_png(out_png: Path) -> None:
    A_u = np.array([0.0, -1.0])
    B_u = np.array([0.76604444, 0.64278761])
    C_u = np.array([-0.98480775, 0.17364818])
    O_u = np.array([0.0, 0.0])

    cx, cy, radius = 0.0, 0.15, 1.0
    O = O_u * radius + np.array([cx, cy])
    A = A_u * radius + np.array([cx, cy])
    B = B_u * radius + np.array([cx, cy])
    C = C_u * radius + np.array([cx, cy])

    fig, ax = plt.subplots(figsize=(5.2, 5.0), facecolor="white")
    ax.set_aspect("equal")
    ax.axis("off")

    ax.add_patch(Circle((O[0], O[1]), radius, fill=False, edgecolor=STROKE, lw=1.8))

    # Tangent XY
    ax.plot([-1.85, 1.85], [A[1], A[1]], color=STROKE, lw=1.8)

    # Segments
    for p, q in ((O, A), (O, C), (A, B), (B, C), (C, A)):
        ax.plot([p[0], q[0]], [p[1], q[1]], color=STROKE, lw=1.6)

    for p in (O, A, B, C):
        ax.plot(p[0], p[1], "o", color=STROKE, markersize=4.5)

    _equal_tick(ax, A, B)
    _equal_tick(ax, B, C)

    y_ref = A + np.array([1.0, 0.0])
    _angle_arc(ax, A, y_ref, B, 0.38)
    _angle_arc(ax, C, O, A, 0.28)

    # Labels — A at the contact point (below the tangent)
    ax.text(O[0] + 0.12, O[1] + 0.08, "O", fontsize=13, fontweight="medium", color=STROKE)
    ax.text(A[0] - 0.02, A[1] - 0.18, "A", fontsize=13, fontweight="medium", color=STROKE, ha="center", va="top")
    ax.text(B[0] + 0.08, B[1] + 0.06, "B", fontsize=13, fontweight="medium", color=STROKE)
    ax.text(C[0] - 0.16, C[1] + 0.02, "C", fontsize=13, fontweight="medium", color=STROKE, ha="right")
    ax.text(-1.75, A[1] - 0.16, "X", fontsize=13, fontweight="medium", color=STROKE, ha="center", va="top")
    ax.text(1.75, A[1] - 0.16, "Y", fontsize=13, fontweight="medium", color=STROKE, ha="center", va="top")

    # 65° near angle YAB
    ax.text(A[0] + 0.52, A[1] + 0.14, r"$65^\circ$", fontsize=12, color=STROKE, ha="left", va="bottom")

    ax.text(
        0.0,
        -1.55,
        "Diagram not to scale",
        fontsize=10,
        style="italic",
        color="#444444",
        ha="center",
        va="top",
    )

    ax.set_xlim(-2.05, 2.05)
    ax.set_ylim(-1.75, 1.55)

    out_png.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(out_png, dpi=180, bbox_inches="tight", pad_inches=0.12, facecolor="white")
    plt.close(fig)


def main() -> None:
    out_dir = (
        Path(__file__).resolve().parents[1]
        / "visual_engine"
        / "artifacts"
        / "nsaa-2494-fix"
    )
    out_png = out_dir / "rendered.png"
    render_png(out_png)
    print(f"rendered {out_png}")

    url_env = (os.environ.get("SUPABASE_URL") or "").strip()
    key_env = (os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or "").strip()
    if not url_env or not key_env:
        raise SystemExit("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY")

    client = create_client(url_env, key_env)
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    key = f"nsaa_review/{GENERATION_ID}/rendered_fixed_{stamp}.png"
    png_bytes = out_png.read_bytes()
    client.storage.from_("question-images").upload(
        path=key,
        file=png_bytes,
        file_options={
            "content-type": "image/png",
            "upsert": "true",
            "cache-control": "public, max-age=3600",
        },
    )
    url = f"{url_env.rstrip('/')}/storage/v1/object/public/question-images/{key}"
    print(f"uploaded {url}")

    try:
        client.storage.from_("question-images").upload(
            path=f"nsaa_review/{GENERATION_ID}/rendered.png",
            file=png_bytes,
            file_options={
                "content-type": "image/png",
                "upsert": "true",
                "cache-control": "public, max-age=3600",
            },
        )
        print("also upserted rendered.png")
    except Exception as exc:  # noqa: BLE001
        print(f"upsert rendered.png failed: {exc}")

    row = (
        client.table("ai_generated_questions")
        .select("question_stem")
        .eq("id", QUESTION_ID)
        .single()
        .execute()
    )
    stem = row.data["question_stem"]
    fig = (
        '<figure class="qg-diagram" style="margin:1em 0;text-align:center;">'
        f'<img src="{url}" alt="Exam diagram" style="max-width:100%;height:auto;" />'
        "</figure>"
    )
    new_stem, n = re.subn(
        r'<figure\b[^>]*class\s*=\s*["\'][^"\']*qg-diagram[^"\']*["\'][^>]*>.*?</figure>',
        fig,
        stem,
        count=1,
        flags=re.IGNORECASE | re.DOTALL,
    )
    print(f"stem replacements: {n}")
    client.table("ai_generated_questions").update(
        {
            "question_stem": new_stem,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
    ).eq("id", QUESTION_ID).execute()
    print("db updated")

    try:
        tickets = (
            client.table("support_requests")
            .select("id,status,message,context")
            .eq("category", "question_or_content_error")
            .in_("status", ["open", "in_progress"])
            .execute()
        )
        matched: list[str] = []
        for ticket in tickets.data or []:
            ctx = ticket.get("context") or {}
            if isinstance(ctx, str):
                try:
                    ctx = json.loads(ctx)
                except json.JSONDecodeError:
                    ctx = {}
            if ctx.get("questionId") == QUESTION_ID:
                matched.append(str(ticket["id"]))
        print(f"matched tickets: {matched}")
        for tid in matched:
            client.table("support_requests").update({"status": "resolved"}).eq(
                "id", tid
            ).execute()
            print(f"resolved {tid}")
    except Exception as exc:  # noqa: BLE001
        print(f"ticket resolve skipped: {exc}")


if __name__ == "__main__":
    main()
