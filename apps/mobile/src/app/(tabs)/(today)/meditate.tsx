import { meditationMinutes } from "@workspace/core"
import { router, Stack } from "expo-router"
import { NotebookPen } from "lucide-react-native"
import { useTranslations } from "use-intl"

import { Body, TabScreen } from "@/components/screen"
import { SessionFlow } from "@/components/session/session-flow"
import { Button } from "@/components/ui/button"

/** A time of meditation with a timer, as on the web. */
export default function MeditateScreen() {
  const t = useTranslations("Meditate")
  return (
    <>
      <Stack.Screen options={{ title: t("title") }} />
      <TabScreen>
        <Body>{t("description")}</Body>
        <SessionFlow
          kind="MEDITATION"
          minutes={meditationMinutes}
          defaultMinutes={10}
          after={(session) => (
            <>
              <Body>{t("done.offerDescription")}</Body>
              <Button
                title={t("done.writeNote")}
                icon={NotebookPen}
                onPress={() =>
                  router.push({
                    pathname: "/note-edit",
                    params: { session: session.id },
                  })
                }
              />
            </>
          )}
        />
      </TabScreen>
    </>
  )
}
