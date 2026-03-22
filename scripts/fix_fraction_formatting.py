#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Fix fraction formatting in question options

This script checks all questions in the database and fixes any \frac{...} 
expressions in options that are not wrapped in $ delimiters for KaTeX rendering.
"""

import os
import sys
import json
import re
from typing import Dict, Any, List, Tuple

# Configure UTF-8 encoding for Windows console
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except AttributeError:
        import codecs
        sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
        sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')

try:
    from supabase import create_client, Client
    _SUPABASE_AVAILABLE = True
except ImportError:
    _SUPABASE_AVAILABLE = False
    print("Error: supabase-py not installed. Install with: pip install supabase")
    sys.exit(1)


def get_supabase_client() -> Client:
    """Create and return Supabase client"""
    supabase_url = os.environ.get("SUPABASE_URL") or os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
    supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    
    if not supabase_url or not supabase_key:
        print("Error: SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_KEY) and SUPABASE_SERVICE_ROLE_KEY must be set")
        print(f"SUPABASE_URL: {'SET' if supabase_url else 'NOT SET'}")
        print(f"SUPABASE_SERVICE_ROLE_KEY: {'SET' if supabase_key else 'NOT SET'}")
        sys.exit(1)
    
    return create_client(supabase_url, supabase_key)


def is_position_in_math_delimiters(text: str, position: int) -> bool:
    """
    Check if a given position in text is inside $...$ or $$...$$ delimiters.
    """
    # Find all math delimiter ranges
    # First, find display math ($$...$$) - these take precedence
    display_pattern = re.compile(r'\$\$')
    display_matches = list(display_pattern.finditer(text))
    
    # Pair up $$ delimiters
    display_ranges = []
    i = 0
    while i < len(display_matches) - 1:
        start = display_matches[i].start()
        end = display_matches[i + 1].end()
        display_ranges.append((start, end))
        i += 2
    
    # Check if position is in any display math range
    for start, end in display_ranges:
        if start <= position < end:
            return True
    
    # Now find inline math ($...$) that doesn't overlap with display math
    inline_pattern = re.compile(r'(?<!\$)\$(?!\$)[^$]*?\$(?!\$)')
    for match in inline_pattern.finditer(text):
        start, end = match.span()
        # Check if this overlaps with any display math
        overlaps = any(start >= dm_start and start < dm_end for dm_start, dm_end in display_ranges)
        if not overlaps:
            if start <= position < end:
                return True
    
    return False


def has_frac_without_delimiters(text: str) -> bool:
    """
    Check if text contains \frac{...} that is not wrapped in $ delimiters.
    Returns True if there's a \frac that needs fixing.
    """
    if not text or not isinstance(text, str):
        return False
    
    # Find all \frac{...} occurrences
    # Pattern matches \frac{...}{...} with proper brace matching
    frac_pattern = re.compile(r'\\frac\{[^}]*\}\{[^}]*\}')
    
    for match in frac_pattern.finditer(text):
        # Check if the start of this \frac is inside math delimiters
        if not is_position_in_math_delimiters(text, match.start()):
            return True
    
    return False


def fix_frac_formatting(text: str) -> str:
    """
    Wrap any \frac{...} expressions that are not already in $ delimiters
    with $ delimiters.
    """
    if not text or not isinstance(text, str):
        return text
    
    # Find all \frac{...} occurrences
    frac_pattern = re.compile(r'\\frac\{[^}]*\}\{[^}]*\}')
    frac_matches = list(frac_pattern.finditer(text))
    
    # Process matches in reverse order to maintain correct indices
    result = text
    for frac_match in reversed(frac_matches):
        frac_start, frac_end = frac_match.span()
        
        # Check if this \frac is inside math delimiters
        if not is_position_in_math_delimiters(result, frac_start):
            # Wrap this \frac with $ delimiters
            frac_content = frac_match.group(0)
            result = result[:frac_start] + '$' + frac_content + '$' + result[frac_end:]
    
    return result


def check_and_fix_question(client: Client, question: Dict[str, Any], dry_run: bool = False) -> Tuple[bool, Dict[str, str]]:
    """
    Check a question's options for fraction formatting issues and fix them.
    Returns (needs_fix, updated_options)
    """
    options = question.get('options', {})
    if not options:
        return False, {}
    
    # Parse options if it's a string
    if isinstance(options, str):
        try:
            options = json.loads(options)
        except json.JSONDecodeError:
            print(f"  Warning: Could not parse options for question {question.get('id')}")
            return False, {}
    
    updated_options = {}
    needs_fix = False
    
    for option_key, option_value in options.items():
        if not isinstance(option_value, str):
            updated_options[option_key] = option_value
            continue
        
        if has_frac_without_delimiters(option_value):
            needs_fix = True
            fixed_value = fix_frac_formatting(option_value)
            updated_options[option_key] = fixed_value
            if not dry_run:
                print(f"    Fixed option {option_key}: {option_value[:50]}... -> {fixed_value[:50]}...")
        else:
            updated_options[option_key] = option_value
    
    return needs_fix, updated_options


def main():
    """Main function"""
    import argparse
    
    parser = argparse.ArgumentParser(description='Fix fraction formatting in question options')
    parser.add_argument('--dry-run', action='store_true', help='Check for issues without making changes')
    parser.add_argument('--limit', type=int, default=None, help='Limit number of questions to process')
    args = parser.parse_args()
    
    print("=" * 80)
    print("Fraction Formatting Fix Script")
    print("=" * 80)
    print()
    
    if args.dry_run:
        print("DRY RUN MODE: No changes will be made to the database")
        print()
    
    if not _SUPABASE_AVAILABLE:
        print("Error: supabase-py not installed")
        sys.exit(1)
    
    client = get_supabase_client()
    
    # Fetch all questions
    print("Fetching questions from database...")
    query = client.table('ai_generated_questions').select('id, options, generation_id, schema_id')
    
    if args.limit:
        query = query.limit(args.limit)
    
    response = query.execute()
    questions = response.data if hasattr(response, 'data') else []
    
    print(f"Found {len(questions)} questions to check")
    print()
    
    # Check each question
    questions_needing_fix = []
    total_options_fixed = 0
    
    for i, question in enumerate(questions, 1):
        question_id = question.get('id')
        generation_id = question.get('generation_id', 'unknown')
        schema_id = question.get('schema_id', 'unknown')
        
        needs_fix, updated_options = check_and_fix_question(client, question, dry_run=args.dry_run)
        
        if needs_fix:
            questions_needing_fix.append({
                'id': question_id,
                'generation_id': generation_id,
                'schema_id': schema_id,
                'updated_options': updated_options
            })
            
            # Count how many options were fixed
            original_options = question.get('options', {})
            if isinstance(original_options, str):
                try:
                    original_options = json.loads(original_options)
                except:
                    original_options = {}
            
            fixed_count = sum(
                1 for key in updated_options
                if key in original_options and updated_options[key] != original_options[key]
            )
            total_options_fixed += fixed_count
            
            if not args.dry_run:
                print(f"  Question {i}/{len(questions)}: {generation_id} ({schema_id}) - {fixed_count} option(s) fixed")
            else:
                print(f"  Question {i}/{len(questions)}: {generation_id} ({schema_id}) - {fixed_count} option(s) need fixing")
    
    print()
    print("=" * 80)
    print(f"Summary:")
    print(f"  Total questions checked: {len(questions)}")
    print(f"  Questions needing fix: {len(questions_needing_fix)}")
    print(f"  Total options fixed: {total_options_fixed}")
    print("=" * 80)
    
    if args.dry_run:
        print()
        print("This was a dry run. Run without --dry-run to apply fixes.")
        return
    
    if not questions_needing_fix:
        print()
        print("No questions need fixing!")
        return
    
    # Apply fixes
    print()
    print("Applying fixes to database...")
    
    for i, question_data in enumerate(questions_needing_fix, 1):
        question_id = question_data['id']
        updated_options = question_data['updated_options']
        
        try:
            response = client.table('ai_generated_questions').update({
                'options': updated_options
            }).eq('id', question_id).execute()
            
            print(f"  [{i}/{len(questions_needing_fix)}] Updated question {question_data['generation_id']}")
        except Exception as e:
            print(f"  ERROR updating question {question_data['generation_id']}: {e}")
    
    print()
    print("Done!")


if __name__ == '__main__':
    main()

