// Service worker of Bible Plan: it only handles push notifications and their
// clicks. It caches nothing, so pages and data are always the latest.
//
// A push message is JSON:
//   { "title": "…", "body": "…", "href": "/fr/today", "tag": "reminder-…",
//     "actions": [{ "action": "…", "title": "…", "href": "/fr/…" }] }
// `href` is a path of this site (with the language). An action with its own
// href opens that path; without one it opens the notification's.

self.addEventListener("install", () => {
  // The new version takes over at once: nothing is cached that could break.
  self.skipWaiting()
})

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim())
})

/** A path of this site, never another origin: anything else becomes "/". */
function safePath(href) {
  try {
    const url = new URL(href, self.location.origin)
    return url.origin === self.location.origin
      ? url.pathname + url.search + url.hash
      : "/"
  } catch {
    return "/"
  }
}

self.addEventListener("push", (event) => {
  if (!event.data) return

  let message
  try {
    message = event.data.json()
  } catch {
    // Not JSON: show the text as it is.
    message = { title: "Bible Plan", body: event.data.text() }
  }

  const actions = Array.isArray(message.actions)
    ? message.actions
        .slice(0, 2)
        .map(({ action, title }) => ({ action, title }))
    : []

  event.waitUntil(
    self.registration.showNotification(message.title || "Bible Plan", {
      body: message.body || "",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      // The same tag replaces the previous notification instead of piling up.
      tag: message.tag,
      data: {
        href: safePath(message.href || "/"),
        actions: Object.fromEntries(
          (message.actions || []).map(({ action, href }) => [
            action,
            href ? safePath(href) : null,
          ])
        ),
      },
      actions,
    })
  )
})

self.addEventListener("notificationclick", (event) => {
  event.notification.close()
  const { href, actions } = event.notification.data || {}
  // A button of the notification may lead elsewhere than the notification.
  const path = (event.action && actions && actions[event.action]) || href || "/"
  const target = new URL(path, self.location.origin).href

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windows) => {
        // An open window of the app is reused, not a new one opened.
        const open = windows.find((client) =>
          client.url.startsWith(self.location.origin)
        )
        if (open && "navigate" in open) {
          return open
            .navigate(target)
            .then((client) => client && client.focus())
        }
        return self.clients.openWindow(target)
      })
  )
})
