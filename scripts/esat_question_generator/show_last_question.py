#!/usr/bin/env python3
"""Display the last successfully generated question with MathJax rendering"""

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
    """Escape HTML but preserve LaTeX math delimiters"""
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
    """Create HTML file with MathJax for proper math rendering"""
    q = data['question_package']['question']
    solution = data['question_package'].get('solution', {})
    distractor_map = data['question_package'].get('distractor_map', {})
    
    stem = escape_html(q['stem'])
    correct = q['correct_option']
    
    # Convert LaTeX to MathJax format ($$ for display, $ for inline)
    # MathJax uses \( \) for inline and \[ \] for display, but also supports $$
    
    html_content = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>ESAT Question: {data['id']}</title>
    <script src="https://polyfill.io/v3/polyfill.min.js?features=es6"></script>
    <script id="MathJax-script" async src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js"></script>
    <script>
        window.MathJax = {{
            tex: {{
                inlineMath: [['$', '$'], ['\\(', '\\)']],
                displayMath: [['$$', '$$'], ['\\[', '\\]']],
                processEscapes: true,
                processEnvironments: true
            }}
        }};
    </script>
    <style>
        body {{
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            max-width: 900px;
            margin: 40px auto;
            padding: 20px;
            background: #f5f5f5;
        }}
        .container {{
            background: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }}
        h1 {{
            color: #2c3e50;
            border-bottom: 3px solid #3498db;
            padding-bottom: 10px;
        }}
        .metadata {{
            background: #ecf0f1;
            padding: 15px;
            border-radius: 5px;
            margin-bottom: 20px;
        }}
        .question {{
            background: #fff9e6;
            padding: 20px;
            border-left: 4px solid #f39c12;
            margin: 20px 0;
            border-radius: 5px;
        }}
        .options {{
            background: #e8f5e9;
            padding: 20px;
            border-left: 4px solid #4caf50;
            margin: 20px 0;
            border-radius: 5px;
        }}
        .option {{
            padding: 10px;
            margin: 8px 0;
            background: white;
            border-radius: 4px;
        }}
        .option.correct {{
            background: #c8e6c9;
            border-left: 4px solid #4caf50;
            font-weight: bold;
        }}
        .solution {{
            background: #e3f2fd;
            padding: 20px;
            border-left: 4px solid #2196f3;
            margin: 20px 0;
            border-radius: 5px;
        }}
        .section {{
            margin: 25px 0;
        }}
        .section-title {{
            color: #2c3e50;
            font-size: 1.3em;
            margin-bottom: 10px;
            font-weight: bold;
        }}
        code {{
            background: #f4f4f4;
            padding: 2px 6px;
            border-radius: 3px;
            font-family: 'Courier New', monospace;
        }}
    </style>
</head>
<body>
    <div class="container">
        <h1>ESAT Question Generator</h1>
        
        <div class="metadata">
            <strong>Question ID:</strong> {data['id']}<br>
            <strong>Schema:</strong> {data['schema_id']}<br>
            <strong>Difficulty:</strong> {data['difficulty']}<br>
            <strong>Attempts:</strong> {data['attempts']}<br>
            <strong>Created:</strong> {data.get('created_at', 'N/A')}<br>
            {f"<strong>Token Usage:</strong> {data.get('token_usage', {}).get('total_tokens', 'N/A'):,} total ({data.get('token_usage', {}).get('prompt_tokens', 0):,} prompt + {data.get('token_usage', {}).get('candidates_tokens', 0):,} completion)<br>" if data.get('token_usage') else ""}
        </div>
        
        <div class="section">
            <div class="section-title">QUESTION</div>
            <div class="question">
                {stem}
            </div>
        </div>
        
        <div class="section">
            <div class="section-title">OPTIONS</div>
            <div class="options">
"""
    
    for opt, text in sorted(q['options'].items()):
        is_correct = opt == correct
        css_class = "option correct" if is_correct else "option"
        marker = " ✓ CORRECT" if is_correct else ""
        opt_text = escape_html(str(text))
        html_content += f'                <div class="{css_class}"><strong>{opt}:</strong> {opt_text}{marker}</div>\n'
    
    html_content += f"""
            </div>
            <p><strong>Correct Answer: {correct}</strong></p>
        </div>
"""
    
    if solution.get('reasoning') or solution.get('key_insight'):
        html_content += """
        <div class="section">
            <div class="section-title">SOLUTION</div>
            <div class="solution">
"""
        if solution.get('reasoning'):
            reasoning = escape_html(solution.get('reasoning', ''))
            html_content += f"                <div><strong>Reasoning:</strong><br><br>{reasoning}</div>\n"
        if solution.get('key_insight'):
            insight = escape_html(solution.get('key_insight', ''))
            html_content += f"                <div style='margin-top: 15px;'><strong>Key Insight:</strong><br><br>{insight}</div>\n"
        html_content += """
            </div>
        </div>
"""
    
    if distractor_map:
        html_content += """
        <div class="section">
            <div class="section-title">DISTRACTOR ANALYSIS</div>
            <div style="background: #fff3e0; padding: 20px; border-left: 4px solid #ff9800; border-radius: 5px;">
"""
        for opt, desc in sorted(distractor_map.items()):
            is_correct = opt == correct
            marker = " [CORRECT ANSWER]" if is_correct else ""
            desc_text = escape_html(desc)
            html_content += f'                <div style="margin: 10px 0;"><strong>{opt}:</strong> {desc_text}{marker}</div>\n'
        html_content += """
            </div>
        </div>
"""
    
    html_content += """
    </div>
</body>
</html>
"""
    
    return html_content

def show_in_browser(data, save_path=None):
    """Create HTML file and open in browser
    
    Args:
        data: Question data dictionary
        save_path: Optional path to save HTML file permanently. If None, uses temp file.
    """
    html_content = create_html_viewer(data)
    
    if save_path:
        # Save to permanent location
        with open(save_path, 'w', encoding='utf-8') as f:
            f.write(html_content)
        html_file = save_path
        print(f"Question HTML saved to: {html_file}")
    else:
        # Create temporary HTML file
        with tempfile.NamedTemporaryFile(mode='w', suffix='.html', delete=False, encoding='utf-8') as f:
            f.write(html_content)
            html_file = f.name
    
    # Open in browser
    webbrowser.open(f'file://{html_file}')
    print(f"Question opened in browser: {html_file}")
    return html_file

def show_in_tkinter(data):
    """Show question in tkinter window with tabs and browser option for MathJax"""
    if not _TKINTER_AVAILABLE:
        return show_in_browser(data)
    
    # Try tkinterweb first for MathJax support
    try:
        import tkinterweb
        use_html_view = True
    except ImportError:
        use_html_view = False
    
    root = tk.Tk()
    root.title(f"ESAT Question: {data['id']}")
    root.geometry("1000x800")
    
    if use_html_view:
        # Use HTML view with MathJax (may have limitations)
        main_frame = ttk.Frame(root, padding="10")
        main_frame.pack(fill=tk.BOTH, expand=True)
        
        # Header
        header_frame = ttk.LabelFrame(main_frame, text="Question Information", padding="10")
        header_frame.pack(fill=tk.X, pady=(0, 10))
        metadata_text = f"ID: {data['id']} | Schema: {data['schema_id']} | Difficulty: {data['difficulty']}"
        ttk.Label(header_frame, text=metadata_text, font=("Arial", 9)).pack()
        
        # HTML frame
        html_content = create_html_viewer(data)
        html_frame = tkinterweb.HtmlFrame(main_frame, messages_enabled=False)
        html_frame.load_html(html_content)
        html_frame.pack(fill=tk.BOTH, expand=True, padx=5, pady=5)
        
        # Buttons
        button_frame = ttk.Frame(main_frame)
        button_frame.pack(fill=tk.X, pady=5)
        
        def open_in_browser():
            show_in_browser(data)
        
        ttk.Button(button_frame, text="Open in Browser (Full MathJax)", command=open_in_browser).pack(side=tk.LEFT, padx=5)
        ttk.Button(button_frame, text="Close", command=root.destroy).pack(side=tk.RIGHT, padx=5)
        
        root.mainloop()
        return
    
    # Fallback: Tabbed view (MathJax shown as LaTeX code, but readable)
    main_frame = ttk.Frame(root, padding="10")
    main_frame.pack(fill=tk.BOTH, expand=True)
    
    # Header with metadata
    header_frame = ttk.LabelFrame(main_frame, text="Question Information", padding="10")
    header_frame.pack(fill=tk.X, pady=(0, 10))
    
    metadata_text = f"ID: {data['id']} | Schema: {data['schema_id']} | Difficulty: {data['difficulty']} | Attempts: {data['attempts']}"
    ttk.Label(header_frame, text=metadata_text, font=("Arial", 9)).pack()
    
    # Button to open in browser for MathJax rendering
    button_frame = ttk.Frame(main_frame)
    button_frame.pack(fill=tk.X, pady=(0, 10))
    
    def open_in_browser():
        show_in_browser(data)
    
    browser_btn = ttk.Button(button_frame, text="Open in Browser (Full MathJax Rendering)", command=open_in_browser)
    browser_btn.pack(side=tk.LEFT, padx=5)
    
    # Create notebook for tabs
    notebook = ttk.Notebook(main_frame)
    notebook.pack(fill=tk.BOTH, expand=True)
    
    q = data['question_package']['question']
    solution = data['question_package'].get('solution', {})
    distractor_map = data['question_package'].get('distractor_map', {})
    correct = q['correct_option']
    
    # Question tab
    question_frame = ttk.Frame(notebook)
    notebook.add(question_frame, text="Question")
    question_text = scrolledtext.ScrolledText(question_frame, wrap=tk.WORD, state=tk.DISABLED, font=("Consolas", 11))
    question_text.pack(fill=tk.BOTH, expand=True, padx=10, pady=10)
    
    q_content = "QUESTION:\n" + "="*70 + "\n\n"
    q_content += q['stem'] + "\n\n"
    q_content += "="*70 + "\n\nOPTIONS:\n" + "="*70 + "\n\n"
    for opt, text in sorted(q['options'].items()):
        marker = " [CORRECT]" if opt == correct else ""
        q_content += f"{opt}: {text}{marker}\n\n"
    q_content += f"\n{'='*70}\nCorrect Answer: {correct}\n"
    
    question_text.config(state=tk.NORMAL)
    question_text.insert(1.0, q_content)
    question_text.config(state=tk.DISABLED)
    
    # Solution tab
    solution_frame = ttk.Frame(notebook)
    notebook.add(solution_frame, text="Solution")
    solution_text = scrolledtext.ScrolledText(solution_frame, wrap=tk.WORD, state=tk.DISABLED, font=("Consolas", 10))
    solution_text.pack(fill=tk.BOTH, expand=True, padx=10, pady=10)
    
    s_content = "SOLUTION:\n" + "="*70 + "\n\n"
    if solution.get('reasoning'):
        s_content += "REASONING:\n" + "-"*70 + "\n\n"
        s_content += solution.get('reasoning', 'N/A') + "\n\n"
    if solution.get('key_insight'):
        s_content += "KEY INSIGHT:\n" + "-"*70 + "\n\n"
        s_content += solution.get('key_insight', 'N/A') + "\n"
    
    solution_text.config(state=tk.NORMAL)
    solution_text.insert(1.0, s_content)
    solution_text.config(state=tk.DISABLED)
    
    # Details tab
    details_frame = ttk.Frame(notebook)
    notebook.add(details_frame, text="Details")
    details_text = scrolledtext.ScrolledText(details_frame, wrap=tk.WORD, state=tk.DISABLED, font=("Consolas", 9))
    details_text.pack(fill=tk.BOTH, expand=True, padx=10, pady=10)
    
    d_content = "DISTRACTOR ANALYSIS:\n" + "="*70 + "\n\n"
    for opt, desc in sorted(distractor_map.items()):
        marker = " [CORRECT ANSWER]" if opt == correct else ""
        d_content += f"{opt}: {desc}{marker}\n\n"
    d_content += "\n" + "="*70 + "\n\n"
    d_content += "VERIFIER REPORT:\n" + "-"*70 + "\n"
    verifier = data.get("verifier_report", {})
    d_content += f"Verdict: {verifier.get('verdict', 'N/A')}\n"
    d_content += f"Confidence: {verifier.get('confidence', 'N/A')}\n"
    if verifier.get("notes"):
        d_content += "\nNotes:\n"
        for note in verifier.get("notes", []):
            d_content += f"  • {note}\n"
    d_content += "\n" + "="*70 + "\n\n"
    d_content += "STYLE REPORT:\n" + "-"*70 + "\n"
    style = data.get("style_report", {})
    d_content += f"Verdict: {style.get('verdict', 'N/A')}\n"
    if style.get("scores"):
        d_content += "\nScores:\n"
        for key, val in style.get("scores", {}).items():
            d_content += f"  {key}: {val}/10\n"
    if style.get("summary"):
        d_content += f"\nSummary: {style.get('summary')}\n"
    
    details_text.config(state=tk.NORMAL)
    details_text.insert(1.0, d_content)
    details_text.config(state=tk.DISABLED)
    
    # Close button
    close_btn = ttk.Button(main_frame, text="Close", command=root.destroy)
    close_btn.pack(pady=10)
    
    root.mainloop()

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

# Show in tkinter (or browser if tkinterweb not available)
# Also save HTML file permanently
show_in_browser(data, save_path=html_path)
show_in_tkinter(data)

