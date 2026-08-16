export interface DonutSegment {
  label: string
  value: number
  color: string
}

export function DonutChart({
  segments,
  size = 160,
  strokeWidth = 24,
  centerLabel,
}: {
  segments: DonutSegment[]
  size?: number
  strokeWidth?: number
  centerLabel?: { value: string; caption: string }
}) {
  const total = segments.reduce((sum, s) => sum + s.value, 0)
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  let cumulative = 0

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#f1f5f9" strokeWidth={strokeWidth} />
        {total > 0 &&
          segments
            .filter((s) => s.value > 0)
            .map((s) => {
              const dash = (s.value / total) * circumference
              const dashOffset = -cumulative
              cumulative += dash
              return (
                <circle
                  key={s.label}
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="none"
                  stroke={s.color}
                  strokeWidth={strokeWidth}
                  strokeDasharray={`${dash} ${circumference - dash}`}
                  strokeDashoffset={dashOffset}
                />
              )
            })}
      </svg>
      {centerLabel && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-slate-900">{centerLabel.value}</span>
          <span className="text-[11px] text-slate-400">{centerLabel.caption}</span>
        </div>
      )}
    </div>
  )
}
