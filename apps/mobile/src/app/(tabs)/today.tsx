import { books, getBookName } from "@workspace/core"
import { Image, StyleSheet } from "react-native"
import { useLocale, useTranslations } from "use-intl"

import { Body, Screen } from "@/components/screen"

const first = books[0]!
const last = books[books.length - 1]!

export default function TodayScreen() {
  const t = useTranslations()
  const locale = useLocale()
  return (
    <Screen
      title={t("App.nav.today")}
      header={
        <Image
          source={require("@/assets/images/splash-icon.png")}
          style={styles.logo}
          accessible={false}
        />
      }
    >
      <Body>
        {t("Mobile.today.books", {
          count: books.length,
          first: getBookName(first.id, locale),
          last: getBookName(last.id, locale),
        })}
      </Body>
    </Screen>
  )
}

const styles = StyleSheet.create({
  logo: { width: 96, height: 96 },
})
