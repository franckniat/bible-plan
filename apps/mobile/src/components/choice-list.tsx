import { Check } from "lucide-react-native"
import { View } from "react-native"

import { Card } from "@/components/ui/card"
import { ListRow } from "@/components/ui/list-row"
import { useColors } from "@/theme/use-colors"

/** One option among a few, ticked when chosen (settings, onboarding). */
export function ChoiceList<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly { value: T; label: string; subtitle?: string }[]
  value: T
  onChange: (value: T) => void
}) {
  const colors = useColors()
  return (
    <Card padded={false}>
      <View accessibilityRole="radiogroup">
        {options.map((option, index) => (
          <ListRow
            key={option.value}
            label={option.label}
            subtitle={option.subtitle}
            onPress={() => onChange(option.value)}
            trailing={
              option.value === value ? (
                <Check size={20} color={colors.foreground} />
              ) : (
                // An empty slot rather than the chevron of other rows.
                <View style={{ width: 20 }} />
              )
            }
            last={index === options.length - 1}
          />
        ))}
      </View>
    </Card>
  )
}
