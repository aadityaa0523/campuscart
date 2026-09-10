import { useState } from "react";
import { Alert, Linking, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ScreenContainer } from "../components/ScreenContainer";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { ThresholdBar } from "../components/ThresholdBar";
import { ErrorState } from "../components/ErrorState";
import { Skeleton } from "../components/Skeleton";
import {
  useGroup,
  useMyContribution,
  useClaimCoordinator,
  useMarkPaid,
  useConfirmPayment,
  useCompleteGroup,
  useRaiseDispute,
} from "../api/hooks";
import { useGroupRealtime } from "../api/realtime";
import { formatPaise } from "../api/money";
import { ApiError } from "../api/client";
import { useAuth } from "../store/authStore";
import { useTheme, spacing, type } from "../theme/tokens";
import type { AppStackParamList } from "../navigation/RootNavigator";

type Props = NativeStackScreenProps<AppStackParamList, "GroupDetail">;

export default function GroupDetailScreen({ route }: Props) {
  const { groupId } = route.params;
  const theme = useTheme();
  const { user } = useAuth();
  useGroupRealtime(groupId);

  const groupQuery = useGroup(groupId);
  const contributionQuery = useMyContribution(groupQuery.data?.coordinatorUserId ? groupId : undefined);
  const claimCoordinator = useClaimCoordinator(groupId);
  const markPaid = useMarkPaid(groupId);
  const confirmPayment = useConfirmPayment(groupId);
  const completeGroup = useCompleteGroup(groupId);
  const raiseDispute = useRaiseDispute(groupId);
  const [actionError, setActionError] = useState<string | null>(null);

  if (groupQuery.isLoading) {
    return (
      <ScreenContainer>
        <View style={{ gap: spacing.md }}>
          <Skeleton height={28} width="60%" />
          <Skeleton height={12} />
          <Skeleton height={120} />
        </View>
      </ScreenContainer>
    );
  }

  if (groupQuery.isError || !groupQuery.data) {
    return (
      <ScreenContainer scroll={false}>
        <ErrorState message="Couldn't load this group." onRetry={() => groupQuery.refetch()} />
      </ScreenContainer>
    );
  }

  const group = groupQuery.data;
  const isCoordinator = group.coordinatorUserId === user?.id;
  const myContribution = contributionQuery.data;

  const runAction = async (fn: () => Promise<unknown>) => {
    setActionError(null);
    try {
      await fn();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Something went wrong");
    }
  };

  const payNow = async () => {
    if (myContribution?.upiLink) await Linking.openURL(myContribution.upiLink);
  };

  const confirmDispute = () => {
    Alert.alert("Raise a dispute", "The coordinator collected money but never placed the order, or something else went wrong?", [
      { text: "Cancel", style: "cancel" },
      { text: "Raise dispute", style: "destructive", onPress: () => runAction(() => raiseDispute.mutateAsync("Raised from the app.")) },
    ]);
  };

  return (
    <ScreenContainer>
      <View style={{ gap: spacing.lg }}>
        <View>
          <Text style={{ ...type.heading, color: theme.text }}>{statusLabel(group.status)}</Text>
          <View style={{ marginTop: spacing.sm }}>
            <ThresholdBar totalPaise={group.totalPaise} thresholdPaise={group.thresholdPaise} />
          </View>
        </View>

        <Card>
          <Text style={{ ...type.label, color: theme.text, marginBottom: spacing.sm }}>Items</Text>
          {group.items.map((item) => (
            <View key={item.id} style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: spacing.xs }}>
              <Text style={{ color: theme.text, ...type.body }}>
                {item.name} {item.quantity > 1 ? `×${item.quantity}` : ""}
              </Text>
              <Text style={{ color: theme.textMuted, ...type.body }}>{formatPaise(item.pricePaise * item.quantity)}</Text>
            </View>
          ))}
        </Card>

        {group.contributions.length > 0 && (
          <Card>
            <Text style={{ ...type.label, color: theme.text, marginBottom: spacing.sm }}>Split</Text>
            {group.contributions.map((c) => (
              <View key={c.id} style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: spacing.xs }}>
                <Text style={{ color: theme.text, ...type.body }}>{c.userId === user?.id ? "You" : `Student ${c.userId.slice(0, 6)}`}</Text>
                <Text style={{ color: theme.textMuted, ...type.body }}>
                  {formatPaise(c.amountPaise)} {c.status === "PAID" ? "✓" : c.status === "CLAIMED_PAID" ? "(claims paid)" : ""}
                </Text>
              </View>
            ))}
          </Card>
        )}

        {actionError && (
          <Text accessibilityRole="alert" style={{ color: theme.danger, ...type.body }}>
            {actionError}
          </Text>
        )}

        <View style={{ gap: spacing.sm }}>
          {group.status === "THRESHOLD_MET" && !group.coordinatorUserId && (
            <Button
              title="I'll place the real order"
              onPress={() => {
                if (!user?.upiVpa) {
                  Alert.alert("Add a UPI ID first", "You need a UPI ID on your profile before you can coordinate an order.");
                  return;
                }
                runAction(() => claimCoordinator.mutateAsync(0));
              }}
              loading={claimCoordinator.isPending}
            />
          )}

          {group.coordinatorUserId && !isCoordinator && myContribution && myContribution.status === "PENDING" && (
            <>
              <Button title={`Pay ${formatPaise(myContribution.amountPaise)} via UPI`} onPress={payNow} />
              <Button title="I've paid" variant="secondary" onPress={() => runAction(() => markPaid.mutateAsync())} loading={markPaid.isPending} />
            </>
          )}

          {myContribution?.status === "CLAIMED_PAID" && (
            <Text style={{ color: theme.warning, ...type.body }}>Waiting for the coordinator to confirm your payment.</Text>
          )}
          {myContribution?.status === "PAID" && <Text style={{ color: theme.success, ...type.body }}>✓ You've paid your share</Text>}

          {isCoordinator && group.status === "AWAITING_PAYMENTS" && (
            <>
              <Text style={{ ...type.label, color: theme.text }}>Confirm payments as they come in:</Text>
              {group.contributions
                .filter((c) => c.status !== "PAID")
                .map((c) => (
                  <Button
                    key={c.id}
                    title={`Confirm ${c.userId === user?.id ? "your own" : `student ${c.userId.slice(0, 6)}`} payment (${formatPaise(c.amountPaise)})`}
                    variant="secondary"
                    onPress={() => runAction(() => confirmPayment.mutateAsync(c.userId))}
                    loading={confirmPayment.isPending}
                  />
                ))}
              <Button
                title="I placed the order — mark complete"
                onPress={() => runAction(() => completeGroup.mutateAsync({ actualTotalPaise: group.totalPaise }))}
                loading={completeGroup.isPending}
              />
            </>
          )}

          {group.status === "COMPLETED" && <Text style={{ ...type.heading, color: theme.text }}>🎉 Order completed. Enjoy!</Text>}
          {group.status === "EXPIRED" && <Text style={{ color: theme.danger, ...type.body }}>This group expired before reaching the threshold.</Text>}

          {!["OPEN", "COMPLETED", "EXPIRED", "CANCELLED", "DISPUTED"].includes(group.status) && (
            <Button title="Something wrong? Raise a dispute" variant="secondary" onPress={confirmDispute} />
          )}
          {group.status === "DISPUTED" && <Text style={{ color: theme.warning, ...type.body }}>⚠️ This order has an open dispute — an admin will review it.</Text>}
        </View>
      </View>
    </ScreenContainer>
  );
}

function statusLabel(status: string) {
  switch (status) {
    case "OPEN":
      return "🕒 Collecting orders...";
    case "THRESHOLD_MET":
      return "✅ Minimum order reached!";
    case "AWAITING_PAYMENTS":
      return "💳 Collecting payments";
    case "COMPLETED":
      return "🎉 Order completed";
    case "EXPIRED":
      return "⌛ Expired";
    case "DISPUTED":
      return "⚠️ Disputed";
    default:
      return status;
  }
}
