import { books, getBookName } from "@workspace/core"
import { Image, StyleSheet } from "react-native"

import { Body, Screen } from "@/components/screen"

const first = books[0]!
const last = books[books.length - 1]!

export default function TodayScreen() {
  return (
    <Screen
      title="Aujourd'hui"
      header={
        <Image
          source={require("@/assets/images/splash-icon.png")}
          style={styles.logo}
          accessible={false}
        />
      }
    >
      <Body>
        {books.length} livres · {getBookName(first.id, "fr")} →{" "}
        {getBookName(last.id, "fr")}
      </Body>
    </Screen>
  )
}

const styles = StyleSheet.create({
  logo: { width: 96, height: 96 },
})
