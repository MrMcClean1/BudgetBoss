import { View, ViewProps } from "react-native";
import { Colors } from "@/constants/colors";
import { useColorScheme } from "@/hooks/useColorScheme";

export function ThemedView({ style, ...props }: ViewProps) {
  const scheme = useColorScheme();
  return (
    <View
      style={[{ backgroundColor: Colors[scheme].background }, style]}
      {...props}
    />
  );
}
