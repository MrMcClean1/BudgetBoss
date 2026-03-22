import * as SecureStore from "expo-secure-store";
import { API_URL } from "@/constants/api";

const TOKEN_KEY = "budgetboss_token";

// ── Token storage ──────────────────────────────────────────────────────────────

export async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function setToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function clearToken(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

// ── HTTP client ────────────────────────────────────────────────────────────────

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

async function request<T>(
  method: HttpMethod,
  path: string,
  body?: unknown,
  requiresAuth = true,
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (requiresAuth) {
    const token = await getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new ApiError(res.status, err?.error ?? "Request failed");
  }

  // 204 No Content
  if (res.status === 204) return undefined as T;

  return res.json() as Promise<T>;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// ── Auth ───────────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  xp: number;
  level: number;
  streakDays: number;
}

export interface SigninResponse {
  token: string;
  user: AuthUser;
}

export async function signin(email: string, password: string): Promise<SigninResponse> {
  return request<SigninResponse>("POST", "/api/mobile/signin", { email, password }, false);
}

export async function register(
  name: string,
  email: string,
  password: string,
): Promise<{ id: string; email: string; name: string }> {
  return request("POST", "/api/auth/register", { name, email, password }, false);
}

// ── Accounts ───────────────────────────────────────────────────────────────────

export interface BankAccount {
  id: string;
  name: string;
  type: "CHECKING" | "SAVINGS" | "CREDIT_CARD" | "CASH" | "INVESTMENT";
  balance: number;
  currency: string;
  isActive: boolean;
  transactionCount: number;
}

export async function getAccounts(): Promise<{ accounts: BankAccount[]; totalBalance: number }> {
  return request("GET", "/api/accounts");
}

// ── Transactions ───────────────────────────────────────────────────────────────

export interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: "INCOME" | "EXPENSE" | "TRANSFER";
  categoryId: string | null;
  categoryName: string | null;
  bankAccountId: string | null;
  bankAccountName: string | null;
  notes: string | null;
  isReviewed: boolean;
}

export interface TransactionListResponse {
  data: Transaction[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export async function getTransactions(
  page = 1,
  limit = 20,
): Promise<TransactionListResponse> {
  return request("GET", `/api/transactions?page=${page}&limit=${limit}`);
}

// ── Budgets ────────────────────────────────────────────────────────────────────

export interface Budget {
  id: string;
  name: string;
  amount: number;
  period: "WEEKLY" | "MONTHLY" | "QUARTERLY" | "YEARLY";
  categoryId: string | null;
  categoryName: string | null;
  spent: number;
  remaining: number;
  percentUsed: number;
  isActive: boolean;
}

export async function getBudgets(): Promise<{ budgets: Budget[] }> {
  return request("GET", "/api/budgets");
}

// ── Savings Goals ──────────────────────────────────────────────────────────────

export interface SavingsGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string | null;
  icon: string | null;
  color: string | null;
  isCompleted: boolean;
  percentComplete: number;
}

export async function getSavingsGoals(): Promise<SavingsGoal[]> {
  return request("GET", "/api/savings-goals");
}

// ── Account creation ──────────────────────────────────────────────────────────

export async function createAccount(data: {
  name: string;
  type: BankAccount["type"];
  currency?: string;
}): Promise<BankAccount> {
  return request("POST", "/api/accounts", data);
}

// ── Budget creation ───────────────────────────────────────────────────────────

export async function createBudget(data: {
  name: string;
  amount: number;
  period: Budget["period"];
  startDate: string;
}): Promise<Budget> {
  return request("POST", "/api/budgets", data);
}

// ── Savings goal creation ─────────────────────────────────────────────────────

export async function createSavingsGoal(data: {
  name: string;
  targetAmount: number;
  currentAmount?: number;
  targetDate?: string | null;
  icon?: string | null;
  color?: string | null;
}): Promise<SavingsGoal> {
  return request("POST", "/api/savings-goals", data);
}

// ── Onboarding ────────────────────────────────────────────────────────────────

export interface OnboardingStatus {
  hasAccount: boolean;
  hasBudget: boolean;
  hasGoal: boolean;
  completed: boolean;
}

export async function getOnboardingStatus(): Promise<OnboardingStatus> {
  return request("GET", "/api/mobile/onboarding-status");
}

// ── Push tokens ───────────────────────────────────────────────────────────────

export async function registerPushToken(token: string, platform: "ios" | "android"): Promise<void> {
  await request("POST", "/api/mobile/push-token", { token, platform });
}

export async function unregisterPushToken(token: string): Promise<void> {
  await request("DELETE", "/api/mobile/push-token", { token });
}

// ── Gamification ───────────────────────────────────────────────────────────────

export interface GamificationData {
  user: { xp: number; level: number; streakDays: number };
  badges: Array<{
    id: string;
    key: string;
    name: string;
    description: string;
    icon: string;
    rarity: string;
    xpReward: number;
    earned: boolean;
    earnedAt: string | null;
  }>;
}

export async function getGamification(): Promise<GamificationData> {
  return request("GET", "/api/gamification/badges");
}

// ── Account Deletion ──────────────────────────────────────────────────────────

export interface DeletionPreview {
  message: string;
  dataToBeDeleted: {
    transactions: number;
    bankAccounts: number;
    budgets: number;
    savingsGoals: number;
    badges: number;
  };
  warning: string;
}

export async function previewAccountDeletion(): Promise<DeletionPreview> {
  return request("POST", "/api/mobile/delete-account");
}

export async function deleteAccount(): Promise<{ success: boolean; message: string }> {
  return request("DELETE", "/api/mobile/delete-account");
}
