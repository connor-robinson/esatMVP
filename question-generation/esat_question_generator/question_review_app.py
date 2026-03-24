#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Question Review Application Entry Point

Launches the Tkinter desktop application for reviewing AI-generated questions.
"""

import sys
import os
from pathlib import Path

# Add the script directory to the path so imports work
script_dir = Path(__file__).parent
sys.path.insert(0, str(script_dir))

# Import and run the app
from question_review.app import main

if __name__ == "__main__":
    main()
































