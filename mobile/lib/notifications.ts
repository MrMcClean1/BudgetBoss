import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";
import { registerPushToken, unregisterPushToken } from "@/lib/api";

// ── Notification handler (foreground) ─────────────────────────────────────────

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// ── Permission + token registration ──────────────────────────────────────────

export async function requestPushPermissions(): Promise<boolean> {
  if (!Device.isDevice) {
    // Simulators can't receive push notifications
    return false;
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;

  if (existing !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  return finalStatus === "granted";
}

/**
 * Register the device for Expo push notifications and store the token on the
 * backend. Call this after the user grants permission.
 */
export async function registerForPushNotifications(): Promise<string | null> {
  const granted = await requestPushPermissions();
  if (!granted) return null;

  // Android: create a notification channel
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "BudgetBoss",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#6C5CE7",
    });
  }

  try {
    const tokenData = await Notifications.getExpoPushTokenAsync();
    const token = tokenData.data;
    const platform = Platform.OS === "ios" ? "ios" : "android";
    await registerPushToken(token, platform);
    return token;
  } catch {
    return null;
  }
}

/**
 * Unregister the device push token. Call on sign-out.
 */
export async function unregisterForPushNotifications(): Promise<void> {
  try {
    const tokenData = await Notifications.getExpoPushTokenAsync();
    await unregisterPushToken(tokenData.data);
  } catch {
    // Silently fail — token may already be gone or device not registered
  }
}

// ── Local notification scheduling ────────────────────────────────────────────

/** Cancel all previously scheduled habit-loop notifications then reschedule. */
export async function scheduleHabitNotifications(): Promise<void> {
  // Cancel existing habit-loop notifications (tagged via identifier prefix)
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const n of scheduled) {
    if (n.identifier.startsWith("habit:")) {
      await Notifications.cancelScheduledNotificationAsync(n.identifier);
    }
  }

  // Daily spending check-in — 9 PM local time every day
  await Notifications.scheduleNotificationAsync({
    identifier: "habit:daily-checkin",
    content: {
      title: "Daily money check-in 💰",
      body: "Take 30 seconds to review today's spending and stay on track.",
      data: { type: "daily_checkin" },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: 21,
      minute: 0,
    },
  });

  // Streak reminder — 8 PM daily (reminds before check-in cutoff)
  await Notifications.scheduleNotificationAsync({
    identifier: "habit:streak-reminder",
    content: {
      title: "Keep your streak alive 🔥",
      body: "Log in to BudgetBoss today to keep your savings streak going!",
      data: { type: "streak_reminder" },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: 20,
      minute: 0,
    },
  });

  // Weekly summary — Sunday at 7 PM
  await Notifications.scheduleNotificationAsync({
    identifier: "habit:weekly-summary",
    content: {
      title: "Your weekly money summary 📊",
      body: "See how you did this week — budgets, savings, and your progress toward goals.",
      data: { type: "weekly_summary" },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
      weekday: 1, // Sunday (1=Sunday in Expo)
      hour: 19,
      minute: 0,
    },
  });
}

/** Send an immediate local notification celebrating a goal milestone. */
export async function celebrateGoalMilestone(goalName: string, percent: number): Promise<void> {
  const milestone = percent >= 100 ? "completed" : `${percent}% funded`;
  await Notifications.scheduleNotificationAsync({
    identifier: `habit:goal-${Date.now()}`,
    content: {
      title: "Goal milestone! 🎉",
      body: `"${goalName}" is ${milestone}. Keep up the amazing work!`,
      data: { type: "goal_milestone" },
    },
    trigger: null, // fire immediately
  });
}

/** Cancel all habit notifications (e.g. when user signs out). */
export async function cancelHabitNotifications(): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const n of scheduled) {
    if (n.identifier.startsWith("habit:")) {
      await Notifications.cancelScheduledNotificationAsync(n.identifier);
    }
  }
}
