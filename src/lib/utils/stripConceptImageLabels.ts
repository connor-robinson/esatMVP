/**
 * Strip authoring captions / labels that say "concept image" from stem figures.
 * Keeps the diagram itself; removes figcaption text and noisy aria/alt labels.
 */

export function stripConceptImageLabels(html: string): string {
  if (!html) return html;
  return html
    .replace(/<figcaption\b[^>]*>[\s\S]*?<\/figcaption>/gi, "")
    .replace(/\saria-label=(["'])\s*concept\s*image\s*\1/gi, ' aria-label="Diagram"')
    .replace(/\salt=(["'])\s*concept\s*image\s*\1/gi, ' alt="Diagram"')
    .replace(/\stitle=(["'])\s*concept\s*image\s*\1/gi, "")
    .replace(/>\s*concept\s*image\s*</gi, "><")
    // Loose caption text that sometimes sits outside a figcaption.
    .replace(/(^|>)\s*concept\s*image\s*(?=<|$)/gim, "$1");
}
