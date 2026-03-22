#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Build the iPad upload page URL for the local network (no secrets)."""

from __future__ import annotations

import os
import socket


def get_lan_ipv4() -> str:
    """Best-effort primary LAN address (falls back to loopback)."""
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.settimeout(0.5)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"


def default_uploader_base_url() -> str:
    """
    Base URL for the Flask upload server, e.g. http://192.168.1.5:8765

    Override host or port if autodetect is wrong:
      UPLOADER_HOST=192.168.1.5
      UPLOAD_SERVER_PORT=8765
    """
    port = (os.environ.get("UPLOAD_SERVER_PORT") or "8765").strip() or "8765"
    host = (os.environ.get("UPLOADER_HOST") or "").strip()
    if not host:
        host = get_lan_ipv4()
    return f"http://{host}:{port}".rstrip("/")
