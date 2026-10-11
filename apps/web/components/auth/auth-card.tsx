import type { ReactNode } from "react"

/** Card holding an authentication form, with its title and footer links. */
export function AuthCard({
  title,
  description,
  footer,
  children,
}: {
  title: string
  description?: string
  footer?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-3xl bg-white/85 p-6 shadow-xl ring-1 shadow-brand-night/5 ring-brand-night/10 backdrop-blur sm:p-8 dark:bg-neutral-900/85 dark:ring-white/10">
        <div className="mb-6">
          <h1 className="font-heading text-2xl font-semibold sm:text-3xl">
            {title}
          </h1>
          {description && (
            <p className="mt-1 text-sm text-brand-night/70 dark:text-neutral-100/70">
              {description}
            </p>
          )}
        </div>
        {children}
      </div>
      {footer && (
        <div className="text-center text-sm text-brand-night/75 dark:text-neutral-100/75 [&_a]:font-medium [&_a]:underline [&_a]:underline-offset-4">
          {footer}
        </div>
      )}
    </div>
  )
}

/** Error or success message shown at the top of an auth form. */
export function AuthNotice({
  tone,
  children,
}: {
  tone: "error" | "success"
  children: ReactNode
}) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={
        tone === "error"
          ? "rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive"
          : "rounded-2xl bg-brand-gold/15 px-4 py-3 text-sm text-brand-night dark:text-neutral-100"
      }
    >
      {children}
    </div>
  )
}
