import { ActivityIndicator, Pressable, Text, type GestureResponderEvent } from "react-native";
import { useTheme, radii, spacing, type } from "../theme/tokens";

interface Props {
  title: string;
  onPress: (e: GestureResponderEvent) => void;
  variant?: "primary" | "secondary" | "danger";
  disabled?: boolean;
  loading?: boolean;
  accessibilityHint?: string;
}

export function Button({ title, onPress, variant = "primary", disabled, loading, accessibilityHint }: Props) {
  const theme = useTheme();
  const isDisabled = disabled || loading;

  const bg = variant === "primary" ? theme.primary : variant === "danger" ? theme.dangerBg : theme.surface;
  const fg = variant === "primary" ? theme.primaryText : variant === "danger" ? theme.danger : theme.text;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      style={({ pressed }) => ({
        minHeight: 48, // >= 44pt touch target
        backgroundColor: bg,
        borderRadius: radii.md,
        borderWidth: variant === "secondary" ? 1 : 0,
        borderColor: theme.border,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
        alignItems: "center",
        justifyContent: "center",
        opacity: isDisabled ? 0.5 : pressed ? 0.85 : 1,
      })}
    >
      {loading ? <ActivityIndicator color={fg} /> : <Text style={{ color: fg, ...type.heading, fontSize: 15 }}>{title}</Text>}
    </Pressable>
  );
}
