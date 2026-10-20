"use client"

import { useSearchParams } from "next/navigation"
import { useLocale, useTranslations } from "next-intl"
import { useState, useTransition } from "react"

import { bibleVersions, type BibleVersionId } from "@workspace/bible-data"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"

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

  // The translations of the language of the page come first.
  const externals = [...externalLinks].sort(
    (a, b) => Number(b.language === locale) - Number(a.language === locale)
  )
  // What the closed select shows for the chosen value.
  const items = [
    ...bibleVersions.map((option) => ({ value: option.id, label: option.name })),
    ...externals.map((link) => ({
      value: `external:${link.id}`,
      label: link.label,
    })),
  ]

  function change(chosen: string) {
    const external = externals.find((link) => `external:${link.id}` === chosen)
    if (external) {
      // Not hosted here: read it on YouVersion, and stay on this version.
      window.open(external.href, "_blank", "noopener,noreferrer")
      return
    }
    const next = chosen as BibleVersionId
    if (next === value) return
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
  }

  return (
    <Select
      items={items}
      value={value}
      disabled={pending}
      onValueChange={(chosen) => chosen && change(chosen)}
    >
      <SelectTrigger size="sm" aria-label={t("version")} className="min-w-44">
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="w-72 max-w-[90vw]">
        <SelectGroup>
          <SelectLabel>{t("versionGroups.app")}</SelectLabel>
          {bibleVersions.map((option) => (
            <SelectItem key={option.id} value={option.id}>
              {option.name}
            </SelectItem>
          ))}
        </SelectGroup>
        {externals.length > 0 && (
          <SelectGroup>
            <SelectLabel>{t("versionGroups.external")}</SelectLabel>
            {externals.map((link) => (
              <SelectItem key={link.id} value={`external:${link.id}`}>
                {link.label}
              </SelectItem>
            ))}
          </SelectGroup>
        )}
      </SelectContent>
    </Select>
  )
}
