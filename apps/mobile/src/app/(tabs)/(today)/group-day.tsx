import {
  canDeleteComment,
  type CommentData,
  type GroupRole,
} from "@workspace/core"
import { Stack, useLocalSearchParams } from "expo-router"
import { CircleAlert, Reply, Send, Trash2, X } from "lucide-react-native"
import { useState } from "react"
import { Text, View } from "react-native"
import { useFormatter, useTranslations } from "use-intl"

import { QueryState, SignedOutCard } from "@/components/groups/query-state"
import { Body, TabScreen } from "@/components/screen"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Notice } from "@/components/ui/notice"
import { ApiError } from "@/lib/api"
import { confirm } from "@/lib/confirm"
import {
  useAccountId,
  useAddComment,
  useDayThread,
  useDeleteComment,
} from "@/repositories/groups"
import { spacing, typography } from "@/theme/metrics"
import { useColors } from "@/theme/use-colors"

/**
 * The discussion of a group about a day of its plan, as on the website: the
 * comments oldest first, their answers under them (one level), a field to
 * write; each one deletes their own, and whoever manages the group any.
 */
export default function GroupDayScreen() {
  const params = useLocalSearchParams<{
    plan: string
    day: string
    title?: string
    total?: string
  }>()
  const t = useTranslations("Comments")
  const accountId = useAccountId()
  const day = Number(params.day)
  const total = Number(params.total)
  const thread = useDayThread(params.plan, day)
  const colors = useColors()
  return (
    <>
      <Stack.Screen options={{ title: t("discussionTitle") }} />
      <TabScreen>
        {params.title ? (
          <Text
            accessibilityRole="header"
            style={[typography.h2, { color: colors.foreground }]}
          >
            {params.title}
          </Text>
        ) : null}
        {Number.isInteger(total) && total > 0 ? (
          <Body>{t("day", { day, total })}</Body>
        ) : null}
        {accountId === null ? (
          <SignedOutCard />
        ) : (
          <QueryState query={thread}>
            {(data) => (
              <Discussion
                planId={params.plan}
                day={day}
                role={data.role}
                accountId={accountId}
                comments={data.comments}
              />
            )}
          </QueryState>
        )}
      </TabScreen>
    </>
  )
}

/** The key of Comments.errors for what went wrong. */
function errorKey(
  error: unknown
): "invalid" | "notFound" | "forbidden" | "unexpected" {
  const code = error instanceof ApiError ? error.code : "unexpected"
  return code === "invalid" || code === "notFound" || code === "forbidden"
    ? code
    : "unexpected"
}

function Discussion({
  planId,
  day,
  role,
  accountId,
  comments,
}: {
  planId: string
  day: number
  role: GroupRole
  accountId: string
  comments: CommentData[]
}) {
  const t = useTranslations("Comments")
  const [body, setBody] = useState("")
  /** The comment being answered, if any. */
  const [replyTo, setReplyTo] = useState<CommentData | null>(null)
  const add = useAddComment(planId, day)
  const remove = useDeleteComment(planId, day)
  const error = add.error ?? remove.error

  const send = () => {
    const text = body.trim()
    if (!text) return
    add.mutate(
      { body: text, parentId: replyTo?.id ?? null },
      {
        onSuccess: () => {
          setBody("")
          setReplyTo(null)
        },
      }
    )
  }
  const askToDelete = async (comment: CommentData) => {
    const sure = await confirm({
      title: t("delete.title"),
      message: t("delete.description"),
      confirmLabel: t("delete.confirm"),
      cancelLabel: t("cancel"),
    })
    if (sure) remove.mutate(comment.id)
  }

  return (
    <>
      {error ? (
        <Notice icon={CircleAlert}>{t(`errors.${errorKey(error)}`)}</Notice>
      ) : null}
      <View style={{ gap: spacing.sm }}>
        <Input
          label={
            replyTo
              ? t("reply.label", { name: replyTo.authorName })
              : t("new.label")
          }
          placeholder={replyTo ? t("reply.placeholder") : t("new.placeholder")}
          value={body}
          onChangeText={setBody}
          multiline
          maxLength={2000}
        />
        <View style={{ flexDirection: "row", gap: spacing.sm }}>
          <Button
            title={replyTo ? t("reply.submit") : t("new.submit")}
            icon={Send}
            loading={add.isPending}
            disabled={add.isPending || !body.trim()}
            onPress={send}
            style={{ flex: 1 }}
          />
          {replyTo ? (
            <Button
              title={t("cancel")}
              icon={X}
              variant="ghost"
              onPress={() => setReplyTo(null)}
            />
          ) : null}
        </View>
      </View>
      {comments.length === 0 ? (
        <Card title={t("empty.title")}>
          <Body>{t("empty.description")}</Body>
        </Card>
      ) : (
        comments.map((comment) => (
          <Card key={comment.id}>
            <CommentView
              comment={comment}
              canDelete={canDeleteComment(comment.authorId, accountId, role)}
              onDelete={() => void askToDelete(comment)}
            />
            {comment.replies.map((reply) => (
              <View
                key={reply.id}
                style={{ paddingLeft: spacing.md, gap: spacing.xs }}
              >
                <CommentView
                  comment={reply}
                  canDelete={canDeleteComment(reply.authorId, accountId, role)}
                  onDelete={() => void askToDelete(reply)}
                />
              </View>
            ))}
            <Button
              title={t("reply.button")}
              icon={Reply}
              variant="ghost"
              size="sm"
              accessibilityLabel={t("reply.label", {
                name: comment.authorName,
              })}
              onPress={() => setReplyTo(comment)}
            />
          </Card>
        ))
      )}
    </>
  )
}

function CommentView({
  comment,
  canDelete,
  onDelete,
}: {
  comment: CommentData
  canDelete: boolean
  onDelete: () => void
}) {
  const t = useTranslations("Comments")
  const format = useFormatter()
  const colors = useColors()
  return (
    <View style={{ gap: spacing.xs }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: spacing.sm,
        }}
      >
        <Text
          style={[typography.h3, { color: colors.foreground, flexShrink: 1 }]}
        >
          {comment.authorName}
          <Text style={[typography.small, { color: colors.mutedForeground }]}>
            {`  ${format.relativeTime(new Date(comment.createdAt))}`}
          </Text>
        </Text>
        {canDelete ? (
          <Button
            title=""
            icon={Trash2}
            variant="ghost"
            size="sm"
            accessibilityLabel={t("delete.label", { name: comment.authorName })}
            onPress={onDelete}
          />
        ) : null}
      </View>
      <Text selectable style={[typography.body, { color: colors.foreground }]}>
        {comment.body}
      </Text>
    </View>
  )
}
