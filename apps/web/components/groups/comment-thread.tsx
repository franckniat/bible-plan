"use client"

import {
  CircleAlertIcon,
  MessageCircleIcon,
  ReplyIcon,
  SendIcon,
} from "lucide-react"
import { useTranslations } from "next-intl"
import { useId, useState, useTransition } from "react"

import {
  canDeleteComment,
  maxCommentLength,
  type GroupRole,
} from "@workspace/core"
import { Alert, AlertDescription } from "@workspace/ui/components/alert"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
} from "@workspace/ui/components/card"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@workspace/ui/components/empty"
import { Field, FieldLabel } from "@workspace/ui/components/field"
import { Spinner } from "@workspace/ui/components/spinner"
import { Textarea } from "@workspace/ui/components/textarea"

import { ConfirmDeleteButton } from "@/components/confirm-delete-button"
import { useRouter } from "@/i18n/navigation"
import {
  addCommentAction,
  deleteCommentAction,
  type CommentActionError,
} from "@/server/actions/comments"

export type CommentRow = {
  id: string
  authorId: string
  authorName: string
  body: string
  /** "3 nov. 2026, 08:15". */
  at: string
  replies: CommentRow[]
}

/** The discussion about the readings of a day of a group plan. */
export function CommentThread({
  planId,
  dayNumber,
  comments,
  currentUserId,
  role,
}: {
  planId: string
  dayNumber: number
  comments: CommentRow[]
  currentUserId: string
  role: GroupRole
}) {
  const t = useTranslations("Comments")
  const router = useRouter()
  const newId = useId()
  const [text, setText] = useState("")
  // The comment being answered, and the answer being written.
  const [replyTo, setReplyTo] = useState<string | null>(null)
  const [reply, setReply] = useState("")
  const [error, setError] = useState<CommentActionError | null>(null)
  const [pending, startTransition] = useTransition()

  function send(body: string, parentId: string | null, then: () => void) {
    setError(null)
    startTransition(async () => {
      const result = await addCommentAction(planId, dayNumber, {
        body,
        parentId,
      }).catch(() => ({ error: "unexpected" }) as const)
      if ("error" in result) return setError(result.error)
      then()
      router.refresh()
    })
  }

  function remove(commentId: string) {
    setError(null)
    startTransition(async () => {
      const result = await deleteCommentAction(commentId).catch(
        () => ({ error: "unexpected" }) as const
      )
      if ("error" in result) return setError(result.error)
      router.refresh()
    })
  }

  const deletable = (comment: CommentRow) => (
    <ConfirmDeleteButton
      label={t("delete.label", { name: comment.authorName })}
      title={t("delete.title")}
      description={t("delete.description")}
      confirmLabel={t("delete.confirm")}
      cancelLabel={t("cancel")}
      disabled={pending}
      onConfirm={() => remove(comment.id)}
    />
  )

  return (
    <div className="flex flex-col gap-6">
      {error && (
        <Alert variant="destructive" role="alert">
          <CircleAlertIcon />
          <AlertDescription>{t(`errors.${error}`)}</AlertDescription>
        </Alert>
      )}

      <form
        onSubmit={(event) => {
          event.preventDefault()
          if (text.trim() !== "") send(text, null, () => setText(""))
        }}
        className="flex flex-col gap-3"
      >
        <Field>
          <FieldLabel htmlFor={newId}>{t("new.label")}</FieldLabel>
          <Textarea
            id={newId}
            value={text}
            maxLength={maxCommentLength}
            placeholder={t("new.placeholder")}
            onChange={(event) => setText(event.target.value)}
            className="min-h-24"
          />
        </Field>
        <div>
          <Button type="submit" disabled={pending || text.trim() === ""}>
            {pending && replyTo === null ? (
              <Spinner data-icon="inline-start" />
            ) : (
              <SendIcon data-icon="inline-start" />
            )}
            {t("new.submit")}
          </Button>
        </div>
      </form>

      {comments.length === 0 ? (
        <Empty className="border border-dashed">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <MessageCircleIcon />
            </EmptyMedia>
            <EmptyTitle>{t("empty.title")}</EmptyTitle>
            <EmptyDescription>{t("empty.description")}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <ul className="flex flex-col gap-3">
          {comments.map((comment) => (
            <li key={comment.id}>
              <Card size="sm">
                <CardContent className="flex flex-col gap-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="flex flex-col">
                      <span className="font-medium">{comment.authorName}</span>
                      <span className="text-xs text-muted-foreground">
                        {comment.at}
                      </span>
                    </div>
                    {canDeleteComment(comment.authorId, currentUserId, role) &&
                      deletable(comment)}
                  </div>
                  <p className="whitespace-pre-line">{comment.body}</p>

                  {comment.replies.length > 0 && (
                    <ul className="flex flex-col gap-3 border-l-2 pl-4">
                      {comment.replies.map((answer) => (
                        <li key={answer.id} className="flex flex-col gap-1">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div className="flex flex-col">
                              <span className="text-sm font-medium">
                                {answer.authorName}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {answer.at}
                              </span>
                            </div>
                            {canDeleteComment(
                              answer.authorId,
                              currentUserId,
                              role
                            ) && deletable(answer)}
                          </div>
                          <p className="text-sm whitespace-pre-line">
                            {answer.body}
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}

                  {replyTo === comment.id ? (
                    <form
                      onSubmit={(event) => {
                        event.preventDefault()
                        if (reply.trim() !== "") {
                          send(reply, comment.id, () => {
                            setReply("")
                            setReplyTo(null)
                          })
                        }
                      }}
                      className="flex flex-col gap-2"
                    >
                      <Textarea
                        value={reply}
                        maxLength={maxCommentLength}
                        placeholder={t("reply.placeholder")}
                        aria-label={t("reply.label", {
                          name: comment.authorName,
                        })}
                        onChange={(event) => setReply(event.target.value)}
                        className="min-h-20"
                        autoFocus
                      />
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="submit"
                          size="sm"
                          disabled={pending || reply.trim() === ""}
                        >
                          {pending && <Spinner data-icon="inline-start" />}
                          {t("reply.submit")}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setReplyTo(null)
                            setReply("")
                          }}
                        >
                          {t("cancel")}
                        </Button>
                      </div>
                    </form>
                  ) : (
                    <div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setReplyTo(comment.id)
                          setReply("")
                        }}
                      >
                        <ReplyIcon data-icon="inline-start" />
                        {t("reply.button")}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
