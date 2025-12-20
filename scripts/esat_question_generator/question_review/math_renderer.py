#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Math rendering utilities for KaTeX formatting.

Ports the logic from TypeScript useKaTeX.ts and mathSpacing.ts
"""

import re
from typing import List, Dict, Literal, Optional, Tuple
import io
import base64

try:
    import matplotlib
    matplotlib.use('Agg')  # Use non-interactive backend
    import matplotlib.pyplot as plt
    from matplotlib.figure import Figure
    MATPLOTLIB_AVAILABLE = True
except ImportError:
    MATPLOTLIB_AVAILABLE = False


MathSegmentType = Literal["text", "inline", "display"]


class MathSegment:
    """Represents a segment of parsed math content."""
    
    def __init__(self, segment_type: MathSegmentType, content: str):
        self.type = segment_type
        self.content = content
    
    def __repr__(self):
        return f"MathSegment(type={self.type!r}, content={self.content!r})"


def normalize_math_spacing(text: str) -> str:
    """
    Normalizes spacing around math delimiters ($ and $$) in text.
    
    Adds spaces before and after math blocks unless:
    - There's already a space
    - It's at the start of the string (before opening delimiter)
    - There's punctuation immediately after closing delimiter
    
    Ported from src/lib/utils/mathSpacing.ts and db_sync.py
    """
    if not text or not isinstance(text, str):
        return text
    
    # Pattern to match $$...$$ blocks (display math) - process these first
    display_math_pattern = re.compile(r'\$\$[^$]*?\$\$')
    
    # Pattern to match $...$ blocks (inline math) - but not part of $$...$$
    # Using negative lookbehind/lookahead to avoid matching $ that's part of $$
    inline_math_pattern = re.compile(r'(?<!\$)\$(?!\$)[^$]*?\$(?!\$)')
    
    # Punctuation that shouldn't have a space after math
    punctuation_after = re.compile(r'^[.,!?;:)\]}]')
    
    result = text
    
    # Find all display math blocks ($$...$$)
    display_matches = list(display_math_pattern.finditer(result))
    
    # Find all inline math blocks ($...$) that aren't part of $$...$$
    inline_matches = []
    for match in inline_math_pattern.finditer(result):
        # Check if this match overlaps with any display math block
        overlaps = any(
            (match.start() >= dm.start() and match.start() < dm.end()) or
            (match.end() > dm.start() and match.end() <= dm.end()) or
            (match.start() < dm.start() and match.end() > dm.end())
            for dm in display_matches
        )
        if not overlaps:
            inline_matches.append(match)
    
    # Combine and sort all matches by position (reverse order for processing)
    all_matches = display_matches + inline_matches
    all_matches.sort(key=lambda m: m.start(), reverse=True)
    
    # Process matches in reverse order to maintain correct indices
    for match in all_matches:
        start, end = match.span()
        before = result[:start]
        after = result[end:]
        
        needs_space_before = False
        needs_space_after = False
        
        # Check if we need space before
        if start > 0:
            char_before = result[start - 1]
            # Need space if previous char is not whitespace
            if not char_before.isspace():
                needs_space_before = True
        
        # Check if we need space after
        if len(after) > 0:
            char_after = after[0]
            # Need space if next char is not whitespace and not punctuation
            if not char_after.isspace() and not punctuation_after.match(char_after):
                needs_space_after = True
        
        # Apply spacing
        new_content = match.group(0)
        if needs_space_before:
            new_content = ' ' + new_content
        if needs_space_after:
            new_content = new_content + ' '
        
        # Replace in result
        result = before + new_content + after
    
    return result


def parse_math_content(text: str) -> List[MathSegment]:
    """
    Parse text to find math expressions and split into segments.
    
    Handles both inline ($...$) and display ($$...$$) math.
    Display math takes precedence over inline math.
    
    Ported from src/hooks/useKaTeX.ts parseMathContent()
    """
    if not text:
        return []
    
    segments: List[MathSegment] = []
    current_index = 0
    text_length = len(text)
    
    while current_index < text_length:
        # Look for display math first ($$...$$)
        display_start = text.find("$$", current_index)
        
        if display_start != -1:
            # Add text before display math
            if display_start > current_index:
                text_content = text[current_index:display_start]
                if text_content:
                    segments.append(MathSegment("text", text_content))
            
            # Find closing $$
            display_end = text.find("$$", display_start + 2)
            if display_end != -1:
                math_content = text[display_start + 2:display_end]
                segments.append(MathSegment("display", math_content))
                current_index = display_end + 2
                continue
            else:
                # Unmatched $$, treat as text
                text_content = text[current_index:display_start + 2]
                segments.append(MathSegment("text", text_content))
                current_index = display_start + 2
                continue
        
        # Look for inline math ($...$)
        inline_start = text.find("$", current_index)
        
        if inline_start != -1:
            # Check if it's not part of $$
            if text[inline_start:inline_start + 2] != "$$":
                # Add text before inline math
                if inline_start > current_index:
                    text_content = text[current_index:inline_start]
                    if text_content:
                        segments.append(MathSegment("text", text_content))
                
                # Find closing $
                inline_end = text.find("$", inline_start + 1)
                if inline_end != -1:
                    math_content = text[inline_start + 1:inline_end]
                    segments.append(MathSegment("inline", math_content))
                    current_index = inline_end + 1
                    continue
                else:
                    # Unmatched $, treat as text
                    text_content = text[current_index:inline_start + 1]
                    segments.append(MathSegment("text", text_content))
                    current_index = inline_start + 1
                    continue
            else:
                # It's $$, skip it (will be handled in display math check)
                current_index = inline_start + 1
                continue
        
        # No more math found, add remaining text
        if current_index < text_length:
            text_content = text[current_index:]
            if text_content:
                segments.append(MathSegment("text", text_content))
            break
    
    return segments


def escape_html(text: str) -> str:
    """Escape HTML special characters."""
    return (
        text.replace("&", "&amp;")
            .replace("<", "&lt;")
            .replace(">", "&gt;")
            .replace('"', "&quot;")
            .replace("'", "&#39;")
    )


def render_math_to_html(text: str, use_inline_cdn: bool = True) -> str:
    """
    Render math content to HTML with KaTeX.
    
    Args:
        text: Text containing math delimiters
        use_inline_cdn: If True, generates HTML that works with KaTeX CDN loaded in page.
                       If False, assumes KaTeX is already loaded.
    
    Returns:
        HTML string with rendered math
    """
    segments = parse_math_content(text)
    html_parts: List[str] = []
    
    for segment in segments:
        if segment.type == "text":
            # Escape HTML in text content
            escaped = escape_html(segment.content)
            html_parts.append(escaped)
        elif segment.type == "inline":
            # Render inline math - wrap in span with data attribute
            # The JavaScript will render this using KaTeX
            math_escaped = escape_html(segment.content)
            html_parts.append(f'<span class="katex-inline" data-katex="{math_escaped}"></span>')
        elif segment.type == "display":
            # Render display math - wrap in div with data attribute
            math_escaped = escape_html(segment.content)
            html_parts.append(f'<div class="katex-display" data-katex="{math_escaped}"></div>')
    
    result = "".join(html_parts)
    
    # If we need to include the KaTeX rendering script, wrap it
    if use_inline_cdn and ("katex-inline" in result or "katex-display" in result):
        # Return HTML with script to render KaTeX
        script = """
<script>
// Render KaTeX expressions when page loads
document.addEventListener('DOMContentLoaded', function() {
    // Load KaTeX if not already loaded
    if (typeof katex === 'undefined') {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css';
        document.head.appendChild(link);
        
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.js';
        script.onload = renderAllKaTeX;
        document.head.appendChild(script);
    } else {
        renderAllKaTeX();
    }
    
    function renderAllKaTeX() {
        // Render inline math
        document.querySelectorAll('.katex-inline').forEach(function(el) {
            const math = el.getAttribute('data-katex');
            try {
                katex.render(math, el, { throwOnError: false, displayMode: false });
            } catch (e) {
                el.textContent = '$' + math + '$';
            }
        });
        
        // Render display math
        document.querySelectorAll('.katex-display').forEach(function(el) {
            const math = el.getAttribute('data-katex');
            try {
                katex.render(math, el, { throwOnError: false, displayMode: true });
            } catch (e) {
                el.textContent = '$$' + math + '$$';
            }
        });
    }
});
</script>
"""
        result = result + script
    
    return result


def render_math_content_simple(text: str) -> str:
    """
    Simple version that returns HTML ready for tkinterweb.
    
    This version assumes KaTeX will be loaded by the parent HTML page.
    """
    segments = parse_math_content(text)
    html_parts: List[str] = []
    
    for segment in segments:
        if segment.type == "text":
            escaped = escape_html(segment.content)
            html_parts.append(escaped)
        elif segment.type == "inline":
            math_escaped = escape_html(segment.content)
            html_parts.append(f'<span class="katex-inline" data-katex="{math_escaped}"></span>')
        elif segment.type == "display":
            math_escaped = escape_html(segment.content)
            html_parts.append(f'<div class="katex-display" data-katex="{math_escaped}"></div>')
    
    return "".join(html_parts)


def render_math_to_image(math_text: str, display_mode: bool = False, dpi: int = 100) -> Optional[io.BytesIO]:
    """
    Render a math expression to a PNG image using matplotlib.
    
    Args:
        math_text: LaTeX math expression (without delimiters)
        display_mode: If True, render as display math (centered, larger)
        dpi: Resolution for the image
        
    Returns:
        BytesIO object containing PNG image data, or None if rendering fails
    """
    if not MATPLOTLIB_AVAILABLE:
        return None
    
    try:
        # Create a figure with minimal padding for compact rendering
        fig = Figure(figsize=(4, 0.6) if display_mode else (3, 0.4), dpi=dpi)
        # Use tight axes for inline math, more space for display math
        if display_mode:
            ax = fig.add_axes([0, 0, 1, 1])
        else:
            ax = fig.add_axes([0, 0.05, 1, 0.9])  # Very tight vertical margins for inline
        ax.axis('off')
        
        # Clean up the math text - remove extra whitespace
        math_text_clean = math_text.strip()
        
        # Render the math using matplotlib's mathtext renderer
        math_display = f'${math_text_clean}$'
        
        ax.text(0.5 if display_mode else 0, 0.5, math_display,
                fontsize=15 if display_mode else 13, 
                horizontalalignment='center' if display_mode else 'left',
                verticalalignment='center')
        
        # Save to BytesIO with minimal padding
        img_buffer = io.BytesIO()
        fig.savefig(img_buffer, format='png', bbox_inches='tight', pad_inches=0.02, 
                   facecolor='white', edgecolor='none', dpi=dpi, transparent=False)
        img_buffer.seek(0)
        plt.close(fig)
        
        return img_buffer
    except Exception as e:
        print(f"Error rendering math '{math_text}': {e}")
        return None


def render_math_segments_to_tkinter(segments: List[MathSegment]) -> List[Tuple[str, Optional[io.BytesIO]]]:
    """
    Convert math segments to a list of (text, image) tuples for Tkinter display.
    
    Returns:
        List of tuples: ("text", None) for text segments, ("", image_bytes) for math segments
    """
    result = []
    for segment in segments:
        if segment.type == "text":
            result.append((segment.content, None))
        elif segment.type in ("inline", "display"):
            display_mode = (segment.type == "display")
            img = render_math_to_image(segment.content, display_mode=display_mode)
            result.append(("", img))
    return result


def get_katex_html_template() -> str:
    """
    Get the HTML template for rendering math content with KaTeX.
    
    This includes the KaTeX CSS and JS, plus a rendering function.
    """
    return """
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css" crossorigin="anonymous">
    <style>
        body {
            margin: 0;
            padding: 8px;
            font-family: system-ui, -apple-system, sans-serif;
            background: white;
            color: #1a1a1a;
        }
        .katex-display {
            margin: 0.5em 0;
        }
        .katex-inline {
            display: inline-block;
        }
    </style>
</head>
<body>
    <div id="content"></div>
    <script src="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.js" integrity="sha384-YbscuV+g0KawmV2b+9c7U6k8k8vKvzHmeJ6BwfU7o8T9AuIQwhhYyN2nE6Q6i5/x" crossorigin="anonymous"></script>
    <script>
        function renderMath(content) {
            const container = document.getElementById('content');
            if (!container) return;
            
            // Store original HTML first
            container.innerHTML = content;
            
            // Wait a tiny bit for DOM to update
            setTimeout(function() {
                // Render inline math
                container.querySelectorAll('.katex-inline').forEach(function(el) {
                    const math = el.getAttribute('data-katex');
                    if (math && typeof katex !== 'undefined') {
                        try {
                            const mathText = math;
                            katex.render(mathText, el, { throwOnError: false, displayMode: false });
                        } catch (e) {
                            console.error('KaTeX render error:', e);
                            el.textContent = '$' + math + '$';
                        }
                    }
                });
                
                // Render display math
                container.querySelectorAll('.katex-display').forEach(function(el) {
                    const math = el.getAttribute('data-katex');
                    if (math && typeof katex !== 'undefined') {
                        try {
                            const mathText = math;
                            katex.render(mathText, el, { throwOnError: false, displayMode: true });
                        } catch (e) {
                            console.error('KaTeX render error:', e);
                            el.textContent = '$$' + math + '$$';
                        }
                    }
                });
            }, 50);
        }
        
        // Function to try rendering
        function tryRender() {
            const contentDiv = document.getElementById('content');
            if (contentDiv && contentDiv.innerHTML) {
                renderMath(contentDiv.innerHTML);
            }
        }
        
        // Render when KaTeX is loaded
        window.addEventListener('load', function() {
            setTimeout(function() {
                if (typeof katex !== 'undefined') {
                    tryRender();
                }
            }, 100);
        });
        
        // Also try immediately if KaTeX is already loaded
        if (typeof katex !== 'undefined') {
            setTimeout(tryRender, 100);
        } else {
            // Wait for KaTeX to load
            const checkKaTeX = setInterval(function() {
                if (typeof katex !== 'undefined') {
                    clearInterval(checkKaTeX);
                    tryRender();
                }
            }, 50);
            // Stop checking after 5 seconds
            setTimeout(function() { clearInterval(checkKaTeX); }, 5000);
        }
    </script>
</body>
</html>
"""


