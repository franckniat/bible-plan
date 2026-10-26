import { NativeTabs } from "expo-router/native-tabs"

export default function TabsLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="today">
        <NativeTabs.Trigger.Label>Aujourd&apos;hui</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="sun.max" md="today" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="bible">
        <NativeTabs.Trigger.Label>Bible</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="book" md="menu_book" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="prayer">
        <NativeTabs.Trigger.Label>Prière</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf="hands.and.sparkles"
          md="volunteer_activism"
        />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="more">
        <NativeTabs.Trigger.Label>Plus</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="ellipsis" md="more_horiz" />
      </NativeTabs.Trigger>
    </NativeTabs>
  )
}
