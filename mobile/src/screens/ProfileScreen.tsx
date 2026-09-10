import { useState } from "react";
import { Alert, Text, View } from "react-native";
import { ScreenContainer } from "../components/ScreenContainer";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { Field, Input } from "../components/FormField";
import { useUpdateUpiVpa } from "../api/hooks";
import { ApiError } from "../api/client";
import { useAuth } from "../store/authStore";
import { useTheme, spacing, type } from "../theme/tokens";

export default function ProfileScreen() {
  const theme = useTheme();
  const { user, setUser } = useAuth();
  const [upiVpa, setUpiVpa] = useState(user?.upiVpa ?? "");
  const updateUpiVpa = useUpdateUpiVpa();

  if (!user) return null;

  const save = async () => {
    try {
      const updated = await updateUpiVpa.mutateAsync(upiVpa.trim());
      setUser(updated);
      Alert.alert("Saved", "Your UPI ID is up to date.");
    } catch (err) {
      Alert.alert("Couldn't save", err instanceof ApiError ? err.message : "Invalid UPI ID");
    }
  };

  return (
    <ScreenContainer>
      <View style={{ gap: spacing.lg }}>
        <View>
          <Text style={{ ...type.heading, fontSize: 22, color: theme.text }}>{user.name}</Text>
          <Text style={{ ...type.body, color: theme.textMuted }}>{user.email}</Text>
        </View>

        <Card>
          <Text style={{ ...type.label, color: theme.text }}>Reliability score</Text>
          <Text style={{ fontSize: 28, fontWeight: "800", color: theme.primary, marginTop: spacing.xs }}>{user.reliabilityScore}/100</Text>
          <Text style={{ ...type.caption, color: theme.textMuted, marginTop: spacing.xs }}>Goes up when you pay on time and complete orders as coordinator.</Text>
        </Card>

        <Field label="UPI ID (needed to coordinate an order)">
          <Input value={upiVpa} onChangeText={setUpiVpa} placeholder="you@okhdfcbank" autoCapitalize="none" accessibilityLabel="UPI ID" />
        </Field>
        <Button title="Save" onPress={save} loading={updateUpiVpa.isPending} />
      </View>
    </ScreenContainer>
  );
}
