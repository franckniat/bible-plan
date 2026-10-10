import { getTranslations } from "next-intl/server"

import { requireUser } from "@/server/session"

// Placeholder until the "Today" page (readings of the day) is built.
export default async function TodayPage() {
  const user = await requireUser()
  const t = await getTranslations("App.today")

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-2 p-6">
      <h1 className="font-heading text-3xl font-semibold">
        {t("greeting", { name: user.name })}
      </h1>
      <p className="text-muted-foreground">{t("placeholder")}</p>
    </main>
  )
}
