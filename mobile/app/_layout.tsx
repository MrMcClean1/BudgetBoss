import { useEffect } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AuthProvider, useAuth } from "@/lib/auth";
import { useColorScheme } from "@/hooks/useColorScheme";
import { Colors } from "@/constants/colors";

function RootNavigator() {
  const { token, isLoading, onboardingComplete } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === "(auth)";
    const inOnboarding = segments[0] === "(onboarding)";
    const inTabs = segments[0] === "(tabs)";

    if (!token) {
      // Not signed in — go to auth
      if (!inAuthGroup) router.replace("/(auth)/login");
    } else if (!onboardingComplete) {
      // Signed in but hasn't completed onboarding
      if (!inOnboarding) router.replace("/(onboarding)");
    } else {
      // Signed in and onboarding done — go to main app
      if (!inTabs) router.replace("/(tabs)");
    }
  }, [token, isLoading, onboardingComplete, segments]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(onboarding)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="+not-found" />
    </Stack>
  );
}

export default function RootLayout() {
  const scheme = useColorScheme();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <StatusBar style={scheme === "dark" ? "light" : "dark"} />
        <RootNavigator />
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
