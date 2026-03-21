import { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/lib/auth";
import {
  getAccounts,
  getTransactions,
  getBudgets,
  getGamification,
  BankAccount,
  Transaction,
  Budget,
} from "@/lib/api";
import { Colors } from "@/constants/colors";
import { useColorScheme } from "@/hooks/useColorScheme";
import { Card } from "@/components/Card";
import { ThemedText } from "@/components/ThemedText";

function formatCurrency(amount: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function TransactionRow({ tx, scheme }: { tx: Transaction; scheme: "light" | "dark" }) {
  const c = Colors[scheme];
  const isIncome = tx.type === "INCOME";
  const amountColor = isIncome ? Colors.income : Colors.expense;

  return (
    <View style={[styles.txRow, { borderBottomColor: c.border }]}>
      <View style={styles.txLeft}>
        <Text style={[styles.txDesc, { color: c.text }]} numberOfLines={1}>
          {tx.description}
        </Text>
        <Text style={[styles.txMeta, { color: c.subtext }]}>
          {formatDate(tx.date)}{tx.categoryName ? ` · ${tx.categoryName}` : ""}
        </Text>
      </View>
      <Text style={[styles.txAmount, { color: amountColor }]}>
        {isIncome ? "+" : "-"}{formatCurrency(Math.abs(tx.amount))}
      </Text>
    </View>
  );
}

function BudgetBar({ budget, scheme }: { budget: Budget; scheme: "light" | "dark" }) {
  const c = Colors[scheme];
  const pct = Math.min(budget.percentUsed, 100);
  const barColor = pct >= 90 ? Colors.danger : pct >= 70 ? Colors.warning : Colors.primary;

  return (
    <View style={styles.budgetItem}>
      <View style={styles.budgetHeader}>
        <ThemedText variant="label">{budget.name}</ThemedText>
        <ThemedText variant="label" dim>
          {formatCurrency(budget.spent)} / {formatCurrency(budget.amount)}
        </ThemedText>
      </View>
      <View style={[styles.barTrack, { backgroundColor: c.border }]}>
        <View style={[styles.barFill, { width: `${pct}%` as `${number}%`, backgroundColor: barColor }]} />
      </View>
    </View>
  );
}

export default function DashboardScreen() {
  const scheme = useColorScheme();
  const { user, signOut } = useAuth();
  const c = Colors[scheme];

  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [totalBalance, setTotalBalance] = useState(0);
  const [recentTx, setRecentTx] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [xp, setXp] = useState(0);
  const [level, setLevel] = useState(1);
  const [streak, setStreak] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const loadData = async () => {
    try {
      setError(null);
      const [acctRes, txRes, budgetRes, gamRes] = await Promise.all([
        getAccounts(),
        getTransactions(1, 5),
        getBudgets(),
        getGamification(),
      ]);
      setAccounts(acctRes.accounts);
      setTotalBalance(acctRes.totalBalance);
      setRecentTx(txRes.data);
      setBudgets(budgetRes.budgets.filter((b) => b.isActive).slice(0, 3));
      setXp(gamRes.user.xp);
      setLevel(gamRes.user.level);
      setStreak(gamRes.user.streakDays);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
      setRefreshing(false);
      Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }).start();
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
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

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.background }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
      <Animated.View style={{ opacity: fadeAnim }}>
        {/* Top bar */}
        <View style={styles.topBar}>
          <View>
            <ThemedText variant="caption" dim>Welcome back</ThemedText>
            <ThemedText variant="subtitle">{user?.name ?? "there"} 👋</ThemedText>
          </View>
          <TouchableOpacity onPress={signOut} style={[styles.signOutBtn, { borderColor: c.border }]}>
            <Text style={{ color: c.subtext, fontSize: 13 }}>Sign out</Text>
          </TouchableOpacity>
        </View>

        {error && (
          <View style={[styles.errorBanner, { backgroundColor: Colors.danger + "18" }]}>
            <Text style={{ color: Colors.danger, fontSize: 13 }}>{error}</Text>
          </View>
        )}

        {/* Total Balance */}
        <Card style={[styles.balanceCard, { backgroundColor: Colors.primary }]}>
          <Text style={styles.balanceLabel}>Total Balance</Text>
          <Text style={styles.balanceAmount}>{formatCurrency(totalBalance)}</Text>
          <Text style={styles.balanceSub}>{accounts.length} account{accounts.length !== 1 ? "s" : ""}</Text>
        </Card>

        {/* Gamification strip */}
        <Card style={styles.gamCard}>
          <View style={styles.gamRow}>
            <View style={styles.gamStat}>
              <Text style={[styles.gamValue, { color: Colors.primary }]}>Lv {level}</Text>
              <Text style={[styles.gamKey, { color: c.subtext }]}>Level</Text>
            </View>
            <View style={[styles.gamDivider, { backgroundColor: c.border }]} />
            <View style={styles.gamStat}>
              <Text style={[styles.gamValue, { color: Colors.warning }]}>{xp.toLocaleString()}</Text>
              <Text style={[styles.gamKey, { color: c.subtext }]}>XP</Text>
            </View>
            <View style={[styles.gamDivider, { backgroundColor: c.border }]} />
            <View style={styles.gamStat}>
              <Text style={[styles.gamValue, { color: Colors.danger }]}>{streak} 🔥</Text>
              <Text style={[styles.gamKey, { color: c.subtext }]}>Streak</Text>
            </View>
          </View>
        </Card>

        {/* Active Budgets */}
        {budgets.length > 0 && (
          <Card style={styles.section}>
            <ThemedText variant="subtitle" style={styles.sectionTitle}>Budgets</ThemedText>
            {budgets.map((b) => (
              <BudgetBar key={b.id} budget={b} scheme={scheme} />
            ))}
          </Card>
        )}

        {/* Recent Transactions */}
        <Card style={styles.section}>
          <ThemedText variant="subtitle" style={styles.sectionTitle}>Recent Transactions</ThemedText>
          {recentTx.length === 0 ? (
            <ThemedText dim style={{ textAlign: "center", paddingVertical: 16 }}>
              No transactions yet
            </ThemedText>
          ) : (
            recentTx.map((tx) => (
              <TransactionRow key={tx.id} tx={tx} scheme={scheme} />
            ))
          )}
        </Card>
      </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, paddingBottom: 32, gap: 12 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  topBar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 16 },
  signOutBtn: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, minHeight: 44, justifyContent: "center" },
  errorBanner: { borderRadius: 10, padding: 12 },

  balanceCard: {
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    shadowColor: Colors.primary,
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
    borderWidth: 0,
  },
  balanceLabel: { color: "rgba(255,255,255,0.8)", fontSize: 13, fontWeight: "600" },
  balanceAmount: { color: "#fff", fontSize: 40, fontWeight: "800", marginTop: 4, letterSpacing: -1 },
  balanceSub: { color: "rgba(255,255,255,0.65)", fontSize: 13, marginTop: 4 },

  gamCard: { borderRadius: 16 },
  gamRow: { flexDirection: "row", justifyContent: "space-around", alignItems: "center" },
  gamStat: { alignItems: "center", flex: 1 },
  gamValue: { fontSize: 20, fontWeight: "700" },
  gamKey: { fontSize: 11, fontWeight: "500", marginTop: 2 },
  gamDivider: { width: 1, height: 36 },

  section: { borderRadius: 16 },
  sectionTitle: { marginBottom: 12 },

  budgetItem: { marginBottom: 12 },
  budgetHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  barTrack: { height: 6, borderRadius: 3, overflow: "hidden" },
  barFill: { height: 6, borderRadius: 3 },

  txRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  txLeft: { flex: 1, marginRight: 12 },
  txDesc: { fontSize: 14, fontWeight: "500" },
  txMeta: { fontSize: 12, marginTop: 2 },
  txAmount: { fontSize: 14, fontWeight: "700" },
});
