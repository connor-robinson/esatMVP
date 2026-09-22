export function DataMethodologyNote({ className }: { className?: string }) {
  return (
    <details
      className={`group rounded-2xl bg-white/[0.04] px-5 py-4 ${className ?? ""}`}
    >
      <summary className="cursor-pointer list-none text-sm font-bold text-white marker:content-none [&::-webkit-details-marker]:hidden">
        <span className="inline-flex items-center gap-2">
          About the data on this page
          <span
            aria-hidden
            className="text-[#64748B] transition-transform group-open:rotate-90"
          >
            →
          </span>
        </span>
      </summary>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-[#94A3B8]">
        <p>
          The performance statistics on this page come from anonymised ESAT Camp
          activity and use first attempts where appropriate.
        </p>
        <p>
          They describe students using our platform rather than a random sample
          of all ESAT candidates, so they should be treated as useful preparation
          data rather than a prediction of live ESAT performance.
        </p>
        <p>Small topic groups are noisier than the overall figures.</p>
      </div>
    </details>
  );
}
