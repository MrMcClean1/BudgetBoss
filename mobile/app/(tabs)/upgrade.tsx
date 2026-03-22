import { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { getSubscriptionStatus, SubscriptionStatus } from "@/lib/api";
import { Colors } from "@/constants/colors";
import { useColorScheme } from "@/hooks/useColorScheme";
import { Card } from "@/components/Card";
import { ThemedText } from "@/components/ThemedText";

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function FeatureRow({ included, text }: { included: boolean; text: string }) {
  return (
    <View style={styles.featureRow}>
      <Text style={styles.featureIcon}>{included ? "✓" : "✗"}</Text>
      <Text style={[styles.featureText, !included && styles.featureDisabled]}>
        {text}
      </Text>
    </View>
  );
}

export default function UpgradeScreen() {
  const scheme = useColorScheme();
  const c = Colors[scheme];

  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<"PRO" | "FAMILY">("PRO");
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("yearly");

  useEffect(() => {
    loadSubscription();
  }, []);

  const loadSubscription = async () => {
    try {
      const status = await getSubscriptionStatus();
      setSubscription(status);
    } catch (error) {
      console.error("Failed to load subscription:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = () => {
    // In production, this would open the payment flow
    Alert.alert(
      "Upgrade to Pro",
      "Payment processing will be enabled when you configure Stripe. For now, this is a preview.",
      [{ text: "OK" }]
    );
  };

  const handleRestorePurchases = () => {
    Alert.alert(
      "Restore Purchases",
      "This will restore any previous purchases from the App Store.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Restore", onPress: () => console.log("Restore purchases") },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: c.background }]}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const isPro = subscription?.isPro;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.background }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerEmoji}>💎</Text>
          <ThemedText variant="title" style={styles.title}>
            {isPro ? "You're on Pro!" : "Upgrade to Pro"}
          </ThemedText>
          <ThemedText dim style={styles.subtitle}>
            {isPro
              ? "Enjoy unlimited features and priority support."
              : "Unlock unlimited budgets, accounts, and premium features."}
          </ThemedText>
        </View>

        {/* Current Status */}
        {subscription && (
          <Card style={styles.statusCard}>
            <View style={styles.statusRow}>
              <ThemedText dim>Current Plan</ThemedText>
              <View style={[styles.tierBadge, isPro && styles.proBadge]}>
                <Text style={[styles.tierText, isPro && styles.proText]}>
                  {subscription.tier}
                </Text>
              </View>
            </View>
            {!isPro && (
              <View style={styles.usageSection}>
                <ThemedText variant="label" style={{ marginBottom: 8 }}>
                  Your Usage
                </ThemedText>
                <View style={styles.usageRow}>
                  <ThemedText dim>Bank Accounts</ThemedText>
                  <ThemedText>
                    {subscription.usage.bankAccounts} / {subscription.limits.maxBankAccounts}
                  </ThemedText>
                </View>
                <View style={styles.usageRow}>
                  <ThemedText dim>Budgets</ThemedText>
                  <ThemedText>
                    {subscription.usage.budgets} / {subscription.limits.maxBudgets}
                  </ThemedText>
                </View>
                <View style={styles.usageRow}>
                  <ThemedText dim>Savings Goals</ThemedText>
                  <ThemedText>
                    {subscription.usage.savingsGoals} / {subscription.limits.maxSavingsGoals}
                  </ThemedText>
                </View>
              </View>
            )}
          </Card>
        )}

        {/* Plan Selection */}
        {!isPro && (
          <>
            <View style={styles.planToggle}>
              <TouchableOpacity
                style={[styles.planBtn, selectedPlan === "PRO" && styles.planBtnActive]}
                onPress={() => setSelectedPlan("PRO")}
              >
                <Text style={[styles.planBtnText, selectedPlan === "PRO" && styles.planBtnTextActive]}>
                  Pro
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.planBtn, selectedPlan === "FAMILY" && styles.planBtnActive]}
                onPress={() => setSelectedPlan("FAMILY")}
              >
                <Text style={[styles.planBtnText, selectedPlan === "FAMILY" && styles.planBtnTextActive]}>
                  Family
                </Text>
              </TouchableOpacity>
            </View>

            {/* Billing Cycle */}
            <View style={styles.cycleToggle}>
              <TouchableOpacity
                style={[styles.cycleBtn, billingCycle === "monthly" && styles.cycleBtnActive]}
                onPress={() => setBillingCycle("monthly")}
              >
                <Text style={[styles.cycleBtnText, billingCycle === "monthly" && styles.cycleBtnTextActive]}>
                  Monthly
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.cycleBtn, billingCycle === "yearly" && styles.cycleBtnActive]}
                onPress={() => setBillingCycle("yearly")}
              >
                <Text style={[styles.cycleBtnText, billingCycle === "yearly" && styles.cycleBtnTextActive]}>
                  Yearly (Save 33%)
                </Text>
              </TouchableOpacity>
            </View>

            {/* Pricing Card */}
            <Card style={styles.pricingCard}>
              <Text style={styles.priceAmount}>
                {formatPrice(subscription?.prices[selectedPlan][billingCycle] || 0)}
              </Text>
              <Text style={[styles.priceInterval, { color: c.subtext }]}>
                per {billingCycle === "monthly" ? "month" : "year"}
              </Text>

              <View style={styles.featuresSection}>
                <FeatureRow included text="Unlimited bank accounts" />
                <FeatureRow included text="Unlimited budgets" />
                <FeatureRow included text="Unlimited savings goals" />
                <FeatureRow included text="Advanced reports & charts" />
                <FeatureRow included text="All badge rarities" />
                <FeatureRow included text="Priority support" />
                <FeatureRow included={selectedPlan === "FAMILY"} text="Up to 5 family members" />
              </View>

              <TouchableOpacity
                style={styles.upgradeBtn}
                onPress={handleUpgrade}
                activeOpacity={0.8}
              >
                <Text style={styles.upgradeBtnText}>
                  Start 7-Day Free Trial
                </Text>
              </TouchableOpacity>

              <Text style={[styles.trialNote, { color: c.subtext }]}>
                No charge until trial ends. Cancel anytime.
              </Text>
            </Card>

            <TouchableOpacity onPress={handleRestorePurchases} style={styles.restoreBtn}>
              <Text style={[styles.restoreText, { color: c.subtext }]}>
                Restore Purchases
              </Text>
            </TouchableOpacity>
          </>
        )}

        {/* Pro benefits reminder */}
        {isPro && (
          <Card style={styles.benefitsCard}>
            <ThemedText variant="subtitle" style={{ marginBottom: 12 }}>
              Your Pro Benefits
            </ThemedText>
            <FeatureRow included text="Unlimited bank accounts" />
            <FeatureRow included text="Unlimited budgets" />
            <FeatureRow included text="Unlimited savings goals" />
            <FeatureRow included text="Advanced reports & charts" />
            <FeatureRow included text="All badge rarities" />
            <FeatureRow included text="Priority support" />
          </Card>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16 },
  center: { flex: 1, alignItems: "center",justifyContent: "center" },

  header: { alignItems: "center", paddingVertical: 24 },
  headerEmoji: { fontSize: 48, marginBottom: 8 },
  title: { textAlign: "center" },
  subtitle: { textAlign: "center", marginTop: 8, paddingHorizontal: 20 },

  statusCard: { marginBottom: 16 },
  statusRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  tierBadge: { backgroundColor: "#e5e7eb", paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  proBadge: { backgroundColor: Colors.primary },
  tierText: { fontSize: 12, fontWeight: "700", color: "#374151" },
  proText: { color: "#fff" },
  usageSection: { marginTop: 16, paddingTop: 16, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "#e5e7eb" },
  usageRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 },

  planToggle: { flexDirection: "row", marginBottom: 12 },
  planBtn: { flex: 1, paddingVertical: 12, alignItems: "center", backgroundColor: "#f3f4f6", marginHorizontal: 4, borderRadius: 10 },
  planBtnActive: { backgroundColor: Colors.primary },
  planBtnText: { fontWeight: "600", color: "#374151" },
  planBtnTextActive: { color: "#fff" },

  cycleToggle: { flexDirection: "row", marginBottom: 16 },
  cycleBtn: { flex: 1, paddingVertical: 10, alignItems: "center", backgroundColor: "#f3f4f6", marginHorizontal: 4, borderRadius: 8 },
  cycleBtnActive: { backgroundColor: "#d1fae5" },
  cycleBtnText: { fontSize: 13, color: "#374151" },
  cycleBtnTextActive: { color: Colors.primary, fontWeight: "600" },

  pricingCard: { alignItems: "center", paddingVertical: 24, marginBottom: 16 },
  priceAmount: { fontSize: 48, fontWeight: "800", color: Colors.primary },
  priceInterval: { fontSize: 14, marginTop: -4 },

  featuresSection: { marginTop: 20, alignSelf: "stretch", paddingHorizontal: 8 },
  featureRow: { flexDirection: "row", alignItems: "center", paddingVertical: 6 },
  featureIcon: { fontSize: 16, marginRight: 10, color: Colors.primary },
  featureText: { fontSize: 14, color: "#374151" },
  featureDisabled: { color: "#9ca3af", textDecorationLine: "line-through" },

  upgradeBtn: { marginTop: 24, backgroundColor: Colors.primary, paddingVertical: 16, paddingHorizontal: 48, borderRadius: 14 },
  upgradeBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  trialNote: { marginTop: 12, fontSize: 12 },

  restoreBtn: { alignItems: "center", paddingVertical: 16 },
  restoreText: { fontSize: 14 },

  benefitsCard: { marginTop: 8 },
  bottomSpacer: { height: 32 },
});
