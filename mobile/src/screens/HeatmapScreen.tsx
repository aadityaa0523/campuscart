import { FlatList, Text, View } from "react-native";
import { ScreenContainer } from "../components/ScreenContainer";
import { Card } from "../components/Card";
import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";
import { Skeleton } from "../components/Skeleton";
import { useHeatmap } from "../api/hooks";
import { formatPaise } from "../api/money";
import { useTheme, spacing, type } from "../theme/tokens";

// "Demand Heatmap" — anonymous pending-demand by hostel (concept doc's
// "Hostel A ₹185 pending / Hostel C ₹260 ✓ Order ready" example).
export default function HeatmapScreen() {
  const theme = useTheme();
  const { data, isLoading, isError, refetch } = useHeatmap();

  return (
    <ScreenContainer scroll={false} style={{ padding: spacing.lg }}>
      <Text style={{ ...type.heading, color: theme.text, marginBottom: spacing.md }}>Campus demand right now</Text>

      {isLoading ? (
        <View style={{ gap: spacing.sm }}>
          <Skeleton height={56} />
          <Skeleton height={56} />
          <Skeleton height={56} />
        </View>
      ) : isError ? (
        <ErrorState message="Couldn't load the heatmap." onRetry={() => refetch()} />
      ) : (
        <FlatList
          data={data}
          keyExtractor={(h) => h.hostelId}
          ListEmptyComponent={<EmptyState title="Nothing pending" body="No active groups on campus right now." />}
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
          renderItem={({ item }) => (
            <Card>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={{ ...type.label, color: theme.text }}>{item.hostelName}</Text>
                <Text style={{ ...type.body, color: item.ready ? theme.success : theme.textMuted, fontWeight: item.ready ? "700" : "400" }}>
                  {formatPaise(item.pendingPaise)} {item.ready ? "✓ ready" : "pending"}
                </Text>
              </View>
            </Card>
          )}
        />
      )}
    </ScreenContainer>
  );
}
