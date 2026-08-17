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
  const left = 36;

  return (
    <figure className="m-0">
      <svg
        viewBox="0 0 520 250"
        role="img"
        aria-label="2025 Cambridge Engineering ESAT applicant and offer-holder averages for Home and international applicants"
        className="h-auto w-full"
      >
        <title>
          2025 Cambridge Engineering ESAT Home and international offer-holder
          averages
        </title>
        {modules.map((module, index) => {
          const clusterX =
            left + index * (barWidth * 2 + gap + groupGap);
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
        <text x={left} y={244} fill="#94A3B8" fontSize="11">
          Scale 1.0 to 9.0. Offer-holder averages only.
        </text>
      </svg>
      <figcaption className="mt-3 text-sm text-[#94A3B8]">
        2025 Cambridge Engineering ESAT average scores for Home and
        international offer holders. Historical average, not a cut-off.
      </figcaption>
    </figure>
  );
}
