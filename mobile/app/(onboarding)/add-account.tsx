import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Colors } from "@/constants/colors";
import { useColorScheme } from "@/hooks/useColorScheme";
import { createAccount, BankAccount } from "@/lib/api";

const ACCOUNT_TYPES: { value: BankAccount["type"]; label: string; emoji: string }[] = [
  { value: "CHECKING", label: "Checking", emoji: "🏦" },
  { value: "SAVINGS", label: "Savings", emoji: "💰" },
  { value: "CREDIT_CARD", label: "Credit Card", emoji: "💳" },
  { value: "CASH", label: "Cash", emoji: "💵" },
  { value: "INVESTMENT", label: "Investment", emoji: "📈" },
];

export default function OnboardingAddAccountScreen() {
  const scheme = useColorScheme();
  const c = Colors[scheme];
  const router = useRouter();

  const [name, setName] = useState("");
  const [type, setType] = useState<BankAccount["type"]>("CHECKING");
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert("Missing name", "Please enter a name for this account.");
      return;
    }
    setLoading(true);
    try {
      await createAccount({ name: name.trim(), type });
      router.push("/(onboarding)/set-budget");
    } catch (err: unknown) {
      Alert.alert("Error", err instanceof Error ? err.message : "Failed to create account.");
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => router.push("/(onboarding)/set-budget");

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.background }]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          {/* Progress */}
          <View style={styles.progress}>
            <View style={[styles.dot, { backgroundColor: Colors.primary }]} />
            <View style={[styles.dotLine, { backgroundColor: Colors.primary }]} />
            <View style={[styles.dot, styles.dotActive, { backgroundColor: Colors.primary }]} />
            <View style={[styles.dotLine, { backgroundColor: c.border }]} />
            <View style={[styles.dot, { backgroundColor: c.border }]} />
          </View>

          <Text style={styles.emoji}>🏦</Text>
          <Text style={[styles.title, { color: c.text }]}>Add your first account</Text>
          <Text style={[styles.subtitle, { color: c.subtext }]}>
            Link a bank account, savings account, or card to start tracking your finances.
          </Text>

          {/* Account name */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: c.subtext }]}>Account name</Text>
            <TextInput
              style={[styles.input, { backgroundColor: c.surface, borderColor: c.border, color: c.text }]}
              placeholder="e.g. Chase Checking"
              placeholderTextColor={c.subtext}
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              returnKeyType="done"
            />
          </View>

          {/* Account type */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: c.subtext }]}>Account type</Text>
            <View style={styles.typeGrid}>
              {ACCOUNT_TYPES.map((t) => {
                const active = type === t.value;
                return (
                  <TouchableOpacity
                    key={t.value}
                    style={[
                      styles.typeBtn,
                      { borderColor: active ? Colors.primary : c.border, backgroundColor: active ? Colors.primary + "18" : c.surface },
                    ]}
                    onPress={() => setType(t.value)}
                    activeOpacity={0.7}
                  >
                    <Text style={{ fontSize: 22 }}>{t.emoji}</Text>
                    <Text style={[styles.typeLabel, { color: active ? Colors.primary : c.text }]}>{t.label}</Text>
                  </TouchableOpacity>
                );
              })}
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
              <Text style={styles.btnPrimaryText}>Add Account & Continue</Text>
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
  typeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  typeBtn: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: "center",
    gap: 4,
    minWidth: "28%",
  },
  typeLabel: { fontSize: 12, fontWeight: "600" },
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
