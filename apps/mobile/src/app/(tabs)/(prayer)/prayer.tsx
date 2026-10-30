import { prayerStatuses, type PrayerStatus } from "@workspace/core"
import { router } from "expo-router"
import { Plus } from "lucide-react-native"
import { useState } from "react"
import { useTranslations } from "use-intl"

import { PrayerCard } from "@/components/prayer/prayer-card"
import { Body, TabScreen } from "@/components/screen"
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
    <TabScreen>
      <Body>{t("description")}</Body>
      <Button
        title={t("add")}
        icon={Plus}
        onPress={() => router.push("/prayer-edit")}
      />
      <Segmented
        value={status}
        options={prayerStatuses.map((value) => ({
          value,
          label: `${t(`statuses.${value}`)} · ${counts[value]}`,
        }))}
        onChange={setStatus}
      />
      {prayers.length === 0 ? (
        <Card title={t(`empty.${status}.title`)}>
          <Body>{t(`empty.${status}.description`)}</Body>
        </Card>
      ) : (
        prayers.map((prayer) => <PrayerCard key={prayer.id} prayer={prayer} />)
      )}
    </TabScreen>
  )
}
