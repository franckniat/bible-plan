import { Text, TextInput, View, type TextInputProps } from "react-native"

import { radius, spacing, typography } from "@/theme/metrics"
import { createThemedStyles, useThemedStyles } from "@/theme/themed-styles"
import { useColors } from "@/theme/use-colors"

/** A text field with its label and error, like the web's fields. */
export function Input({
  label,
  error,
  style,
  ...props
}: TextInputProps & { label?: string; error?: string }) {
  const styles = useThemedStyles(themedStyles)
  const colors = useColors()
  return (
    <View style={styles.field}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.mutedForeground}
        style={[styles.input, error ? styles.inputError : null, style]}
        {...props}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  )
}

const themedStyles = createThemedStyles((colors) => ({
  field: { gap: spacing.xs },
  label: {
    ...typography.small,
    fontFamily: typography.label.fontFamily,
    color: colors.foreground,
  },
  input: {
    ...typography.body,
    minHeight: 48,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.input,
    backgroundColor: colors.card,
    color: colors.foreground,
  },
  inputError: { borderColor: colors.destructive },
  error: { ...typography.small, color: colors.destructive },
}))
