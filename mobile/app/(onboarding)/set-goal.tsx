import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Colors } from "@/constants/colors";
import { useColorScheme } from "@/hooks/useColorScheme";
import { createSavingsGoal } from "@/lib/api";
import { useAuth } from "@/lib/auth";

const GOAL_PRESETS = [
  { name: "Emergency Fund", icon: "🛡️", amount: 5000 },
  { name: "Vacation", icon: "✈️", amount: 2000 },
  { name: "New Car", icon: "🚗", amount: 10000 },
  { name: "Home Down Payment", icon: "🏠", amount: 20000 },
];

export default function OnboardingSetGoalScreen() {
  const scheme = useColorScheme();
  const c = Colors[scheme];
  const router = useRouter();
  const { markOnboardingComplete } = useAuth();

  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [selectedIcon, setSelectedIcon] = useState("🎯");
  const [loading, setLoading] = useState(false);

  const selectPreset = (preset: (typeof GOAL_PRESETS)[0]) => {
    setName(preset.name);
    setAmount(String(preset.amount));
    setSelectedIcon(preset.icon);
  };

  const handleCreate = async () => {
    const parsed = parseFloat(amount.replace(/,/g, ""));
    if (isNaN(parsed) || parsed <= 0) {
      Alert.alert("Invalid amount", "Please enter a target amount greater than 0.");
      return;
    }
    if (!name.trim()) {
      Alert.alert("Missing name", "Please give your goal a name.");
      return;
    }
    setLoading(true);
    try {
      await createSavingsGoal({ name: name.trim(), targetAmount: parsed, icon: selectedIcon });
      await markOnboardingComplete();
      router.replace("/(tabs)");
    } catch (err: unknown) {
      Alert.alert("Error", err instanceof Error ? err.message : "Failed to create goal.");
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = async () => {
    await markOnboardingComplete();
    router.replace("/(tabs)");
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.background }]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          {/* Progress — all filled */}
          <View style={styles.progress}>
            {[0, 1, 2].map((i) => (
              <View key={i} style={{ flexDirection: "row", alignItems: "center" }}>
                <View style={[styles.dot, { backgroundColor: Colors.primary }]} />
                {i < 2 && <View style={[styles.dotLine, { backgroundColor: Colors.primary }]} />}
              </View>
            ))}
          </View>

          <Text style={styles.emoji}>{selectedIcon}</Text>
          <Text style={[styles.title, { color: c.text }]}>Create your first savings goal</Text>
          <Text style={[styles.subtitle, { color: c.subtext }]}>
            What are you saving for? Set a target and we'll track your progress.
          </Text>

          {/* Presets */}
          <View style={styles.presets}>
            {GOAL_PRESETS.map((p) => (
              <TouchableOpacity
                key={p.name}
                style={[styles.presetBtn, { borderColor: name === p.name ? Colors.primary : c.border, backgroundColor: name === p.name ? Colors.primary + "18" : c.surface }]}
                onPress={() => selectPreset(p)}
                activeOpacity={0.7}
              >
                <Text style={{ fontSize: 20 }}>{p.icon}</Text>
                <Text style={[styles.presetName, { color: name === p.name ? Colors.primary : c.text }]}>{p.name}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { color: c.subtext }]}>Goal name</Text>
            <TextInput
              style={[styles.input, { backgroundColor: c.surface, borderColor: c.border, color: c.text }]}
              value={name}
              onChangeText={setName}
              placeholder="e.g. Emergency Fund"
              placeholderTextColor={c.subtext}
              autoCapitalize="words"
            />
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { color: c.subtext }]}>Target amount (USD)</Text>
            <View style={[styles.amountWrap, { backgroundColor: c.surface, borderColor: c.border }]}>
              <Text style={[styles.currency, { color: c.subtext }]}>$</Text>
              <TextInput
                style={[styles.amountInput, { color: c.text }]}
                value={amount}
                onChangeText={setAmount}
                placeholder="0"
                placeholderTextColor={c.subtext}
                keyboardType="decimal-pad"
              />
            </View>
          </View>

          <TouchableOpacity
            style={[styles.btnPrimary, { backgroundColor: Colors.primary, opacity: loading ? 0.7 : 1 }]}
            onPress={handleCreate}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnPrimaryText}>Create Goal & Get Started 🎉</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={handleSkip} style={styles.btnSkip} activeOpacity={0.7} disabled={loading}>
            <Text style={[styles.btnSkipText, { color: c.subtext }]}>Skip for now</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 32, paddingBottom: 24 },
  progress: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 32,
  },
  dot: { width: 10, height: 10, borderRadius: 5 },
  dotLine: { width: 32, height: 2, marginHorizontal: 2 },
  emoji: { fontSize: 52, textAlign: "center", marginBottom: 12 },
  title: { fontSize: 24, fontWeight: "800", textAlign: "center", letterSpacing: -0.5, marginBottom: 8 },
  subtitle: { fontSize: 14, textAlign: "center", lineHeight: 20, marginBottom: 24 },
  presets: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 20 },
  presetBtn: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minWidth: "45%",
    flex: 1,
  },
  presetName: { fontSize: 12, fontWeight: "600", flexShrink: 1 },
  field: { marginBottom: 20 },
  label: { fontSize: 13, fontWeight: "600", marginBottom: 8 },
  input: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  amountWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 14,
  },
  currency: { fontSize: 22, fontWeight: "700", marginRight: 4 },
  amountInput: { flex: 1, fontSize: 32, fontWeight: "800", paddingVertical: 12 },
  btnPrimary: {
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 8,
    marginBottom: 12,
  },
  btnPrimaryText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  btnSkip: { alignItems: "center", paddingVertical: 8 },
  btnSkipText: { fontSize: 14 },
});
