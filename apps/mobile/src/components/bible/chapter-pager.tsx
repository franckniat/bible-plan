import { useEffect, useRef, type ReactNode } from "react"
import {
  Platform,
  ScrollView,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollViewInstance,
} from "react-native"

import { haptics } from "@/lib/haptics"

/** Time without scrolling after which the page is settled (ms). */
const settleDelay = 120

/**
 * The chapter read between its neighbours, as pages side by side: moving the
 * finger to the left brings the next chapter, to the right the previous one,
 * like the pages of a book. Once a neighbour is settled, `onPrevious` or
 * `onNext` opens it, and the pages are laid out again around it (by `pageKey`).
 */
export function ChapterPager({
  pageKey,
  previous,
  current,
  next,
  onPrevious,
  onNext,
}: {
  /** The chapter shown: the pager starts again on it when it changes. */
  pageKey: string
  previous: ReactNode | null
  current: ReactNode
  next: ReactNode | null
  onPrevious: () => void
  onNext: () => void
}) {
  const { width } = useWindowDimensions()
  const scroll = useRef<ScrollViewInstance>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const pages = [previous, current, next].filter((page) => page !== null)
  const start = previous === null ? 0 : 1

  // On the chapter itself, whatever the last page was.
  useEffect(() => {
    scroll.current?.scrollTo({ x: start * width, animated: false })
  }, [pageKey, start, width])
  useEffect(() => () => clearTimeout(timer.current), [])

  const settle = (x: number) => {
    const page = Math.round(x / width)
    // Only once the page is in place: not while the finger rests half-way.
    if (Math.abs(x - page * width) > 2 || page === start) return
    haptics.tap()
    if (page < start) onPrevious()
    else onNext()
  }

  // The web has no end of momentum: the page is settled once scrolling stops.
  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (Platform.OS !== "web") return
    const x = event.nativeEvent.contentOffset.x
    clearTimeout(timer.current)
    timer.current = setTimeout(() => settle(x), settleDelay)
  }

  if (pages.length === 1) return <View style={{ flex: 1 }}>{current}</View>
  return (
    <ScrollView
      key={pageKey}
      ref={scroll}
      horizontal
      pagingEnabled
      showsHorizontalScrollIndicator={false}
      contentOffset={{ x: start * width, y: 0 }}
      onScroll={onScroll}
      onMomentumScrollEnd={(event) => {
        clearTimeout(timer.current)
        settle(event.nativeEvent.contentOffset.x)
      }}
      scrollEventThrottle={32}
      style={{ flex: 1 }}
    >
      {pages.map((page, index) => (
        <View key={index} style={{ width, flex: 1 }}>
          {page}
        </View>
      ))}
    </ScrollView>
  )
}
