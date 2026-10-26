import { books, getBookName } from "@workspace/core"
import { useLocale, useTranslations } from "use-intl"

import { Body, TabScreen } from "@/components/screen"

const first = books[0]!
const last = books[books.length - 1]!

export default function TodayScreen() {
  const t = useTranslations("Mobile.today")
  const locale = useLocale()
  return (
    <TabScreen>
      <Body>
        {t("books", {
          count: books.length,
          first: getBookName(first.id, locale),
          last: getBookName(last.id, locale),
        })}
      </Body>
    </TabScreen>
  )
}
