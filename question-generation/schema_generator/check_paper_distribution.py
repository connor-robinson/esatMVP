"""Check distribution of Paper 1 vs Paper 2 questions in the index."""

import os
import sys
import json
from pathlib import Path
from collections import Counter

os.environ["SCHEMA_MODE"] = "TMUA"
sys.path.insert(0, str(Path(__file__).parent))

from schemagenerator import INDEX_JSON, safe_read_text

if not INDEX_JSON.exists():
    print(f"Index file not found: {INDEX_JSON}")
    sys.exit(1)

index = json.loads(safe_read_text(INDEX_JSON))

paper1 = [q for q in index if q.get('section') and 'Paper 1' in q.get('section', '')]
paper2 = [q for q in index if q.get('section') and 'Paper 2' in q.get('section', '')]
unknown = [q for q in index if not (q.get('section') and ('Paper 1' in q.get('section', '') or 'Paper 2' in q.get('section', '')))]

print(f"Total questions in index: {len(index)}")
print(f"Paper 1 questions: {len(paper1)}")
print(f"Paper 2 questions: {len(paper2)}")
print(f"Unknown/Other: {len(unknown)}")
print()

# Group by year
paper1_years = Counter(q.get('year') for q in paper1 if q.get('year'))
paper2_years = Counter(q.get('year') for q in paper2 if q.get('year'))

print("Paper 1 questions by year:")
for year in sorted(paper1_years.keys()):
    print(f"  {year}: {paper1_years[year]} questions")
print()

print("Paper 2 questions by year:")
for year in sorted(paper2_years.keys()):
    print(f"  {year}: {paper2_years[year]} questions")
print()

# Check PDFs
paper1_pdfs = set(q.get('pdf_path', '') for q in paper1)
paper2_pdfs = set(q.get('pdf_path', '') for q in paper2)

print(f"Paper 1 PDFs: {len(paper1_pdfs)}")
print(f"Paper 2 PDFs: {len(paper2_pdfs)}")
print()

# Check if there are Paper 1 PDFs that might not have been indexed
papers_dir = Path(__file__).resolve().parent / "papers"
if papers_dir.exists():
    paper1_dirs = list((papers_dir / "TMUA Paper 1").glob("*")) if (papers_dir / "TMUA Paper 1").exists() else []
    paper2_dirs = list((papers_dir / "TMUA Paper 2").glob("*")) if (papers_dir / "TMUA Paper 2").exists() else []
    print(f"Paper 1 directories found: {len(paper1_dirs)}")
    print(f"Paper 2 directories found: {len(paper2_dirs)}")










