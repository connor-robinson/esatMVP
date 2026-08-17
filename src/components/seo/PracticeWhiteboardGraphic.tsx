export function PracticeWhiteboardGraphic() {
  return (
    <figure className="m-0">
      <svg
        viewBox="0 0 640 400"
        role="img"
        aria-label="ESAT-style A4 erasable whiteboard for rough working practice"
        className="h-auto w-full"
      >
        <title>ESAT-style A4 erasable whiteboard for rough working practice</title>
        <rect width="640" height="400" rx="28" fill="#161D2F" />
        <rect x="48" y="36" width="420" height="328" rx="18" fill="#F8FAFC" />
        <rect
          x="48"
          y="36"
          width="420"
          height="328"
          rx="18"
          fill="none"
          stroke="#94A3B8"
          strokeWidth="8"
        />
        <text
          x="72"
          y="84"
          fill="#0F172A"
          fontSize="22"
          fontFamily="ui-sans-serif, system-ui, sans-serif"
          fontWeight="700"
        >
          A4 practice board
        </text>
        <path
          d="M86 148 H360 M86 178 H300 M86 208 H250"
          stroke="#64748B"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <path
          d="M92 268 L168 268 L168 196 Z"
          fill="none"
          stroke="#3B82F6"
          strokeWidth="4"
          strokeLinejoin="round"
        />
        <text x="188" y="248" fill="#334155" fontSize="18" fontFamily="ui-monospace, monospace">
          compact working
        </text>
        <rect x="500" y="92" width="28" height="168" rx="10" fill="#0F172A" />
        <rect x="508" y="104" width="12" height="132" rx="6" fill="#3B82F6" />
        <rect x="494" y="250" width="40" height="18" rx="6" fill="#94A3B8" />
        <text x="490" y="300" fill="#94A3B8" fontSize="13" fontFamily="ui-sans-serif, system-ui, sans-serif">
          dry-wipe pen
        </text>
      </svg>
      <figcaption className="mt-3 text-sm text-[#94A3B8]">
        Example A4 dry-erase board for ESAT practice. Practice boards are not
        identical to every Pearson centre board.
      </figcaption>
    </figure>
  );
}
