#!/usr/bin/env python3
"""
Tag Lookup Utility

Look up curriculum tag information from prefixed codes like:
- M2-MM1 (Math 2, topic MM1)
- biology-B1 (Biology, topic B1)
- P-P3 (Physics, topic P3)
- chemistry-C5 (Chemistry, topic C5)
"""

import sys
from pathlib import Path
from curriculum_parser import CurriculumParser

def lookup_tag(tag_code: str):
    """Look up information about a curriculum tag."""
    # Initialize parser
    base_dir = Path(__file__).parent
    curriculum_path = base_dir / "by_subject_prompts" / "ESAT curriculum.md"
    
    try:
        parser = CurriculumParser(str(curriculum_path))
    except Exception as e:
        print(f"Error loading curriculum: {e}")
        return
    
    # Try to get topic info
    topic_info = parser.get_topic_info(tag_code)
    
    if topic_info:
        print(f"\n✓ Found tag: {tag_code}")
        print(f"  Title: {topic_info.get('title', 'N/A')}")
        print(f"  Paper: {topic_info.get('paper_name', 'N/A')} ({topic_info.get('paper_id', 'N/A')})")
        print(f"  Prefixed Code: {topic_info.get('prefixed_code', tag_code)}")
        if 'description' in topic_info:
            print(f"  Description: {topic_info['description']}")
    else:
        # Try to normalize it
        normalized = parser.normalize_topic_code(tag_code)
        if normalized:
            print(f"\n⚠ Tag '{tag_code}' normalized to: {normalized}")
            topic_info = parser.get_topic_info(normalized)
            if topic_info:
                print(f"  Title: {topic_info.get('title', 'N/A')}")
                print(f"  Paper: {topic_info.get('paper_name', 'N/A')} ({topic_info.get('paper_id', 'N/A')})")
        else:
            print(f"\n✗ Tag '{tag_code}' not found in curriculum")
            print("\nValid tag formats:")
            print("  Math 1: M1-M1, M1-M2, M1-M3, ...")
            print("  Math 2: M2-MM1, M2-MM2, M2-MM3, ...")
            print("  Physics: P-P1, P-P2, P-P3, ...")
            print("  Biology: biology-B1, biology-B2, biology-B3, ...")
            print("  Chemistry: chemistry-C1, chemistry-C2, chemistry-C3, ...")

def list_all_tags():
    """List all available tags grouped by paper."""
    base_dir = Path(__file__).parent
    curriculum_path = base_dir / "by_subject_prompts" / "ESAT curriculum.md"
    
    try:
        parser = CurriculumParser(str(curriculum_path))
    except Exception as e:
        print(f"Error loading curriculum: {e}")
        return
    
    summary = parser.get_curriculum_summary()
    print("\n📚 Available Curriculum Tags:\n")
    
    for paper in summary["papers"]:
        paper_id = paper["paper_id"]
        paper_name = paper["paper_name"]
        topics = parser.get_topics_for_paper(paper_id)
        
        print(f"{paper_name} ({paper_id}):")
        for topic in topics:
            raw_code = topic["code"]
            prefixed = parser._get_prefixed_code(paper_id, raw_code)
            title = topic.get("title", "N/A")
            print(f"  {prefixed:20s} - {title}")
        print()

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage:")
        print("  python lookup_tag.py <tag_code>     # Look up a specific tag")
        print("  python lookup_tag.py --list          # List all available tags")
        print("\nExamples:")
        print("  python lookup_tag.py M2-MM1")
        print("  python lookup_tag.py biology-B1")
        print("  python lookup_tag.py P-P3")
        print("  python lookup_tag.py chemistry-C5")
        sys.exit(1)
    
    if sys.argv[1] == "--list":
        list_all_tags()
    else:
        lookup_tag(sys.argv[1])
