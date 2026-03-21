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
import { createBudget } from "@/lib/api";

const QUICK_AMOUNTS = [500, 1000, 2000, 3000];

export default function OnboardingSetBudgetScreen() {
  const scheme = useColorScheme();
  const c = Colors[scheme];
  const router = useRouter();

  const [name, setName] = useState("Monthly Budget");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    const parsed = parseFloat(amount.replace(/,/g, ""));
    if (isNaN(parsed) || parsed <= 0) {
      Alert.alert("Invalid amount", "Please enter a monthly budget amount greater than 0.");
      return;
    }
    if (!name.trim()) {
      Alert.alert("Missing name", "Please give your budget a name.");
      return;
    }
    setLoading(true);
    try {
      const today = new Date();
      await createBudget({
        name: name.trim(),
        amount: parsed,
        period: "MONTHLY",
        startDate: new Date(today.getFullYear(), today.getMonth(), 1).toISOString(),
      });
      router.push("/(onboarding)/set-goal");
    } catch (err: unknown) {
      Alert.alert("Error", err instanceof Error ? err.message : "Failed to create budget.");
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => router.push("/(onboarding)/set-goal");

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.background }]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          {/* Progress */}
          <View style={styles.progress}>
            <View style={[styles.dot, { backgroundColor: Colors.primary }]} />
            <View style={[styles.dotLine, { backgroundColor: Colors.primary }]} />
            <View style={[styles.dot, { backgroundColor: Colors.primary }]} />
            <View style={[styles.dotLine, { backgroundColor: Colors.primary }]} />
            <View style={[styles.dot, styles.dotActive, { backgroundColor: Colors.primary }]} />
            <View style={[styles.dotLine, { backgroundColor: c.border }]} />
            <View style={[styles.dot, { backgroundColor: c.border }]} />
          </View>

          <Text style={styles.emoji}>🎯</Text>
          <Text style={[styles.title, { color: c.text }]}>Set your monthly budget</Text>
          <Text style={[styles.subtitle, { color: c.subtext }]}>
            How much do you want to spend this month? You can always adjust this later.
          </Text>

          <View style={styles.field}>
            <Text style={[styles.label, { color: c.subtext }]}>Budget name</Text>
            <TextInput
              style={[styles.input, { backgroundColor: c.surface, borderColor: c.border, color: c.text }]}
              value={name}
              onChangeText={setName}
              placeholder="Monthly Budget"
              placeholderTextColor={c.subtext}
              autoCapitalize="words"
            />
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { color: c.subtext }]}>Monthly limit (USD)</Text>
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

            {/* Quick picks */}
            <View style={styles.quickRow}>
              {QUICK_AMOUNTS.map((a) => (
                <TouchableOpacity
                  key={a}
                  style={[styles.quickBtn, { borderColor: amount === String(a) ? Colors.primary : c.border, backgroundColor: amount === String(a) ? Colors.primary + "18" : c.surface }]}
                  onPress={() => setAmount(String(a))}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.quickLabel, { color: amount === String(a) ? Colors.primary : c.text }]}>${a.toLocaleString()}</Text>
                </TouchableOpacity>
              ))}
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
              <Text style={styles.btnPrimaryText}>Set Budget & Continue</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={handleSkip} style={styles.btnSkip} activeOpacity={0.7}>
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
    gap: 0,
  },
  dot: { width: 10, height: 10, borderRadius: 5 },
  dotActive: { width: 24, borderRadius: 5 },
  dotLine: { flex: 1, height: 2, maxWidth: 32 },
  emoji: { fontSize: 52, textAlign: "center", marginBottom: 12 },
  title: { fontSize: 24, fontWeight: "800", textAlign: "center", letterSpacing: -0.5, marginBottom: 8 },
  subtitle: { fontSize: 14, textAlign: "center", lineHeight: 20, marginBottom: 28 },
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
  quickRow: { flexDirection: "row", gap: 8, marginTop: 10 },
  quickBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: "center",
  },
  quickLabel: { fontSize: 13, fontWeight: "600" },
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
