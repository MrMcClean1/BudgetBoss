import { Stack } from "expo-router";

export default function OnboardingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: "slide_from_right" }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="add-account" />
      <Stack.Screen name="set-budget" />
      <Stack.Screen name="set-goal" />
    </Stack>
  );
}
