import { books, getBookName } from "@workspace/core"

import { Body, Screen } from "@/components/screen"

const first = books[0]!
const last = books[books.length - 1]!

export default function TodayScreen() {
  return (
    <Screen title="Aujourd'hui">
      <Body>
        {books.length} livres · {getBookName(first.id, "fr")} →{" "}
        {getBookName(last.id, "fr")}
      </Body>
    </Screen>
  )
}
