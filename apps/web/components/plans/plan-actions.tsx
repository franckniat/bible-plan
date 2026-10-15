"use client"

import { Archive, ArchiveRestore, Pause, Play, Trash2 } from "lucide-react"
import { useTranslations } from "next-intl"
import { useState, useTransition } from "react"

import { Button } from "@workspace/ui/components/button"

import { deletePlanAction, setPlanStatusAction } from "@/server/actions/plans"

type Status = "ACTIVE" | "PAUSED" | "ARCHIVED"

/** Pause, resume, archive, restore or delete a plan. */
export function PlanActions({
  planId,
  status,
}: {
  planId: string
  status: Status
}) {
  const t = useTranslations("PlanDetail.actions")
  const [pending, startTransition] = useTransition()
  const [confirming, setConfirming] = useState(false)
  const [failed, setFailed] = useState(false)

  function run(action: () => Promise<{ ok: boolean }>) {
    setFailed(false)
    startTransition(async () => {
      const result = await action().catch(() => ({ ok: false }))
      // A successful delete redirects; other actions refresh the page.
      if (!result?.ok) setFailed(true)
    })
  }

  const setStatus = (next: Status) => () =>
    run(() => setPlanStatusAction(planId, next))

  return (
    <div className="flex flex-col gap-3">
      {status !== "ACTIVE" && (
        <p className="text-sm text-brand-night/70 dark:text-neutral-100/70">
          {t(status === "PAUSED" ? "pausedHint" : "archivedHint")}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {status === "ACTIVE" && (
          <Button
            variant="outline"
            disabled={pending}
            onClick={setStatus("PAUSED")}
          >
            <Pause />
            {t("pause")}
          </Button>
        )}
        {status === "PAUSED" && (
          <Button
            variant="outline"
            disabled={pending}
            onClick={setStatus("ACTIVE")}
          >
            <Play />
            {t("resume")}
          </Button>
        )}
        {status === "ARCHIVED" ? (
          <Button
            variant="outline"
            disabled={pending}
            onClick={setStatus("ACTIVE")}
          >
            <ArchiveRestore />
            {t("restore")}
          </Button>
        ) : (
          <Button
            variant="outline"
            disabled={pending}
            onClick={setStatus("ARCHIVED")}
          >
            <Archive />
            {t("archive")}
          </Button>
        )}
        {!confirming && (
          <Button
            variant="ghost"
            disabled={pending}
            onClick={() => setConfirming(true)}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 />
            {t("delete")}
          </Button>
        )}
      </div>

      {confirming && (
        <div
          role="alertdialog"
          aria-labelledby="delete-question"
          className="flex flex-col gap-3 rounded-2xl bg-destructive/10 p-4"
        >
          <p id="delete-question" className="text-sm">
            {t("deleteQuestion")}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="destructive"
              disabled={pending}
              onClick={() => run(() => deletePlanAction(planId))}
            >
              <Trash2 />
              {t("deleteConfirm")}
            </Button>
            <Button
              variant="ghost"
              disabled={pending}
              onClick={() => setConfirming(false)}
              autoFocus
            >
              {t("cancel")}
            </Button>
          </div>
        </div>
      )}

      {failed && (
        <p role="alert" className="text-sm text-destructive">
          {t("failed")}
        </p>
      )}
    </div>
  )
}
