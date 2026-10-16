import { ChevronLeft, ChevronRight } from "lucide-react"

import { cn } from "@workspace/ui/lib/utils"

import { Link } from "@/i18n/navigation"

type Target = { href: string; label: string }

const arrowClassName =
  "fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] z-10 flex size-11 items-center justify-center rounded-xl bg-white/90 text-brand-night shadow-md ring-1 ring-brand-night/10 backdrop-blur transition-colors hover:bg-white md:bottom-8 md:size-12 dark:bg-neutral-800/90 dark:text-neutral-100 dark:ring-white/10 dark:hover:bg-neutral-800"

/**
 * Previous and next arrows kept on the sides of the text while it scrolls,
 * for pointer and touch. They repeat the navigation at the end of the page,
 * which keyboard and screen reader users get instead.
 */
export function ReaderArrows({
  previous,
  next,
}: {
  previous?: Target
  next?: Target
}) {
  return (
    <div aria-hidden>
      {previous && (
        <Link
          href={previous.href}
          tabIndex={-1}
          title={previous.label}
          // Just left of the text column, never over the sidebar.
          className={cn(
            arrowClassName,
            "left-3 md:left-[max(17rem,calc(50vw-20rem))]"
          )}
        >
          <ChevronLeft className="size-6" />
        </Link>
      )}
      {next && (
        <Link
          href={next.href}
          tabIndex={-1}
          title={next.label}
          className={cn(
            arrowClassName,
            "right-3 md:right-[max(1rem,calc(50vw-36rem))]"
          )}
        >
          <ChevronRight className="size-6" />
        </Link>
      )}
    </div>
  )
}
