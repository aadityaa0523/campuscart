import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Alert, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useState } from "react";
import { ScreenContainer } from "../components/ScreenContainer";
import { Button } from "../components/Button";
import { Field, Input } from "../components/FormField";
import { useAuth } from "../store/authStore";
import { ApiError } from "../api/client";
import { useTheme, spacing, type } from "../theme/tokens";
import type { AuthStackParamList } from "../navigation/RootNavigator";

const schema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});
type FormValues = z.infer<typeof schema>;

type Props = NativeStackScreenProps<AuthStackParamList, "Login">;

export default function LoginScreen({ navigation }: Props) {
  const theme = useTheme();
  const { login } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    setSubmitting(true);
    try {
      await login(values.email, values.password);
    } catch (err) {
      Alert.alert("Couldn't log in", err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScreenContainer>
      <View style={{ gap: spacing.md, marginTop: spacing.xxl }}>
        <Text style={{ ...type.title, color: theme.text }}>CampusCart</Text>
        <Text style={{ ...type.body, color: theme.textMuted, marginBottom: spacing.lg }}>Log in to your campus account.</Text>

        <Field label="Email" error={errors.email?.message}>
          <Controller
            control={control}
            name="email"
            render={({ field }) => (
              <Input
                value={field.value ?? ""}
                onChangeText={field.onChange}
                placeholder="you@college.edu"
                keyboardType="email-address"
                autoCapitalize="none"
                accessibilityLabel="Email"
              />
            )}
          />
        </Field>

        <Field label="Password" error={errors.password?.message}>
          <Controller
            control={control}
            name="password"
            render={({ field }) => (
              <Input value={field.value ?? ""} onChangeText={field.onChange} placeholder="••••••••" secureTextEntry accessibilityLabel="Password" />
            )}
          />
        </Field>

        <View style={{ marginTop: spacing.sm, gap: spacing.sm }}>
          <Button title="Log in" onPress={() => handleSubmit(onSubmit)()} loading={submitting} />
          <Button title="New here? Create an account" variant="secondary" onPress={() => navigation.navigate("Signup")} />
        </View>
      </View>
    </ScreenContainer>
  );
}
