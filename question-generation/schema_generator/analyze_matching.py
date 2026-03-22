import fitz
import re
from pathlib import Path

def analyze_solution_pdf(pdf_path):
    """Analyze TMUA Official Solutions PDF structure"""
    print(f"\n{'='*80}")
    print(f"Analyzing Solutions: {pdf_path.name}")
    print(f"{'='*80}")
    
    doc = fitz.open(pdf_path)
    print(f"Total pages: {doc.page_count}")
    
    # Get all text
    all_text = ""
    for i in range(doc.page_count):
        all_text += doc.load_page(i).get_text("text") + "\n"
    
    lines = all_text.splitlines()
    
    # Look for question markers
    question_marker_patterns = [
        re.compile(r"^Question\s+(\d{1,2})[:\.]?\s*", re.IGNORECASE),
        re.compile(r"^Q\.?\s*(\d{1,2})[:\.]?\s*", re.IGNORECASE),
        re.compile(r"^(\d{1,2})[:\.\)]\s+", re.IGNORECASE),
    ]
    
    found_questions = []
    for idx, line in enumerate(lines):
        for pattern in question_marker_patterns:
            m = pattern.match(line.strip())
            if m:
                try:
                    qnum = int(m.group(1))
                    if 1 <= qnum <= 25:
                        found_questions.append((qnum, idx, line.strip(), pattern.pattern))
                        break
                except (ValueError, IndexError):
                    continue
    
    print(f"\nFound {len(found_questions)} question markers:")
    for qnum, idx, line, pattern in found_questions[:10]:
        try:
            print(f"  Q{qnum} at line {idx}: '{line[:60]}...' (pattern: {pattern[:30]})")
        except UnicodeEncodeError:
            print(f"  Q{qnum} at line {idx}: [contains special chars] (pattern: {pattern[:30]})")
    
    if len(found_questions) > 10:
        print(f"  ... and {len(found_questions) - 10} more")
    
    question_nums = sorted(set([q[0] for q in found_questions]))
    print(f"\nUnique question numbers: {question_nums}")
    
    doc.close()
    return question_nums

def analyze_paper_pdf(pdf_path):
    """Analyze TMUA Past Paper PDF structure"""
    print(f"\n{'='*80}")
    print(f"Analyzing Past Paper: {pdf_path.name}")
    print(f"{'='*80}")
    
    doc = fitz.open(pdf_path)
    
    # Get all text
    all_text = ""
    for i in range(doc.page_count):
        all_text += doc.load_page(i).get_text("text") + "\n"
    
    lines = all_text.splitlines()
    
    # Look for question starts
    QSTART_RE = re.compile(r"^\s*(\d{1,2})\s+(.*)$")
    
    starts = []
    for idx, line in enumerate(lines):
        m = QSTART_RE.match(line)
        if m:
            qnum = int(m.group(1))
            if 1 <= qnum <= 25:
                starts.append((qnum, idx, line.strip()))
    
    print(f"\nFound {len(starts)} question starts:")
    for qnum, idx, line in starts[:10]:
        try:
            print(f"  Q{qnum} at line {idx}: '{line[:60]}...'")
        except UnicodeEncodeError:
            print(f"  Q{qnum} at line {idx}: [contains special chars]")
    
    if len(starts) > 10:
        print(f"  ... and {len(starts) - 10} more")
    
    question_nums = sorted(set([s[0] for s in starts]))
    print(f"\nUnique question numbers: {question_nums}")
    
    doc.close()
    return question_nums

# Analyze problematic pair
print("\n" + "="*80)
print("ANALYZING PROBLEMATIC PAIR: TMUA 2019 Paper 2")
print("="*80)

paper_path = Path("papers/TMUA Paper 2/TMUA 2019 Paper 2/TMUA 2019 Paper 2 Past Paper.pdf")
solution_path = Path("papers/TMUA Paper 2/TMUA 2019 Paper 2/TMUA 2019 Paper 2 Official Solutions.pdf")

if paper_path.exists() and solution_path.exists():
    paper_qs = analyze_paper_pdf(paper_path)
    solution_qs = analyze_solution_pdf(solution_path)
    
    print(f"\n{'='*80}")
    print(f"MATCHING ANALYSIS")
    print(f"{'='*80}")
    print(f"Questions in Past Paper: {len(paper_qs)} - {paper_qs}")
    print(f"Questions in Solutions: {len(solution_qs)} - {solution_qs}")
    print(f"Questions in both: {sorted(set(paper_qs) & set(solution_qs))}")
    print(f"Questions only in paper: {sorted(set(paper_qs) - set(solution_qs))}")
    print(f"Questions only in solutions: {sorted(set(solution_qs) - set(paper_qs))}")

