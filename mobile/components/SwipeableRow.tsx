import { useRef } from "react";
import { Animated, TouchableOpacity, StyleSheet, Text, View } from "react-native";
import Swipeable from "react-native-gesture-handler/Swipeable";
import { Colors } from "@/constants/colors";

interface Action {
  label: string;
  color: string;
  onPress: () => void;
}

interface SwipeableRowProps {
  children: React.ReactNode;
  rightActions?: Action[];
  scheme: "light" | "dark";
}

export function SwipeableRow({ children, rightActions, scheme: _scheme }: SwipeableRowProps) {
  const swipeableRef = useRef<Swipeable>(null);

  const close = () => swipeableRef.current?.close();

  const renderRightActions = (
    _progress: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>
  ) => {
    if (!rightActions?.length) return null;

    const totalWidth = rightActions.length * ACTION_WIDTH;
    const translateX = dragX.interpolate({
      inputRange: [-totalWidth, 0],
      outputRange: [0, totalWidth],
      extrapolate: "clamp",
    });

    return (
      <Animated.View style={[styles.actionsContainer, { transform: [{ translateX }] }]}>
        {rightActions.map((action, i) => (
          <TouchableOpacity
            key={i}
            style={[styles.action, { backgroundColor: action.color, width: ACTION_WIDTH }]}
            onPress={() => {
              close();
              action.onPress();
            }}
            activeOpacity={0.85}
          >
            <Text style={styles.actionLabel}>{action.label}</Text>
          </TouchableOpacity>
        ))}
      </Animated.View>
    );
  };

  return (
    <Swipeable
      ref={swipeableRef}
      renderRightActions={rightActions?.length ? renderRightActions : undefined}
      friction={2}
      overshootRight={false}
      rightThreshold={ACTION_WIDTH * 0.6}
      containerStyle={styles.container}
    >
      {children}
    </Swipeable>
  );
}

const ACTION_WIDTH = 80;

const styles = StyleSheet.create({
  container: { overflow: "hidden" },
  actionsContainer: {
    flexDirection: "row",
  },
  action: {
    justifyContent: "center",
    alignItems: "center",
    height: "100%",
  },
  actionLabel: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
  },
});
