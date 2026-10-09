import { getTranslations } from "next-intl/server"

import { Link } from "@/i18n/navigation"

export default async function NotFound() {
  const t = await getTranslations("NotFound")

  return (
    <div className="flex min-h-svh p-6">
      <div className="flex max-w-md min-w-0 flex-col gap-2 text-sm leading-loose">
        <h1 className="font-heading text-2xl font-medium">{t("title")}</h1>
        <p>{t("description")}</p>
        <Link href="/" className="underline underline-offset-4">
          {t("backHome")}
        </Link>
      </div>
    </div>
  )
}
