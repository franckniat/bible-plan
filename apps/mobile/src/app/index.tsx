import { Redirect } from "expo-router"

import { usePreferences } from "@/lib/preferences"

export default function Index() {
  const { onboarded } = usePreferences()
  return <Redirect href={onboarded ? "/today" : "/welcome"} />
}
