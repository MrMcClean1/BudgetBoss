import { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { getAccounts, BankAccount } from "@/lib/api";
import { Colors } from "@/constants/colors";
import { useColorScheme } from "@/hooks/useColorScheme";
import { Card } from "@/components/Card";
import { ThemedText } from "@/components/ThemedText";
import { AccountSkeleton } from "@/components/Skeleton";

const ACCOUNT_ICONS: Record<string, string> = {
  CHECKING: "🏦",
  SAVINGS: "💰",
  CREDIT_CARD: "💳",
  CASH: "💵",
  INVESTMENT: "📈",
};

const ACCOUNT_LABELS: Record<string, string> = {
  CHECKING: "Checking",
  SAVINGS: "Savings",
  CREDIT_CARD: "Credit Card",
  CASH: "Cash",
  INVESTMENT: "Investment",
};

function formatCurrency(amount: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

function AccountCard({ account, scheme }: { account: BankAccount; scheme: "light" | "dark" }) {
  const c = Colors[scheme];
  const isNegative = account.balance < 0;

  return (
    <Card style={styles.accountCard}>
      <View style={styles.row}>
        <View style={[styles.iconWrap, { backgroundColor: Colors.primaryLight }]}>
          <Text style={{ fontSize: 22 }}>{ACCOUNT_ICONS[account.type] ?? "🏦"}</Text>
        </View>
        <View style={styles.accountInfo}>
          <ThemedText variant="subtitle" numberOfLines={1} style={{ flex: 1 }}>
            {account.name}
          </ThemedText>
          <ThemedText variant="caption" dim>
            {ACCOUNT_LABELS[account.type]} · {account.currency}
          </ThemedText>
        </View>
        <View style={styles.balanceWrap}>
          <ThemedText
            variant="subtitle"
            style={{ color: isNegative ? Colors.danger : Colors.primary, textAlign: "right" }}
          >
            {formatCurrency(account.balance, account.currency)}
          </ThemedText>
          <Text style={[styles.txCount, { color: c.subtext }]}>
            {account.transactionCount} tx
          </Text>
        </View>
      </View>
      {!account.isActive && (
        <View style={[styles.inactiveBadge, { backgroundColor: c.border }]}>
          <Text style={{ color: c.subtext, fontSize: 11, fontWeight: "600" }}>Inactive</Text>
        </View>
      )}
    </Card>
  );
}

export default function AccountsScreen() {
  const scheme = useColorScheme();
  const c = Colors[scheme];

  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [totalBalance, setTotalBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const res = await getAccounts();
      setAccounts(res.accounts);
      setTotalBalance(res.totalBalance);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, []);
  const onRefresh = () => { setRefreshing(true); load(); };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.background }]}>
      <View style={[styles.header, { borderBottomColor: c.border }]}>
        <ThemedText variant="title">Accounts</ThemedText>
      </View>

      {loading ? (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={[styles.summaryCard, { backgroundColor: Colors.primary + "40", borderWidth: 0, borderRadius: 20 }]} />
          {Array.from({ length: 4 }).map((_, i) => (
            <AccountSkeleton key={i} scheme={scheme} />
          ))}
        </ScrollView>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
          showsVerticalScrollIndicator={false}
        >
          {/* Summary Card */}
          <Card style={[styles.summaryCard, { backgroundColor: Colors.primary, borderWidth: 0 }]}>
            <Text style={styles.summaryLabel}>Net Worth</Text>
            <Text style={styles.summaryAmount}>{formatCurrency(totalBalance)}</Text>
            <Text style={styles.summarySub}>{accounts.length} account{accounts.length !== 1 ? "s" : ""}</Text>
          </Card>

          {accounts.length === 0 ? (
            <View style={styles.center}>
              <Text style={{ color: c.subtext, fontSize: 16 }}>No accounts yet</Text>
            </View>
          ) : (
            accounts.map((a) => <AccountCard key={a.id} account={a} scheme={scheme} />)
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 40 },
  content: { padding: 16, gap: 12 },
  summaryCard: {
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    shadowColor: Colors.primary,
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  summaryLabel: { color: "rgba(255,255,255,0.8)", fontSize: 13, fontWeight: "600" },
  summaryAmount: { color: "#fff", fontSize: 36, fontWeight: "800", marginTop: 4, letterSpacing: -0.5 },
  summarySub: { color: "rgba(255,255,255,0.65)", fontSize: 13, marginTop: 4 },
  accountCard: { borderRadius: 16 },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconWrap: { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  accountInfo: { flex: 1 },
  balanceWrap: { alignItems: "flex-end" },
  txCount: { fontSize: 11, marginTop: 2 },
  inactiveBadge: { marginTop: 8, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, alignSelf: "flex-start" },
});
