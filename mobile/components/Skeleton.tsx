import { useEffect, useRef } from "react";
import { Animated, View, StyleSheet } from "react-native";
import { Colors } from "@/constants/colors";

interface SkeletonProps {
  width?: number | `${number}%`;
  height?: number;
  borderRadius?: number;
  style?: object;
  scheme: "light" | "dark";
}

export function Skeleton({ width = "100%", height = 16, borderRadius = 8, style, scheme }: SkeletonProps) {
  const opacity = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 750, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.35, duration: 750, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [opacity]);

  const c = Colors[scheme];

  return (
    <Animated.View
      style={[{ width, height, borderRadius, backgroundColor: c.border, opacity }, style]}
    />
  );
}

export function TransactionSkeleton({ scheme }: { scheme: "light" | "dark" }) {
  const c = Colors[scheme];
  return (
    <View style={[txStyles.row, { borderBottomColor: c.border, backgroundColor: c.surface }]}>
      <View style={[txStyles.dot, { backgroundColor: c.border }]} />
      <View style={txStyles.body}>
        <Skeleton scheme={scheme} width="58%" height={14} />
        <Skeleton scheme={scheme} width="36%" height={12} style={{ marginTop: 6 }} />
      </View>
      <Skeleton scheme={scheme} width={72} height={14} />
    </View>
  );
}

export function AccountSkeleton({ scheme }: { scheme: "light" | "dark" }) {
  const c = Colors[scheme];
  return (
    <View style={[acctStyles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
      <View style={acctStyles.row}>
        <View style={[acctStyles.icon, { backgroundColor: c.border }]} />
        <View style={acctStyles.info}>
          <Skeleton scheme={scheme} width="50%" height={16} />
          <Skeleton scheme={scheme} width="35%" height={12} style={{ marginTop: 6 }} />
        </View>
        <View style={acctStyles.balance}>
          <Skeleton scheme={scheme} width={80} height={16} />
          <Skeleton scheme={scheme} width={40} height={11} style={{ marginTop: 6 }} />
        </View>
      </View>
    </View>
  );
}

export function BudgetSkeleton({ scheme }: { scheme: "light" | "dark" }) {
  const c = Colors[scheme];
  return (
    <View style={[budgetStyles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
      <View style={budgetStyles.row}>
        <Skeleton scheme={scheme} width="45%" height={16} />
        <Skeleton scheme={scheme} width={60} height={22} borderRadius={6} />
      </View>
      <Skeleton scheme={scheme} width="100%" height={8} borderRadius={4} style={{ marginTop: 14 }} />
      <View style={[budgetStyles.row, { marginTop: 10 }]}>
        <Skeleton scheme={scheme} width="30%" height={12} />
        <Skeleton scheme={scheme} width="25%" height={12} />
      </View>
    </View>
  );
}

const txStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  dot: { width: 36, height: 36, borderRadius: 18, marginRight: 12 },
  body: { flex: 1, marginRight: 8, gap: 6 },
});

const acctStyles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 0,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  icon: { width: 48, height: 48, borderRadius: 14 },
  info: { flex: 1, gap: 6 },
  balance: { alignItems: "flex-end", gap: 6 },
});

const budgetStyles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
});
