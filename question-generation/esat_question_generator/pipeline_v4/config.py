"""V4 model routing + run config.

We keep role-based env vars (``MODEL_STRUCTURED_STRONG`` etc.) so model names
are never hard-coded inside stage code. Falls back to the legacy
``MODEL_DESIGNER`` / ``MODEL_IMPLEMENTER`` / ``MODEL_VERIFIER`` / ``MODEL_STYLE``
/ ``MODEL_CLASSIFIER`` variables used by ``project.ModelsConfig`` so existing
deployments keep working without a new ``.env``.
"""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from typing import Dict, Optional, Tuple


def _sanitize_env_value(raw: str) -> str:
    """Strip whitespace and trailing ``#`` comments from env values."""
    v = (raw or "").strip()
    if not v:
        return ""
    if v[0] in "\"'":
        return v.strip("\"'").strip()
    # Inline comment (PowerShell Get-Content loader does not strip these).
    hash_idx = v.find("#")
    if hash_idx > 0:
        v = v[:hash_idx].rstrip()
    return v.strip()


def _env(*names: str, default: str = "") -> str:
    for n in names:
        v = _sanitize_env_value(os.environ.get(n) or "")
        if v:
            return v
    return default


@dataclass
class V4ModelsConfig:
    """Role-based model routing for V4.

    Roles:
      - ``structured_strong``: Designer, Implementer, hard image-prompt drafts.
      - ``structured_fast``: Idea Judge, Verifier, Style, Router, Graph/Schematic spec, Visual verifier.
      - ``structured_light``: Tag Labeler, Format Fixer.
      - ``image_fast`` / ``image_high_quality``: Gemini image models.
      - ``vision_structured``: vision-capable structured model used by the concept-image verifier.
    """

    structured_strong: str = "gemini-2.5-pro"
    structured_fast: str = "gemini-2.5-flash"
    structured_light: str = "gemini-2.5-flash"
    image_fast: str = ""
    image_high_quality: str = ""
    vision_structured: str = "gemini-2.5-flash"

    @classmethod
    def from_env(cls) -> "V4ModelsConfig":
        return cls(
            structured_strong=_env(
                "MODEL_STRUCTURED_STRONG", "MODEL_DESIGNER", "MODEL_IMPLEMENTER",
                default="gemini-2.5-pro",
            ),
            structured_fast=_env(
                "MODEL_STRUCTURED_FAST", "MODEL_VERIFIER", "MODEL_STYLE",
                default="gemini-2.5-flash",
            ),
            structured_light=_env(
                "MODEL_STRUCTURED_LIGHT", "MODEL_CLASSIFIER", "MODEL_FORMAT_FIXER",
                default="gemini-2.5-flash",
            ),
            image_fast=_env("MODEL_IMAGE_FAST", default=""),
            image_high_quality=_env("MODEL_IMAGE_HIGH_QUALITY", default=""),
            vision_structured=_env(
                "MODEL_VISION_STRUCTURED", "MODEL_STRUCTURED_FAST",
                default="gemini-2.5-flash",
            ),
        )

    def for_stage(self, stage: str) -> str:
        m = {
            "designer": self.structured_strong,
            "implementer": self.structured_strong,
            "implementer_regen": self.structured_strong,
            "idea_judge": self.structured_fast,
            "verifier": self.structured_fast,
            "style_checker": self.structured_fast,
            "visual_router": self.structured_fast,
            "graph_spec": self.structured_fast,
            "schematic_spec": self.structured_fast,
            "graph_visual_verifier": self.structured_fast,
            "concept_image_prompt": self.structured_strong,
            "concept_image_verifier": self.vision_structured,
            "concept_image_regen": self.structured_fast,
            "tag_labeler": self.structured_light,
            "format_fixer": self.structured_light,
        }
        return m.get(stage, self.structured_fast)


@dataclass
class V4RunConfig:
    """Per-run V4 settings; keeps existing env conventions where useful."""

    max_designer_retries: int = 1
    max_idea_judge_retries: int = 1
    max_implementer_retries: int = 2
    max_concept_image_regens: int = 2
    enable_tag_labeling: bool = True
    enable_visual_pipeline: bool = True
    enable_concept_image_generation: bool = True  # Gemini/Imagen wired in v4 image_gen.py
    enable_svg_rendering: bool = True  # deterministic graph/schematic renderers
    enable_asset_upload: bool = True  # upload PNG/SVG to Supabase question-images bucket
    variation_mode: str = "base"  # base|sibling|far (designer picks if "base")
    difficulty_weights: Optional[Dict[str, float]] = None
    seed: Optional[int] = None
    # Dev/testing knobs (V5 defaults visuals to ``none``). See ``cli --prefer-visual``.
    prefer_visual: bool = False  # router ``none`` → ``concept_image_prompt``
    visual_route_override: Optional[str] = None  # force route, skip router verdict

    @classmethod
    def from_env(cls) -> "V4RunConfig":
        def _int(name: str, default: int) -> int:
            try:
                return max(0, int((os.environ.get(name) or "").strip() or default))
            except ValueError:
                return default

        def _bool(name: str, default: bool) -> bool:
            v = (os.environ.get(name) or "").strip().lower()
            if not v:
                return default
            return v not in ("0", "false", "no", "off")

        return cls(
            max_designer_retries=_int("MAX_DESIGNER_RETRIES", 1),
            max_idea_judge_retries=_int("MAX_IDEA_JUDGE_RETRIES", 1),
            max_implementer_retries=_int("MAX_IMPLEMENTER_RETRIES", 2),
            max_concept_image_regens=_int("MAX_CONCEPT_IMAGE_REGENS", 2),
            enable_tag_labeling=_bool("ESAT_ENABLE_TAG_LABELING", True),
            enable_visual_pipeline=_bool("ESAT_ENABLE_VISUAL_PIPELINE", True),
            enable_concept_image_generation=_bool(
                "ESAT_ENABLE_CONCEPT_IMAGE_GEN", True
            ),
            enable_svg_rendering=_bool("ESAT_ENABLE_SVG_RENDERING", True),
            enable_asset_upload=_bool("ESAT_ENABLE_ASSET_UPLOAD", True),
            variation_mode=(os.environ.get("VARIATION_MODE") or "base").strip().lower() or "base",
            prefer_visual=_bool("V4_PREFER_VISUAL", False),
            visual_route_override=_sanitize_env_value(
                os.environ.get("V4_VISUAL_ROUTE_OVERRIDE") or ""
            )
            or None,
        )


# ---- Supported subjects ----

SUPPORTED_SUBJECTS: Tuple[str, ...] = ("physics",)
"""V4 ships with Physics first. Other subjects fall back to legacy ``run_once``."""


def subject_from_schema_id(schema_id: str) -> str:
    """Map ``P1``/``P_foo`` -> ``physics`` (mirrors ``project.get_subject_from_schema``)."""
    if not schema_id:
        return ""
    p = schema_id[0].upper()
    return {
        "M": "mathematics",
        "P": "physics",
        "C": "chemistry",
        "B": "biology",
    }.get(p, "")
