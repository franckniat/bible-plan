"use client"

import {
  BookOpenIcon,
  CheckIcon,
  HandHeartIcon,
  NotebookPenIcon,
  PauseIcon,
  PlayIcon,
  SquareIcon,
} from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import { useCallback, useEffect, useId, useRef, useState } from "react"

import {
  maxMeditationMinutes,
  minMeditationMinutes,
  type Locale,
  type SessionKind,
} from "@workspace/core"
import { Alert, AlertDescription, AlertTitle } from "@workspace/ui/components/alert"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import { Progress } from "@workspace/ui/components/progress"
import { Spinner } from "@workspace/ui/components/spinner"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@workspace/ui/components/toggle-group"

import { PassagePicker } from "@/components/bible/passage-picker"
import { NoteEditor } from "@/components/notes/note-editor"
import { Link } from "@/i18n/navigation"
import { labelOfSlug } from "@/lib/passage-input"
import { saveMeditationSessionAction } from "@/server/actions/meditation"

type Phase =
  | { name: "setup" }
  | { name: "running"; plannedSeconds: number; passage: string }
  | { name: "saving" }
  | {
      name: "done"
      passage: string
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

/**
 * A timed session of meditation or of prayer: choose a duration and a
 * passage, then a fullscreen timer that keeps the screen awake, can be
 * paused and ends with a sound. The session is saved with the time really
 * spent.
 */
export function SessionFlow({
  kind,
  minutes: durations,
  defaultMinutes,
  todayPassage,
}: {
  kind: SessionKind
  /** The durations offered, in minutes. */
  minutes: readonly number[]
  defaultMinutes: number
  /** The passage to read today in the plans of the user, as a slug. */
  todayPassage: string | null
}) {
  // Both namespaces have the same keys, one wording for each kind.
  const t = useTranslations(
    kind === "PRAYER" ? "PrayerTimer" : "Meditate"
  ) as unknown as ReturnType<typeof useTranslations<"Meditate">>
  const tPrayer = useTranslations("PrayerTimer")
  const locale = useLocale() as Locale
  const id = useId()
  const [phase, setPhase] = useState<Phase>({ name: "setup" })
  const [minutes, setMinutes] = useState<number>(defaultMinutes)
  const [customMinutes, setCustomMinutes] = useState("")
  const [passage, setPassage] = useState(todayPassage ?? "")
  const [customInvalid, setCustomInvalid] = useState(false)
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
    async (slug: string, early: boolean) => {
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
      setPhase({ name: "saving" })
      const result = await saveMeditationSessionAction({
        kind,
        passage: slug === "" ? null : slug,
        plannedSeconds: state.plannedSeconds,
        durationSeconds: seconds,
        startedAt: state.startedAt.toISOString(),
      }).catch(() => ({ ok: false }) as const)
      setPhase({
        name: "done",
        passage: slug,
        durationSeconds: seconds,
        sessionId: result.ok ? result.sessionId : null,
      })
    },
    [kind, releaseWakeLock]
  )

  // Ticks while running; the screen is kept awake, and asked again when the
  // tab comes back (the browser lets go of the lock when it is hidden).
  const running = phase.name === "running"
  const runningPassage = phase.name === "running" ? phase.passage : ""
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
      return setCustomInvalid(true)
    }
    setCustomInvalid(false)
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
    const progress = Math.min(
      100,
      Math.max(0, (1 - remaining / phase.plannedSeconds) * 100)
    )
    return (
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t("timer.label")}
        className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-10 bg-brand-night px-6 text-brand-cream"
      >
        <div className="flex flex-col items-center gap-3 text-center">
          {phase.passage && (
            <Button
              variant="outline"
              size="sm"
              className="border-brand-cream/25 bg-transparent text-brand-cream hover:bg-brand-cream/10 hover:text-brand-cream"
              nativeButton={false}
              render={
                <Link href={`/read/${phase.passage}`} target="_blank" />
              }
            >
              <BookOpenIcon data-icon="inline-start" />
              {labelOfSlug(phase.passage, locale)}
              <span className="sr-only"> — {t("timer.readPassage")}</span>
            </Button>
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
        <Progress
          value={progress}
          aria-label={t("timer.progress")}
          className="max-w-sm"
        />
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button
            size="lg"
            className="h-12 bg-brand-gold px-6 text-neutral-950 hover:bg-brand-gold/90"
            onClick={togglePause}
          >
            {paused ? (
              <PlayIcon data-icon="inline-start" />
            ) : (
              <PauseIcon data-icon="inline-start" />
            )}
            {paused ? t("timer.resume") : t("timer.pause")}
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="h-12 border-brand-cream/30 bg-transparent px-6 text-brand-cream hover:bg-brand-cream/10 hover:text-brand-cream"
            onClick={() => void finish(phase.passage, true)}
          >
            <SquareIcon data-icon="inline-start" />
            {t("timer.stop")}
          </Button>
        </div>
      </div>
    )
  }

  if (phase.name === "saving") {
    return (
      <div role="status" className="flex items-center gap-3">
        <Spinner />
        {t("done.saving")}
      </div>
    )
  }

  if (phase.name === "done") {
    return (
      <div className="flex flex-col gap-6">
        <Alert role="status">
          <CheckIcon />
          <AlertTitle>{t("done.title")}</AlertTitle>
          <AlertDescription>
            {phase.sessionId
              ? t("done.saved", { duration: clock(phase.durationSeconds) })
              : t("done.notSaved", { duration: clock(phase.durationSeconds) })}
          </AlertDescription>
        </Alert>

        {kind === "MEDITATION" &&
          (noted ? (
            <p role="status">
              {t("done.noteSaved")}{" "}
              <Link href="/notes" className="underline underline-offset-4">
                {t("done.seeNotes")}
              </Link>
            </p>
          ) : noting ? (
            <Card>
              <CardContent>
                <NoteEditor
                  initial={{
                    passage: phase.passage,
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
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>{t("done.offerTitle")}</CardTitle>
                <CardDescription>{t("done.offerDescription")}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={() => setNoting(true)}>
                  <NotebookPenIcon data-icon="inline-start" />
                  {t("done.writeNote")}
                </Button>
              </CardContent>
            </Card>
          ))}

        {kind === "PRAYER" && (
          <p>
            <Link href="/prayer" className="underline underline-offset-4">
              {tPrayer("done.backToJournal")}
            </Link>
          </p>
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
      onSubmit={(event) => {
        event.preventDefault()
        start()
      }}
    >
      <FieldGroup>
        <FieldSet>
          <FieldLegend variant="label">{t("setup.duration")}</FieldLegend>
          <ToggleGroup
            variant="outline"
            spacing={2}
            className="flex-wrap"
            aria-label={t("setup.duration")}
            value={customMinutes.trim() === "" ? [String(minutes)] : []}
            onValueChange={(next) => {
              const chosen = next[0]
              // The chosen duration cannot be unchecked: one is always set.
              if (!chosen) return
              setMinutes(Number(chosen))
              setCustomMinutes("")
              setCustomInvalid(false)
            }}
          >
            {durations.map((value) => (
              <ToggleGroupItem key={value} value={String(value)}>
                {t("setup.minutes", { count: value })}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </FieldSet>

        <Field data-invalid={customInvalid || undefined} className="max-w-xs">
          <FieldLabel htmlFor={`${id}-custom`}>{t("setup.custom")}</FieldLabel>
          <Input
            id={`${id}-custom`}
            type="number"
            inputMode="numeric"
            min={minMeditationMinutes}
            max={maxMeditationMinutes}
            value={customMinutes}
            aria-invalid={customInvalid}
            onChange={(event) => {
              setCustomMinutes(event.target.value)
              setCustomInvalid(false)
            }}
          />
          <FieldDescription>
            {t("setup.customHint", { max: maxMeditationMinutes })}
          </FieldDescription>
        </Field>

        <FieldSet>
          <FieldLegend variant="label">{t("setup.passage")}</FieldLegend>
          <FieldDescription>
            {todayPassage && passage === todayPassage
              ? t("setup.passageToday")
              : t("setup.passageHint")}
          </FieldDescription>
          <PassagePicker value={passage} onChange={setPassage} />
        </FieldSet>

        <div>
          <Button type="submit" size="lg" className="h-12 px-6">
            {kind === "PRAYER" ? (
              <HandHeartIcon data-icon="inline-start" />
            ) : (
              <PlayIcon data-icon="inline-start" />
            )}
            {t("setup.start")}
          </Button>
        </div>
      </FieldGroup>
    </form>
  )
}
