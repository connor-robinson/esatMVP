import fitz
from pathlib import Path

def show_page_content(pdf_path, page_num):
    """Show raw page text to understand structure"""
    doc = fitz.open(pdf_path)
    page = doc.load_page(page_num)
    text = page.get_text("text")
    
    print(f"\n{'='*80}")
    print(f"Page {page_num + 1} of {pdf_path.name}")
    print(f"{'='*80}")
    
    lines = text.splitlines()
    for i, line in enumerate(lines[:100], 1):  # First 100 lines
        try:
            # Show line numbers and content
            print(f"{i:3d}: {repr(line)}")
        except UnicodeEncodeError:
            print(f"{i:3d}: [special chars]")
    
    doc.close()

# Check first few pages of a TMUA paper to see the REAL format
papers_to_check = [
    (Path("papers/TMUA Paper 2/TMUA 2023 Paper 2/TMUA 2023 Paper 2 Past Paper.pdf"), [1, 2, 3]),  # Pages 2, 3, 4
    (Path("papers/TMUA Paper 1/TMUA 2023 Paper 1/TMUA 2023 Paper 1 Past Paper.pdf"), [1, 2]),  # Pages 2, 3
]

for pdf_path, pages in papers_to_check:
    if pdf_path.exists():
        for page_num in pages:
            show_page_content(pdf_path, page_num)












