import {
  bookPassage,
  books,
  countVerses,
  formatPassage,
  getBookName,
  parseReference,
  type Locale,
  type Passage,
} from "@workspace/core"
import { ArrowDown, ArrowUp, X } from "lucide-react-native"
import { useState } from "react"
import { Pressable, Text, View } from "react-native"
import { useLocale, useTranslations } from "use-intl"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Chip } from "@/components/ui/chip"
import { Input } from "@/components/ui/input"
import { haptics } from "@/lib/haptics"
import { spacing, typography } from "@/theme/metrics"
import { createThemedStyles, useThemedStyles } from "@/theme/themed-styles"
import { useColors } from "@/theme/use-colors"

/** Whole books of a kind, in the order of the Bible (the web's presets). */
const presets = {
  bible: () => books.map((book) => bookPassage(book.id)),
  oldTestament: () =>
    books
      .filter((book) => book.testament === "old")
      .map((book) => bookPassage(book.id)),
  newTestament: () =>
    books
      .filter((book) => book.testament === "new")
      .map((book) => bookPassage(book.id)),
  gospels: () =>
    books
      .filter((book) => book.genre === "gospels")
      .map((book) => bookPassage(book.id)),
  psalms: () => [bookPassage("Ps")],
  proverbs: () => [bookPassage("Prov")],
} as const

/** A passage covering a whole book. */
const isWholeBook = (passage: Passage) =>
  JSON.stringify(passage) === JSON.stringify(bookPassage(passage.book))

/**
 * What a free plan reads, as on the web: a preset, books tapped one by one,
 * or a passage typed ("Jean 3-5 ; Ps 23"), in the order chosen; each one can
 * move up or down, or go.
 */
export function FreeSelection({
  passages,
  onChange,
}: {
  passages: readonly Passage[]
  onChange: (passages: Passage[]) => void
}) {
  const t = useTranslations("PlanWizard.selection")
  const locale = useLocale() as Locale
  const styles = useThemedStyles(themedStyles)
  const colors = useColors()
  const [reference, setReference] = useState("")
  const [invalid, setInvalid] = useState(false)

  const toggleBook = (book: Passage["book"]) => {
    const whole = passages.findIndex(
      (passage) => passage.book === book && isWholeBook(passage)
    )
    onChange(
      whole >= 0
        ? passages.filter((_, index) => index !== whole)
        : [...passages, bookPassage(book)]
    )
  }
  const move = (index: number, by: -1 | 1) => {
    const next = [...passages]
    const [item] = next.splice(index, 1)
    next.splice(index + by, 0, item!)
    haptics.tap()
    onChange(next)
  }
  const add = () => {
    const found = parseReference(reference, { locale })
    if (!found) return setInvalid(true)
    setInvalid(false)
    setReference("")
    onChange([...passages, ...found])
  }
  const chapters = passages.reduce(
    (total, passage) => total + passage.end.chapter - passage.start.chapter + 1,
    0
  )

  return (
    <>
      <Card title={t("presets")}>
        <View style={styles.chips}>
          {(Object.keys(presets) as (keyof typeof presets)[]).map((key) => (
            <Chip
              key={key}
              label={t(`preset.${key}`)}
              onPress={() => onChange(presets[key]())}
            />
          ))}
        </View>
      </Card>

      <Card title={t("books")}>
        {(["old", "new"] as const).map((testament) => (
          <View key={testament} style={styles.group}>
            <Text style={styles.label}>{t(`testament.${testament}`)}</Text>
            <View style={styles.chips}>
              {books
                .filter((book) => book.testament === testament)
                .map((book) => (
                  <Chip
                    key={book.id}
                    label={getBookName(book.id, locale)}
                    selected={passages.some(
                      (passage) =>
                        passage.book === book.id && isWholeBook(passage)
                    )}
                    onPress={() => toggleBook(book.id)}
                  />
                ))}
            </View>
          </View>
        ))}
      </Card>

      <Card>
        <Input
          label={t("reference.label")}
          placeholder={t("reference.placeholder")}
          value={reference}
          onChangeText={setReference}
          onSubmitEditing={add}
          returnKeyType="done"
          error={invalid ? t("reference.invalid") : undefined}
        />
        <Button
          title={t("reference.add")}
          variant="outline"
          size="sm"
          disabled={!reference.trim()}
          onPress={add}
          style={{ alignSelf: "flex-start" }}
        />
      </Card>

      <Card title={t("list.title")} padded={false}>
        {passages.length === 0 ? (
          <Text style={[styles.hint, styles.inset]}>{t("list.empty")}</Text>
        ) : (
          <View>
            {passages.map((passage, index) => {
              const name = formatPassage(passage, locale)
              const button = (
                label: string,
                Icon: typeof X,
                onPress: () => void,
                disabled = false
              ) => (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={label}
                  accessibilityState={{ disabled }}
                  disabled={disabled}
                  hitSlop={6}
                  onPress={onPress}
                  style={{ opacity: disabled ? 0.3 : 1 }}
                >
                  <Icon size={20} color={colors.foreground} />
                </Pressable>
              )
              return (
                <View
                  key={`${index}-${name}`}
                  style={[
                    styles.row,
                    index < passages.length - 1 && styles.divider,
                  ]}
                >
                  <Text style={styles.name} numberOfLines={1}>
                    {name}
                  </Text>
                  {button(
                    t("list.moveUp", { passage: name }),
                    ArrowUp,
                    () => move(index, -1),
                    index === 0
                  )}
                  {button(
                    t("list.moveDown", { passage: name }),
                    ArrowDown,
                    () => move(index, 1),
                    index === passages.length - 1
                  )}
                  {button(t("list.remove", { passage: name }), X, () =>
                    onChange(passages.filter((_, other) => other !== index))
                  )}
                </View>
              )
            })}
          </View>
        )}
        {passages.length > 0 ? (
          <Text style={[styles.hint, styles.inset]}>
            {t("list.summary", { chapters, verses: countVerses(passages) })}
          </Text>
        ) : null}
      </Card>
    </>
  )
}

const themedStyles = createThemedStyles((colors) => ({
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  group: { gap: spacing.sm },
  label: {
    ...typography.small,
    fontFamily: typography.label.fontFamily,
    color: colors.foreground,
  },
  hint: { ...typography.small, color: colors.mutedForeground },
  inset: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    minHeight: 52,
    paddingHorizontal: spacing.lg,
  },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.border },
  name: { ...typography.body, color: colors.foreground, flex: 1 },
}))
