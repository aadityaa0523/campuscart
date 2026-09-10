import type { ReactNode } from "react";
import { Text, TextInput, View, type TextInputProps } from "react-native";
import { useTheme, radii, spacing, type } from "../theme/tokens";

export function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  const theme = useTheme();
  return (
    <View style={{ gap: spacing.xs }}>
      <Text style={{ ...type.label, color: theme.text }}>{label}</Text>
      {children}
      {error && (
        <Text accessibilityRole="alert" style={{ color: theme.danger, ...type.caption }}>
          {error}
        </Text>
      )}
    </View>
  );
}

export function Input(props: TextInputProps & { accessibilityLabel: string }) {
  const theme = useTheme();
  return (
    <TextInput
      {...props}
      placeholderTextColor={theme.textMuted}
      style={[
        {
          minHeight: 48,
          borderWidth: 1,
          borderColor: theme.border,
          borderRadius: radii.md,
          paddingHorizontal: spacing.md,
          color: theme.text,
          backgroundColor: theme.surface,
          fontSize: type.body.fontSize,
        },
        props.style,
      ]}
    />
  );
}
