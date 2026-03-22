import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import ImportClient from "./import-client";

export const metadata = { title: "Import Transactions – BudgetBoss" };

export default async function ImportPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return <ImportClient />;
}
