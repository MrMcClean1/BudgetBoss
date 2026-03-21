import { Text, TextProps, StyleSheet } from "react-native";
import { Colors } from "@/constants/colors";
import { useColorScheme } from "@/hooks/useColorScheme";

interface ThemedTextProps extends TextProps {
  variant?: "title" | "subtitle" | "body" | "caption" | "label";
  dim?: boolean;
}

export function ThemedText({ style, variant = "body", dim = false, ...props }: ThemedTextProps) {
  const scheme = useColorScheme();
  const color = dim ? Colors[scheme].subtext : Colors[scheme].text;
  return (
    <Text
      style={[styles[variant], { color }, style]}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 24, fontWeight: "700", lineHeight: 32 },
  subtitle: { fontSize: 18, fontWeight: "600", lineHeight: 26 },
  body: { fontSize: 15, fontWeight: "400", lineHeight: 22 },
  caption: { fontSize: 12, fontWeight: "400", lineHeight: 18 },
  label: { fontSize: 13, fontWeight: "500", lineHeight: 20 },
});
