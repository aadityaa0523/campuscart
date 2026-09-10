import type { ReactNode } from "react";
import { Pressable, View, type GestureResponderEvent } from "react-native";
import { useTheme, radii, spacing } from "../theme/tokens";

export function Card({ children, onPress, accessibilityLabel }: { children: ReactNode; onPress?: (e: GestureResponderEvent) => void; accessibilityLabel?: string }) {
  const theme = useTheme();
  const style = {
    backgroundColor: theme.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: theme.border,
    padding: spacing.lg,
  };

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        style={({ pressed }) => [style, { opacity: pressed ? 0.9 : 1 }]}
      >
        {children}
      </Pressable>
    );
  }
  return <View style={style}>{children}</View>;
}
