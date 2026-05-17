"""Upload V4 visual assets to the existing ``question-images`` Supabase bucket.

We deliberately reuse the same public bucket already used by review-app /
question-bank so question URLs work across the existing UIs without further
configuration. Layout::

    question-images/v4/<generation_id>/<filename>

For example::

    question-images/v4/P_d4f05622-Medium-bd09f528db/concept_image_v1.png
    question-images/v4/P_d4f05622-Medium-bd09f528db/graph.svg

The bucket is ``public=true`` so the public URL is just:
``<SUPABASE_URL>/storage/v1/object/public/question-images/<key>``.

The module returns ``None`` (and logs a warning) instead of raising when
credentials or network access are missing, so the orchestrator can degrade
gracefully to local-only output.
"""

from __future__ import annotations

import mimetypes
import os
import re
from pathlib import Path
from typing import Dict, Optional

try:
    from supabase import create_client, Client  # type: ignore
    _SUPABASE_AVAILABLE = True
except Exception:  # pragma: no cover - optional dep
    _SUPABASE_AVAILABLE = False
    Client = None  # type: ignore

try:
    from pipeline_log import plog  # type: ignore
except Exception:  # pragma: no cover

    def plog(*args, **kwargs):  # type: ignore
        pass


DEFAULT_BUCKET = "question-images"
DEFAULT_PREFIX = "v4"


_SAFE_KEY = re.compile(r"[^A-Za-z0-9._/\-]+")


def _sanitize_key_part(value: str) -> str:
    out = _SAFE_KEY.sub("_", str(value or "").strip())
    return out or "unknown"


class SupabaseAssetUploader:
    """Thin wrapper around ``supabase.storage.from_(bucket).upload``.

    Reuses ``SUPABASE_URL`` + ``SUPABASE_SERVICE_ROLE_KEY`` from the same env
    file db_sync uses. Treat instantiation as cheap.
    """

    def __init__(
        self,
        bucket: str = DEFAULT_BUCKET,
        prefix: str = DEFAULT_PREFIX,
        *,
        url: Optional[str] = None,
        key: Optional[str] = None,
    ) -> None:
        self.bucket = bucket
        self.prefix = prefix.strip("/")
        self.enabled = False
        self.client = None
        self._public_base: Optional[str] = None

        if not _SUPABASE_AVAILABLE:
            return

        if not url or not key:
            try:
                from dotenv import load_dotenv  # type: ignore
                env_path = Path(__file__).resolve().parents[3] / ".env.local"
                if env_path.is_file():
                    load_dotenv(env_path)
            except Exception:
                pass

        self.supabase_url = (url or os.environ.get("SUPABASE_URL") or "").strip()
        self.supabase_key = (key or os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or "").strip()
        if not self.supabase_url or not self.supabase_key:
            return
        try:
            self.client = create_client(self.supabase_url, self.supabase_key)
            self.enabled = True
            self._public_base = (
                self.supabase_url.rstrip("/") + "/storage/v1/object/public/" + self.bucket
            )
        except Exception as e:
            plog(
                "v4_assets",
                "supabase_client_init_failed",
                level="warning",
                detail={"error": str(e)},
                echo=True,
            )
            self.client = None
            self.enabled = False

    def _key_for(self, generation_id: str, filename: str) -> str:
        gen = _sanitize_key_part(generation_id)
        fname = _sanitize_key_part(filename)
        return f"{self.prefix}/{gen}/{fname}"

    def public_url(self, key: str) -> str:
        return f"{self._public_base}/{key}" if self._public_base else ""

    def upload_bytes(
        self,
        data: bytes,
        *,
        generation_id: str,
        filename: str,
        content_type: Optional[str] = None,
        upsert: bool = True,
    ) -> Optional[Dict[str, str]]:
        """Upload raw bytes and return ``{"key": ..., "url": ..., "size": ...}``.

        Returns ``None`` on failure (already logged).
        """
        if not self.enabled or not self.client:
            return None
        key = self._key_for(generation_id, filename)
        ct = content_type or mimetypes.guess_type(filename)[0] or "application/octet-stream"
        try:
            # supabase-py v2 ``upload`` signature: (path, file, file_options={...}).
            # ``upsert`` lets us replace if rerunning the same generation_id.
            self.client.storage.from_(self.bucket).upload(
                path=key,
                file=data,
                file_options={
                    "content-type": ct,
                    "upsert": "true" if upsert else "false",
                    "cache-control": "public, max-age=31536000, immutable",
                },
            )
        except Exception as e:
            err_text = str(e)
            # ``Duplicate`` / 409 -> treat as success when upsert was requested.
            if upsert and ("duplicate" in err_text.lower() or "409" in err_text):
                pass
            else:
                plog(
                    "v4_assets",
                    "upload_failed",
                    level="warning",
                    detail={"key": key, "error": err_text[:600]},
                    echo=True,
                )
                return None
        url = self.public_url(key)
        return {"key": key, "url": url, "size": str(len(data))}

    def upload_file(
        self,
        path: Path,
        *,
        generation_id: str,
        filename: Optional[str] = None,
        content_type: Optional[str] = None,
        upsert: bool = True,
    ) -> Optional[Dict[str, str]]:
        path = Path(path)
        if not path.is_file():
            return None
        data = path.read_bytes()
        return self.upload_bytes(
            data,
            generation_id=generation_id,
            filename=filename or path.name,
            content_type=content_type,
            upsert=upsert,
        )


_singleton: Optional[SupabaseAssetUploader] = None


def get_uploader() -> SupabaseAssetUploader:
    """Module-level cached uploader; safe to call repeatedly."""
    global _singleton
    if _singleton is None:
        _singleton = SupabaseAssetUploader()
    return _singleton
