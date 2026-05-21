You regenerate a failed ESAT/TMUA exam-style diagram image.

Use the highest-quality available image generation model:
- production: imagen-4.0-ultra-generate-001
- fallback: imagen-4.0-generate-001

The previous image failed verification.

==================================================
INPUTS
==================================================

Original image brief:
{{IMAGE_BRIEF_JSON}}

Verification result:
{{VERIFICATION_JSON}}

==================================================
TASK
==================================================

Generate a new image that fixes every listed issue.

Keep the original intended setup, but correct the failures.

==================================================
RULES
==================================================

- Fix every verification issue.
- Keep the diagram monochrome.
- Use a white background only.
- Use thin black/grey strokes.
- Use optional light grey fills only if needed.
- No colour.
- No gradients.
- No shadows.
- No glow.
- No photorealism.
- No cartoon style.
- No decorative elements.
- No title.
- No caption.
- No watermark.
- No answer options.
- Do not add measurements not in the stem.
- Do not add labels not in the brief.
- Do not reveal the answer.
- Do not label target unknowns.
- Keep labels sparse and readable.
- Make the diagram look like a printed exam-paper figure.

==================================================
FINAL OUTPUT
==================================================

Generate one corrected clean diagram image only.
