import { StyleSheet } from "react-native";
import { Link } from "expo-router";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";

export default function NotFoundScreen() {
  return (
    <ThemedView style={styles.container}>
      <ThemedText variant="title">This screen doesn't exist.</ThemedText>
      <Link href="/" style={styles.link}>
        <ThemedText style={{ color: "#10B981" }}>Go to home screen</ThemedText>
      </Link>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", padding: 20 },
  link: { marginTop: 16 },
});
