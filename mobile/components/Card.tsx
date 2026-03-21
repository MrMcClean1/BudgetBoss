import { View, ViewProps, StyleSheet } from "react-native";
import { Colors } from "@/constants/colors";
import { useColorScheme } from "@/hooks/useColorScheme";

export function Card({ style, children, ...props }: ViewProps) {
  const scheme = useColorScheme();
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: Colors[scheme].surface,
          borderColor: Colors[scheme].border,
          shadowColor: scheme === "light" ? "#000" : "transparent",
        },
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
});
