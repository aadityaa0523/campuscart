import { useState } from "react";
import { Alert, FlatList, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ScreenContainer } from "../components/ScreenContainer";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { Field, Input } from "../components/FormField";
import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";
import { Skeleton } from "../components/Skeleton";
import { useMatches, useCreateGroup, useJoinGroup } from "../api/hooks";
import { formatPaise } from "../api/money";
import { ApiError } from "../api/client";
import { useAuth } from "../store/authStore";
import { usePushRegistration } from "../api/push";
import { useTheme, spacing, type } from "../theme/tokens";
import type { MatchResult } from "../types/api";
import type { AppStackParamList } from "../navigation/RootNavigator";

const STORE = "Blinkit";

type Props = NativeStackScreenProps<AppStackParamList, "Home">;

export default function HomeScreen({ navigation }: Props) {
  const theme = useTheme();
  const { user, logout } = useAuth();
  usePushRegistration(!!user);

  const [itemName, setItemName] = useState("");
  const [priceText, setPriceText] = useState("");
  const [searching, setSearching] = useState(false);

  const pricePaise = Math.round(Number(priceText) * 100);
  const validInput = itemName.trim().length > 0 && Number.isFinite(pricePaise) && pricePaise > 0;

  const matchesQuery = useMatches(searching ? user?.hostelId : undefined, STORE);
  const createGroup = useCreateGroup();
  const joinGroup = useJoinGroup();

  const items = [{ name: itemName.trim(), pricePaise }];

  const startNewGroup = async () => {
    if (!user || !validInput) return;
    try {
      const group = await createGroup.mutateAsync({ hostelId: user.hostelId, store: STORE, items });
      navigation.navigate("GroupDetail", { groupId: group.id });
    } catch (err) {
      Alert.alert("Couldn't start a group", err instanceof ApiError ? err.message : "Something went wrong");
    }
  };

  const join = async (groupId: string) => {
    try {
      await joinGroup.mutateAsync({ groupId, items });
      navigation.navigate("GroupDetail", { groupId });
    } catch (err) {
      Alert.alert("Couldn't join", err instanceof ApiError ? err.message : "Something went wrong");
    }
  };

  const busy = createGroup.isPending || joinGroup.isPending;

  return (
    <ScreenContainer>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.lg }}>
        <Text style={{ ...type.heading, fontSize: 20, color: theme.text }}>Hi {user?.name?.split(" ")[0]} 👋</Text>
        <Button title="Profile" variant="secondary" onPress={() => navigation.navigate("Profile")} />
      </View>

      <View style={{ gap: spacing.sm, marginBottom: spacing.md }}>
        <Field label={`What do you need from ${STORE}?`}>
          <Input value={itemName} onChangeText={setItemName} placeholder="e.g. Maggi, Coke, Chips" accessibilityLabel="Item name" />
        </Field>
        <Field label="Price">
          <Input value={priceText} onChangeText={setPriceText} placeholder="Price in ₹, e.g. 65" keyboardType="decimal-pad" accessibilityLabel="Item price in rupees" />
        </Field>
      </View>

      <View style={{ gap: spacing.sm }}>
        <Button title="🔥 Find a group nearby" onPress={() => setSearching(true)} disabled={!validInput} loading={matchesQuery.isFetching && searching} />
        <Button title="Start a new group instead" variant="secondary" onPress={startNewGroup} disabled={!validInput} loading={createGroup.isPending} />
      </View>

      {searching && (
        <View style={{ marginTop: spacing.lg }}>
          {matchesQuery.isLoading ? (
            <View style={{ gap: spacing.sm }}>
              <Skeleton height={72} />
              <Skeleton height={72} />
            </View>
          ) : matchesQuery.isError ? (
            <ErrorState message="Couldn't load nearby groups." onRetry={() => matchesQuery.refetch()} />
          ) : (
            <FlatList
              data={matchesQuery.data}
              keyExtractor={(m) => m.groupId}
              ListEmptyComponent={<EmptyState title="No groups nearby yet" body="Start one — someone else will probably join within minutes." />}
              ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
              renderItem={({ item }) => <MatchCard match={item} onJoin={() => join(item.groupId)} disabled={busy} />}
            />
          )}
        </View>
      )}

      <View style={{ marginTop: spacing.xl, gap: spacing.sm }}>
        <Button title="View campus demand heatmap →" variant="secondary" onPress={() => navigation.navigate("Heatmap")} />
        <Button title="Log out" variant="secondary" onPress={logout} />
      </View>
    </ScreenContainer>
  );
}

function MatchCard({ match, onJoin, disabled }: { match: MatchResult; onJoin: () => void; disabled: boolean }) {
  const theme = useTheme();
  const minutesLeft = Math.max(0, Math.round((new Date(match.group.expiresAt).getTime() - Date.now()) / 60_000));
  return (
    <Card onPress={disabled ? undefined : onJoin} accessibilityLabel={`Join group with ${formatPaise(match.group.totalPaise)} pending, expires in ${minutesLeft} minutes`}>
      <Text style={{ ...type.heading, fontSize: 15, color: theme.text }}>{formatPaise(match.group.totalPaise)} pending</Text>
      <Text style={{ ...type.caption, color: theme.textMuted, marginTop: spacing.xs }}>
        Match score {match.totalScore.toFixed(1)}/5 · expires in {minutesLeft} min
        {match.group.status === "THRESHOLD_MET" ? " · ✅ already ready" : ""}
      </Text>
    </Card>
  );
}
