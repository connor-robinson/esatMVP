"""Diagram crop and Supabase upload."""

from __future__ import annotations

import io
import math
import re
import uuid
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
from PIL import Image

from .config import (
    DIAGRAM_BBOX_PAD_X,
    DIAGRAM_BBOX_PAD_Y,
    DIAGRAM_EDGE_EXPAND_STEP,
    DIAGRAM_EDGE_INK_THRESHOLD,
    DIAGRAM_MAX_EDGE_EXPANSIONS,
    STORAGE_BUCKET,
    STORAGE_PREFIX,
    supabase_service_key,
    supabase_url,
)

try:
    from supabase import create_client
except ImportError:
    create_client = None  # type: ignore


def _valid_bbox_norm(bbox_norm: List[float]) -> bool:
    return (
        isinstance(bbox_norm, list)
        and len(bbox_norm) == 4
        and all(isinstance(v, (int, float)) and math.isfinite(float(v)) for v in bbox_norm)
        and float(bbox_norm[2]) > 0
        and float(bbox_norm[3]) > 0
    )


def expand_bbox_norm(bbox_norm: List[float]) -> List[float]:
    """Add margin so diagram labels/lines are not clipped at crop edges."""
    if not _valid_bbox_norm(bbox_norm):
        return bbox_norm
    x, y, w, h = [float(v) for v in bbox_norm]
    x = min(1.0, max(0.0, x))
    y = min(1.0, max(0.0, y))
    w = min(1.0 - x, w)
    h = min(1.0 - y, h)
    x = max(0.0, x - DIAGRAM_BBOX_PAD_X)
    y = max(0.0, y - DIAGRAM_BBOX_PAD_Y)
    w = min(1.0 - x, w + 2 * DIAGRAM_BBOX_PAD_X)
    h = min(1.0 - y, h + 2 * DIAGRAM_BBOX_PAD_Y)
    return [x, y, w, h]


def _bbox_to_pixels(bbox: List[float], width: int, height: int) -> List[int]:
    x, y, w, h = bbox
    return [
        max(0, int(math.floor(x * width))),
        max(0, int(math.floor(y * height))),
        min(width, int(math.ceil((x + w) * width))),
        min(height, int(math.ceil((y + h) * height))),
    ]


def _pixels_to_bbox(box: List[int], width: int, height: int) -> List[float]:
    left, top, right, bottom = box
    return [
        left / width,
        top / height,
        (right - left) / width,
        (bottom - top) / height,
    ]


def _xyxy_to_xywh(bbox: List[float]) -> List[float]:
    x1, y1, x2, y2 = [float(v) for v in bbox]
    return [x1, y1, max(0.0, x2 - x1), max(0.0, y2 - y1)]


def _collection_uses_xyxy(items: List[Dict[str, Any]]) -> bool:
    """Detect Vertex occasionally returning corners despite an xywh prompt."""
    boxes = [item.get("bbox_norm") for item in items if isinstance(item, dict)]
    valid = [box for box in boxes if _valid_bbox_norm(box)]
    return bool(valid) and any(
        float(box[0]) + float(box[2]) > 1.001
        or float(box[1]) + float(box[3]) > 1.001
        for box in valid
    )


def _graphical_grid_boxes(
    items: List[Dict[str, Any]], *, xyxy: bool
) -> Dict[str, List[float]]:
    """Turn approximate option boxes into non-overlapping grid-cell crops."""
    normalized: List[Tuple[str, List[float]]] = []
    for item in items:
        if not isinstance(item, dict):
            continue
        letter = str(item.get("letter") or "").strip().upper()
        box = item.get("bbox_norm")
        if not letter or not _valid_bbox_norm(box):
            continue
        next_box = _xyxy_to_xywh(box) if xyxy else [float(v) for v in box]
        normalized.append((letter, next_box))

    if len(normalized) < 2:
        return {letter: box for letter, box in normalized}

    xs = sorted({round(box[0], 3) for _, box in normalized})
    ys = sorted({round(box[1], 3) for _, box in normalized})
    grid_like = len(xs) <= 3 and len(ys) <= max(4, len(normalized))
    if not grid_like:
        out: Dict[str, List[float]] = {}
        for letter, (x, y, w, h) in normalized:
            left = max(0.0, x - 0.01)
            top = max(0.0, y - 0.04)
            right = min(1.0, x + w + 0.01)
            bottom = min(1.0, y + h + 0.06)
            out[letter] = [left, top, right - left, bottom - top]
        return out

    # Use the left column's reported content width for internal boundaries: a
    # graph origin is normally its y-axis, so the midpoint between origins can
    # cut straight through the left graph. Do not trust the final column width,
    # however: Vertex sometimes reports only its y-axis. The final column is
    # therefore extended to the page edge below.
    x_widths = {
        x_value: max(
            box[2] for _, box in normalized if abs(box[0] - x_value) < 0.03
        )
        for x_value in xs
    }
    x_boundaries = [
        (xs[index] + x_widths[xs[index]] + xs[index + 1]) / 2
        for index in range(len(xs) - 1)
    ]
    y_boundaries = [
        (ys[index] + ys[index + 1]) / 2 for index in range(len(ys) - 1)
    ]

    out: Dict[str, List[float]] = {}
    for letter, (x, y, w, h) in normalized:
        x_index = min(range(len(xs)), key=lambda index: abs(xs[index] - x))
        y_index = min(range(len(ys)), key=lambda index: abs(ys[index] - y))
        # Vertex often starts a box at the y-axis even when a horizontal axis
        # label (for example "velocity") extends materially to its left.  A
        # midpoint-only cell boundary clipped those labels in middle/right
        # columns.  Controlled overlap is preferable to losing printed ink;
        # adjacent answer diagrams remain independently addressable assets.
        left = max(0.0, x - 0.10)
        right = 1.0 if x_index == len(xs) - 1 else x_boundaries[x_index]
        # Anchor every crop at its own option label. A boundary inherited from
        # the preceding row can make C/D mostly contain A/B and then truncate
        # the intended graph at the bottom.
        top = max(0.0, y - 0.05)
        bottom = 1.0 if y_index == len(ys) - 1 else y_boundaries[y_index]
        # Vertex consistently places the bottom edge near the graph baseline.
        # Preserve the full falling/rising segment and lower axis labels even
        # when that means retaining whitespace or the next row's letter.
        # Graph labels mark the row origin, not its vertical extent. A generous
        # overlap into the following row is intentional: each asset may contain
        # a sliver of its neighbour, but its own axes/curve must be complete.
        bottom = min(1.0, bottom + 0.18)
        out[letter] = [left, top, max(0.0, right - left), max(0.0, bottom - top)]
    return out


def _edge_ink_ratios(image: Image.Image, box: List[int]) -> Dict[str, float]:
    """Measure dark ink in narrow bands at each crop edge."""
    left, top, right, bottom = box
    crop = image.crop((left, top, right, bottom)).convert("L")
    arr = np.asarray(crop, dtype=np.uint8)
    if arr.size == 0:
        return {side: 1.0 for side in ("left", "top", "right", "bottom")}

    # Adaptive threshold handles both white scans and slightly grey screenshots.
    background = float(np.percentile(arr, 90))
    ink = arr < min(220.0, background - 22.0)
    band = max(2, min(8, int(round(min(arr.shape) * 0.012))))
    return {
        "left": float(ink[:, :band].mean()),
        "top": float(ink[:band, :].mean()),
        "right": float(ink[:, -band:].mean()),
        "bottom": float(ink[-band:, :].mean()),
    }


def _trim_vertical_at_whitespace(
    image: Image.Image,
    box: List[int],
    core_box: List[int],
    *,
    preserve_all_core_components: bool = True,
) -> Tuple[List[int], Dict[str, Any]]:
    """Remove nearby prose separated from the diagram by a clear horizontal gap."""
    left, top, right, bottom = box
    crop = image.crop((left, top, right, bottom)).convert("L")
    arr = np.asarray(crop, dtype=np.uint8)
    if arr.size == 0:
        return box, {"vertical_trim_applied": False}

    background = float(np.percentile(arr, 90))
    ink = arr < min(220.0, background - 22.0)
    # Ignore isolated scan noise, while retaining thin graph and circuit lines.
    row_active = ink.sum(axis=1) >= max(2, int(round(arr.shape[1] * 0.0015)))
    active_rows = np.flatnonzero(row_active)
    if active_rows.size == 0:
        return box, {"vertical_trim_applied": False}

    # Bridge small gaps inside a diagram (for example between an axis and label),
    # but preserve the larger whitespace band between a diagram and body prose.
    bridge_radius = (
        max(5, min(10, int(round(image.height * 0.005))))
        if not preserve_all_core_components
        else max(8, min(20, int(round(image.height * 0.012))))
    )
    kernel = np.ones(bridge_radius * 2 + 1, dtype=np.int16)
    bridged = np.convolve(row_active.astype(np.int16), kernel, mode="same") > 0

    # Preserve every vertical ink component inside the model's raw diagram
    # box.  Selecting only the component nearest its centre silently dropped
    # lower panels such as "Graph 2" when a clear gap separated it from
    # "Graph 1".
    core_top = max(0, core_box[1] - top)
    core_bottom = min(len(bridged) - 1, core_box[3] - top)
    core_active = active_rows[(active_rows >= core_top) & (active_rows <= core_bottom)]
    if core_active.size and not preserve_all_core_components:
        target = int(round((core_top + core_bottom) / 2))
        core_active = np.asarray(
            [int(core_active[np.argmin(np.abs(core_active - target))])]
        )
    if core_active.size == 0:
        target_global = int(round((core_box[1] + core_box[3]) / 2))
        target = min(len(bridged) - 1, max(0, target_global - top))
        core_active = np.asarray(
            [int(active_rows[np.argmin(np.abs(active_rows - target))])]
        )

    seg_top = int(core_active.min())
    while seg_top > 0 and bridged[seg_top - 1]:
        seg_top -= 1
    seg_bottom = int(core_active.max())
    while seg_bottom + 1 < len(bridged) and bridged[seg_bottom + 1]:
        seg_bottom += 1

    segment_ink = active_rows[(active_rows >= seg_top) & (active_rows <= seg_bottom)]
    if segment_ink.size == 0:
        return box, {"vertical_trim_applied": False}

    margin = max(12, int(round(image.height * 0.012)))
    new_top = max(top, top + int(segment_ink.min()) - margin)
    new_bottom = min(bottom, top + int(segment_ink.max()) + margin + 1)
    # Only trim meaningful whitespace/prose; avoid jittering already clean crops.
    if (new_top - top) + (bottom - new_bottom) < margin:
        return box, {"vertical_trim_applied": False}

    return [left, new_top, right, new_bottom], {
        "vertical_trim_applied": True,
        "vertical_trim_pixels": [new_top - top, bottom - new_bottom],
        "whitespace_bridge_radius": bridge_radius,
        "whitespace_margin": margin,
    }


def crop_diagram_with_diagnostics(
    image_bytes: bytes,
    bbox_norm: List[float],
    *,
    diagram_type: str = "other",
    has_graphical_options: bool = False,
) -> Tuple[Optional[bytes], Dict[str, Any]]:
    """Crop conservatively, expanding any edge that intersects diagram ink.

    A little adjacent prose is preferable to losing labels or a second row of
    graphical choices. In particular, tables and graphical answer options are
    often separated by large internal whitespace that must never be treated as
    the end of the visual.
    """
    diagnostics: Dict[str, Any] = {
        "bbox_norm_raw": bbox_norm,
        "bbox_valid": _valid_bbox_norm(bbox_norm),
        "edge_expansions": 0,
        "cutoff_risk": False,
    }
    if not diagnostics["bbox_valid"]:
        diagnostics["cutoff_risk"] = True
        return None, diagnostics

    image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    width, height = image.size
    expanded = expand_bbox_norm(bbox_norm)
    if diagram_type == "graphical_option_single":
        # Grid-aware preprocessing has already supplied safe cell boundaries.
        expanded = [float(v) for v in bbox_norm]
    elif diagram_type == "geometry":
        # Detached base/dimension labels regularly sit below Vertex's box.
        # Retain an extra lower margin; adjacent prose is safer than a missing
        # measurement that changes the mathematical question.
        expanded[3] = min(1.0 - expanded[1], expanded[3] + 0.06)
    box = _bbox_to_pixels(expanded, width, height)
    core_box = _bbox_to_pixels([float(v) for v in bbox_norm], width, height)

    conservative_mode = "standard"
    if has_graphical_options or diagram_type == "graphical_options":
        # The model commonly boxes only the first row of a multi-row answer
        # grid. Preserve every column and everything below the first visual.
        box = [0, box[1], width, height]
        conservative_mode = "graphical_options_to_page_bottom"
    elif diagram_type == "table":
        # Thin vertical table rules may not trip the generic edge-ink ratio.
        # Extending down guarantees that later rows are not silently omitted.
        box[3] = height
        conservative_mode = "table_to_page_bottom"
    elif diagram_type == "graphical_option_single":
        # Axes often legitimately meet a choice crop's padded edge. Generic
        # ink-driven expansion would grow into neighbouring choices.
        conservative_mode = "graphical_option_single"

    trim_diagnostics: Dict[str, Any] = {
        "vertical_trim_applied": False,
        "vertical_trim_disabled": True,
    }
    if diagram_type in {"graph", "scientific", "circuit", "stem_diagram_single"}:
        # A full-page recovery image can place stem prose and answer lines
        # inside the deliberately generous bbox padding.  Isolate the graph's
        # whitespace-separated ink component before edge expansion so prose
        # does not pull the crop down through the rest of the page.  Do not use
        # this for tables, geometry, or graphical-choice grids: their internal
        # whitespace can separate meaningful rows or disconnected shapes.
        box, trim_diagnostics = _trim_vertical_at_whitespace(
            image,
            box,
            core_box,
            preserve_all_core_components=diagram_type != "stem_diagram_single",
        )
        trim_diagnostics["vertical_trim_disabled"] = False

    diagnostics["conservative_mode"] = conservative_mode
    step_x = max(8, int(round(width * DIAGRAM_EDGE_EXPAND_STEP)))
    step_y = max(8, int(round(height * DIAGRAM_EDGE_EXPAND_STEP)))

    ratios: Dict[str, float] = {}
    risky: List[str] = []
    max_expansions = 0 if diagram_type == "graphical_option_single" else DIAGRAM_MAX_EDGE_EXPANSIONS
    for attempt in range(max_expansions + 1):
        ratios = _edge_ink_ratios(image, box)
        left, top, right, bottom = box
        risky = [
            side
            for side, ratio in ratios.items()
            if ratio > DIAGRAM_EDGE_INK_THRESHOLD
            and not (
                (side == "left" and left == 0)
                or (side == "top" and top == 0)
                or (side == "right" and right == width)
                or (side == "bottom" and bottom == height)
            )
        ]
        if not risky or attempt == max_expansions:
            break
        if "left" in risky:
            left = max(0, left - step_x)
        if "top" in risky:
            top = max(0, top - step_y)
        if "right" in risky:
            right = min(width, right + step_x)
        if "bottom" in risky:
            bottom = min(height, bottom + step_y)
        box = [left, top, right, bottom]
        diagnostics["edge_expansions"] = attempt + 1

    diagnostics.update(trim_diagnostics)
    ratios = _edge_ink_ratios(image, box)
    left, top, right, bottom = box
    risky = [
        side
        for side, ratio in ratios.items()
        if ratio > DIAGRAM_EDGE_INK_THRESHOLD
        and not (
            (side == "left" and left == 0)
            or (side == "top" and top == 0)
            or (side == "right" and right == width)
            or (side == "bottom" and bottom == height)
        )
    ]
    accepted_edge_ink: List[str] = []
    if diagram_type == "graphical_option_single":
        accepted_edge_ink = risky
        risky = []

    diagnostics.update(
        {
            "bbox_norm_padded": expanded,
            "bbox_norm_final": _pixels_to_bbox(box, width, height),
            "edge_ink_ratios": ratios,
            "risky_edges": risky,
            "accepted_edge_ink": accepted_edge_ink,
            "cutoff_risk": bool(risky),
            "source_size": [width, height],
            "crop_size": [box[2] - box[0], box[3] - box[1]],
        }
    )
    if box[2] <= box[0] or box[3] <= box[1]:
        diagnostics["cutoff_risk"] = True
        return None, diagnostics

    cropped = image.crop(tuple(box))
    buf = io.BytesIO()
    cropped.save(buf, format="PNG")
    return buf.getvalue(), diagnostics


def crop_diagram(
    image_bytes: bytes,
    bbox_norm: List[float],
) -> Optional[bytes]:
    cropped, _ = crop_diagram_with_diagnostics(image_bytes, bbox_norm)
    return cropped


def upload_diagram(
    question_id: int,
    diagram_bytes: bytes,
    index: int = 1,
    *,
    version: Optional[str] = None,
) -> Optional[str]:
    if create_client is None:
        return None
    client = create_client(supabase_url(), supabase_service_key())
    suffix = f"_{version}" if version else ""
    key = f"{STORAGE_PREFIX}/{question_id}/diagram_{index}{suffix}.png"
    bucket = client.storage.from_(STORAGE_BUCKET)
    bucket.upload(
        key,
        diagram_bytes,
        file_options={"content-type": "image/png", "upsert": "true"},
    )
    base = supabase_url().rstrip("/")
    return f"{base}/storage/v1/object/public/{STORAGE_BUCKET}/{key}"


def upload_recovered_source(
    question_id: int,
    image_bytes: bytes,
    *,
    version: Optional[str] = None,
) -> Optional[str]:
    """Persist an authoritative replacement when the stored source is truncated."""
    if create_client is None:
        return None
    client = create_client(supabase_url(), supabase_service_key())
    source_version = version or uuid.uuid4().hex[:12]
    key = f"{STORAGE_PREFIX}/{question_id}/source_recovered_{source_version}.png"
    client.storage.from_(STORAGE_BUCKET).upload(
        key,
        image_bytes,
        file_options={"content-type": "image/png", "upsert": "false"},
    )
    base = supabase_url().rstrip("/")
    return f"{base}/storage/v1/object/public/{STORAGE_BUCKET}/{key}"


def build_diagram_stem_embed(
    url: str,
    alt: str = "diagram not to scale",
    *,
    display_width_pct: Optional[float] = None,
) -> str:
    style_attr = ""
    if display_width_pct is not None:
        pct = max(25.0, min(95.0, float(display_width_pct)))
        style_attr = (
            f' style="width:{pct:.1f}%;max-width:100%;height:auto;'
            f'display:block;margin:0 auto"'
        )
    return (
        f'<figure class="qg-diagram">'
        f'<img src="{url}" alt="{alt}"{style_attr} />'
        f"</figure>"
    )


def process_diagrams(
    question_id: int,
    image_bytes: bytes,
    parsed: Dict[str, Any],
    *,
    upload: bool = True,
) -> Tuple[str, List[Dict[str, Any]], bool]:
    """Returns (stem_with_embed, diagram_assets, crop_failed)."""
    stem = str(parsed.get("stem") or "")
    if not parsed.get("has_diagram"):
        return stem, [], False

    assets: List[Dict[str, Any]] = []
    failed = False
    next_index = 1
    asset_version = uuid.uuid4().hex[:12]

    def add_asset(
        bbox: Any,
        *,
        caption: str,
        position: str,
        option_letter: Optional[str] = None,
        asset_diagram_type: str = "other",
    ) -> Optional[str]:
        nonlocal failed, next_index
        if not isinstance(bbox, list) or len(bbox) != 4:
            failed = True
            return None
        cropped, diagnostics = crop_diagram_with_diagnostics(
            image_bytes,
            bbox,
            diagram_type=(
                "graphical_option_single" if option_letter else asset_diagram_type
            ),
            has_graphical_options=False,
        )
        if not cropped or diagnostics.get("cutoff_risk"):
            failed = True
            return None
        url = (
            upload_diagram(
                question_id, cropped, index=next_index, version=asset_version
            )
            if upload
            else f"dry-run://past-papers/{question_id}/diagram_{next_index}_{asset_version}.png"
        )
        if not url:
            failed = True
            return None
        asset: Dict[str, Any] = {
            "id": f"d{next_index}",
            "url": url,
            "alt": caption,
            "position": position,
            "bbox_norm": diagnostics.get("bbox_norm_final"),
            "bbox_norm_raw": bbox,
            "crop_diagnostics": diagnostics,
        }
        if option_letter:
            asset["option_letter"] = option_letter
            asset["role"] = "graphical_option"
        else:
            asset["role"] = "stem_diagram"
        assets.append(asset)
        next_index += 1
        return url

    has_graphical_options = parsed.get("has_graphical_options") is True
    main_bbox = parsed.get("diagram_bbox_norm")
    raw_stem_assets = parsed.get("stem_diagram_assets")
    separate_stem_assets = (
        raw_stem_assets
        if isinstance(raw_stem_assets, list) and raw_stem_assets
        else []
    )
    diagram_type = str(parsed.get("diagram_type") or "other")
    multi_panel_graph = (
        diagram_type == "graph"
        and re.search(r"\bgraph\s*1\b", stem, re.I) is not None
        and re.search(r"\bgraph\s*2\b", stem, re.I) is not None
    )
    if multi_panel_graph and _valid_bbox_norm(main_bbox):
        x, y, w, h = [float(value) for value in main_bbox]
        original_bottom = min(1.0, y + h)
        target_bottom = max(original_bottom, min(1.0, 0.68))
        main_bbox = [x, y, w, max(0.0, target_bottom - y)]
        parsed["multi_panel_bbox_extended"] = target_bottom > original_bottom
        parsed["multi_panel_bbox_original"] = parsed.get("diagram_bbox_norm")
    # Multiple separated stem diagrams are independent assets. This prevents a
    # conservative union crop from swallowing intervening prose or MC answers.
    stem_embeds: List[str] = []
    if separate_stem_assets:
        for index, item in enumerate(separate_stem_assets, start=1):
            if not isinstance(item, dict):
                failed = True
                continue
            caption = str(item.get("caption") or f"diagram {index}")
            url = add_asset(
                item.get("bbox_norm"),
                caption=caption,
                position="before_options",
                asset_diagram_type="stem_diagram_single",
            )
            if url:
                stem_embeds.append(build_diagram_stem_embed(url, caption))
        parsed["stem_diagram_assets_processed"] = len(stem_embeds)
    # A graphical-options question may also have a separate stem graph. Crop it
    # independently so it is never merged with the answer-choice grid.
    elif _valid_bbox_norm(main_bbox):
        caption = str(parsed.get("diagram_caption") or "diagram not to scale")
        main_url = add_asset(
            main_bbox,
            caption=caption,
            position="before_options",
            asset_diagram_type=diagram_type,
        )
        if main_url:
            stem_embeds.append(build_diagram_stem_embed(main_url, caption))
    elif not has_graphical_options:
        failed = True

    if stem_embeds:
        embeds = "\n\n".join(stem_embeds)
        stem = f"{stem}\n\n{embeds}" if stem else embeds

    processed_letters: List[str] = []
    if has_graphical_options:
        raw_options = parsed.get("graphical_option_assets")
        if not isinstance(raw_options, list) or not raw_options:
            failed = True
        else:
            option_xyxy = _collection_uses_xyxy(raw_options)
            parsed["graphical_option_bbox_format"] = "xyxy_normalized" if option_xyxy else "xywh"
            grid_boxes = _graphical_grid_boxes(raw_options, xyxy=option_xyxy)
            seen = set()
            for item in raw_options:
                if not isinstance(item, dict):
                    failed = True
                    continue
                letter = str(item.get("letter") or "").strip().upper()
                if len(letter) != 1 or not letter.isalpha() or letter in seen:
                    failed = True
                    continue
                seen.add(letter)
                caption = str(item.get("caption") or f"option {letter}")
                option_bbox = grid_boxes.get(letter, item.get("bbox_norm"))
                if (
                    letter not in grid_boxes
                    and option_xyxy
                    and _valid_bbox_norm(option_bbox)
                ):
                    option_bbox = _xyxy_to_xywh(option_bbox)
                url = add_asset(
                    option_bbox,
                    caption=caption,
                    position="option",
                    option_letter=letter,
                )
                if url:
                    processed_letters.append(letter)

    parsed["graphical_option_letters_processed"] = sorted(processed_letters)
    parsed["diagram_asset_count"] = len(assets)
    return stem, assets, failed
