"use client"

import { BellRing, LoaderCircle, Share } from "lucide-react"
import { useTranslations } from "next-intl"
import { useEffect, useState } from "react"

import { Button } from "@workspace/ui/components/button"

import { pushEnvironment, urlBase64ToUint8Array } from "@/lib/push-support"

type State =
  | "checking"
  | "unsupported"
  | "ios-install" // iPhone or iPad, not yet on the home screen
  | "denied" // the browser blocks notifications for this site
  | "off"
  | "on"

/** The service worker of the app, registered once. */
function registerWorker() {
  return navigator.serviceWorker.register("/sw.js", {
    scope: "/",
    updateViaCache: "none",
  })
}

async function post(path: string, body: unknown) {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`)
}

/**
 * Turns push notifications on or off for this device. iPhones only receive
 * them from an app added to the home screen, so they get a short guide first.
 */
export function PushSettings({
  publicKey,
  devices,
}: {
  /** The public VAPID key the browser subscribes with. */
  publicKey: string
  /** How many devices of the account receive notifications. */
  devices: number
}) {
  const t = useTranslations("Reminders.push")
  const [state, setState] = useState<State>("checking")
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let live = true
    async function detect() {
      const environment = pushEnvironment({
        navigator,
        standalone:
          window.matchMedia("(display-mode: standalone)").matches ||
          (navigator as Navigator & { standalone?: boolean }).standalone ===
            true,
        hasServiceWorker: "serviceWorker" in navigator,
        hasPushManager: "PushManager" in window,
        hasNotification: "Notification" in window,
      })
      if (environment !== "ready") return environment
      if (Notification.permission === "denied") return "denied" as const
      const registration = await registerWorker()
      await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
      return subscription ? ("on" as const) : ("off" as const)
    }
    detect()
      .then((next) => live && setState(next))
      .catch(() => live && setState("unsupported"))
    return () => {
      live = false
    }
  }, [])

  async function enable() {
    setBusy(true)
    setFailed(false)
    try {
      const permission = await Notification.requestPermission()
      if (permission !== "granted") {
        setState(permission === "denied" ? "denied" : "off")
        return
      }
      const registration = await registerWorker()
      await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      })
      await post("/api/push/subscribe", subscription.toJSON())
      setState("on")
    } catch {
      setFailed(true)
    } finally {
      setBusy(false)
    }
  }

  async function disable() {
    setBusy(true)
    setFailed(false)
    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
      if (subscription) {
        await post("/api/push/unsubscribe", { endpoint: subscription.endpoint })
        await subscription.unsubscribe()
      }
      setState("off")
    } catch {
      setFailed(true)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section
      aria-labelledby="push-title"
      className="flex flex-col gap-3 rounded-3xl bg-white/85 p-5 ring-1 ring-brand-night/10 dark:bg-neutral-900/85 dark:ring-white/10"
    >
      <div className="flex flex-col gap-1">
        <h2
          id="push-title"
          className="flex items-center gap-2 font-heading text-lg font-semibold"
        >
          <BellRing aria-hidden className="size-5 text-brand-gold" />
          {t("title")}
        </h2>
        <p className="text-sm text-brand-night/70 dark:text-neutral-100/70">
          {t("description")}
        </p>
      </div>

      {state === "checking" && (
        <p className="flex items-center gap-2 text-sm opacity-60">
          <LoaderCircle aria-hidden className="size-4 animate-spin" />
          {t("checking")}
        </p>
      )}

      {state === "unsupported" && (
        <p className="text-sm text-brand-night/80 dark:text-neutral-100/80">
          {t("unsupported")}
        </p>
      )}

      {state === "ios-install" && (
        <div className="flex flex-col gap-2 rounded-2xl bg-brand-gold/15 p-4 text-sm">
          <p className="font-medium">{t("ios.title")}</p>
          <ol className="flex list-decimal flex-col gap-1 pl-5">
            <li className="[&>svg]:inline [&>svg]:align-text-bottom">
              {t.rich("ios.share", {
                icon: () => <Share aria-hidden className="mx-0.5 size-4" />,
              })}
            </li>
            <li>{t("ios.add")}</li>
            <li>{t("ios.open")}</li>
          </ol>
        </div>
      )}

      {state === "denied" && (
        <p
          role="status"
          className="rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {t("denied")}
        </p>
      )}

      {state === "off" && (
        <div className="flex flex-col items-start gap-2">
          <Button
            size="lg"
            className="h-11 sm:px-5"
            disabled={busy}
            onClick={enable}
          >
            {busy && <LoaderCircle className="animate-spin" />}
            {t("enable")}
          </Button>
        </div>
      )}

      {state === "on" && (
        <div className="flex flex-col items-start gap-2">
          <p role="status" className="text-sm font-medium">
            {t("enabled")}
          </p>
          <Button
            size="lg"
            variant="outline"
            className="h-11 sm:px-5"
            disabled={busy}
            onClick={disable}
          >
            {busy && <LoaderCircle className="animate-spin" />}
            {t("disable")}
          </Button>
        </div>
      )}

      {failed && (
        <p role="alert" className="text-sm text-destructive">
          {t("failed")}
        </p>
      )}

      {devices > 0 && (
        <p className="text-xs text-brand-night/60 dark:text-neutral-100/60">
          {t("devices", { count: devices })}
        </p>
      )}
    </section>
  )
}
