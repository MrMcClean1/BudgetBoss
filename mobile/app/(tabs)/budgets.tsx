import { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { getBudgets, Budget } from "@/lib/api";
import { Colors } from "@/constants/colors";
import { useColorScheme } from "@/hooks/useColorScheme";
import { Card } from "@/components/Card";
import { ThemedText } from "@/components/ThemedText";
import { BudgetSkeleton } from "@/components/Skeleton";

function formatCurrency(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

function AnimatedBar({ pct, color }: { pct: number; color: string }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(anim, {
      toValue: pct,
      damping: 18,
      stiffness: 100,
      useNativeDriver: false,
    }).start();
  }, [pct, anim]);

  const width = anim.interpolate({
    inputRange: [0, 100],
    outputRange: ["0%", "100%"],
    extrapolate: "clamp",
  });

  return (
    <Animated.View style={[barStyles.fill, { width, backgroundColor: color }]} />
  );
}

const barStyles = StyleSheet.create({
  fill: { height: 8, borderRadius: 4 },
});

function BudgetCard({ budget, scheme }: { budget: Budget; scheme: "light" | "dark" }) {
  const c = Colors[scheme];
  const pct = budget.percentUsed;
  const barColor =
    pct >= 100 ? Colors.danger : pct >= 80 ? Colors.warning : Colors.primary;
  const isOver = pct > 100;

  return (
    <Card style={styles.budgetCard}>
      <View style={styles.row}>
        <ThemedText variant="subtitle" style={{ flex: 1 }}>{budget.name}</ThemedText>
        <View style={[styles.periodBadge, { backgroundColor: Colors.primaryLight }]}>
          <Text style={[styles.periodText, { color: Colors.primaryDark }]}>
            {budget.period.charAt(0) + budget.period.slice(1).toLowerCase()}
          </Text>
        </View>
      </View>

      {budget.categoryName && (
        <ThemedText variant="caption" dim style={{ marginTop: 2 }}>
          {budget.categoryName}
        </ThemedText>
      )}

      <View style={[styles.barTrack, { backgroundColor: c.border, marginTop: 12 }]}>
        <AnimatedBar pct={Math.min(pct, 100)} color={barColor} />
      </View>

      <View style={[styles.row, { marginTop: 8 }]}>
        <ThemedText variant="caption" dim>
          {formatCurrency(budget.spent)} spent
        </ThemedText>
        <ThemedText variant="caption" style={{ color: isOver ? Colors.danger : c.subtext }}>
          {isOver
            ? `${formatCurrency(Math.abs(budget.remaining))} over`
            : `${formatCurrency(budget.remaining)} left`}
        </ThemedText>
      </View>

      <View style={styles.row}>
        <ThemedText variant="caption" dim>Budget</ThemedText>
        <ThemedText variant="caption">{formatCurrency(budget.amount)}</ThemedText>
      </View>
    </Card>
  );
}

export default function BudgetsScreen() {
  const scheme = useColorScheme();
  const c = Colors[scheme];

  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const res = await getBudgets();
      setBudgets(res.budgets);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, []);
  const onRefresh = () => { setRefreshing(true); load(); };

  const active = budgets.filter((b) => b.isActive);
  const inactive = budgets.filter((b) => !b.isActive);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.background }]}>
      <View style={[styles.header, { borderBottomColor: c.border }]}>
        <ThemedText variant="title">Budgets</ThemedText>
      </View>

      {loading ? (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {Array.from({ length: 4 }).map((_, i) => (
            <BudgetSkeleton key={i} scheme={scheme} />
          ))}
        </ScrollView>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
          showsVerticalScrollIndicator={false}
        >
          {active.length === 0 && inactive.length === 0 && (
            <View style={styles.center}>
              <Text style={{ color: c.subtext, fontSize: 16 }}>No budgets yet</Text>
            </View>
          )}

          {active.length > 0 && (
            <>
              <ThemedText variant="label" dim style={styles.groupLabel}>ACTIVE</ThemedText>
              {active.map((b) => <BudgetCard key={b.id} budget={b} scheme={scheme} />)}
            </>
          )}

          {inactive.length > 0 && (
            <>
              <ThemedText variant="label" dim style={styles.groupLabel}>INACTIVE</ThemedText>
              {inactive.map((b) => <BudgetCard key={b.id} budget={b} scheme={scheme} />)}
            </>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 60 },
  content: { padding: 16, gap: 12 },
  groupLabel: { marginBottom: 4, marginLeft: 4 },
  budgetCard: { borderRadius: 16 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  periodBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, minHeight: 28, justifyContent: "center" },
  periodText: { fontSize: 11, fontWeight: "700" },
  barTrack: { height: 8, borderRadius: 4, overflow: "hidden" },
});
