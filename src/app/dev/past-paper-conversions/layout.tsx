/**
 * Standalone dev tool — not part of the past-papers product UI.
 */
export default function PastPaperConversionsDevLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background text-text">{children}</div>
  );
}
