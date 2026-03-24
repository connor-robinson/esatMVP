#!/usr/bin/env python3
"""Generate HTML files for all accepted questions in all runs"""

import json
import os
import glob
from show_last_question import create_html_viewer

def generate_html_for_all_questions():
    """Generate HTML files for all accepted questions"""
    
    # Find all accepted.jsonl files
    accepted_files = glob.glob("runs/*/accepted.jsonl")
    
    if not accepted_files:
        print("No accepted questions found.")
        return
    
    total_questions = 0
    total_html = 0
    
    for accepted_file in accepted_files:
        run_dir = os.path.dirname(accepted_file)
        print(f"\nProcessing: {run_dir}")
        
        # Read all questions from this run
        with open(accepted_file, 'r', encoding='utf-8') as f:
            lines = f.readlines()
        
        for line_num, line in enumerate(lines, 1):
            if not line.strip():
                continue
            
            try:
                data = json.loads(line)
                question_id = data.get('id', f'question_{line_num}')
                html_filename = f"{question_id}.html"
                html_path = os.path.join(run_dir, html_filename)
                
                # Generate HTML
                html_content = create_html_viewer(data)
                
                # Save HTML file
                with open(html_path, 'w', encoding='utf-8') as f:
                    f.write(html_content)
                
                total_html += 1
                print(f"  [OK] Generated: {html_filename}")
                
            except Exception as e:
                print(f"  [ERROR] Error processing line {line_num}: {e}")
            
            total_questions += 1
    
    print(f"\n{'='*60}")
    print(f"Summary:")
    print(f"  Total questions processed: {total_questions}")
    print(f"  HTML files generated: {total_html}")
    print(f"{'='*60}")
    print(f"\nHTML files are saved in their respective run directories:")
    print(f"  runs/<timestamp>/<question_id>.html")

if __name__ == "__main__":
    generate_html_for_all_questions()

