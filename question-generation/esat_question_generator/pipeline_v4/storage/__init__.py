"""Local file storage for V4 runs (per-question folders with stage JSONs).

Also exposes :class:`SupabaseAssetUploader` for pushing generated PNGs / SVGs
into the existing ``question-images`` Supabase bucket so the review-app and
question-bank can reference assets by URL instead of base64-embedding them
in the question stem.
"""

from .local_store import RunStore, create_run_store
from .manifest import build_manifest
from .supabase_assets import SupabaseAssetUploader, get_uploader

__all__ = [
    "RunStore",
    "create_run_store",
    "build_manifest",
    "SupabaseAssetUploader",
    "get_uploader",
]
