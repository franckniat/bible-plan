"use client"

import { Check, LoaderCircle } from "lucide-react"
import { useTranslations } from "next-intl"
import { useState, useTransition } from "react"

import { bibleVersions, type BibleVersionId } from "@workspace/bible-data"

import {
  choiceCardClassName,
  choiceInputClassName,
} from "@/components/choice-card"
import { setBibleVersionAction } from "@/server/actions/profile"

/** The Bible version of the reader; saved as soon as it is chosen. */
export function BibleVersionSetting({ version }: { version: BibleVersionId }) {
  const t = useTranslations("Settings.bible")
  const tLocale = useTranslations("LanguageSwitcher")
  const [value, setValue] = useState(version)
  const [pending, startTransition] = useTransition()
  const [status, setStatus] = useState<"idle" | "saved" | "failed">("idle")

  function choose(next: BibleVersionId) {
    const previous = value
    setValue(next)
    setStatus("idle")
    startTransition(async () => {
      const { ok } = await setBibleVersionAction(next).catch(() => ({
        ok: false,
      }))
      if (ok) setStatus("saved")
      else {
        setValue(previous)
        setStatus("failed")
      }
    })
  }

  return (
    <div className="flex flex-col gap-3">
      {bibleVersions.map((option) => (
        <label key={option.id} className={choiceCardClassName}>
          <input
            type="radio"
            name="bible-version"
            value={option.id}
            checked={value === option.id}
            disabled={pending}
            onChange={() => choose(option.id)}
            className={choiceInputClassName}
          />
          <span className="flex flex-col gap-0.5">
            <span className="font-medium">{option.name}</span>
            <span className="text-brand-night/65 dark:text-neutral-100/65">
              {option.year
                ? t("details", {
                    language: tLocale("locale", { locale: option.language }),
                    year: option.year,
                  })
                : tLocale("locale", { locale: option.language })}
            </span>
          </span>
        </label>
      ))}
      <p aria-live="polite" className="min-h-5 text-sm">
        {pending ? (
          <span className="flex items-center gap-1.5 text-brand-night/60 dark:text-neutral-100/60">
            <LoaderCircle className="size-4 animate-spin" />
            {t("saving")}
          </span>
        ) : status === "saved" ? (
          <span className="flex items-center gap-1.5 text-brand-night/60 dark:text-neutral-100/60">
            <Check className="size-4" />
            {t("saved")}
          </span>
        ) : status === "failed" ? (
          <span className="text-destructive">{t("failed")}</span>
        ) : null}
      </p>
    </div>
  )
}
