import { ImageResponse } from "next/og"

import type { AchievementLevel } from "@workspace/core"

import { ogColors, OgBrand, OgFrame } from "@/lib/og"

/** Square, as shared in chats and on social networks. */
export const cardSize = { width: 1080, height: 1080 }

const metals: Record<AchievementLevel, [string, string]> = {
  1: ["#d9a066", "#9c5f2b"],
  2: ["#e5e7eb", "#8b95a5"],
  3: ["#f7d774", "#c08a12"],
}

export type AchievementCardProps = {
  name: string
  description: string
  /** "Bronze", "Silver", "Gold" or "Trophy". */
  levelLabel: string
  level: AchievementLevel
  trophy: boolean
  /** The day it was earned, already formatted. */
  date: string
}

/**
 * The picture a person can share when they choose to: the medal, its name and
 * the day it was earned. Nothing else about the person is on it.
 */
export function renderAchievementCard(props: AchievementCardProps) {
  const [light, dark] = props.trophy ? metals[3] : metals[props.level]
  return new ImageResponse(
    <OgFrame>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          alignItems: "center",
          width: "100%",
          textAlign: "center",
        }}
      >
        <OgBrand size={44} />
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <svg width="420" height="420" viewBox="0 0 100 100">
            <defs>
              <linearGradient id="m" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor={light} />
                <stop offset="1" stopColor={dark} />
              </linearGradient>
            </defs>
            {props.trophy ? (
              <path
                d="M50 4 L61 14 L76 12 L81 27 L95 34 L90 49 L95 64 L81 71 L76 86 L61 84 L50 94 L39 84 L24 86 L19 71 L5 64 L10 49 L5 34 L19 27 L24 12 L39 14 Z"
                fill="url(#m)"
              />
            ) : (
              <circle cx="50" cy="50" r="46" fill="url(#m)" />
            )}
            <circle cx="50" cy="50" r="34" fill="#fffaf0" opacity="0.92" />
            <circle cx="50" cy="50" r="12" fill={dark} />
          </svg>
          <div
            style={{
              display: "flex",
              marginTop: 36,
              fontSize: 30,
              letterSpacing: 4,
              textTransform: "uppercase",
              color: ogColors.goldSoft,
            }}
          >
            {props.levelLabel}
          </div>
          <div
            style={{
              display: "flex",
              marginTop: 12,
              fontSize: 76,
              fontWeight: 700,
              color: ogColors.cream,
            }}
          >
            {props.name}
          </div>
          <div
            style={{
              display: "flex",
              marginTop: 18,
              maxWidth: 820,
              fontSize: 34,
              color: ogColors.goldSoft,
              justifyContent: "center",
            }}
          >
            {props.description}
          </div>
        </div>
        <div style={{ display: "flex", fontSize: 30, opacity: 0.8 }}>
          {props.date}
        </div>
      </div>
    </OgFrame>,
    cardSize
  )
}
