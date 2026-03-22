#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Label TMUA Questions with Paper 1 / Paper 2

This script labels TMUA questions in the question bank that don't have paper labels yet.
It uses patterns from already-labeled questions and metadata to determine Paper 1 vs Paper 2.
"""

import os
import sys
import re
from dotenv import load_dotenv
from typing import List, Dict, Optional, Tuple

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


def determine_paper_from_metadata(question: Dict) -> Optional[str]:
    """
    Determine if a question is Paper 1 or Paper 2 based on metadata.
    Uses priority order (most to least reliable):
    1. Schema ID prefix (M_ = Paper 1, R_ = Paper 2)
    2. Primary tag patterns (Arg/Prf/Err = Paper 2, MM/M = Paper 1)
    3. idea_plan.paper (nested JSON)
    4. paper field (if populated)
    
    Returns 'Paper1' or 'Paper2' or None if can't determine.
    """
    # PRIORITY 1: Schema ID prefix (MOST RELIABLE)
    # M_ prefix = Paper 1 (e.g., M_206f3493, M_361a9633)
    # R_ prefix = Paper 2 (e.g., R_12345678)
    schema_id = question.get('schema_id', '')
    if schema_id:
        if schema_id.startswith('M_'):
            return 'Paper1'
        elif schema_id.startswith('R_'):
            return 'Paper2'
    
    # PRIORITY 2: Primary tag patterns
    # Paper 1: MM1-MM8, M1-M7
    # Paper 2: Arg1-Arg4, Prf1-Prf5, Err1-Err2
    primary_tag = question.get('primary_tag', '')
    if primary_tag:
        tag_upper = primary_tag.upper()
        tag_lower = primary_tag.lower()
        
        # Paper 2 tags: Arg, Prf (Proof), Err (Error)
        if tag_upper.startswith(('ARG', 'PRF', 'ERR')):
            return 'Paper2'
        
        # Paper 1 tags: MM (MM1-MM8) or M (M1-M7, but not if it's Arg/Prf/Err)
        if tag_upper.startswith('MM'):
            return 'Paper1'
        # M1-M7 are Paper 1, but be careful not to match Arg/Prf/Err
        if tag_upper.startswith('M') and len(tag_upper) >= 2:
            # Check if it's M followed by a digit (M1-M7, M10, etc.)
            second_char = tag_upper[1]
            if second_char.isdigit() or (second_char == '-' and len(tag_upper) >= 3 and tag_upper[2].isdigit()):
                return 'Paper1'
    
    # PRIORITY 3: idea_plan.paper (nested JSON)
    idea_plan = question.get('idea_plan', {})
    if isinstance(idea_plan, dict):
        paper_from_plan = idea_plan.get('paper')
        if paper_from_plan == 'Paper1' or paper_from_plan == 'Paper 1':
            return 'Paper1'
        elif paper_from_plan == 'Paper2' or paper_from_plan == 'Paper 2':
            return 'Paper2'
    
    # PRIORITY 4: paper field (if populated, but may be NULL)
    paper_field = question.get('paper')
    if paper_field == 'Paper1':
        return 'Paper1'
    elif paper_field == 'Paper2':
        return 'Paper2'
    
    return None


def label_tmua_questions(dry_run: bool = False):
    """Main function to label TMUA questions."""
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
    print("TMUA Question Labeling Script")
    print("=" * 80)
    print()
    
    # 1. Get all TMUA questions
    print("Fetching all TMUA questions...")
    try:
        response = client.table('ai_generated_questions').select('*').eq('test_type', 'TMUA').execute()
        all_questions = response.data if response.data else []
        print(f"Found {len(all_questions)} TMUA questions")
    except Exception as e:
        print(f"ERROR: Failed to fetch questions: {e}")
        return
    
    if not all_questions:
        print("No TMUA questions found. Exiting.")
        return
    
    # 2. Analyze existing labels
    labeled_paper1 = [q for q in all_questions if q.get('paper') == 'Paper1']
    labeled_paper2 = [q for q in all_questions if q.get('paper') == 'Paper2']
    unlabeled = [q for q in all_questions if not q.get('paper') or q.get('paper') not in ['Paper1', 'Paper2']]
    
    print(f"\nCurrent status:")
    print(f"  - Labeled as Paper1: {len(labeled_paper1)}")
    print(f"  - Labeled as Paper2: {len(labeled_paper2)}")
    print(f"  - Unlabeled: {len(unlabeled)}")
    print()
    
    # 3. Analyze patterns from labeled questions (for validation)
    if labeled_paper1 or labeled_paper2:
        print("Analyzing patterns from labeled questions (for validation)...")
        
        # Count by schema prefix
        paper1_m_prefix = sum(1 for q in labeled_paper1 if q.get('schema_id', '').startswith('M_'))
        paper1_r_prefix = sum(1 for q in labeled_paper1 if q.get('schema_id', '').startswith('R_'))
        paper2_m_prefix = sum(1 for q in labeled_paper2 if q.get('schema_id', '').startswith('M_'))
        paper2_r_prefix = sum(1 for q in labeled_paper2 if q.get('schema_id', '').startswith('R_'))
        
        print(f"  Paper1 questions:")
        print(f"    - With M_ prefix: {paper1_m_prefix}")
        print(f"    - With R_ prefix: {paper1_r_prefix} (unexpected!)")
        print(f"    - Total: {len(labeled_paper1)}")
        
        print(f"  Paper2 questions:")
        print(f"    - With M_ prefix: {paper2_m_prefix} (unexpected!)")
        print(f"    - With R_ prefix: {paper2_r_prefix}")
        print(f"    - Total: {len(labeled_paper2)}")
        
        # Show tag patterns
        paper1_tags = {q.get('primary_tag') for q in labeled_paper1 if q.get('primary_tag')}
        paper2_tags = {q.get('primary_tag') for q in labeled_paper2 if q.get('primary_tag')}
        print(f"  Paper1 tag examples: {sorted(list(paper1_tags))[:10]}")
        print(f"  Paper2 tag examples: {sorted(list(paper2_tags))[:10]}")
        print()
    
    # 4. Determine labels for unlabeled questions using reliable schema_id prefix
    if not unlabeled:
        print("All questions are already labeled!")
        return
    
    print(f"Determining labels for {len(unlabeled)} unlabeled questions...")
    print("Using priority order:")
    print("  1. Schema ID prefix (M_ = Paper 1, R_ = Paper 2) - MOST RELIABLE")
    print("  2. Primary tag patterns (Arg/Prf/Err = Paper 2, MM/M = Paper 1)")
    print("  3. idea_plan.paper (nested JSON)")
    print("  4. paper field (if populated)")
    print()
    
    labels_to_apply: List[Tuple[str, str]] = []  # List of (question_id, paper_label)
    labeled_count = 0
    cannot_determine = []
    
    # Track labeling method
    by_schema_prefix = 0
    by_primary_tag = 0
    by_idea_plan = 0
    by_paper_field = 0
    
    for question in unlabeled:
        question_id = question.get('id')
        if not question_id:
            continue
        
        # Use priority-based determination (schema_id prefix is most reliable)
        paper_label = None
        method = None
        
        # PRIORITY 1: Schema ID prefix
        schema_id = question.get('schema_id', '')
        if schema_id:
            if schema_id.startswith('M_'):
                paper_label = 'Paper1'
                method = 'schema_prefix'
                by_schema_prefix += 1
            elif schema_id.startswith('R_'):
                paper_label = 'Paper2'
                method = 'schema_prefix'
                by_schema_prefix += 1
        
        # PRIORITY 2: Primary tag (if schema didn't determine it)
        if not paper_label:
            primary_tag = question.get('primary_tag', '')
            if primary_tag:
                tag_upper = primary_tag.upper()
                if tag_upper.startswith(('ARG', 'PRF', 'ERR')):
                    paper_label = 'Paper2'
                    method = 'primary_tag'
                    by_primary_tag += 1
                elif tag_upper.startswith('MM') or (tag_upper.startswith('M') and len(tag_upper) >= 2 and (tag_upper[1].isdigit() or tag_upper[1] == '-')):
                    paper_label = 'Paper1'
                    method = 'primary_tag'
                    by_primary_tag += 1
        
        # PRIORITY 3: idea_plan.paper
        if not paper_label:
            idea_plan = question.get('idea_plan', {})
            if isinstance(idea_plan, dict):
                paper_from_plan = idea_plan.get('paper')
                if paper_from_plan in ['Paper1', 'Paper 1']:
                    paper_label = 'Paper1'
                    method = 'idea_plan'
                    by_idea_plan += 1
                elif paper_from_plan in ['Paper2', 'Paper 2']:
                    paper_label = 'Paper2'
                    method = 'idea_plan'
                    by_idea_plan += 1
        
        # PRIORITY 4: paper field
        if not paper_label:
            paper_field = question.get('paper')
            if paper_field == 'Paper1':
                paper_label = 'Paper1'
                method = 'paper_field'
                by_paper_field += 1
            elif paper_field == 'Paper2':
                paper_label = 'Paper2'
                method = 'paper_field'
                by_paper_field += 1
        
        if paper_label:
            labels_to_apply.append((question_id, paper_label))
            labeled_count += 1
        else:
            cannot_determine.append({
                'id': question_id,
                'schema_id': question.get('schema_id'),
                'primary_tag': question.get('primary_tag'),
            })
    
    print(f"Labeling method breakdown:")
    print(f"  - By schema prefix (M_/R_): {by_schema_prefix}")
    print(f"  - By primary tag: {by_primary_tag}")
    print(f"  - By idea_plan.paper: {by_idea_plan}")
    print(f"  - By paper field: {by_paper_field}")
    print(f"  - Total labeled: {labeled_count}")
    print(f"  - Cannot determine: {len(cannot_determine)}")
    print()
    
    print(f"  - Can be labeled: {labeled_count}")
    print(f"  - Cannot determine: {len(cannot_determine)}")
    print()
    
    if cannot_determine:
        print("Questions that could not be automatically labeled:")
        for q in cannot_determine[:10]:  # Show first 10
            print(f"  - ID: {q['id']}, schema_id: {q['schema_id']}, primary_tag: {q['primary_tag']}")
        if len(cannot_determine) > 10:
            print(f"  ... and {len(cannot_determine) - 10} more")
        print()
    
    # 5. Show preview of labels to apply
    if labels_to_apply:
        print(f"Preview of labels to apply (first 10):")
        paper1_count = sum(1 for _, label in labels_to_apply if label == 'Paper1')
        paper2_count = sum(1 for _, label in labels_to_apply if label == 'Paper2')
        print(f"  - Paper1: {paper1_count}")
        print(f"  - Paper2: {paper2_count}")
        
        # Show sample labels
        for i, (question_id, paper_label) in enumerate(labels_to_apply[:10]):
            q = next((q for q in unlabeled if q.get('id') == question_id), None)
            if q:
                print(f"    {paper_label}: id={question_id[:8]}..., schema={q.get('schema_id')}, tag={q.get('primary_tag')}")
        if len(labels_to_apply) > 10:
            print(f"    ... and {len(labels_to_apply) - 10} more")
        print()
    
    # 6. Apply labels
    if not labels_to_apply:
        print("No labels to apply. Exiting.")
        return
    
    if dry_run:
        print("=" * 80)
        print("DRY RUN MODE - No changes will be made to the database")
        print(f"Would label {len(labels_to_apply)} questions:")
        print(f"  - Paper1: {paper1_count}")
        print(f"  - Paper2: {paper2_count}")
        print(f"  - Could not determine: {len(cannot_determine)}")
        print("=" * 80)
        print("\nRun without --dry-run to apply labels.")
        return
    
    print(f"Applying labels to {len(labels_to_apply)} questions...")
    print()
    
    # Update in batches
    batch_size = 50
    updated_count = 0
    failed_count = 0
    
    for i in range(0, len(labels_to_apply), batch_size):
        batch = labels_to_apply[i:i + batch_size]
        
        for question_id, paper_label in batch:
            try:
                result = client.table('ai_generated_questions').update({
                    'paper': paper_label,
                    'tags_labeled_by': 'script:label_tmua_questions',
                }).eq('id', question_id).execute()
                
                if result.data:
                    updated_count += 1
                else:
                    failed_count += 1
                    print(f"  Warning: Failed to update question {question_id}")
            except Exception as e:
                failed_count += 1
                print(f"  Error updating question {question_id}: {e}")
        
        # Progress indicator
        if (i + batch_size) < len(labels_to_apply):
            print(f"  Updated {min(i + batch_size, len(labels_to_apply))}/{len(labels_to_apply)}...")
    
    print()
    print("=" * 80)
    print("Labeling complete!")
    print(f"  - Successfully labeled: {updated_count}")
    print(f"  - Failed: {failed_count}")
    print(f"  - Could not determine: {len(cannot_determine)}")
    print("=" * 80)


if __name__ == '__main__':
    # Check for --dry-run flag
    dry_run = '--dry-run' in sys.argv or '-n' in sys.argv
    
    try:
        label_tmua_questions(dry_run=dry_run)
    except KeyboardInterrupt:
        print("\n\nScript interrupted by user.")
        sys.exit(1)
    except Exception as e:
        print(f"\n\nERROR: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

