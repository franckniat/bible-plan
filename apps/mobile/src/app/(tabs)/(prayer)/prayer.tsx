import { prayerStatuses, type PrayerStatus } from "@workspace/core"
import { router } from "expo-router"
import { Plus, Timer } from "lucide-react-native"
import { useState } from "react"
import { useTranslations } from "use-intl"

import { PrayerCard } from "@/components/prayer/prayer-card"
import { Body, TabList } from "@/components/screen"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Segmented } from "@/components/ui/segmented"
import { usePrayerCounts, usePrayers } from "@/repositories/prayers"

/** The prayer journal, kept on the phone: requests, "I prayed", answers. */
export default function PrayerScreen() {
  const t = useTranslations("Prayer")
  const [status, setStatus] = useState<PrayerStatus>("ACTIVE")
  const prayers = usePrayers(status)
  const counts = usePrayerCounts()
  return (
    <TabList
      items={prayers}
      keyOf={(prayer) => prayer.id}
      renderItem={(prayer) => <PrayerCard prayer={prayer} />}
      empty={
        <Card title={t(`empty.${status}.title`)}>
          <Body>{t(`empty.${status}.description`)}</Body>
        </Card>
      }
      header={
        <>
          <Body>{t("description")}</Body>
          <Button
            title={t("add")}
            icon={Plus}
            onPress={() => router.push("/prayer-edit")}
          />
          <Button
            title={t("timer")}
            icon={Timer}
            variant="outline"
            onPress={() => router.push("/prayer-timer")}
          />
          <Segmented
            value={status}
            options={prayerStatuses.map((value) => ({
              value,
              label: `${t(`statuses.${value}`)} · ${counts[value]}`,
            }))}
            onChange={setStatus}
          />
        </>
      }
    />
  )
}
