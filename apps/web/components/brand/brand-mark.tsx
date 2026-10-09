import { useId } from "react"

import { cn } from "@workspace/ui/lib/utils"

/**
 * Bible Plan logo mark: a flame with a cross carved in its heart
 * ("Your word is a lamp to my feet", Psalm 119:105). The cross is transparent,
 * so the mark works on any background. Same drawing as /brand/bible-plan-mark.svg.
 */
export function BrandMark({
  className,
  title,
}: {
  className?: string
  /** Accessible name; omit when the mark sits next to the product name. */
  title?: string
}) {
  const maskId = useId()

  return (
    <svg
      viewBox="132 68 248 364"
      className={cn("h-8 w-auto shrink-0", className)}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
    >
      {title && <title>{title}</title>}
      <defs>
        <mask id={maskId}>
          <rect width="512" height="512" fill="#fff" />
          <rect x="246" y="262" width="20" height="104" rx="4" fill="#000" />
          <rect x="216" y="290" width="80" height="20" rx="4" fill="#000" />
        </mask>
      </defs>
      <g mask={`url(#${maskId})`}>
        <path
          d="M256 76 C300 140 372 196 372 288 C372 370 318 424 256 424 C194 424 140 370 140 288 C140 228 170 194 196 162 C200 196 214 214 232 222 C226 168 236 118 256 76 Z"
          fill="var(--brand-gold)"
        />
        <path
          d="M256 214 C280 248 318 276 318 322 C318 360 290 388 256 388 C222 388 194 360 194 322 C194 276 232 248 256 214 Z"
          fill="var(--brand-gold-soft)"
        />
      </g>
    </svg>
  )
}
