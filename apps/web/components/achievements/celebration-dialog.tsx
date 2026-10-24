"use client"

import { Download, Share2 } from "lucide-react"
import { useTranslations } from "next-intl"
import { useState } from "react"

import type { AchievementKey, AchievementLevel } from "@workspace/core"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@workspace/ui/components/alert-dialog"
import { Button } from "@workspace/ui/components/button"

import { AchievementMedal } from "@/components/achievements/achievement-medal"
import { markAchievementsSeenAction } from "@/server/actions/achievements"

type Item = {
  key: AchievementKey
  level: AchievementLevel
  trophy: boolean
  name: string
  label: string
  shareText: string
}

/**
 * Celebrates what was just earned. The medals pop in unless the person asked
 * for less motion. Sharing the picture is a choice: nothing leaves the app
 * until they press the button, and they can only save it too.
 */
export function CelebrationDialog({ items }: { items: Item[] }) {
  const t = useTranslations("Achievements")
  const [open, setOpen] = useState(true)
  const [failed, setFailed] = useState(false)

  function close() {
    setOpen(false)
    void markAchievementsSeenAction().catch(() => undefined)
  }

  async function share(item: Item) {
    setFailed(false)
    try {
      const response = await fetch(
        `/api/achievements/card?key=${item.key}&level=${item.level}`
      )
      if (!response.ok) throw new Error("card")
      const file = new File([await response.blob()], `${item.key}.png`, {
        type: "image/png",
      })
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], text: item.shareText })
      } else {
        const link = document.createElement("a")
        link.href = URL.createObjectURL(file)
        link.download = file.name
        link.click()
        URL.revokeObjectURL(link.href)
      }
    } catch (error) {
      // Closing the share sheet is not a failure.
      if (error instanceof DOMException && error.name === "AbortError") return
      setFailed(true)
    }
  }

  const canShare =
    typeof navigator !== "undefined" && typeof navigator.share === "function"

  return (
    <AlertDialog open={open} onOpenChange={(next) => !next && close()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("celebrate.title")}</AlertDialogTitle>
          <AlertDialogDescription>
            {items.every((item) => item.trophy)
              ? t("celebrate.trophy")
              : t("celebrate.badge")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <ul className="flex flex-col gap-4">
          {items.map((item) => (
            <li
              key={`${item.key}:${item.level}`}
              className="flex items-center gap-4"
            >
              <AchievementMedal
                achievementKey={item.key}
                level={item.level}
                trophy={item.trophy}
                className="motion-safe:animate-in motion-safe:duration-500 motion-safe:zoom-in-50"
              />
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="font-medium">{item.name}</span>
                {item.label && (
                  <span className="text-sm text-muted-foreground">
                    {item.label}
                  </span>
                )}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void share(item)}
              >
                {canShare ? <Share2 /> : <Download />}
                {canShare ? t("celebrate.share") : t("celebrate.download")}
              </Button>
            </li>
          ))}
        </ul>
        {failed && (
          <p role="alert" className="text-sm text-destructive">
            {t("celebrate.shareFailed")}
          </p>
        )}
        <AlertDialogFooter>
          <Button type="button" onClick={close}>
            {t("celebrate.close")}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
