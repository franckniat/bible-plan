"use client"

import { useTranslations } from "next-intl"
import { useState, useTransition } from "react"

import { bibleVersions, type BibleVersionId } from "@workspace/bible-data"

import { setBibleVersionAction } from "@/server/actions/profile"

/** Changes the Bible version from the reader (saved in the profile). */
export function VersionSwitch({ version }: { version: BibleVersionId }) {
  const t = useTranslations("Reader")
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
            const { ok } = await setBibleVersionAction(next).catch(() => ({
              ok: false,
            }))
            if (!ok) setValue(previous)
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
