"use client"

import {
  BookOpenIcon,
  CircleAlertIcon,
  NotebookPenIcon,
  PencilIcon,
  PlusIcon,
} from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"

import type { Locale } from "@workspace/core"
import { Alert, AlertDescription } from "@workspace/ui/components/alert"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@workspace/ui/components/empty"

import { ConfirmDeleteButton } from "@/components/confirm-delete-button"
import {
  emptyNoteDraft,
  NoteEditor,
  type NoteDraft,
} from "@/components/notes/note-editor"
import { Link } from "@/i18n/navigation"
import { labelOfSlug } from "@/lib/passage-input"
import { deleteNoteAction } from "@/server/actions/meditation"

export type NoteView = {
  id: string
  passage: string
  keyVerse: string | null
  reflection: string | null
  application: string | null
  /** "12 oct. 2026". */
  updated: string
}

export function NotesManager({
  notes,
  newPassage,
  filtered,
}: {
  notes: NoteView[]
  /** A passage to start a new note on (from the reader or a session). */
  newPassage: string | null
  /** Whether a search or a book filter is on, for the empty message. */
  filtered: boolean
}) {
  const t = useTranslations("Notes")
  const locale = useLocale() as Locale
  const router = useRouter()
  // "new", the id of the note being edited, or null.
  const [editing, setEditing] = useState<string | null>(
    newPassage ? "new" : null
  )
  const [error, setError] = useState(false)
  const [pending, startTransition] = useTransition()

  function done() {
    setEditing(null)
    // Drops `?new=` from the address so a refresh does not reopen the editor.
    router.replace("/notes")
    router.refresh()
  }

  return (
    <div className="flex flex-col gap-6">
      {error && (
        <Alert variant="destructive" role="alert">
          <CircleAlertIcon />
          <AlertDescription>{t("errors.unexpected")}</AlertDescription>
        </Alert>
      )}

      {editing === "new" ? (
        <Card>
          <CardContent>
            <NoteEditor
              initial={{ ...emptyNoteDraft, passage: newPassage ?? "" }}
              onSaved={done}
              onCancel={done}
            />
          </CardContent>
        </Card>
      ) : (
        <div>
          <Button
            size="lg"
            className="h-11 sm:px-5"
            onClick={() => setEditing("new")}
          >
            <PlusIcon data-icon="inline-start" />
            {t("add")}
          </Button>
        </div>
      )}

      {notes.length === 0 && editing !== "new" ? (
        <Empty className="border border-dashed">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <NotebookPenIcon />
            </EmptyMedia>
            <EmptyTitle>
              {filtered ? t("empty.filteredTitle") : t("empty.title")}
            </EmptyTitle>
            <EmptyDescription>
              {filtered
                ? t("empty.filteredDescription")
                : t("empty.description")}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <ul className="flex flex-col gap-3">
          {notes.map((note) => {
            const draft: NoteDraft = {
              passage: note.passage,
              keyVerse: note.keyVerse ?? "",
              reflection: note.reflection ?? "",
              application: note.application ?? "",
            }
            return (
              <li key={note.id}>
                <Card>
                  {editing === note.id ? (
                    <CardContent>
                      <NoteEditor
                        id={note.id}
                        initial={draft}
                        onSaved={done}
                        onCancel={() => setEditing(null)}
                      />
                    </CardContent>
                  ) : (
                    <>
                      <CardHeader>
                        <CardTitle className="flex flex-wrap items-center justify-between gap-2 font-heading text-xl">
                          <Link
                            href={`/read/${note.passage}`}
                            className="flex items-center gap-2 underline-offset-4 hover:underline"
                          >
                            <BookOpenIcon
                              aria-hidden
                              className="size-4 text-brand-gold"
                            />
                            {labelOfSlug(note.passage, locale)}
                          </Link>
                          <span className="font-sans text-xs font-normal text-muted-foreground">
                            {note.updated}
                          </span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="flex flex-col gap-3">
                        {note.keyVerse && (
                          <p className="text-sm">
                            <span className="font-medium">
                              {t("fields.keyVerse")}
                            </span>
                            {" · "}
                            <Link
                              href={`/read/${note.keyVerse}`}
                              className="underline-offset-4 hover:underline"
                            >
                              {labelOfSlug(note.keyVerse, locale)}
                            </Link>
                          </p>
                        )}
                        {note.reflection && (
                          <div>
                            <h3 className="text-sm font-medium">
                              {t("fields.reflection")}
                            </h3>
                            <p className="whitespace-pre-line text-muted-foreground">
                              {note.reflection}
                            </p>
                          </div>
                        )}
                        {note.application && (
                          <div>
                            <h3 className="text-sm font-medium">
                              {t("fields.application")}
                            </h3>
                            <p className="whitespace-pre-line text-muted-foreground">
                              {note.application}
                            </p>
                          </div>
                        )}
                      </CardContent>
                      <CardFooter className="justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setEditing(note.id)}
                          aria-label={t("edit")}
                        >
                          <PencilIcon />
                        </Button>
                        <ConfirmDeleteButton
                          label={t("delete")}
                          title={t("deleteDialog.title")}
                          description={t("deleteDialog.description")}
                          confirmLabel={t("delete")}
                          cancelLabel={t("cancel")}
                          disabled={pending}
                          onConfirm={() => {
                            setError(false)
                            startTransition(async () => {
                              const result = await deleteNoteAction(
                                note.id
                              ).catch(() => ({ error: "unexpected" }) as const)
                              if ("error" in result) setError(true)
                              else router.refresh()
                            })
                          }}
                        />
                      </CardFooter>
                    </>
                  )}
                </Card>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
