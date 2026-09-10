import { Text, View } from "react-native";
import { Button } from "./Button";
import { useTheme, spacing, type } from "../theme/tokens";

export function ErrorState({ message = "Something went wrong.", onRetry }: { message?: string; onRetry?: () => void }) {
  const theme = useTheme();
  return (
    <View accessibilityRole="alert" style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl, gap: spacing.sm }}>
      <Text style={{ ...type.heading, color: theme.danger, textAlign: "center" }}>⚠️ {message}</Text>
      {onRetry && <Button title="Retry" variant="secondary" onPress={onRetry} />}
    </View>
  );
}
