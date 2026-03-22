import fitz
import re
from pathlib import Path

def analyze_pdf(pdf_path):
    """Analyze TMUA PDF structure"""
    print(f"\n{'='*80}")
    print(f"Analyzing: {pdf_path.name}")
    print(f"{'='*80}")
    
    doc = fitz.open(pdf_path)
    print(f"Total pages: {doc.page_count}")
    
    # Check first page
    page = doc.load_page(0)
    text = page.get_text("text")
    
    print(f"\nFirst page text length: {len(text)} chars")
    print(f"\nFirst 500 chars:")
    print(text[:500])
    
    # Look for question patterns
    print(f"\n--- Question Pattern Analysis ---")
    
    # Try different patterns
    patterns = [
        (r"^\s*(\d{1,2})\s+", "Pattern 1: 'N ' at line start"),
        (r"^\s*(\d{1,2})\.", "Pattern 2: 'N.' at line start"),
        (r"Question\s+(\d{1,2})", "Pattern 3: 'Question N'"),
        (r"^(\d{1,2})\s*$", "Pattern 4: 'N' alone on line"),
    ]
    
    for pattern, desc in patterns:
        matches = re.findall(pattern, text, re.MULTILINE)
        if matches:
            print(f"{desc}: Found {len(matches)} matches: {matches[:5]}")
    
    # Check for option letters
    print(f"\n--- Option Letter Analysis ---")
    option_patterns = [
        (r'\bA\)', "A)"),
        (r'\(A\)', "(A)"),
        (r'\bA\b', "standalone A"),
        (r'\bA\s+[A-Z]', "A followed by capital"),
    ]
    
    for pattern, desc in option_patterns:
        matches = re.findall(pattern, text)
        if matches:
            print(f"{desc}: Found {len(matches)} matches")
    
    # Get all text from all pages
    all_text = ""
    for i in range(doc.page_count):
        all_text += doc.load_page(i).get_text("text") + "\n"
    
    print(f"\n--- Full Document Analysis ---")
    print(f"Total chars: {len(all_text)}")
    
    # Count question numbers
    question_nums = set()
    for match in re.finditer(r'^\s*(\d{1,2})\s+', all_text, re.MULTILINE):
        qnum = int(match.group(1))
        if 1 <= qnum <= 25:
            question_nums.add(qnum)
    
    print(f"Question numbers found (Pattern 1): {sorted(question_nums)}")
    print(f"Total unique questions: {len(question_nums)}")
    
    doc.close()

# Analyze multiple papers
papers = [
    Path("papers/TMUA Paper 2/TMUA 2019 Paper 2/TMUA 2019 Paper 2 Past Paper.pdf"),
    Path("papers/TMUA Paper 1/TMUA 2021 Paper 1/TMUA 2021 Paper 1 Past Paper.pdf"),
    Path("papers/TMUA Paper 2/TMUA 2023 Paper 2/TMUA 2023 Paper 2 Past Paper.pdf"),
    Path("papers/TMUA Paper 1/TMUA 2023 Paper 1/TMUA 2023 Paper 1 Past Paper.pdf"),
]

for paper in papers:
    if paper.exists():
        try:
            analyze_pdf(paper)
        except Exception as e:
            print(f"Error analyzing {paper.name}: {e}")
    else:
        print(f"Not found: {paper}")












