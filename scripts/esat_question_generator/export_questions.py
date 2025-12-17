#!/usr/bin/env python3
"""Export all accepted questions in a parseable format for other programs/AIs"""

import json
import os
import glob
import sys

def export_questions(format_type='json', output_file=None):
    """
    Export all accepted questions in a parseable format.
    
    Args:
        format_type: 'json' (default) or 'text' for structured text
        output_file: Optional file path to save output. If None, prints to stdout.
    """
    
    # Find all accepted.jsonl files
    accepted_files = glob.glob("runs/*/accepted.jsonl")
    
    if not accepted_files:
        print("No accepted questions found.", file=sys.stderr)
        return
    
    all_questions = []
    
    # Collect all questions
    for accepted_file in sorted(accepted_files):
        run_dir = os.path.dirname(accepted_file)
        run_id = os.path.basename(run_dir)
        
        with open(accepted_file, 'r', encoding='utf-8') as f:
            for line_num, line in enumerate(f, 1):
                if not line.strip():
                    continue
                
                try:
                    data = json.loads(line)
                    # Add run metadata
                    data['_run_id'] = run_id
                    data['_run_dir'] = run_dir
                    all_questions.append(data)
                except Exception as e:
                    print(f"Error parsing question in {accepted_file} line {line_num}: {e}", file=sys.stderr)
    
    if not all_questions:
        print("No valid questions found.", file=sys.stderr)
        return
    
    # Format output
    if format_type == 'json':
        output = json.dumps(all_questions, indent=2, ensure_ascii=False)
    elif format_type == 'text':
        output = format_questions_as_text(all_questions)
    else:
        print(f"Unknown format: {format_type}. Use 'json' or 'text'.", file=sys.stderr)
        return
    
    # Write to file or stdout
    if output_file:
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(output)
        print(f"Exported {len(all_questions)} questions to: {output_file}", file=sys.stderr)
    else:
        print(output)

def format_questions_as_text(questions):
    """Format questions as structured text"""
    lines = []
    lines.append("="*80)
    lines.append(f"ESAT QUESTION GENERATOR - EXPORT")
    lines.append(f"Total Questions: {len(questions)}")
    lines.append("="*80)
    lines.append("")
    
    for idx, q in enumerate(questions, 1):
        lines.append(f"\n{'='*80}")
        lines.append(f"QUESTION #{idx}")
        lines.append(f"{'='*80}")
        lines.append(f"ID: {q.get('id', 'N/A')}")
        lines.append(f"Schema: {q.get('schema_id', 'N/A')}")
        lines.append(f"Difficulty: {q.get('difficulty', 'N/A')}")
        lines.append(f"Run ID: {q.get('_run_id', 'N/A')}")
        lines.append(f"Attempts: {q.get('attempts', 'N/A')}")
        lines.append(f"Created: {q.get('created_at', 'N/A')}")
        
        # Token usage if available
        if q.get('token_usage'):
            tu = q['token_usage']
            lines.append(f"Token Usage: {tu.get('total_tokens', 0)} total ({tu.get('prompt_tokens', 0)} prompt + {tu.get('candidates_tokens', 0)} completion)")
        
        lines.append("")
        lines.append("-"*80)
        lines.append("QUESTION PACKAGE")
        lines.append("-"*80)
        
        q_pkg = q.get('question_package', {})
        question = q_pkg.get('question', {})
        solution = q_pkg.get('solution', {})
        distractor_map = q_pkg.get('distractor_map', {})
        
        # Question stem
        lines.append("STEM:")
        lines.append(question.get('stem', 'N/A'))
        lines.append("")
        
        # Options
        lines.append("OPTIONS:")
        correct = question.get('correct_option', 'N/A')
        for opt, text in sorted(question.get('options', {}).items()):
            marker = " [CORRECT]" if opt == correct else ""
            lines.append(f"  {opt}: {text}{marker}")
        lines.append(f"CORRECT_OPTION: {correct}")
        lines.append("")
        
        # Solution
        if solution:
            lines.append("SOLUTION:")
            if solution.get('reasoning'):
                lines.append("REASONING:")
                lines.append(solution.get('reasoning', 'N/A'))
                lines.append("")
            if solution.get('key_insight'):
                lines.append("KEY_INSIGHT:")
                lines.append(solution.get('key_insight', 'N/A'))
                lines.append("")
        
        # Distractor map
        if distractor_map:
            lines.append("DISTRACTOR_MAP:")
            for opt, desc in sorted(distractor_map.items()):
                marker = " [CORRECT]" if opt == correct else ""
                lines.append(f"  {opt}: {desc}{marker}")
            lines.append("")
        
        # Verifier report
        verifier = q.get('verifier_report', {})
        if verifier:
            lines.append("-"*80)
            lines.append("VERIFIER REPORT")
            lines.append("-"*80)
            lines.append(f"Verdict: {verifier.get('verdict', 'N/A')}")
            lines.append(f"Confidence: {verifier.get('confidence', 'N/A')}")
            if verifier.get('notes'):
                lines.append("Notes:")
                for note in verifier.get('notes', []):
                    lines.append(f"  - {note}")
            lines.append("")
        
        # Style report
        style = q.get('style_report', {})
        if style:
            lines.append("-"*80)
            lines.append("STYLE REPORT")
            lines.append("-"*80)
            lines.append(f"Verdict: {style.get('verdict', 'N/A')}")
            if style.get('scores'):
                lines.append("Scores:")
                for key, val in style.get('scores', {}).items():
                    lines.append(f"  {key}: {val}/10")
            if style.get('summary'):
                lines.append(f"Summary: {style.get('summary')}")
            lines.append("")
        
        # Idea plan
        idea = q.get('idea_plan', {})
        if idea:
            lines.append("-"*80)
            lines.append("IDEA PLAN (from Designer)")
            lines.append("-"*80)
            lines.append(f"Schema ID: {idea.get('schema_id', 'N/A')}")
            lines.append(f"Idea Summary: {idea.get('idea_summary', 'N/A')}")
            lines.append("")
        
        lines.append("")
    
    return "\n".join(lines)

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description='Export accepted questions in parseable format')
    parser.add_argument('--format', choices=['json', 'text'], default='json',
                       help='Output format: json (default) or text')
    parser.add_argument('--output', '-o', type=str, default=None,
                       help='Output file path (default: stdout)')
    
    args = parser.parse_args()
    export_questions(format_type=args.format, output_file=args.output)

