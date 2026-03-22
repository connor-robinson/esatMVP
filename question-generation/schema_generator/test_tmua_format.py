# -*- coding: utf-8 -*-
import fitz
import re
from pathlib import Path

def test_tmua_question_format():
    """Test different TMUA papers to understand question format"""
    papers = [
        Path("papers/TMUA Paper 2/TMUA 2023 Paper 2/TMUA 2023 Paper 2 Past Paper.pdf"),
        Path("papers/TMUA Paper 1/TMUA 2023 Paper 1/TMUA 2023 Paper 1 Past Paper.pdf"),
        Path("papers/TMUA Paper 2/TMUA 2019 Paper 2/TMUA 2019 Paper 2 Past Paper.pdf"),
    ]
    
    for pdf_path in papers:
        if not pdf_path.exists():
            continue
            
        print(f"\n{'='*80}")
        print(f"Testing: {pdf_path.name}")
        print(f"{'='*80}")
        
        doc = fitz.open(pdf_path)
        
        # Skip first page (usually cover/instructions), check next 5 pages
        for page_idx in range(1, min(6, doc.page_count)):
            page = doc.load_page(page_idx)
            text = page.get_text("text")
            lines = text.splitlines()
            
            # Find question number candidates
            candidates = []
            for i, line in enumerate(lines[:20]):  # First 20 lines of page
                # Try different patterns
                patterns = [
                    (r"^\s*(\d{1,2})\s+", "simple_number_space"),
                    (r"^\s*(\d{1,2})\.\s+", "number_dot_space"),
                    (r"^\s*(\d{1,2})\)\s+", "number_paren_space"),
                    (r"Question\s+(\d{1,2})", "Question_N"),
                ]
                
                for pattern, name in patterns:
                    m = re.match(pattern, line.strip(), re.IGNORECASE)
                    if m:
                        qnum = int(m.group(1))
                        if 1 <= qnum <= 25:
                            candidates.append((qnum, i, line[:60], name))
                            break
            
            if candidates:
                qnum, line_idx, preview, pattern = candidates[0]
                print(f"Page {page_idx + 1}: Found Q{qnum} (pattern: {pattern}) - '{preview}'")
            else:
                print(f"Page {page_idx + 1}: No clear question marker found")
                if lines:
                    print(f"  First line: {repr(lines[0][:80])}")
        
        doc.close()
        print()

if __name__ == "__main__":
    test_tmua_question_format()

