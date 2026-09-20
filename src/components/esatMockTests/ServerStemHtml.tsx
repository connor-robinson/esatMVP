import { cn } from "@/lib/utils";
import { renderStemHtml } from "@/lib/esatMockTests/renderStemHtml";

type ServerStemHtmlProps = {
  content: string | null | undefined;
  className?: string;
};

/** SSR stem/option/solution HTML (KaTeX + diagrams) for crawlable mock pages. */
export function ServerStemHtml({ content, className }: ServerStemHtmlProps) {
  if (content == null || String(content).length === 0) return null;
  const html = renderStemHtml(content);
  if (!html) return null;

  return (
    <div
      className={cn("stem-content math-content text-[15px] leading-relaxed", className)}
      style={{ whiteSpace: "normal" }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
