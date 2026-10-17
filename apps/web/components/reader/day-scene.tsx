import type { Period } from "@/lib/day-period"

/**
 * Illustration of a moment of the day, drawn on a 400×200 canvas and anchored
 * bottom right so that the sun or the moon stays visible whatever the shape of
 * the card. Decorative: the text of the card is on its left.
 */
export function DayScene({
  period,
  compact = false,
}: {
  period: Period
  /** Narrow cards: the sun or the moon is raised above the text. */
  compact?: boolean
}) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 400 200"
      preserveAspectRatio="xMaxYMax slice"
      className="absolute inset-0 size-full"
    >
      {period === "morning" && <Morning compact={compact} />}
      {period === "day" && <Day compact={compact} />}
      {period === "night" && <Night compact={compact} />}
    </svg>
  )
}

function Cloud({
  x,
  y,
  scale = 1,
  opacity = 0.7,
}: {
  x: number
  y: number
  scale?: number
  opacity?: number
}) {
  return (
    <g
      transform={`translate(${x} ${y}) scale(${scale})`}
      fill="#fff"
      opacity={opacity}
    >
      <ellipse cx="0" cy="0" rx="26" ry="9" />
      <ellipse cx="-12" cy="-7" rx="14" ry="10" />
      <ellipse cx="9" cy="-9" rx="16" ry="12" />
    </g>
  )
}

function Morning({ compact }: { compact: boolean }) {
  const k = compact ? "c" : "w"
  const y = compact ? 78 : 152
  return (
    <>
      <defs>
        <linearGradient id={`morning-sky-${k}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f3c3b4" />
          <stop offset="0.55" stopColor="#ffdcae" />
          <stop offset="1" stopColor="#fff1c9" />
        </linearGradient>
        <radialGradient id={`morning-glow-${k}`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#ffd27a" stopOpacity="0.9" />
          <stop offset="1" stopColor="#ffd27a" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="400" height="200" fill={`url(#morning-sky-${k})`} />
      <circle cx="320" cy={y} r="95" fill={`url(#morning-glow-${k})`} />
      <g stroke="#ffb84d" strokeWidth="3" strokeLinecap="round" opacity="0.8">
        {Array.from({ length: 9 }, (_, i) => {
          const angle = Math.PI + (i * Math.PI) / 8
          return (
            <line
              key={i}
              x1={320 + Math.cos(angle) * 46}
              y1={y + Math.sin(angle) * 46}
              x2={320 + Math.cos(angle) * 62}
              y2={y + Math.sin(angle) * 62}
            />
          )
        })}
      </g>
      <circle cx="320" cy={y} r="34" fill="#ffb347" />
      <Cloud x={95} y={92} opacity={0.55} />
      <Cloud x={230} y={70} scale={0.8} opacity={0.5} />
      <path
        d="M0 176 Q80 146 170 168 T400 158 V200 H0Z"
        fill="#f0b98c"
        opacity="0.75"
      />
      <path d="M0 188 Q110 166 220 184 T400 178 V200 H0Z" fill="#e39a6c" />
    </>
  )
}

function Day({ compact }: { compact: boolean }) {
  const k = compact ? "c" : "w"
  const y = compact ? 56 : 98
  return (
    <>
      <defs>
        <linearGradient id={`day-sky-${k}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8fcfff" />
          <stop offset="1" stopColor="#dcf1ff" />
        </linearGradient>
        <radialGradient id={`day-glow-${k}`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#fff3a8" stopOpacity="0.9" />
          <stop offset="1" stopColor="#fff3a8" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="400" height="200" fill={`url(#day-sky-${k})`} />
      <circle cx="326" cy={y} r="80" fill={`url(#day-glow-${k})`} />
      <g stroke="#ffd84d" strokeWidth="3" strokeLinecap="round">
        {Array.from({ length: 12 }, (_, i) => {
          const angle = (i * Math.PI) / 6
          return (
            <line
              key={i}
              x1={326 + Math.cos(angle) * 34}
              y1={y + Math.sin(angle) * 34}
              x2={326 + Math.cos(angle) * 46}
              y2={y + Math.sin(angle) * 46}
            />
          )
        })}
      </g>
      <circle cx="326" cy={y} r="26" fill="#ffd23f" />
      <Cloud x={120} y={112} scale={1.2} opacity={0.95} />
      <Cloud x={240} y={150} scale={0.9} opacity={0.9} />
      <Cloud x={60} y={60} scale={0.8} opacity={0.8} />
      <path
        d="M0 178 Q90 150 180 172 T400 164 V200 H0Z"
        fill="#9fd0a0"
        opacity="0.9"
      />
      <path d="M0 190 Q120 170 230 186 T400 180 V200 H0Z" fill="#74b57f" />
    </>
  )
}

const stars: [number, number, number][] = [
  [40, 118, 1.6],
  [118, 98, 1.2],
  [196, 132, 1.8],
  [262, 94, 1.4],
  [372, 160, 1.6],
  [296, 152, 1.2],
  [160, 168, 1.4],
  [64, 172, 1.8],
  [230, 44, 1.4],
  [350, 40, 1.8],
  [90, 40, 1.2],
]

function Night({ compact }: { compact: boolean }) {
  const k = compact ? "c" : "w"
  const y = compact ? 58 : 100
  return (
    <>
      <defs>
        <linearGradient id={`night-sky-${k}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#12141d" />
          <stop offset="1" stopColor="#262b45" />
        </linearGradient>
        <radialGradient id={`night-glow-${k}`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#f4ebd0" stopOpacity="0.35" />
          <stop offset="1" stopColor="#f4ebd0" stopOpacity="0" />
        </radialGradient>
        <mask id={`night-crescent-${k}`}>
          <rect width="400" height="200" fill="#000" />
          <circle cx="326" cy={y} r="24" fill="#fff" />
          <circle cx="338" cy={y - 8} r="21" fill="#000" />
        </mask>
      </defs>
      <rect width="400" height="200" fill={`url(#night-sky-${k})`} />
      <circle cx="326" cy={y} r="70" fill={`url(#night-glow-${k})`} />
      <circle
        cx="326"
        cy={y}
        r="24"
        fill="#f4ebd0"
        mask={`url(#night-crescent-${k})`}
      />
      <g fill="#f4ebd0">
        {stars.map(([x, y, r]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r={r} opacity="0.85" />
        ))}
      </g>
      <path
        d="M0 180 Q90 154 180 174 T400 166 V200 H0Z"
        fill="#1a1e33"
        opacity="0.95"
      />
      <path d="M0 192 Q120 172 230 188 T400 182 V200 H0Z" fill="#0d0f18" />
    </>
  )
}
