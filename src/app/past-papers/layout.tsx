/**
 * Past Papers routes use signature blue (`maths`) as the accent instead of mental-maths green.
 */
export default function PastPapersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="past-papers-theme min-h-0 flex-1">{children}</div>;
}
