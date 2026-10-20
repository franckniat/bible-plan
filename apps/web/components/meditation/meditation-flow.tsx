"use client"

import { BookOpen, Check, NotebookPen, Pause, Play, Square } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import { useCallback, useEffect, useId, useRef, useState } from "react"

import {
  maxMeditationMinutes,
  meditationMinutes,
  minMeditationMinutes,
  type Locale,
} from "@workspace/core"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { cn } from "@workspace/ui/lib/utils"

import { NoteEditor } from "@/components/notes/note-editor"
import { Link } from "@/i18n/navigation"
import { labelOfSlug, slugFromText } from "@/lib/passage-input"
import { saveMeditationSessionAction } from "@/server/actions/meditation"

type Phase =
  | { name: "setup" }
  | { name: "running"; plannedSeconds: number; passage: string | null }
  | {
      name: "done"
      passage: string | null
      durationSeconds: number
      /** Null when the session could not be saved. */
      sessionId: string | null
    }

/** mm:ss, with hours when a session is long enough. */
function clock(totalSeconds: number): string {
  const seconds = Math.max(0, Math.ceil(totalSeconds))
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  const pad = (n: number) => String(n).padStart(2, "0")
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`
}

/** Three soft tones, to tell the end of a session without startling. */
function playEndSound(context: AudioContext | null) {
  if (!context) return
  const now = context.currentTime
  ;[0, 0.9, 1.8].forEach((offset, index) => {
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    oscillator.type = "sine"
    oscillator.frequency.value = [523.25, 659.25, 783.99][index]!
    gain.gain.setValueAtTime(0.0001, now + offset)
    gain.gain.exponentialRampToValueAtTime(0.25, now + offset + 0.05)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 1.6)
    oscillator.connect(gain).connect(context.destination)
    oscillator.start(now + offset)
    oscillator.stop(now + offset + 1.7)
  })
}

export function MeditationFlow({
  todayPassage,
}: {
  /** The passage to read today in the plans of the user, as a slug. */
  todayPassage: string | null
}) {
  const t = useTranslations("Meditate")
  const locale = useLocale() as Locale
  const id = useId()
  const [phase, setPhase] = useState<Phase>({ name: "setup" })
  const [minutes, setMinutes] = useState<number>(10)
  const [customMinutes, setCustomMinutes] = useState("")
  const [passageText, setPassageText] = useState(
    todayPassage ? labelOfSlug(todayPassage, locale) : ""
  )
  const [passageError, setPassageError] = useState(false)
  const [noting, setNoting] = useState(false)
  const [noted, setNoted] = useState(false)

  // The timer. Time is counted from the clock, not from the ticks: a tab in
  // the background slows timers down but not Date.now().
  const [remaining, setRemaining] = useState(0)
  const [paused, setPaused] = useState(false)
  const timer = useRef({
    startedAt: new Date(),
    elapsedBefore: 0,
    resumedAt: 0,
    plannedSeconds: 0,
    finished: false,
  })
  const audio = useRef<AudioContext | null>(null)
  const wakeLock = useRef<WakeLockSentinel | null>(null)

  const elapsedSeconds = () => {
    const { elapsedBefore, resumedAt } = timer.current
    return (
      (elapsedBefore + (resumedAt > 0 ? Date.now() - resumedAt : 0)) / 1000
    )
  }

  const releaseWakeLock = useCallback(() => {
    wakeLock.current?.release().catch(() => {})
    wakeLock.current = null
  }, [])

  const requestWakeLock = useCallback(async () => {
    try {
      wakeLock.current = (await navigator.wakeLock?.request("screen")) ?? null
    } catch {
      // Not supported, or refused (low battery): the screen may dim.
    }
  }, [])

  const finish = useCallback(
    async (passage: string | null, early: boolean) => {
      const state = timer.current
      if (state.finished) return
      state.finished = true
      const seconds = Math.max(
        1,
        Math.min(Math.round(elapsedSeconds()), state.plannedSeconds * 2)
      )
      state.resumedAt = 0
      releaseWakeLock()
      if (!early) playEndSound(audio.current)
      const result = await saveMeditationSessionAction({
        passage,
        plannedSeconds: state.plannedSeconds,
        durationSeconds: seconds,
        startedAt: state.startedAt.toISOString(),
      }).catch(() => ({ ok: false }) as const)
      setPhase({
        name: "done",
        passage,
        durationSeconds: seconds,
        sessionId: result.ok ? result.sessionId : null,
      })
    },
    [releaseWakeLock]
  )

  // Ticks while running; the screen is kept awake, and asked again when the
  // tab comes back (the browser lets go of the lock when it is hidden).
  const running = phase.name === "running"
  const runningPassage = phase.name === "running" ? phase.passage : null
  useEffect(() => {
    if (!running) return
    const tick = () => {
      const left = timer.current.plannedSeconds - elapsedSeconds()
      setRemaining(left)
      if (left <= 0) void finish(runningPassage, false)
    }
    tick()
    const interval = window.setInterval(tick, 250)
    const onVisible = () => {
      if (document.visibilityState === "visible" && !timer.current.finished) {
        if (timer.current.resumedAt > 0) void requestWakeLock()
        tick()
      }
    }
    document.addEventListener("visibilitychange", onVisible)
    return () => {
      window.clearInterval(interval)
      document.removeEventListener("visibilitychange", onVisible)
    }
  }, [running, runningPassage, finish, requestWakeLock])

  // Leaving the page lets the screen sleep again.
  useEffect(() => () => releaseWakeLock(), [releaseWakeLock])

  function start() {
    const chosen = customMinutes.trim() === "" ? minutes : Number(customMinutes)
    if (
      !Number.isInteger(chosen) ||
      chosen < minMeditationMinutes ||
      chosen > maxMeditationMinutes
    ) {
      return
    }
    let passage: string | null = null
    if (passageText.trim() !== "") {
      passage = slugFromText(passageText, locale)
      if (!passage) return setPassageError(true)
    }
    setPassageError(false)
    // The audio context is made in the click, as browsers only allow sound
    // after a gesture; the end of the session is far from any click.
    try {
      audio.current ??= new AudioContext()
      void audio.current.resume()
    } catch {
      audio.current = null
    }
    timer.current = {
      startedAt: new Date(),
      elapsedBefore: 0,
      resumedAt: Date.now(),
      plannedSeconds: chosen * 60,
      finished: false,
    }
    setPaused(false)
    setRemaining(chosen * 60)
    setNoting(false)
    setNoted(false)
    void requestWakeLock()
    setPhase({ name: "running", plannedSeconds: chosen * 60, passage })
  }

  function togglePause() {
    const state = timer.current
    if (paused) {
      state.resumedAt = Date.now()
      void requestWakeLock()
    } else {
      state.elapsedBefore += Date.now() - state.resumedAt
      state.resumedAt = 0
      releaseWakeLock()
    }
    setPaused(!paused)
  }

  if (phase.name === "running") {
    const progress = 1 - remaining / phase.plannedSeconds
    return (
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t("timer.label")}
        className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-10 bg-brand-night px-6 text-brand-cream"
      >
        <div className="flex flex-col items-center gap-3 text-center">
          {phase.passage && (
            <Link
              href={`/read/${phase.passage}`}
              target="_blank"
              className="flex items-center gap-2 rounded-full px-4 py-1.5 text-sm text-brand-cream/80 ring-1 ring-brand-cream/25 transition-colors outline-none hover:bg-brand-cream/10 focus-visible:ring-3 focus-visible:ring-brand-gold"
            >
              <BookOpen aria-hidden className="size-4 text-brand-gold" />
              {labelOfSlug(phase.passage, locale)}
              <span className="sr-only"> — {t("timer.readPassage")}</span>
            </Link>
          )}
          <p
            role="timer"
            aria-live="off"
            className="font-heading text-8xl font-semibold tabular-nums sm:text-9xl"
          >
            {clock(remaining)}
          </p>
          <p className="text-brand-cream/70">
            {paused ? t("timer.paused") : t("timer.breathe")}
          </p>
        </div>
        <div
          aria-hidden
          className="h-1.5 w-full max-w-sm overflow-hidden rounded-full bg-brand-cream/15"
        >
          <div
            className="h-full rounded-full bg-brand-gold transition-[width] duration-300"
            style={{ width: `${Math.min(100, Math.max(0, progress * 100))}%` }}
          />
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button
            size="lg"
            className="h-12 bg-brand-gold px-6 text-neutral-950 hover:bg-brand-gold/90"
            onClick={togglePause}
          >
            {paused ? <Play /> : <Pause />}
            {paused ? t("timer.resume") : t("timer.pause")}
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="h-12 border-brand-cream/30 bg-transparent px-6 text-brand-cream hover:bg-brand-cream/10 hover:text-brand-cream"
            onClick={() => void finish(phase.passage, true)}
          >
            <Square />
            {t("timer.stop")}
          </Button>
        </div>
      </div>
    )
  }

  if (phase.name === "done") {
    return (
      <div className="flex flex-col gap-6">
        <div
          role="status"
          className="flex flex-col gap-2 rounded-3xl bg-brand-gold/15 p-6"
        >
          <p className="flex items-center gap-2 font-heading text-xl font-semibold">
            <Check aria-hidden className="size-5 text-brand-gold" />
            {t("done.title")}
          </p>
          <p>
            {phase.sessionId
              ? t("done.saved", {
                  duration: clock(phase.durationSeconds),
                })
              : t("done.notSaved", {
                  duration: clock(phase.durationSeconds),
                })}
          </p>
        </div>

        {noted ? (
          <p role="status" className="text-brand-night/80 dark:text-neutral-100/80">
            {t("done.noteSaved")}{" "}
            <Link href="/notes" className="underline underline-offset-4">
              {t("done.seeNotes")}
            </Link>
          </p>
        ) : noting ? (
          <div className="rounded-3xl bg-white/85 p-5 ring-1 ring-brand-night/10 dark:bg-neutral-900/85 dark:ring-white/10">
            <NoteEditor
              initial={{
                passage: phase.passage ?? "",
                keyVerse: "",
                reflection: "",
                application: "",
              }}
              sessionId={phase.sessionId}
              onSaved={() => {
                setNoting(false)
                setNoted(true)
              }}
              onCancel={() => setNoting(false)}
            />
          </div>
        ) : (
          <div className="flex flex-col gap-2 rounded-3xl bg-white/85 p-5 ring-1 ring-brand-night/10 dark:bg-neutral-900/85 dark:ring-white/10">
            <h2 className="font-heading text-lg font-semibold">
              {t("done.offerTitle")}
            </h2>
            <p className="text-brand-night/70 dark:text-neutral-100/70">
              {t("done.offerDescription")}
            </p>
            <div>
              <Button onClick={() => setNoting(true)}>
                <NotebookPen />
                {t("done.writeNote")}
              </Button>
            </div>
          </div>
        )}

        <div>
          <Button variant="outline" onClick={() => setPhase({ name: "setup" })}>
            {t("done.again")}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <form
      noValidate
      className="flex flex-col gap-6"
      onSubmit={(event) => {
        event.preventDefault()
        start()
      }}
    >
      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1 text-sm font-medium">{t("setup.duration")}</legend>
        <div className="flex flex-wrap gap-2">
          {meditationMinutes.map((value) => {
            const selected = customMinutes.trim() === "" && minutes === value
            return (
              <label
                key={value}
                className={cn(
                  "cursor-pointer rounded-full px-4 py-2 text-sm ring-1 transition-colors select-none has-focus-visible:ring-3 has-focus-visible:ring-brand-gold",
                  selected
                    ? "bg-brand-night text-brand-cream ring-brand-night dark:bg-brand-gold dark:text-neutral-950 dark:ring-brand-gold"
                    : "ring-brand-night/15 hover:bg-brand-gold/10 dark:ring-white/20"
                )}
              >
                <input
                  type="radio"
                  name={`${id}-minutes`}
                  className="sr-only"
                  checked={selected}
                  onChange={() => {
                    setMinutes(value)
                    setCustomMinutes("")
                  }}
                />
                {t("setup.minutes", { count: value })}
              </label>
            )
          })}
        </div>
        <div className="flex max-w-xs flex-col gap-2">
          <Label htmlFor={`${id}-custom`}>{t("setup.custom")}</Label>
          <Input
            id={`${id}-custom`}
            type="number"
            inputMode="numeric"
            min={minMeditationMinutes}
            max={maxMeditationMinutes}
            value={customMinutes}
            onChange={(event) => setCustomMinutes(event.target.value)}
            className="h-10"
          />
        </div>
      </fieldset>

      <div className="flex max-w-md flex-col gap-2">
        <Label htmlFor={`${id}-passage`}>{t("setup.passage")}</Label>
        <Input
          id={`${id}-passage`}
          value={passageText}
          placeholder={t("setup.passagePlaceholder")}
          aria-invalid={passageError}
          onChange={(event) => {
            setPassageText(event.target.value)
            setPassageError(false)
          }}
          className="h-10"
        />
        {passageError ? (
          <p role="alert" className="text-sm text-destructive">
            {t("setup.passageError")}
          </p>
        ) : (
          <p className="text-sm text-brand-night/70 dark:text-neutral-100/70">
            {todayPassage ? t("setup.passageToday") : t("setup.passageHint")}
          </p>
        )}
      </div>

      <div>
        <Button type="submit" size="lg" className="h-12 px-6">
          <Play />
          {t("setup.start")}
        </Button>
      </div>
    </form>
  )
}
