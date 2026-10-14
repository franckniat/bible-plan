import { getTranslations } from "next-intl/server"

import { requireUser } from "@/server/session"

// Placeholder until the "Today" page (readings of the day) is built.
export default async function TodayPage() {
  const user = await requireUser()
  const t = await getTranslations("App.today")

  return (
    <div className="flex flex-col gap-2">
      <h1 className="font-heading text-3xl font-semibold">
        {t("greeting", { name: user.name })}
      </h1>
      <p className="text-brand-night/70 dark:text-neutral-100/70">
        {t("placeholder")}
      </p>
    </div>
  )
}
