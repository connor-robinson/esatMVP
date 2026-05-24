"""ESAT question quality gate: LLM rubric, Supabase updates, CLI + Streamlit operator UI."""

from __future__ import annotations

from typing import TYPE_CHECKING

__all__ = ["QualityGateResult", "CohortFilters"]

if TYPE_CHECKING:
    from .schemas import CohortFilters, QualityGateResult


def __getattr__(name: str):
    if name == "QualityGateResult":
        from .schemas import QualityGateResult

        return QualityGateResult
    if name == "CohortFilters":
        from .schemas import CohortFilters

        return CohortFilters
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")
