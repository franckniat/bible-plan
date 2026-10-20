"use client"

import { useSearchParams } from "next/navigation"
import { useTranslations } from "next-intl"
import { useState, useTransition } from "react"

import { bibleVersions, type BibleVersionId } from "@workspace/bible-data"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"

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

  // What the closed select shows for the chosen value.
  const items = bibleVersions.map((option) => ({
    value: option.id,
    label: option.name,
  }))

  function change(chosen: string) {
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
          {bibleVersions.map((option) => (
            <SelectItem key={option.id} value={option.id}>
              {option.name}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}
