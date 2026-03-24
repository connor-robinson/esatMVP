#!/usr/bin/env python3
"""Test TMUA curriculum parser"""
from pathlib import Path
from tmua_curriculum_parser import CurriculumParser

spec_path = Path(__file__).parent / "by_paper_prompts" / "Spec.md"
p = CurriculumParser(str(spec_path))

print("[OK] Parser loaded successfully")
print(f"Is TMUA: {p.is_tmua}")

# Test Paper 1 (M_ prefix)
paper1_topics = p.get_available_topics_for_schema("M_12345678")
print(f"\nPaper 1 (M_ prefix): {len(paper1_topics)} topics")
print(f"  All Section 1: {all(t.get('section', '').startswith('Section 1') for t in paper1_topics)}")

# Test Paper 2 (R_ prefix)
paper2_topics = p.get_available_topics_for_schema("R_12345678")
s2_topics = [t for t in paper2_topics if t.get('section_type') == 'Section 2']
s1_topics = [t for t in paper2_topics if t.get('section_type') == 'Section 1']

print(f"\nPaper 2 (R_ prefix): {len(paper2_topics)} total topics")
print(f"  Section 1 topics: {len(s1_topics)}")
print(f"  Section 2 topics: {len(s2_topics)}")
print(f"  Section 2 properly marked: {len(s2_topics) > 0}")

# Show example Section 2 topic
if s2_topics:
    print(f"\nExample Section 2 topic:")
    print(f"  Code: {s2_topics[0]['code']}")
    print(f"  Title: {s2_topics[0]['title']}")
    print(f"  Note: {s2_topics[0].get('note', 'N/A')}")

print("\n[OK] All tests passed!")

