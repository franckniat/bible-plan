import { type SessionKind } from "@workspace/core"
import { useKeepAwake } from "expo-keep-awake"
import { Pause, Play, Square } from "lucide-react-native"
import { useEffect, useRef, useState, type ReactNode } from "react"
import { Text, View } from "react-native"
import { useTranslations } from "use-intl"

import { Body } from "@/components/screen"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Chip } from "@/components/ui/chip"
import { ProgressBar } from "@/components/ui/progress-bar"
import { haptics } from "@/lib/haptics"
import {
  cancelSessionEnd,
  playEndSound,
  scheduleSessionEnd,
} from "@/lib/session-alerts"
import { recordSession } from "@/repositories/sessions"
import { fontFamily } from "@/theme/fonts"
import { spacing } from "@/theme/metrics"
import { useColors } from "@/theme/use-colors"

/** mm:ss, with hours when a session is long enough (as on the web). */
export function clock(totalSeconds: number): string {
  const seconds = Math.max(0, Math.ceil(totalSeconds))
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  const pad = (n: number) => String(n).padStart(2, "0")
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`
}

type Running = {
  startedAt: string
  plannedSeconds: number
  /** Seconds spent before the current run (pauses excluded). */
  spent: number
  /** When the current run started (ms), or null while paused. */
  since: number | null
  /** The scheduled end notification. */
  alert: string | null
}

const elapsed = (run: Running, now: number) =>
  run.spent + (run.since === null ? 0 : (now - run.since) / 1000)

/**
 * A timed session of meditation or of prayer, as on the web: a duration,
 * then a timer that keeps the screen on, can be paused and ends with a
 * sound, heard with the phone locked too (a scheduled notification). The
 * time really spent is saved.
 */
export function SessionFlow({
  kind,
  minutes: durations,
  defaultMinutes,
  passage = null,
  after,
}: {
  kind: SessionKind
  minutes: readonly number[]
  defaultMinutes: number
  /** The passage meditated on, as a slug. */
  passage?: string | null
  /** Under the end of a session (a note to write, a way back). */
  after?: (session: { id: string }) => ReactNode
}) {
  const t = useTranslations(kind === "PRAYER" ? "PrayerTimer" : "Meditate")
  const colors = useColors()
  const [minutes, setMinutes] = useState(defaultMinutes)
  const [run, setRun] = useState<Running | null>(null)
  const [done, setDone] = useState<{ id: string; seconds: number } | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const finishing = useRef(false)

  const alertContent = () => ({
    title: t("done.title"),
    body: t("done.saved", { duration: t("setup.minutes", { count: minutes }) }),
  })

  const finish = (current: Running, endedAt: number, completed: boolean) => {
    if (finishing.current) return
    finishing.current = true
    void cancelSessionEnd(current.alert)
    if (completed) {
      haptics.success()
      void playEndSound()
    }
    const seconds = Math.max(
      1,
      Math.round(
        Math.min(elapsed(current, endedAt), current.plannedSeconds * 2)
      )
    )
    const id = recordSession({
      kind,
      passage,
      plannedSeconds: current.plannedSeconds,
      durationSeconds: seconds,
      startedAt: current.startedAt,
    })
    setRun(null)
    setDone({ id, seconds })
  }

  // The clock of a running session; it ends on time even after the phone
  // was locked (the time is read, not counted).
  useEffect(() => {
    if (!run || run.since === null) return
    const timer = setInterval(() => {
      const at = Date.now()
      setNow(at)
      if (elapsed(run, at) >= run.plannedSeconds) finish(run, at, true)
    }, 250)
    return () => clearInterval(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run])

  const start = async () => {
    const at = Date.now()
    finishing.current = false
    const plannedSeconds = minutes * 60
    const next: Running = {
      startedAt: new Date(at).toISOString(),
      plannedSeconds,
      spent: 0,
      since: at,
      alert: null,
    }
    setDone(null)
    setNow(at)
    setRun(next)
    const alert = await scheduleSessionEnd(
      new Date(at + plannedSeconds * 1000),
      alertContent()
    )
    setRun((current) =>
      current?.startedAt === next.startedAt ? { ...current, alert } : current
    )
  }

  const pause = () => {
    if (!run || run.since === null) return
    const at = Date.now()
    void cancelSessionEnd(run.alert)
    setRun({ ...run, spent: elapsed(run, at), since: null, alert: null })
  }

  const resume = async () => {
    if (!run || run.since !== null) return
    const at = Date.now()
    const resumed = { ...run, since: at }
    setNow(at)
    setRun(resumed)
    const alert = await scheduleSessionEnd(
      new Date(at + (run.plannedSeconds - run.spent) * 1000),
      alertContent()
    )
    setRun((current) =>
      current?.startedAt === run.startedAt && current.since === at
        ? { ...current, alert }
        : current
    )
  }

  if (run) {
    return (
      <Timer
        run={run}
        now={now}
        title={t("timer.label")}
        breathe={run.since === null ? t("timer.paused") : t("timer.breathe")}
        progressLabel={t("timer.progress")}
        controls={
          <View style={{ gap: spacing.sm }}>
            {run.since === null ? (
              <Button title={t("timer.resume")} icon={Play} onPress={resume} />
            ) : (
              <Button
                title={t("timer.pause")}
                icon={Pause}
                variant="outline"
                onPress={pause}
              />
            )}
            <Button
              title={t("timer.stop")}
              icon={Square}
              variant="ghost"
              onPress={() => finish(run, Date.now(), false)}
            />
          </View>
        }
        color={colors.foreground}
      />
    )
  }

  if (done) {
    const duration =
      done.seconds < 60
        ? clock(done.seconds)
        : t("setup.minutes", { count: Math.round(done.seconds / 60) })
    return (
      <Card title={t("done.title")}>
        <Body>{t("done.saved", { duration })}</Body>
        {after?.({ id: done.id })}
        <Button
          title={t("done.again")}
          variant="outline"
          onPress={() => setDone(null)}
        />
      </Card>
    )
  }

  return (
    <Card title={t("setup.duration")}>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
        {durations.map((value) => (
          <Chip
            key={value}
            label={t("setup.minutes", { count: value })}
            selected={minutes === value}
            onPress={() => setMinutes(value)}
          />
        ))}
      </View>
      <Button title={t("setup.start")} icon={Play} onPress={start} />
    </Card>
  )
}

/** The running clock; the screen stays on while it shows. */
function Timer({
  run,
  now,
  title,
  breathe,
  progressLabel,
  controls,
  color,
}: {
  run: Running
  now: number
  title: string
  breathe: string
  progressLabel: string
  controls: ReactNode
  color: string
}) {
  useKeepAwake()
  const spent = Math.min(elapsed(run, now), run.plannedSeconds)
  return (
    <Card>
      <Text
        accessibilityRole="timer"
        accessibilityLabel={title}
        style={{
          fontFamily: fontFamily.heading,
          fontSize: 64,
          lineHeight: 76,
          textAlign: "center",
          color,
          fontVariant: ["tabular-nums"],
        }}
      >
        {clock(run.plannedSeconds - spent)}
      </Text>
      <ProgressBar ratio={spent / run.plannedSeconds} label={progressLabel} />
      <Body>{breathe}</Body>
      {controls}
    </Card>
  )
}
