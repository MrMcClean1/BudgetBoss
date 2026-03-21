import Constants from "expo-constants";

// Override via EXPO_PUBLIC_API_URL env var (e.g. in .env.local)
// Android emulator: use 10.0.2.2 to reach host machine localhost
// iOS simulator:    localhost works fine
// Real device:      set to your machine's LAN IP, e.g. http://192.168.1.10:3000
const envUrl = (Constants.expoConfig?.extra as Record<string, string> | undefined)?.apiUrl;

export const API_URL = process.env.EXPO_PUBLIC_API_URL || envUrl || "http://localhost:3000";
