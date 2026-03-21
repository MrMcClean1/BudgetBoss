import React, { createContext, useContext, useEffect, useState } from "react";
import * as SecureStore from "expo-secure-store";
import { signin as apiSignin, register as apiRegister, getToken, setToken, clearToken, AuthUser } from "@/lib/api";

const ONBOARDING_KEY = "budgetboss_onboarding_done";

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  onboardingComplete: boolean;
}

interface AuthContextValue extends AuthState {
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  markOnboardingComplete: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: null,
    isLoading: true,
    onboardingComplete: false,
  });

  useEffect(() => {
    Promise.all([getToken(), SecureStore.getItemAsync(ONBOARDING_KEY)]).then(
      ([token, onboardingDone]) => {
        setState({
          user: null,
          token,
          isLoading: false,
          onboardingComplete: onboardingDone === "true",
        });
      }
    );
  }, []);

  const signIn = async (email: string, password: string) => {
    const res = await apiSignin(email, password);
    await setToken(res.token);
    const onboardingDone = await SecureStore.getItemAsync(ONBOARDING_KEY);
    setState({
      user: res.user,
      token: res.token,
      isLoading: false,
      onboardingComplete: onboardingDone === "true",
    });
  };

  const signUp = async (name: string, email: string, password: string) => {
    await apiRegister(name, email, password);
    // Clear onboarding flag so new users always go through the wizard
    await SecureStore.deleteItemAsync(ONBOARDING_KEY);
    await signIn(email, password);
  };

  const signOut = async () => {
    await clearToken();
    setState({ user: null, token: null, isLoading: false, onboardingComplete: false });
  };

  const markOnboardingComplete = async () => {
    await SecureStore.setItemAsync(ONBOARDING_KEY, "true");
    setState((s) => ({ ...s, onboardingComplete: true }));
  };

  return (
    <AuthContext.Provider value={{ ...state, signIn, signUp, signOut, markOnboardingComplete }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
