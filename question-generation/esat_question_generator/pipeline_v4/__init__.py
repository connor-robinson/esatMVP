"""
ESAT Physics V4 generation pipeline (clean core).

The Tkinter UI (``simple_generator_ui.py``) and other batch runners should call
``pipeline_v4.orchestrator.run_once_v4(...)`` rather than putting stage logic
inline. The legacy ``project.run_once`` remains the default; set the env var
``ESAT_USE_PIPELINE_V4=1`` to route Physics generation through V4.

Stage order (Physics only at the moment):

    Setup
    -> Designer
    -> Idea Judge                  [new V4 gate]
    -> Implementer
    -> Deterministic Validator     [code, not LLM]
    -> Verifier
    -> Style Checker
    -> Diagram / Graph Router
    -> Visual generation (graph spec | schematic spec | concept image prompt)
    -> Visual verifier (deterministic graph/spec linkage + LLM concept-image QC)
    -> Retry loop (Retry_controller + regen header) on fixable failures
    -> Tag Labeler
    -> Save manifest + accepted item
"""

from .orchestrator import run_once_v4, V4Result

__all__ = ["run_once_v4", "V4Result"]
