import { books, getChapterCount } from "@workspace/core"
import { router, Stack } from "expo-router"
import { View } from "react-native"
import { useLocale, useTranslations } from "use-intl"

import { Body, TabScreen } from "@/components/screen"
import { Card } from "@/components/ui/card"
import { ListRow } from "@/components/ui/list-row"
import { openPassage } from "@/lib/open-passage"

/** The books of the Bible, by testament: pick one, then a chapter. */
export default function BooksScreen() {
  const t = useTranslations("BibleIndex")
  const locale = useLocale()
  return (
    <>
      <Stack.Screen options={{ title: t("title") }} />
      <TabScreen>
        <Body>{t("description")}</Body>
        {(["old", "new"] as const).map((testament) => {
          const list = books.filter((book) => book.testament === testament)
          return (
            <Card
              key={testament}
              title={t(`testament.${testament}`)}
              padded={false}
            >
              <View>
                {list.map((book, index) => (
                  <ListRow
                    key={book.id}
                    label={book.names[locale].name}
                    value={t("chapters", { count: getChapterCount(book.id) })}
                    onPress={() =>
                      getChapterCount(book.id) === 1
                        ? openPassage(`${book.id}.1`)
                        : router.push(`/bible/${book.id}`)
                    }
                    last={index === list.length - 1}
                  />
                ))}
              </View>
            </Card>
          )
        })}
      </TabScreen>
    </>
  )
}
