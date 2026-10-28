import { Alert } from "react-native"

/** Asks before a destructive action; true when confirmed. */
export function confirm({
  title,
  message,
  confirmLabel,
  cancelLabel,
}: {
  title: string
  message: string
  confirmLabel: string
  cancelLabel: string
}): Promise<boolean> {
  return new Promise((resolve) =>
    Alert.alert(
      title,
      message,
      [
        { text: cancelLabel, style: "cancel", onPress: () => resolve(false) },
        {
          text: confirmLabel,
          style: "destructive",
          onPress: () => resolve(true),
        },
      ],
      { cancelable: true, onDismiss: () => resolve(false) }
    )
  )
}
