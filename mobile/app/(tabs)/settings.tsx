import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as DocumentPicker from "expo-document-picker";
import { useAuth } from "@/lib/auth";
import { previewAccountDeletion, deleteAccount, clearToken, importTransactionsFile } from "@/lib/api";
import { Colors } from "@/constants/colors";
import { useColorScheme } from "@/hooks/useColorScheme";
import { Card } from "@/components/Card";
import { ThemedText } from "@/components/ThemedText";

const PRIVACY_POLICY_URL = "https://budgetboss.app/privacy";
const TERMS_OF_SERVICE_URL = "https://budgetboss.app/terms";

export default function SettingsScreen() {
  const scheme = useColorScheme();
  const { user, signOut } = useAuth();
  const c = Colors[scheme];

  const [deleting, setDeleting] = useState(false);
  const [importing, setImporting] = useState(false);

  const handleDeleteAccount = async () => {
    try {
      setDeleting(true);

      // First, get a preview of what will be deleted
      const preview = await previewAccountDeletion();

      // Show confirmation dialog with data counts
      Alert.alert(
        "Delete Account?",
        `This will permanently delete:\n\n` +
          `• ${preview.dataToBeDeleted.transactions} transactions\n` +
          `• ${preview.dataToBeDeleted.bankAccounts} bank accounts\n` +
          `• ${preview.dataToBeDeleted.budgets} budgets\n` +
          `• ${preview.dataToBeDeleted.savingsGoals} savings goals\n` +
          `• ${preview.dataToBeDeleted.badges} badges\n\n` +
          `${preview.warning}`,
        [
          { text: "Cancel", style: "cancel", onPress: () => setDeleting(false) },
          {
            text: "Delete Forever",
            style: "destructive",
            onPress: confirmDelete,
          },
        ]
      );
    } catch (error) {
      setDeleting(false);
      const message = error instanceof Error ? error.message : "Failed to prepare deletion";
      Alert.alert("Error", message);
    }
  };

  const confirmDelete = async () => {
    try {
      await deleteAccount();
      await clearToken();
      Alert.alert(
        "Account Deleted",
        "Your account and all data have been permanently deleted.",
        [{ text: "OK", onPress: signOut }]
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete account";
      Alert.alert("Deletion Failed", message);
    } finally {
      setDeleting(false);
    }
  };

  const handleImport = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["text/csv", "text/comma-separated-values", "application/json", "*/*"],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.length) return;

      const asset = result.assets[0];
      const fileName = asset.name ?? "import";
      const uri = asset.uri;
      const mimeType = asset.mimeType ?? "application/octet-stream";

      setImporting(true);
      const importResult = await importTransactionsFile(uri, fileName, mimeType);
      setImporting(false);

      Alert.alert(
        "Import Complete",
        `Imported ${importResult.rowsImported} transactions from ${fileName}.\n` +
          (importResult.rowsErrored > 0 ? `${importResult.rowsErrored} rows were skipped.` : ""),
        [{ text: "OK" }]
      );
    } catch (error) {
      setImporting(false);
      const message = error instanceof Error ? error.message : "Import failed";
      Alert.alert("Import Failed", message);
    }
  };

  const openPrivacyPolicy = () => {
    Linking.openURL(PRIVACY_POLICY_URL);
  };

  const openTermsOfService = () => {
    Linking.openURL(TERMS_OF_SERVICE_URL);
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.background }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <ThemedText variant="title">Settings</ThemedText>
        </View>

        {/* Account Section */}
        <Card style={styles.section}>
          <ThemedText variant="subtitle" style={styles.sectionTitle}>
            Account
          </ThemedText>

          <View style={[styles.infoRow, { borderBottomColor: c.border }]}>
            <ThemedText dim>Email</ThemedText>
            <ThemedText>{user?.email ?? "—"}</ThemedText>
          </View>

          <View style={styles.infoRow}>
            <ThemedText dim>Name</ThemedText>
            <ThemedText>{user?.name ?? "—"}</ThemedText>
          </View>
        </Card>

        {/* Import Section */}
        <Card style={styles.section}>
          <ThemedText variant="subtitle" style={styles.sectionTitle}>
            Import Transactions
          </ThemedText>

          <ThemedText dim style={styles.importDescription}>
            Upload a bank statement in CSV, OFX/QFX, or JSON format to add transactions in bulk.
          </ThemedText>

          <TouchableOpacity
            style={[styles.importBtn, { opacity: importing ? 0.6 : 1 }]}
            onPress={handleImport}
            disabled={importing}
            activeOpacity={0.7}
          >
            {importing ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.importBtnText}>📂 Choose File to Import</Text>
            )}
          </TouchableOpacity>

          <ThemedText dim style={styles.importFormats}>
            Supported: CSV · OFX · QFX · JSON
          </ThemedText>
        </Card>

        {/* Legal Section */}
        <Card style={styles.section}>
          <ThemedText variant="subtitle" style={styles.sectionTitle}>
            Legal
          </ThemedText>

          <TouchableOpacity
            style={[styles.linkRow, { borderBottomColor: c.border }]}
            onPress={openPrivacyPolicy}
            activeOpacity={0.7}
          >
            <ThemedText>Privacy Policy</ThemedText>
            <Text style={{ color: c.subtext }}>→</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.linkRow}
            onPress={openTermsOfService}
            activeOpacity={0.7}
          >
            <ThemedText>Terms of Service</ThemedText>
            <Text style={{ color: c.subtext }}>→</Text>
          </TouchableOpacity>
        </Card>

        {/* App Info */}
        <Card style={styles.section}>
          <ThemedText variant="subtitle" style={styles.sectionTitle}>
            About
          </ThemedText>

          <View style={[styles.infoRow, { borderBottomColor: c.border }]}>
            <ThemedText dim>Version</ThemedText>
            <ThemedText>1.0.0</ThemedText>
          </View>

          <View style={styles.infoRow}>
            <ThemedText dim>Build</ThemedText>
            <ThemedText>1</ThemedText>
          </View>
        </Card>

        {/* Sign Out */}
        <TouchableOpacity
          style={[styles.signOutBtn, { borderColor: c.border }]}
          onPress={signOut}
          activeOpacity={0.7}
        >
          <Text style={[styles.signOutText, { color: c.text }]}>Sign Out</Text>
        </TouchableOpacity>

        {/* Danger Zone */}
        <Card style={[styles.section, styles.dangerSection]}>
          <ThemedText variant="subtitle" style={styles.sectionTitle}>
            Danger Zone
          </ThemedText>

          <ThemedText dim style={styles.dangerDescription}>
            Permanently delete your account and all associated data. This action
            cannot be undone.
          </ThemedText>

          <TouchableOpacity
            style={[styles.deleteBtn, { opacity: deleting ? 0.6 : 1 }]}
            onPress={handleDeleteAccount}
            disabled={deleting}
            activeOpacity={0.7}
          >
            {deleting ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.deleteBtnText}>Delete Account</Text>
            )}
          </TouchableOpacity>
        </Card>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 8 },
  header: { paddingVertical: 16 },

  section: { borderRadius: 16, marginBottom: 16 },
  sectionTitle: { marginBottom: 12 },

  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },

  linkRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },

  signOutBtn: {
    borderWidth: 1.5,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
    marginBottom: 24,
  },
  signOutText: { fontSize: 16, fontWeight: "600" },

  dangerSection: {
    borderColor: Colors.danger + "40",
    borderWidth: 1,
  },
  dangerDescription: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16,
  },
  deleteBtn: {
    backgroundColor: Colors.danger,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  deleteBtnText: {
    color: "#fff",
    fontSize:15,
    fontWeight: "700",
  },

  bottomSpacer: { height: 32 },

  importDescription: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 14,
  },
  importBtn: {
    backgroundColor: "#16a34a",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 8,
  },
  importBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
  importFormats: {
    fontSize: 11,
    textAlign: "center",
  },
});
