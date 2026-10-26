import {
  Geist_400Regular,
  Geist_500Medium,
  Geist_600SemiBold,
} from "@expo-google-fonts/geist"
import {
  Lora_400Regular,
  Lora_600SemiBold,
  useFonts as useGoogleFonts,
} from "@expo-google-fonts/lora"

/** Same fonts as the web: Lora for headings and Scripture, Geist for the UI. */
export const fontFamily = {
  regular: "Geist_400Regular",
  medium: "Geist_500Medium",
  semibold: "Geist_600SemiBold",
  heading: "Lora_600SemiBold",
  scripture: "Lora_400Regular",
} as const

/** Loads the fonts; true once they can be used. */
export function useFonts(): boolean {
  const [loaded, error] = useGoogleFonts({
    Geist_400Regular,
    Geist_500Medium,
    Geist_600SemiBold,
    Lora_400Regular,
    Lora_600SemiBold,
  })
  // Without the fonts the app still works with the system ones.
  return loaded || error !== null
}
