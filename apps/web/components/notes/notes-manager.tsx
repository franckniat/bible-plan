"use client"

import { BookOpen, NotebookPen, Pencil, Plus, Trash2 } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"

import type { Locale } from "@workspace/core"
import { Button } from "@workspace/ui/components/button"

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
        <p
          role="alert"
          className="rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {t("errors.unexpected")}
        </p>
      )}

      {editing === "new" ? (
        <div className="rounded-3xl bg-white/85 p-5 ring-1 ring-brand-night/10 dark:bg-neutral-900/85 dark:ring-white/10">
          <NoteEditor
            initial={{ ...emptyNoteDraft, passage: newPassage ?? "" }}
            onSaved={done}
            onCancel={done}
          />
        </div>
      ) : (
        <div>
          <Button
            size="lg"
            className="h-11 sm:px-5"
            onClick={() => setEditing("new")}
          >
            <Plus />
            {t("add")}
          </Button>
        </div>
      )}

      {notes.length === 0 && editing !== "new" ? (
        <div className="flex flex-col items-start gap-2 rounded-3xl border border-dashed border-brand-night/20 p-6 dark:border-white/20">
          <NotebookPen aria-hidden className="size-6 text-brand-gold" />
          <h2 className="font-heading text-xl font-semibold">
            {filtered ? t("empty.filteredTitle") : t("empty.title")}
          </h2>
          <p className="text-brand-night/70 dark:text-neutral-100/70">
            {filtered ? t("empty.filteredDescription") : t("empty.description")}
          </p>
        </div>
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
              <li
                key={note.id}
                className="rounded-3xl bg-white/85 p-5 ring-1 ring-brand-night/10 dark:bg-neutral-900/85 dark:ring-white/10"
              >
                {editing === note.id ? (
                  <NoteEditor
                    id={note.id}
                    initial={draft}
                    onSaved={done}
                    onCancel={() => setEditing(null)}
                  />
                ) : (
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Link
                        href={`/read/${note.passage}`}
                        className="flex items-center gap-2 font-heading text-xl font-semibold underline-offset-4 hover:underline"
                      >
                        <BookOpen
                          aria-hidden
                          className="size-4 text-brand-gold"
                        />
                        {labelOfSlug(note.passage, locale)}
                      </Link>
                      <span className="text-xs text-brand-night/60 dark:text-neutral-100/60">
                        {note.updated}
                      </span>
                    </div>
                    {note.keyVerse && (
                      <p className="text-sm">
                        <span className="font-medium">{t("fields.keyVerse")}</span>
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
                        <p className="whitespace-pre-line text-brand-night/80 dark:text-neutral-100/80">
                          {note.reflection}
                        </p>
                      </div>
                    )}
                    {note.application && (
                      <div>
                        <h3 className="text-sm font-medium">
                          {t("fields.application")}
                        </h3>
                        <p className="whitespace-pre-line text-brand-night/80 dark:text-neutral-100/80">
                          {note.application}
                        </p>
                      </div>
                    )}
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setEditing(note.id)}
                        aria-label={t("edit")}
                      >
                        <Pencil />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={pending}
                        aria-label={t("delete")}
                        onClick={() => {
                          if (!window.confirm(t("confirmDelete"))) return
                          setError(false)
                          startTransition(async () => {
                            const result = await deleteNoteAction(
                              note.id
                            ).catch(() => ({ error: "unexpected" }) as const)
                            if ("error" in result) setError(true)
                            else router.refresh()
                          })
                        }}
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
