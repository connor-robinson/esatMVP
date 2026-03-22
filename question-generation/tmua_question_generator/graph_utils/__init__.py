"""
Graph Utilities Package for TMUA Question Generator

Provides constraint-based graph generation, validation, and placeholder handling.
"""

from .graph_builder import build_graph_spec_from_intent
from .graph_validator import validate_graph_spec
from .placeholder_parser import parse_graph_placeholders, insert_graph_placeholder

# Try to import GraphQuotaManager, but handle if quota_manager.py is empty/missing
try:
    from .quota_manager import GraphQuotaManager
except (ImportError, AttributeError):
    # Create a stub if quota_manager doesn't exist or is empty
    class GraphQuotaManager:
        """Stub GraphQuotaManager for when quota_manager.py is not implemented."""
        def __init__(self, *args, **kwargs):
            pass
        def can_use_graph(self, *args, **kwargs):
            return True
        def record_graph_usage(self, *args, **kwargs):
            pass

__all__ = [
    "build_graph_spec_from_intent",
    "validate_graph_spec",
    "parse_graph_placeholders",
    "insert_graph_placeholder",
    "GraphQuotaManager",
]
