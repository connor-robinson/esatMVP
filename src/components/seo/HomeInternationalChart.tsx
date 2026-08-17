export function HomeInternationalChart() {
  const groups = [
    {
      label: "Home offer holders",
      values: [5.67, 5.85, 5.67],
      color: "#3B82F6",
    },
    {
      label: "International offer holders",
      values: [7.41, 7.2, 7.21],
      color: "#93C5FD",
    },
  ] as const;
  const modules = ["Maths 1", "Physics", "Maths 2"] as const;
  const max = 9;
  const barWidth = 28;
  const gap = 18;
  const groupGap = 36;
  const chartHeight = 180;
  const viewWidth = 420;
  const clusterWidth = barWidth * 2 + gap;
  const chartWidth =
    modules.length * clusterWidth + (modules.length - 1) * groupGap;
  const left = (viewWidth - chartWidth) / 2;

  return (
    <figure className="mx-auto m-0 flex max-w-[26rem] flex-col items-center">
      <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-[#CBD5E1]">
        {groups.map((group) => (
          <span key={group.label} className="inline-flex items-center gap-2">
            <span
              className="inline-block h-2.5 w-2.5 rounded-sm"
              style={{ backgroundColor: group.color }}
              aria-hidden
            />
            {group.label}
          </span>
        ))}
      </div>
      <svg
        viewBox={`0 0 ${viewWidth} 236`}
        role="img"
        aria-label="2025 Cambridge Engineering ESAT offer-holder averages. Darker blue is Home, lighter blue is international."
        className="mt-4 h-auto w-full"
      >
        <title>
          2025 Cambridge Engineering ESAT Home and international offer-holder
          averages
        </title>
        {modules.map((module, index) => {
          const clusterX = left + index * (clusterWidth + groupGap);
          return (
            <g key={module}>
              {groups.map((group, groupIndex) => {
                const value = group.values[index] ?? 0;
                const height = (value / max) * chartHeight;
                const x = clusterX + groupIndex * (barWidth + gap);
                const y = 20 + chartHeight - height;
                return (
                  <g key={group.label}>
                    <rect
                      x={x}
                      y={y}
                      width={barWidth}
                      height={height}
                      rx="6"
                      fill={group.color}
                    />
                    <text
                      x={x + barWidth / 2}
                      y={y - 8}
                      textAnchor="middle"
                      fill="#F8FAFC"
                      fontSize="11"
                      fontWeight="700"
                    >
                      {value.toFixed(2)}
                    </text>
                  </g>
                );
              })}
              <text
                x={clusterX + barWidth + gap / 2}
                y={20 + chartHeight + 22}
                textAnchor="middle"
                fill="#94A3B8"
                fontSize="12"
              >
                {module}
              </text>
            </g>
          );
        })}
      </svg>
      <figcaption className="mt-3 text-center text-sm text-[#94A3B8]">
        Darker blue is Home offer holders. Lighter blue is international offer
        holders. Scale 1.0 to 9.0. Historical average, not a cut-off.
      </figcaption>
    </figure>
  );
}
