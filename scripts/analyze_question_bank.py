#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Analyze Question Bank - Display all questions categorized by test_type and subject/paper

This script queries all questions from the question bank and categorizes them:
- ESAT questions: Physics, Biology, Chemistry, Math 1, Math 2
- TMUA questions: Paper 1, Paper 2
"""

import os
import sys
from dotenv import load_dotenv
from typing import Dict, List
from collections import defaultdict

# Configure UTF-8 encoding for Windows console
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except AttributeError:
        import codecs
        sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
        sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')

# Try multiple paths for .env.local
script_dir = os.path.dirname(os.path.abspath(__file__))
env_paths = [
    os.path.join(script_dir, '..', '.env.local'),
    os.path.join(script_dir, '.env.local'),
    '.env.local',
]
for env_path in env_paths:
    if os.path.exists(env_path):
        load_dotenv(env_path)
        break
else:
    load_dotenv('.env.local')

try:
    from supabase import create_client, Client
except ImportError:
    print("ERROR: supabase-py not installed.")
    print("Installing supabase...")
    os.system(f"{sys.executable} -m pip install supabase python-dotenv")
    from supabase import create_client, Client


def categorize_question(question: Dict) -> str:
    """
    Categorize a question into its subject/paper category.
    Returns: "ESAT: Physics", "ESAT: Math 1", "TMUA: Paper 1", etc.
    """
    test_type = question.get('test_type', 'ESAT')  # Default to ESAT
    paper = question.get('paper')
    schema_id = question.get('schema_id', '')
    primary_tag = question.get('primary_tag', '')
    
    if test_type == 'TMUA':
        # TMUA questions: Paper 1 or Paper 2
        if paper == 'Paper1' or paper == 'Paper2':
            return f"TMUA: {paper}"
        # Infer from schema_id prefix
        elif schema_id.startswith('M_'):
            return "TMUA: Paper1"
        elif schema_id.startswith('R_'):
            return "TMUA: Paper2"
        else:
            return "TMUA: Unknown"
    
    elif test_type == 'ESAT':
        # ESAT questions: Physics, Biology, Chemistry, Math 1, Math 2
        if paper == 'Math 1':
            return "ESAT: Math 1"
        elif paper == 'Math 2':
            return "ESAT: Math 2"
        else:
            # Infer from schema_id or primary_tag
            schema_upper = schema_id.upper()
            tag_upper = primary_tag.upper() if primary_tag else ''
            
            # Physics
            if schema_upper.startswith('P') or tag_upper.startswith('P-'):
                return "ESAT: Physics"
            # Biology
            elif schema_upper.startswith('B') or tag_upper.startswith('BIOLOGY-'):
                return "ESAT: Biology"
            # Chemistry
            elif schema_upper.startswith('C') or tag_upper.startswith('CHEMISTRY-'):
                return "ESAT: Chemistry"
            # Math 1
            elif schema_upper.startswith('M1') or tag_upper.startswith('M1-'):
                return "ESAT: Math 1"
            # Math 2
            elif (schema_upper.startswith('M') and not schema_upper.startswith('M1')) or tag_upper.startswith('M2-'):
                return "ESAT: Math 2"
            else:
                return "ESAT: Unknown"
    
    else:
        return f"{test_type}: Unknown"


def analyze_question_bank():
    """Main function to analyze and display question bank."""
    # Get Supabase credentials
    supabase_url = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
    
    if not supabase_url or not supabase_key:
        print("ERROR: Missing Supabase credentials!")
        print("Please set SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and")
        print("SUPABASE_SERVICE_ROLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY)")
        print("in your .env.local file.")
        return
    
    try:
        client = create_client(supabase_url, supabase_key)
    except Exception as e:
        print(f"ERROR: Failed to connect to Supabase: {e}")
        return
    
    print("=" * 80)
    print("Question Bank Analysis")
    print("=" * 80)
    print()
    
    # Fetch all questions
    print("Fetching all questions from question bank...")
    try:
        # Get all questions (no filter)
        response = client.table('ai_generated_questions').select('*').execute()
        all_questions = response.data if response.data else []
        print(f"Found {len(all_questions)} total questions")
        print()
    except Exception as e:
        print(f"ERROR: Failed to fetch questions: {e}")
        return
    
    if not all_questions:
        print("No questions found in the question bank.")
        return
    
    # Categorize questions
    categories = defaultdict(list)
    category_counts = defaultdict(int)
    
    for question in all_questions:
        category = categorize_question(question)
        categories[category].append(question)
        category_counts[category] += 1
    
    # Display results
    print("=" * 80)
    print("QUESTION BANK CATEGORIZATION")
    print("=" * 80)
    print()
    
    # ESAT Questions
    print("📚 ESAT QUESTIONS")
    print("-" * 80)
    esat_categories = sorted([cat for cat in category_counts.keys() if cat.startswith('ESAT')])
    if esat_categories:
        total_esat = sum(category_counts[cat] for cat in esat_categories)
        print(f"Total ESAT questions: {total_esat}")
        print()
        
        for cat in esat_categories:
            count = category_counts[cat]
            subject = cat.replace('ESAT: ', '')
            print(f"  • {subject:20s} : {count:5d} questions")
    else:
        print("  No ESAT questions found")
    print()
    
    # TMUA Questions
    print("🧮 TMUA QUESTIONS")
    print("-" * 80)
    tmua_categories = sorted([cat for cat in category_counts.keys() if cat.startswith('TMUA')])
    if tmua_categories:
        total_tmua = sum(category_counts[cat] for cat in tmua_categories)
        print(f"Total TMUA questions: {total_tmua}")
        print()
        
        for cat in tmua_categories:
            count = category_counts[cat]
            paper = cat.replace('TMUA: ', '')
            print(f"  • {paper:20s} : {count:5d} questions")
    else:
        print("  No TMUA questions found")
    print()
    
    # Summary
    print("=" * 80)
    print("SUMMARY")
    print("=" * 80)
    print(f"Total questions in bank: {len(all_questions)}")
    print(f"ESAT questions: {sum(category_counts[cat] for cat in category_counts.keys() if cat.startswith('ESAT'))}")
    print(f"TMUA questions: {sum(category_counts[cat] for cat in category_counts.keys() if cat.startswith('TMUA'))}")
    print(f"Other/Unknown: {sum(category_counts[cat] for cat in category_counts.keys() if not cat.startswith(('ESAT', 'TMUA')))}")
    print()
    
    # Detailed breakdown by test_type
    print("=" * 80)
    print("BREAKDOWN BY TEST_TYPE")
    print("=" * 80)
    
    test_type_counts = defaultdict(int)
    test_type_details = defaultdict(lambda: defaultdict(int))
    
    for question in all_questions:
        test_type = question.get('test_type', 'ESAT')
        category = categorize_question(question)
        test_type_counts[test_type] += 1
        test_type_details[test_type][category] += 1
    
    for test_type in sorted(test_type_counts.keys()):
        count = test_type_counts[test_type]
        print(f"\n{test_type}: {count} questions")
        print("-" * 80)
        for category in sorted(test_type_details[test_type].keys()):
            cat_count = test_type_details[test_type][category]
            subject_paper = category.replace(f'{test_type}: ', '')
            percentage = (cat_count / count * 100) if count > 0 else 0
            print(f"  • {subject_paper:25s} : {cat_count:5d} ({percentage:5.1f}%)")
    
    print()
    print("=" * 80)
    
    # Show sample questions from each category
    print()
    print("=" * 80)
    print("SAMPLE QUESTIONS BY CATEGORY")
    print("=" * 80)
    
    for category in sorted(categories.keys()):
        questions = categories[category]
        if questions:
            print(f"\n{category}: {len(questions)} questions")
            print("-" * 80)
            # Show first 3 sample questions
            for i, q in enumerate(questions[:3], 1):
                gen_id = q.get('generation_id', q.get('id', 'unknown'))[:20]
                schema_id = q.get('schema_id', 'N/A')
                difficulty = q.get('difficulty', 'N/A')
                status = q.get('status', 'N/A')
                paper_field = q.get('paper', 'NULL')
                primary_tag = q.get('primary_tag', 'NULL')
                
                print(f"  {i}. ID: {gen_id}...")
                print(f"     Schema: {schema_id}, Difficulty: {difficulty}, Status: {status}")
                print(f"     Paper field: {paper_field}, Primary tag: {primary_tag}")
            if len(questions) > 3:
                print(f"  ... and {len(questions) - 3} more")
    
    print()
    print("=" * 80)
    print("Analysis complete!")
    print("=" * 80)


if __name__ == '__main__':
    try:
        analyze_question_bank()
    except KeyboardInterrupt:
        print("\n\nScript interrupted by user.")
        sys.exit(1)
    except Exception as e:
        print(f"\n\nERROR: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)





