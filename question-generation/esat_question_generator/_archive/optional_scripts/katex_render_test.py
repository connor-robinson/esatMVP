#!/usr/bin/env python3
"""
Python wrapper for Node.js KaTeX render test.

Calls the Node.js script via subprocess and returns structured results.
"""

import json
import subprocess
import tempfile
import os
from pathlib import Path
from typing import Dict, Any, Optional


def run_render_test(text: str, node_script_path: Optional[str] = None) -> Dict[str, Any]:
    """
    Run KaTeX render test on text using Node.js script.
    
    Args:
        text: Text to test (can be raw text or JSON with solution_reasoning_katex)
        node_script_path: Optional path to katex_render_test.mjs (defaults to same directory)
        
    Returns:
        Dictionary with:
        - ok: bool - Whether all segments rendered successfully
        - type: str (if failed) - "inline" or "display"
        - startLine: int (if failed) - Line number where error occurred
        - content: str (if failed) - Content of failing segment
        - katexError: str (if failed) - KaTeX error message
        
    Raises:
        RuntimeError: If Node.js script execution fails
    """
    if node_script_path is None:
        # Default to katex_render_test.mjs in same directory
        script_dir = Path(__file__).parent
        node_script_path = script_dir / "katex_render_test.mjs"
    
    if not os.path.exists(node_script_path):
        raise RuntimeError(f"Node.js script not found: {node_script_path}")
    
    # Create temporary file with text
    with tempfile.NamedTemporaryFile(mode='w', encoding='utf-8', suffix='.txt', delete=False) as f:
        f.write(text)
        temp_path = f.name
    
    try:
        # Run Node.js script
        result = subprocess.run(
            ["node", str(node_script_path), temp_path],
            capture_output=True,
            text=True,
            timeout=10  # 10 second timeout per render test
        )
        
        if result.returncode != 0 and result.returncode != 1:
            # Non-zero exit that's not a validation failure
            raise RuntimeError(
                f"Node.js script failed with code {result.returncode}: {result.stderr}"
            )
        
        # Parse JSON output
        try:
            output = json.loads(result.stdout)
            return output
        except json.JSONDecodeError as e:
            raise RuntimeError(
                f"Failed to parse Node.js output as JSON: {e}\n"
                f"stdout: {result.stdout}\nstderr: {result.stderr}"
            )
    
    except subprocess.TimeoutExpired:
        raise RuntimeError("KaTeX render test timed out (>10s)")
    except FileNotFoundError:
        raise RuntimeError("Node.js not found. Please install Node.js to run render tests.")
    finally:
        # Clean up temp file
        try:
            os.unlink(temp_path)
        except OSError:
            pass


if __name__ == "__main__":
    # Test the wrapper
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: python katex_render_test.py <text>")
        sys.exit(1)
    
    test_text = sys.argv[1]
    result = run_render_test(test_text)
    
    print(json.dumps(result, indent=2))
    sys.exit(0 if result.get("ok") else 1)





















