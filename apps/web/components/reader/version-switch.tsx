"use client"

import { useSearchParams } from "next/navigation"
import { useTranslations } from "next-intl"
import { useState, useTransition } from "react"

import { bibleVersions, type BibleVersionId } from "@workspace/bible-data"

import { useRouter, usePathname } from "@/i18n/navigation"
import { bibleVersionCookie } from "@/lib/bible-version"
import { setBibleVersionAction } from "@/server/actions/profile"

const oneYear = 60 * 60 * 24 * 365

/**
 * Changes the Bible version from the reader: saved in the profile when signed
 * in, on the device otherwise. It replaces the version of a shared link.
 */
export function VersionSwitch({
  version,
  signedIn,
}: {
  version: BibleVersionId
  signedIn: boolean
}) {
  const t = useTranslations("Reader")
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
        {bibleVersions.map((option) => (
          <option key={option.id} value={option.id}>
            {option.name}
          </option>
        ))}
      </select>
    </label>
  )
}
