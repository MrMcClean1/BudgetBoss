import { View, Text, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Colors } from "@/constants/colors";
import { useColorScheme } from "@/hooks/useColorScheme";
import { registerForPushNotifications, scheduleHabitNotifications } from "@/lib/notifications";

export default function OnboardingWelcomeScreen() {
  const scheme = useColorScheme();
  const c = Colors[scheme];
  const router = useRouter();

  const handleEnableNotifications = async () => {
    const token = await registerForPushNotifications();
    if (token) {
      await scheduleHabitNotifications();
    }
    router.push("/(onboarding)/add-account");
  };

  const handleSkipNotifications = () => {
    router.push("/(onboarding)/add-account");
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.background }]}>
      <View style={styles.container}>
        {/* Progress indicator */}
        <View style={styles.progress}>
          <View style={[styles.dot, styles.dotActive, { backgroundColor: Colors.primary }]} />
          <View style={[styles.dotLine, { backgroundColor: c.border }]} />
          <View style={[styles.dot, { backgroundColor: c.border }]} />
          <View style={[styles.dotLine, { backgroundColor: c.border }]} />
          <View style={[styles.dot, { backgroundColor: c.border }]} />
        </View>

        <View style={styles.hero}>
          <Text style={styles.emoji}>🚀</Text>
          <Text style={[styles.title, { color: c.text }]}>Welcome to BudgetBoss!</Text>
          <Text style={[styles.subtitle, { color: c.subtext }]}>
            Let's set you up in under 2 minutes. We'll help you link an account, set a budget, and create your first savings goal.
          </Text>
        </View>

        <View style={[styles.notifCard, { backgroundColor: c.surface, borderColor: c.border }]}>
          <Text style={{ fontSize: 28, textAlign: "center", marginBottom: 8 }}>🔔</Text>
          <Text style={[styles.notifTitle, { color: c.text }]}>Stay on track with notifications</Text>
          <Text style={[styles.notifBody, { color: c.subtext }]}>
            Get daily spending check-ins, streak reminders, and weekly summaries — without the spam.
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.btnPrimary, { backgroundColor: Colors.primary }]}
          onPress={handleEnableNotifications}
          activeOpacity={0.85}
        >
          <Text style={styles.btnPrimaryText}>Enable Notifications & Continue</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleSkipNotifications} style={styles.btnSkip} activeOpacity={0.7}>
          <Text style={[styles.btnSkipText, { color: c.subtext }]}>Skip for now</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { flex: 1, paddingHorizontal: 24, paddingTop: 32, paddingBottom: 24 },
  progress: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 40,
    gap: 0,
  },
  dot: { width: 10, height: 10, borderRadius: 5 },
  dotActive: { width: 24, borderRadius: 5 },
  dotLine: { flex: 1, height: 2, maxWidth: 32 },
  hero: { alignItems: "center", marginBottom: 32 },
  emoji: { fontSize: 64, marginBottom: 16 },
  title: { fontSize: 26, fontWeight: "800", textAlign: "center", letterSpacing: -0.5 },
  subtitle: { fontSize: 15, textAlign: "center", marginTop: 10, lineHeight: 22 },
  notifCard: {
    borderRadius: 16,
    padding: 20,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 32,
    alignItems: "center",
  },
  notifTitle: { fontSize: 16, fontWeight: "700", textAlign: "center", marginBottom: 6 },
  notifBody: { fontSize: 14, textAlign: "center", lineHeight: 20 },
  btnPrimary: {
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
    marginBottom: 12,
  },
  btnPrimaryText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  btnSkip: { alignItems: "center", paddingVertical: 8 },
  btnSkipText: { fontSize: 14 },
});
