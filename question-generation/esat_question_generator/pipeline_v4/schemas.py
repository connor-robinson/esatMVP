"""Small data shapes used by the V4 orchestrator + stages.

We intentionally keep these as plain ``dataclass``es so they stay JSON-friendly
when written into ``manifest.json``.
"""

from __future__ import annotations

from dataclasses import asdict, dataclass, field
from typing import Any, Dict, List, Optional


@dataclass
class StageResult:
    """Uniform record for any V4 stage outcome."""

    stage: str
    status: str  # "pass" | "fail" | "skipped" | "error" | "info"
    verdict: Optional[str] = None  # PASS/FAIL/REGENERATE/DELETE etc. when applicable
    payload: Optional[Dict[str, Any]] = None  # parsed JSON output (LLM stages)
    notes: List[str] = field(default_factory=list)
    error: Optional[str] = None
    raw_text: Optional[str] = None  # last raw model text (when JSON parsing failed)
    model: Optional[str] = None
    attempts: int = 1

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class VisualAssetRecord:
    kind: str  # graph_spec | schematic_spec | concept_image
    spec_path: Optional[str] = None
    image_paths: List[str] = field(default_factory=list)
    renderer: Optional[str] = None
    qc_status: str = "pending"  # pending | pass | regenerate | delete | skipped
    qc_source: Optional[str] = None
    answer_bearing: bool = False
    checksum: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


def has_pass_verdict(payload: Optional[Dict[str, Any]]) -> bool:
    if not payload:
        return False
    verdict = str(payload.get("verdict", "")).upper()
    return verdict == "PASS"
