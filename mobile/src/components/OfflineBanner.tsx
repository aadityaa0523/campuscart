import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import NetInfo from "@react-native-community/netinfo";
import { useTheme, spacing, type } from "../theme/tokens";

/** Minimum viable offline handling per spec §9: a clear "you're offline"
 * state. Queuing writes for retry-on-reconnect is a real upgrade path, not
 * needed for a campus-scale MVP where a failed request just gets retried
 * by hand. */
export function OfflineBanner() {
  const theme = useTheme();
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    return NetInfo.addEventListener((state) => setOffline(state.isConnected === false));
  }, []);

  if (!offline) return null;
  return (
    <View
      accessibilityRole="alert"
      style={{ backgroundColor: theme.warningBg, paddingVertical: spacing.sm, paddingHorizontal: spacing.lg }}
    >
      <Text style={{ color: theme.warning, ...type.label, textAlign: "center" }}>You're offline — some actions won't work until you reconnect.</Text>
    </View>
  );
}
