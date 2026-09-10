import type { ReactNode } from "react";
import { ScrollView, View, type ViewStyle } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme, spacing } from "../theme/tokens";
import { OfflineBanner } from "./OfflineBanner";

export function ScreenContainer({ children, scroll = true, style }: { children: ReactNode; scroll?: boolean; style?: ViewStyle }) {
  const theme = useTheme();
  const Wrapper = scroll ? ScrollView : View;
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }} edges={["top", "bottom"]}>
      <OfflineBanner />
      <Wrapper
        style={scroll ? { flex: 1 } : [{ flex: 1 }, style]}
        contentContainerStyle={scroll ? [{ padding: spacing.lg, flexGrow: 1 }, style] : undefined}
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </Wrapper>
    </SafeAreaView>
  );
}
