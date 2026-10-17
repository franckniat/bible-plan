import Image from "next/image"

import { cn } from "@workspace/ui/lib/utils"

/** A screenshot of the app (390×844 at 2x) inside a phone-shaped frame. */
export function PhoneFrame({
  src,
  alt,
  priority,
  className,
}: {
  src: string
  alt: string
  priority?: boolean
  className?: string
}) {
  return (
    <div
      className={cn(
        "mx-auto w-full max-w-[17rem] rounded-[2.5rem] bg-brand-night p-2 shadow-2xl ring-1 shadow-brand-night/20 ring-brand-night/20 dark:bg-neutral-800 dark:ring-white/15",
        className
      )}
    >
      <Image
        src={src}
        alt={alt}
        width={780}
        height={1688}
        sizes="272px"
        priority={priority}
        className="h-auto w-full rounded-[2rem]"
      />
    </div>
  )
}
