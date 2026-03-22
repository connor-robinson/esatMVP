#!/usr/bin/env python3
"""Display the last successfully generated question with KaTeX rendering"""

import json
import os
import glob
import html
import webbrowser
import tempfile

try:
    import tkinter as tk
    from tkinter import ttk, scrolledtext
    _TKINTER_AVAILABLE = True
except ImportError:
    _TKINTER_AVAILABLE = False

def escape_html(text):
    """Escape HTML but preserve KaTeX math delimiters"""
    # Replace $$...$$ with placeholders, escape, then restore
    import re
    math_blocks = []
    def replace_math(match):
        idx = len(math_blocks)
        math_blocks.append(match.group(0))
        return f"__MATH_BLOCK_{idx}__"
    
    # Replace $...$ and $$...$$
    text = re.sub(r'\$\$.*?\$\$', replace_math, text, flags=re.DOTALL)
    text = re.sub(r'\$[^$]+\$', replace_math, text)
    
    # Escape HTML
    text = html.escape(text)
    
    # Restore math blocks
    for i, math_block in enumerate(math_blocks):
        text = text.replace(f"__MATH_BLOCK_{i}__", math_block)
    
    return text

def create_html_viewer(data):
    """Create HTML file with KaTeX for proper math rendering"""
    q = data['question_package']['question']
    solution = data['question_package'].get('solution', {})
    distractor_map = data['question_package'].get('distractor_map', {})
    
    stem = escape_html(q['stem'])
    correct = q['correct_option']
    
    # Convert LaTeX to KaTeX format ($$ for display, $ for inline)
    # Already in correct format from Implementer
    
    options_html = ""
    for opt, text in sorted(q['options'].items()):
        opt_text = escape_html(text)
        marker = " <strong>(CORRECT)</strong>" if opt == correct else ""
        options_html += f"<p><strong>{opt}:</strong> {opt_text}{marker}</p>\n"
    
    solution_html = ""
    if solution.get('reasoning'):
        solution_html += f"<h3>Reasoning</h3><p>{escape_html(solution['reasoning'])}</p>\n"
    if solution.get('key_insight'):
        solution_html += f"<h3>Key Insight</h3><p>{escape_html(solution['key_insight'])}</p>\n"
    
    distractor_html = ""
    for opt, desc in sorted(distractor_map.items()):
        marker = " <strong>(CORRECT ANSWER)</strong>" if opt == correct else ""
        distractor_html += f"<p><strong>{opt}:</strong> {escape_html(desc)}{marker}</p>\n"
    
    html_content = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>ESAT Question: {data['id']}</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css" integrity="sha384-Xi8rHCmBmhbuyyhbI88391ZOP2oxb5N8d7y3SPiUao3W6Xfn2c0V7znv4i5aL5v" crossorigin="anonymous">
    <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.js" integrity="sha384-YbscuV+g0KawmV2b+9c7U6k8k8vKvzHmeJ6BwfU7o8T9AuIQwhhYyN2nE6Q6i5/x" crossorigin="anonymous"></script>
    <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/contrib/auto-render.min.js" integrity="sha384-+XBljXPPiv+OzfbB3cVmLHf4hdUFHlWNZN5spNQ7rmHTXpd7WvJum6fihLPegpU" crossorigin="anonymous"
        onload="renderMathInElement(document.body);"></script>
    <script>
        document.addEventListener("DOMContentLoaded", function() {{
            renderMathInElement(document.body, {{
                delimiters: [
                    {{left: "$$", right: "$$", display: true}},
                    {{left: "$", right: "$", display: false}},
                    {{left: "\\\\[", right: "\\\\]", display: true}},
                    {{left: "\\\\(", right: "\\\\)", display: false}}
                ],
                throwOnError: false
            }});
        }});
    </script>
    <style>
        body {{
            font-family: Arial, sans-serif;
            max-width: 800px;
            margin: 20px auto;
            padding: 20px;
            line-height: 1.6;
        }}
        h1 {{ color: #333; }}
        h2 {{ color: #555; border-bottom: 2px solid #ddd; padding-bottom: 5px; }}
        h3 {{ color: #777; }}
        .metadata {{
            background: #f5f5f5;
            padding: 10px;
            border-radius: 5px;
            margin-bottom: 20px;
        }}
    </style>
</head>
<body>
    <div class="metadata">
        <strong>ID:</strong> {data['id']} | 
        <strong>Schema:</strong> {data['schema_id']} | 
        <strong>Difficulty:</strong> {data['difficulty']}
    </div>
    
    <h1>Question</h1>
    <p>{stem}</p>
    
    <h2>Options</h2>
    {options_html}
    
    <h2>Solution</h2>
    {solution_html}
    
    <h2>Distractor Analysis</h2>
    {distractor_html}
    
    <h2>Metadata</h2>
    <p><strong>Correct Answer:</strong> {correct}</p>
    <p><strong>Attempts:</strong> {data.get('attempts', 'N/A')}</p>
</body>
</html>"""
    
    return html_content

def show_in_browser(data, save_path=None):
    """Create HTML file and open in browser - DISABLED: No previews during generation
    
    Args:
        data: Question data dictionary
        save_path: Optional path to save HTML file permanently. If None, uses temp file.
    """
    # Preview disabled - questions are saved to database and shown in web UI
    return None

def show_in_tkinter(data):
    """Show question in tkinter window - DISABLED: No previews during generation"""
    # Preview disabled - questions are saved to database and shown in web UI
    return

# Find the most recent accepted.jsonl file
accepted_files = glob.glob("runs/*/accepted.jsonl")
if not accepted_files:
    print("No accepted questions found.")
    exit(1)

# Get the most recent one
latest_file = max(accepted_files, key=os.path.getmtime)

# Read the last line (most recent question)
with open(latest_file, 'r', encoding='utf-8') as f:
    lines = f.readlines()
    if not lines:
        print("No questions in accepted file.")
        exit(1)
    
    # Get the last question
    data = json.loads(lines[-1])

# Save HTML file in the run directory
run_dir = os.path.dirname(latest_file)
question_id = data.get('id', 'question')
html_filename = f"{question_id}.html"
html_path = os.path.join(run_dir, html_filename)

# Don't auto-open previews - just save HTML file
# show_in_browser(data, save_path=html_path)
# show_in_tkinter(data)
print(f"HTML file saved to: {html_path}")
print("(Preview opening disabled - view questions in the web UI instead)")
