import {
  BookOpen,
  CalendarClock,
  HandHeart,
  Languages,
  Plus,
  Sparkles,
  Trash2,
  Users,
} from "lucide-react-native"
import { useState } from "react"
import { StyleSheet, View } from "react-native"
import { Redirect, Stack } from "expo-router"

import { Body, TabScreen } from "@/components/screen"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Chip } from "@/components/ui/chip"
import { Input } from "@/components/ui/input"
import { ListRow } from "@/components/ui/list-row"
import { Notice } from "@/components/ui/notice"
import { ProgressBar } from "@/components/ui/progress-bar"
import { Segmented } from "@/components/ui/segmented"
import { SwitchRow } from "@/components/ui/switch-row"
import { spacing } from "@/theme/metrics"

/**
 * Development gallery of the UI kit (bibleplan://ui-kit), rebuilding pieces
 * of the web screens. Texts are samples, so they are not translated.
 */
export default function UiKitScreen() {
  const [filter, setFilter] = useState("active")
  const [theme, setTheme] = useState<"light" | "dark" | "system">("system")
  const [reminders, setReminders] = useState(true)
  if (!__DEV__) return <Redirect href="/today" />
  return (
    <>
      <Stack.Screen options={{ title: "UI kit" }} />
      <TabScreen>
        <Card title="Les Évangiles en 30 jours" action={<Body>12 / 33</Body>}>
          <ProgressBar ratio={12 / 33} label="12 / 33 lectures" />
          <Notice
            icon={CalendarClock}
            actions={
              <>
                <Button title="Décaler le plan" size="sm" />
                <Button title="Voir le plan" size="sm" variant="ghost" />
              </>
            }
          >
            Une lecture vous attend dans ce plan. Pas de souci, reprenez à votre
            rythme.
          </Notice>
        </Card>

        <View style={styles.wrap}>
          <Chip
            label="Actifs · 4"
            selected={filter === "active"}
            onPress={() => setFilter("active")}
          />
          <Chip
            label="Exaucés · 1"
            selected={filter === "answered"}
            onPress={() => setFilter("answered")}
          />
          <Chip
            label="Archivés · 0"
            selected={filter === "archived"}
            onPress={() => setFilter("archived")}
          />
        </View>

        <View style={styles.wrap}>
          <Button title="Ajouter un sujet" icon={Plus} />
          <Button
            title="Minuteur de prière"
            icon={HandHeart}
            variant="outline"
          />
        </View>

        <Card title="Notre église et ses projets">
          <View style={styles.wrap}>
            <Badge label="Église" />
            <Badge
              label="Partagé avec Cellule du jeudi"
              icon={Users}
              variant="outline"
            />
            <Badge label="Psaume 122:6–9" icon={BookOpen} variant="accent" />
          </View>
          <Body>
            Commencé le 17 octobre 2026 · Pas encore prié pour ce sujet.
          </Body>
          <View style={styles.wrap}>
            <Button title="J'ai prié" icon={HandHeart} size="sm" />
            <Button
              title="Exaucé"
              icon={Sparkles}
              size="sm"
              variant="secondary"
            />
            <Button
              title="Supprimer"
              icon={Trash2}
              size="sm"
              variant="destructive"
            />
          </View>
        </Card>

        <Segmented
          value={theme}
          onChange={setTheme}
          options={[
            { value: "light", label: "Clair" },
            { value: "dark", label: "Sombre" },
            { value: "system", label: "Système" },
          ]}
        />

        <Card padded={false} title="Réglages">
          <View>
            <ListRow
              label="Langue"
              icon={Languages}
              value="Français"
              onPress={() => undefined}
            />
            <SwitchRow
              label="Rappels de lecture"
              subtitle="Chaque jour à 7 h"
              value={reminders}
              onValueChange={setReminders}
            />
            <ListRow
              label="Effacer ce téléphone"
              icon={Trash2}
              destructive
              last
              onPress={() => undefined}
            />
          </View>
        </Card>

        <Input label="Sujet de prière" placeholder="Pour qui, pour quoi ?" />
        <Input
          label="Titre"
          defaultValue=""
          error="Le titre est obligatoire."
        />
        <Button title="Enregistrement…" loading />
      </TabScreen>
    </>
  )
}

const styles = StyleSheet.create({
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
})
