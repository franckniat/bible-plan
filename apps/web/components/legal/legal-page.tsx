import type { ReactNode } from "react"

/** Readable long-form layout for legal pages (privacy, terms). */
export function LegalPage({
  title,
  updated,
  children,
}: {
  title: string
  updated: string
  children: ReactNode
}) {
  return (
    <article className="mx-auto max-w-3xl px-6 pt-8 pb-24 lg:pt-14">
      <h1 className="font-heading text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
        {title}
      </h1>
      <p className="mt-3 text-sm text-brand-night/60 dark:text-brand-cream/60">
        {updated}
      </p>
      <div className="mt-10 flex flex-col gap-4 leading-relaxed text-brand-night/85 dark:text-brand-cream/85 [&_a]:font-medium [&_a]:underline [&_a]:underline-offset-2 [&_h2]:mt-6 [&_h2]:font-heading [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:text-brand-night dark:[&_h2]:text-brand-cream [&_li]:pl-1 [&_strong]:font-semibold [&_ul]:flex [&_ul]:list-disc [&_ul]:flex-col [&_ul]:gap-2 [&_ul]:pl-6">
        {children}
      </div>
    </article>
  )
}
