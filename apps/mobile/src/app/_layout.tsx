import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from "expo-router"
import { useColorScheme } from "react-native"

export default function RootLayout() {
  const colorScheme = useColorScheme()
  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="join/[code]" options={{ title: "Invitation" }} />
        <Stack.Screen
          name="prayer-time"
          options={{ title: "Temps de prière", presentation: "modal" }}
        />
      </Stack>
    </ThemeProvider>
  )
}
