"use client"

import { useSearchParams } from "next/navigation"
import { useLocale, useTranslations } from "next-intl"
import { useState, useTransition } from "react"

import { bibleVersions, type BibleVersionId } from "@workspace/bible-data"

import { useRouter, usePathname } from "@/i18n/navigation"
import { bibleVersionCookie } from "@/lib/bible-version"
import { setBibleVersionAction } from "@/server/actions/profile"

const oneYear = 60 * 60 * 24 * 365

/** An external translation and where its passage is on YouVersion. */
export type ExternalVersionLink = {
  id: string
  /** "Parole de Vie 2017 (PDV)". */
  label: string
  language: string
  href: string
}

/**
 * Changes the Bible version from the reader: saved in the profile when signed
 * in, on the device otherwise. It replaces the version of a shared link.
 */
export function VersionSwitch({
  version,
  signedIn,
  externalLinks = [],
}: {
  version: BibleVersionId
  signedIn: boolean
  /**
   * Translations under copyright, which are not hosted: choosing one opens
   * the same passage on YouVersion in a new tab.
   */
  externalLinks?: ExternalVersionLink[]
}) {
  const t = useTranslations("Reader")
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [value, setValue] = useState(version)
  const [pending, startTransition] = useTransition()

  return (
    <label className="flex items-center gap-2 text-sm text-brand-night/60 dark:text-neutral-100/60">
      <span className="sr-only">{t("version")}</span>
      <select
        value={value}
        disabled={pending}
        onChange={(event) => {
          const external = externalLinks.find(
            (link) => `external:${link.id}` === event.target.value
          )
          if (external) {
            // Not hosted here: read it on YouVersion, and stay on this version.
            window.open(external.href, "_blank", "noopener,noreferrer")
            return
          }
          const next = event.target.value as BibleVersionId
          const previous = value
          setValue(next)
          startTransition(async () => {
            if (signedIn) {
              const { ok } = await setBibleVersionAction(next).catch(() => ({
                ok: false,
              }))
              if (!ok) {
                setValue(previous)
                return
              }
            } else {
              document.cookie = `${bibleVersionCookie}=${next}; path=/; max-age=${oneYear}; samesite=lax`
            }
            const params = new URLSearchParams(searchParams)
            params.delete("v")
            const search = params.toString()
            router.replace(search ? `${pathname}?${search}` : pathname)
            router.refresh()
          })
        }}
        className="h-8 rounded-lg border border-brand-night/15 bg-transparent px-2 dark:border-white/15"
      >
        <optgroup label={t("versionGroups.app")}>
          {bibleVersions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name}
            </option>
          ))}
        </optgroup>
        {externalLinks.length > 0 && (
          <optgroup label={t("versionGroups.external")}>
            {/* The translations of the language of the page come first. */}
            {[...externalLinks]
              .sort(
                (a, b) =>
                  Number(b.language === locale) - Number(a.language === locale)
              )
              .map((link) => (
                <option key={link.id} value={`external:${link.id}`}>
                  {link.label}
                </option>
              ))}
          </optgroup>
        )}
      </select>
    </label>
  )
}
