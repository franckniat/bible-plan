"use client"

import { useCallback, useSyncExternalStore } from "react"

import { isBibleVersionId, type BibleVersionId } from "@workspace/bible-data"

// The versions compared last belong to the device: they live in localStorage.
const storageKey = "bible-plan:compared-versions"
const changeEvent = "bible-plan:compared-versions-change"

function read(): string {
  try {
    return localStorage.getItem(storageKey) ?? ""
  } catch {
    return ""
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange)
  window.addEventListener(changeEvent, onChange)
  return () => {
    window.removeEventListener("storage", onChange)
    window.removeEventListener(changeEvent, onChange)
  }
}

/** The versions stored, without what is not (or no longer) a version. */
export function parseRememberedComparison(raw: string): BibleVersionId[] {
  try {
    const data: unknown = JSON.parse(raw)
    return Array.isArray(data) ? data.filter(isBibleVersionId) : []
  } catch {
    return []
  }
}

/**
 * The versions compared last time on this device, and how to remember a new
 * choice. Comparing starts from them the next time.
 */
export function useRememberedComparison() {
  // The raw string is the snapshot: it is stable, an array would not be.
  const raw = useSyncExternalStore(subscribe, read, () => "")
  const remember = useCallback((versions: readonly BibleVersionId[]) => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(versions))
    } catch {
      // Storage blocked: the choice lasts until the page is closed, no more.
    }
    window.dispatchEvent(new Event(changeEvent))
  }, [])
  return { remembered: parseRememberedComparison(raw), remember }
}
