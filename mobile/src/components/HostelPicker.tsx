import { Pressable, Text, View } from "react-native";
import type { Hostel } from "../types/api";
import { useTheme, radii, spacing, type } from "../theme/tokens";

export function HostelPicker({ hostels, value, onChange }: { hostels: Hostel[]; value: string | null; onChange: (id: string) => void }) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
      {hostels.map((h) => {
        const active = value === h.id;
        return (
          <Pressable
            key={h.id}
            onPress={() => onChange(h.id)}
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
            accessibilityLabel={h.name}
            style={{
              minHeight: 44,
              justifyContent: "center",
              paddingVertical: spacing.sm,
              paddingHorizontal: spacing.lg,
              borderRadius: radii.pill,
              borderWidth: 1,
              borderColor: active ? theme.primary : theme.border,
              backgroundColor: active ? theme.primary : theme.surface,
            }}
          >
            <Text style={{ color: active ? theme.primaryText : theme.text, ...type.label }}>{h.name}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
