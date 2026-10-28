import {
  addDays,
  allWeekdays,
  books,
  countVerses,
  estimateReadingMinutes,
  generatePlan,
  getBook,
  getBookName,
  getChapterCount,
  getPlanTemplate,
  getToday,
  getWeekday,
  newPlanSchema,
  PlanGenerationError,
  readingSpeeds,
  resolveNewPlan,
  type BookId,
  type IsoDate,
  type Locale,
  type NewPlan,
  type Weekday,
} from "@workspace/core"
import { TriangleAlert } from "lucide-react-native"
import { router, Stack, useLocalSearchParams } from "expo-router"
import { useState } from "react"
import { Text, View } from "react-native"
import { useFormatter, useLocale, useTranslations } from "use-intl"

import { TemplateCard } from "@/components/plans/template-card"
import { TabScreen } from "@/components/screen"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Chip } from "@/components/ui/chip"
import { Input } from "@/components/ui/input"
import { ListRow } from "@/components/ui/list-row"
import { Notice } from "@/components/ui/notice"
import { bookRange } from "@/lib/book-range"
import { addPlan } from "@/repositories/plans"
import { useProfile } from "@/repositories/profile"
import { spacing, typography } from "@/theme/metrics"
import { createThemedStyles, useThemedStyles } from "@/theme/themed-styles"

const quickChapters = [1, 2, 3, 5, 10]

/** A date of the calendar, read in UTC so that it stays the same day. */
const utc = (date: IsoDate) => new Date(`${date}T00:00:00.000Z`)

/** The next Monday after `today` (a week later on a Monday). */
function nextMonday(today: IsoDate): IsoDate {
  return addDays(today, (8 - getWeekday(today)) % 7 || 7)
}

/** The plan the phone will make, or why it cannot make it. */
function previewPlan(request: NewPlan, locale: Locale) {
  const parsed = newPlanSchema.safeParse(request)
  if (!parsed.success) return { error: "invalid" as const }
  try {
    return { plan: generatePlan(resolveNewPlan(parsed.data, locale).input) }
  } catch (error) {
    if (error instanceof PlanGenerationError) return { error: error.code }
    throw error
  }
}

/**
 * The plan wizard: from a template (`?template=key`), or by chapters a day
 * from a first to a last book. The plan is generated on the phone, as on the
 * web, and stored offline.
 */
export default function NewPlanScreen() {
  const t = useTranslations()
  const locale = useLocale() as Locale
  const format = useFormatter()
  const styles = useThemedStyles(themedStyles)
  const profile = useProfile()
  const { template: templateKey } = useLocalSearchParams<{
    template?: string
  }>()
  const template = templateKey ? getPlanTemplate(templateKey) : undefined

  const today = getToday(profile.timeZone)
  const [startDate, setStartDate] = useState(today)
  const [weekdays, setWeekdays] = useState<Weekday[]>([...allWeekdays])
  const [from, setFrom] = useState<BookId>("Gen")
  const [to, setTo] = useState<BookId>("Deut")
  const [choosing, setChoosing] = useState<"from" | "to" | null>(null)
  const [chapters, setChapters] = useState(3)
  const [title, setTitle] = useState("")

  const passages = bookRange(from, to)
  const suggestedTitle = template
    ? template.title[locale]
    : from === to
      ? getBookName(from, locale)
      : `${getBookName(from, locale)} – ${getBookName(to, locale)}`
  const request: NewPlan = template
    ? {
        source: "template",
        templateKey: template.key,
        title: title.trim() || undefined,
        startDate,
        activeWeekdays: weekdays,
        pace: { mode: "days", days: template.days },
      }
    : {
        source: "custom",
        title: title.trim() || suggestedTitle,
        passages,
        startDate,
        activeWeekdays: weekdays,
        pace: { mode: "chaptersPerDay", chapters },
      }

  const preview = previewPlan(request, locale)

  const pickBook = (side: "from" | "to", book: BookId) => {
    if (side === "from") {
      setFrom(book)
      // A first book after the last one moves the last one along with it.
      if (getBook(book).order > getBook(to).order) setTo(book)
    } else {
      setTo(book)
    }
    setChoosing(null)
  }

  const bookPicker = (side: "from" | "to") => (
    <View style={styles.picker}>
      {(["old", "new"] as const).map((testament) => (
        <View key={testament} style={styles.group}>
          <Text style={styles.groupLabel}>
            {t(`PlanWizard.range.testaments.${testament}`)}
          </Text>
          <View style={styles.chips}>
            {books
              .filter((book) => book.testament === testament)
              // The last book comes after the first: nothing earlier.
              .filter(
                (book) => side === "from" || book.order >= getBook(from).order
              )
              .map((book) => (
                <Chip
                  key={book.id}
                  label={getBookName(book.id, locale)}
                  selected={book.id === (side === "from" ? from : to)}
                  onPress={() => pickBook(side, book.id)}
                />
              ))}
          </View>
        </View>
      ))}
    </View>
  )

  const startChoices: { label: string; date: IsoDate }[] = [
    { label: t("Mobile.plans.today"), date: today },
    { label: t("Mobile.plans.tomorrow"), date: addDays(today, 1) },
    { label: t("Mobile.plans.nextMonday"), date: nextMonday(today) },
  ]
  // 2023-01-01 is a Sunday: weekday 0.
  const weekdayName = (weekday: Weekday) =>
    format.dateTime(utc(addDays("2023-01-01", weekday)), {
      weekday: "short",
      timeZone: "UTC",
    })
  const dateText = (date: IsoDate) =>
    format.dateTime(utc(date), { dateStyle: "medium", timeZone: "UTC" })

  const plan = preview.plan
  const versesPerDay = plan
    ? Math.round(plan.totalVerses / Math.max(1, plan.days.length))
    : 0

  return (
    <>
      <Stack.Screen options={{ title: t("PlanWizard.title") }} />
      <TabScreen>
        {template ? (
          <TemplateCard template={template} />
        ) : (
          <>
            <Card title={t("PlanWizard.steps.selection")} padded={false}>
              <View>
                {(["from", "to"] as const).map((side) => (
                  <View key={side}>
                    <ListRow
                      label={t(`PlanWizard.range.${side}`)}
                      value={getBookName(side === "from" ? from : to, locale)}
                      onPress={() =>
                        setChoosing(choosing === side ? null : side)
                      }
                      last={side === "to" && choosing !== "to"}
                    />
                    {choosing === side ? bookPicker(side) : null}
                  </View>
                ))}
              </View>
              <Text style={[styles.hint, styles.rangeHint]}>
                {t("PlanWizard.range.summary", {
                  books: passages.length,
                  chapters: passages.reduce(
                    (total, passage) => total + getChapterCount(passage.book),
                    0
                  ),
                  verses: countVerses(passages),
                })}
              </Text>
            </Card>

            <Card title={t("PlanWizard.schedule.chapters.label")}>
              <View style={styles.chips}>
                {quickChapters.map((value) => (
                  <Chip
                    key={value}
                    label={t("PlanWizard.schedule.chapters.quick", {
                      chapters: value,
                    })}
                    selected={chapters === value}
                    onPress={() => setChapters(value)}
                  />
                ))}
              </View>
              <Text style={styles.hint}>
                {t("PlanWizard.schedule.chapters.hint")}
              </Text>
            </Card>
          </>
        )}

        <Card title={t("PlanWizard.steps.schedule")}>
          <View style={styles.group}>
            <Text style={styles.groupLabel}>
              {t("PlanWizard.schedule.startDate")}
            </Text>
            <View style={styles.chips}>
              {startChoices.map((choice) => (
                <Chip
                  key={choice.date}
                  label={choice.label}
                  selected={startDate === choice.date}
                  onPress={() => setStartDate(choice.date)}
                />
              ))}
            </View>
          </View>
          <View style={styles.group}>
            <Text style={styles.groupLabel}>
              {t("PlanWizard.schedule.weekdays.legend")}
            </Text>
            <View style={styles.chips}>
              {/* Monday first, Sunday last. */}
              {[1, 2, 3, 4, 5, 6, 0].map((weekday) => (
                <Chip
                  key={weekday}
                  label={weekdayName(weekday)}
                  selected={weekdays.includes(weekday)}
                  onPress={() =>
                    setWeekdays((current) =>
                      current.includes(weekday)
                        ? current.filter((day) => day !== weekday)
                        : [...current, weekday].sort()
                    )
                  }
                />
              ))}
            </View>
            <Text style={styles.hint}>
              {weekdays.length === 0
                ? t("PlanWizard.schedule.weekdays.required")
                : t("PlanWizard.schedule.weekdays.hint")}
            </Text>
          </View>
        </Card>

        <Card title={t("PlanWizard.steps.preview")}>
          <Input
            label={t("PlanWizard.preview.title")}
            value={title}
            onChangeText={setTitle}
            placeholder={suggestedTitle}
            maxLength={100}
          />
          {plan ? (
            <View style={styles.summary}>
              <Text style={styles.summaryText}>
                {t("PlanWizard.preview.summary.datesValue", {
                  start: dateText(plan.startDate),
                  end: dateText(plan.endDate),
                })}
              </Text>
              <Text style={styles.hint}>
                {t("PlanWizard.preview.summary.daysValue", {
                  days: plan.days.length,
                })}
                {" · "}
                {t("PlanWizard.preview.summary.loadValue", {
                  verses: versesPerDay,
                  minutes: Math.max(
                    1,
                    Math.round(
                      estimateReadingMinutes(
                        versesPerDay,
                        readingSpeeds[profile.readingSpeed]
                      )
                    )
                  ),
                })}
              </Text>
            </View>
          ) : weekdays.length > 0 ? (
            <Notice icon={TriangleAlert}>
              {t(`PlanWizard.preview.errors.${preview.error ?? "invalid"}`)}
            </Notice>
          ) : null}
        </Card>

        <Button
          title={t("PlanWizard.create.submit")}
          disabled={!plan}
          onPress={() => {
            addPlan(request, locale)
            router.back()
          }}
        />
      </TabScreen>
    </>
  )
}

const themedStyles = createThemedStyles((colors) => ({
  picker: {
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  group: { gap: spacing.sm },
  groupLabel: {
    ...typography.small,
    fontFamily: typography.label.fontFamily,
    color: colors.foreground,
  },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  rangeHint: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },
  hint: { ...typography.small, color: colors.mutedForeground },
  summary: { gap: spacing.xs },
  summaryText: { ...typography.body, color: colors.foreground },
}))
