"use client"

import { BookOpen, Settings, Sun, type LucideIcon } from "lucide-react"
import { useTranslations } from "next-intl"

import { cn } from "@workspace/ui/lib/utils"

import { Link, usePathname } from "@/i18n/navigation"

type NavItem = {
  href: string
  label: "today" | "plans" | "settings"
  icon: LucideIcon
}

// Sections are added here as they are built.
const navItems: NavItem[] = [
  { href: "/today", label: "today", icon: Sun },
  { href: "/plans", label: "plans", icon: BookOpen },
  { href: "/settings", label: "settings", icon: Settings },
]

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`)
}

/** Main navigation: a vertical list in the sidebar, a bottom bar on mobile. */
export function AppNav({
  variant,
  className,
}: {
  variant: "sidebar" | "bottom"
  className?: string
}) {
  const t = useTranslations("App.nav")
  const pathname = usePathname()

  return (
    <nav aria-label={t("label")} className={className}>
      <ul
        className={cn(
          variant === "sidebar" ? "flex flex-col gap-1" : "flex justify-around"
        )}
      >
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href)
          return (
            <li key={href} className={cn(variant === "bottom" && "flex-1")}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "outline-none focus-visible:ring-3 focus-visible:ring-ring/40",
                  variant === "sidebar"
                    ? "flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition-colors"
                    : "flex flex-col items-center gap-1 rounded-xl py-2 text-xs font-medium",
                  active
                    ? "text-brand-night dark:text-neutral-100"
                    : "text-brand-night/60 hover:text-brand-night dark:text-neutral-100/60 dark:hover:text-neutral-100",
                  variant === "sidebar" &&
                    (active
                      ? "bg-brand-night/[0.06] dark:bg-white/10"
                      : "hover:bg-brand-night/[0.04] dark:hover:bg-white/5")
                )}
              >
                <Icon
                  aria-hidden
                  className={cn("size-5", active && "text-brand-gold")}
                />
                {t(label)}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
