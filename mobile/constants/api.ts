import Constants from "expo-constants";

// Production API URL (Vercel deployment)
const PRODUCTION_URL = "https://budget-boss-roan.vercel.app";

// Override via EXPO_PUBLIC_API_URL env var (e.g. in .env.local)
// Android emulator: use 10.0.2.2 to reach host machine localhost
// iOS simulator:    localhost works fine
// Real device:      set to your machine's LAN IP, e.g. http://192.168.1.10:3000
const envUrl = (Constants.expoConfig?.extra as Record<string, string> | undefined)?.apiUrl;

// Use environment variable if set, otherwise use production URL
export const API_URL = process.env.EXPO_PUBLIC_API_URL || envUrl || PRODUCTION_URL;
