import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Alert, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ScreenContainer } from "../components/ScreenContainer";
import { Button } from "../components/Button";
import { Field, Input } from "../components/FormField";
import { HostelPicker } from "../components/HostelPicker";
import { Skeleton } from "../components/Skeleton";
import { useHostels } from "../api/hooks";
import { useAuth } from "../store/authStore";
import { ApiError } from "../api/client";
import { useTheme, spacing, type } from "../theme/tokens";
import type { AuthStackParamList } from "../navigation/RootNavigator";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "At least 8 characters"),
  hostelId: z.string().min(1, "Pick a hostel"),
});
type FormValues = z.infer<typeof schema>;

type Props = NativeStackScreenProps<AuthStackParamList, "Signup">;

export default function SignupScreen({ navigation }: Props) {
  const theme = useTheme();
  const { signup } = useAuth();
  const { data: hostels, isLoading } = useHostels();
  const [submitting, setSubmitting] = useState(false);
  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { hostelId: "" } });

  useEffect(() => {
    if (hostels?.length && !watch("hostelId")) setValue("hostelId", hostels[0].id);
  }, [hostels, setValue, watch]);

  const onSubmit = async (values: FormValues) => {
    setSubmitting(true);
    try {
      await signup(values);
    } catch (err) {
      Alert.alert("Couldn't create account", err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScreenContainer>
      <View style={{ gap: spacing.md }}>
        <Text style={{ ...type.title, fontSize: 24, color: theme.text }}>Create your account</Text>

        <Field label="Full name" error={errors.name?.message}>
          <Controller control={control} name="name" render={({ field }) => <Input value={field.value ?? ""} onChangeText={field.onChange} placeholder="Aadityaa" accessibilityLabel="Full name" />} />
        </Field>

        <Field label="Campus email" error={errors.email?.message}>
          <Controller
            control={control}
            name="email"
            render={({ field }) => (
              <Input value={field.value ?? ""} onChangeText={field.onChange} placeholder="you@college.edu" autoCapitalize="none" keyboardType="email-address" accessibilityLabel="Campus email" />
            )}
          />
        </Field>

        <Field label="Password" error={errors.password?.message}>
          <Controller
            control={control}
            name="password"
            render={({ field }) => <Input value={field.value ?? ""} onChangeText={field.onChange} placeholder="Min 8 characters" secureTextEntry accessibilityLabel="Password" />}
          />
        </Field>

        <Field label="Hostel" error={errors.hostelId?.message}>
          {isLoading ? (
            <Skeleton height={44} width="60%" />
          ) : (
            <Controller
              control={control}
              name="hostelId"
              render={({ field }) => <HostelPicker hostels={hostels ?? []} value={field.value} onChange={field.onChange} />}
            />
          )}
        </Field>

        <View style={{ marginTop: spacing.sm, gap: spacing.sm }}>
          <Button title="Create account" onPress={() => handleSubmit(onSubmit)()} loading={submitting} disabled={isLoading} />
          <Button title="Already have an account? Log in" variant="secondary" onPress={() => navigation.navigate("Login")} />
        </View>
      </View>
    </ScreenContainer>
  );
}
