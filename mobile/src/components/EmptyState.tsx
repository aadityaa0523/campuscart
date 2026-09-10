import { Text, View } from "react-native";
import { Button } from "./Button";
import { useTheme, spacing, type } from "../theme/tokens";

export function EmptyState({ title, body, actionLabel, onAction }: { title: string; body: string; actionLabel?: string; onAction?: () => void }) {
  const theme = useTheme();
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl, gap: spacing.sm }}>
      <Text style={{ ...type.heading, color: theme.text, textAlign: "center" }}>{title}</Text>
      <Text style={{ ...type.body, color: theme.textMuted, textAlign: "center", marginBottom: spacing.md }}>{body}</Text>
      {actionLabel && onAction && <Button title={actionLabel} onPress={onAction} />}
    </View>
  );
}
