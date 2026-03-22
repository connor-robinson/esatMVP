#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Start the iPad-friendly upload server (see upload_server.py)."""

import sys
from pathlib import Path

script_dir = Path(__file__).parent
sys.path.insert(0, str(script_dir))


def main():
    try:
        import flask  # noqa: F401
    except ImportError:
        print("Missing Flask. Install with: pip install flask")
        sys.exit(1)

    from upload_server import main as run

    run()


if __name__ == "__main__":
    main()
