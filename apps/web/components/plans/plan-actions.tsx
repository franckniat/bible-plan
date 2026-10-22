"use client"

import { Archive, ArchiveRestore, Pause, Play, Trash2 } from "lucide-react"
import { useTranslations } from "next-intl"
import { useState, useTransition } from "react"

import { Button } from "@workspace/ui/components/button"

import { ConfirmDialog } from "@/components/confirm-dialog"
import { deletePlanAction, setPlanStatusAction } from "@/server/actions/plans"

type Status = "ACTIVE" | "PAUSED" | "ARCHIVED"

/** Pause, resume, archive, restore or delete a plan. */
export function PlanActions({
  planId,
  status,
  canDelete = true,
}: {
  planId: string
  status: Status
  /** False for a member who only follows a plan of a group. */
  canDelete?: boolean
}) {
  const t = useTranslations("PlanDetail.actions")
  const [pending, startTransition] = useTransition()
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
        {canDelete && (
          <ConfirmDialog
            trigger={
              <Button
                variant="ghost"
                disabled={pending}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 />
                {t("delete")}
              </Button>
            }
            title={t("delete")}
            description={t("deleteQuestion")}
            confirmLabel={t("deleteConfirm")}
            cancelLabel={t("cancel")}
            onConfirm={() => run(() => deletePlanAction(planId))}
          />
        )}
      </div>

      {failed && (
        <p role="alert" className="text-sm text-destructive">
          {t("failed")}
        </p>
      )}
    </div>
  )
}
