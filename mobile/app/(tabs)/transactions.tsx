import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { getTransactions, Transaction } from "@/lib/api";
import { Colors } from "@/constants/colors";
import { useColorScheme } from "@/hooks/useColorScheme";
import { ThemedText } from "@/components/ThemedText";
import { SwipeableRow } from "@/components/SwipeableRow";
import { BottomSheet } from "@/components/BottomSheet";
import { TransactionSkeleton } from "@/components/Skeleton";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const TYPE_COLOR: Record<string, string> = {
  INCOME: Colors.income,
  EXPENSE: Colors.expense,
  TRANSFER: Colors.transfer,
};

const TYPE_LABEL: Record<string, string> = {
  INCOME: "+",
  EXPENSE: "−",
  TRANSFER: "⇄",
};

const TYPE_DISPLAY: Record<string, string> = {
  INCOME: "Income",
  EXPENSE: "Expense",
  TRANSFER: "Transfer",
};

interface TxItemProps {
  item: Transaction;
  scheme: "light" | "dark";
  onPress: (tx: Transaction) => void;
}

function TxItem({ item, scheme, onPress }: TxItemProps) {
  const c = Colors[scheme];
  const color = TYPE_COLOR[item.type];
  const prefix = TYPE_LABEL[item.type];

  return (
    <SwipeableRow
      scheme={scheme}
      rightActions={[
        {
          label: "Details",
          color: Colors.primary,
          onPress: () => onPress(item),
        },
      ]}
    >
      <Pressable
        style={({ pressed }) => [
          styles.row,
          { borderBottomColor: c.border, backgroundColor: pressed ? c.border + "60" : c.surface },
        ]}
        onPress={() => onPress(item)}
        android_ripple={{ color: c.border }}
      >
        <View style={[styles.dot, { backgroundColor: color + "20" }]}>
          <View style={[styles.dotInner, { backgroundColor: color }]} />
        </View>
        <View style={styles.rowBody}>
          <Text style={[styles.desc, { color: c.text }]} numberOfLines={1}>
            {item.description}
          </Text>
          <Text style={[styles.meta, { color: c.subtext }]}>
            {formatDate(item.date)}{item.categoryName ? ` · ${item.categoryName}` : ""}
          </Text>
        </View>
        <Text style={[styles.amount, { color }]}>
          {prefix}{formatCurrency(Math.abs(item.amount))}
        </Text>
      </Pressable>
    </SwipeableRow>
  );
}

function TxDetailSheet({
  tx,
  visible,
  onClose,
  scheme,
}: {
  tx: Transaction | null;
  visible: boolean;
  onClose: () => void;
  scheme: "light" | "dark";
}) {
  const c = Colors[scheme];
  if (!tx) return null;
  const color = TYPE_COLOR[tx.type];
  const prefix = TYPE_LABEL[tx.type];

  return (
    <BottomSheet visible={visible} onClose={onClose} scheme={scheme}>
      <View style={detailStyles.container}>
        {/* Amount hero */}
        <View style={[detailStyles.amountWrap, { backgroundColor: color + "18" }]}>
          <Text style={[detailStyles.amountText, { color }]}>
            {prefix}{formatCurrency(Math.abs(tx.amount))}
          </Text>
          <View style={[detailStyles.typePill, { backgroundColor: color + "28" }]}>
            <Text style={[detailStyles.typeLabel, { color }]}>{TYPE_DISPLAY[tx.type]}</Text>
          </View>
        </View>

        <ThemedText variant="subtitle" style={{ marginTop: 20, marginBottom: 16 }}>
          {tx.description}
        </ThemedText>

        {/* Details rows */}
        <DetailRow label="Date" value={formatDate(tx.date)} c={c} />
        {tx.categoryName && <DetailRow label="Category" value={tx.categoryName} c={c} />}
        {tx.bankAccountName && <DetailRow label="Account" value={tx.bankAccountName} c={c} />}
        <DetailRow label="Status" value={tx.isReviewed ? "Reviewed ✓" : "Pending review"} c={c} />
        {tx.notes && <DetailRow label="Notes" value={tx.notes} c={c} />}

        <TouchableOpacity
          style={[detailStyles.closeBtn, { backgroundColor: c.border }]}
          onPress={onClose}
          activeOpacity={0.7}
        >
          <Text style={[detailStyles.closeBtnText, { color: c.text }]}>Close</Text>
        </TouchableOpacity>
      </View>
    </BottomSheet>
  );
}

function DetailRow({ label, value, c }: { label: string; value: string; c: typeof Colors.light }) {
  return (
    <View style={detailStyles.detailRow}>
      <Text style={[detailStyles.detailLabel, { color: c.subtext }]}>{label}</Text>
      <Text style={[detailStyles.detailValue, { color: c.text }]}>{value}</Text>
    </View>
  );
}

export default function TransactionsScreen() {
  const scheme = useColorScheme();
  const c = Colors[scheme];

  const [data, setData] = useState<Transaction[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [sheetVisible, setSheetVisible] = useState(false);

  const load = useCallback(async (p: number, replace: boolean) => {
    try {
      const res = await getTransactions(p, 25);
      setData((prev) => (replace ? res.data : [...prev, ...res.data]));
      setTotalPages(res.meta.totalPages);
      setPage(p);
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(1, true); }, [load]);

  const onRefresh = () => { setRefreshing(true); load(1, true); };

  const onEndReached = () => {
    if (loadingMore || page >= totalPages) return;
    setLoadingMore(true);
    load(page + 1, false);
  };

  const openDetails = (tx: Transaction) => {
    setSelectedTx(tx);
    setSheetVisible(true);
  };

  const closeDetails = () => setSheetVisible(false);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.background }]}>
      <View style={[styles.header, { borderBottomColor: c.border }]}>
        <ThemedText variant="title">Transactions</ThemedText>
      </View>

      {loading ? (
        <View style={{ backgroundColor: c.background, flex: 1 }}>
          {Array.from({ length: 8 }).map((_, i) => (
            <TransactionSkeleton key={i} scheme={scheme} />
          ))}
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <TxItem item={item} scheme={scheme} onPress={openDetails} />}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
          onEndReached={onEndReached}
          onEndReachedThreshold={0.2}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={{ color: c.subtext, fontSize: 16 }}>No transactions yet</Text>
            </View>
          }
          ListFooterComponent={
            loadingMore ? <ActivityIndicator color={Colors.primary} style={{ padding: 16 }} /> : null
          }
          style={{ backgroundColor: c.background }}
        />
      )}

      <TxDetailSheet
        tx={selectedTx}
        visible={sheetVisible}
        onClose={closeDetails}
        scheme={scheme}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 60 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
    minHeight: 64,
  },
  dot: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", marginRight: 12 },
  dotInner: { width: 12, height: 12, borderRadius: 6 },
  rowBody: { flex: 1, marginRight: 8 },
  desc: { fontSize: 14, fontWeight: "500" },
  meta: { fontSize: 12, marginTop: 2 },
  amount: { fontSize: 14, fontWeight: "700", minWidth: 80, textAlign: "right" },
});

const detailStyles = StyleSheet.create({
  container: { paddingBottom: 8 },
  amountWrap: {
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    marginTop: 8,
  },
  amountText: { fontSize: 36, fontWeight: "800", letterSpacing: -1 },
  typePill: {
    marginTop: 8,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  typeLabel: { fontSize: 13, fontWeight: "700" },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingVertical: 11,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(0,0,0,0.06)",
    minHeight: 44,
  },
  detailLabel: { fontSize: 14, fontWeight: "500" },
  detailValue: { fontSize: 14, fontWeight: "400", textAlign: "right", flex: 1, marginLeft: 16 },
  closeBtn: {
    marginTop: 20,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  closeBtnText: { fontSize: 15, fontWeight: "600" },
});
