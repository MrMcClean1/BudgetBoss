import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import AppNav from "@/components/app-nav";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  return (
    <div className="min-h-screen bg-gray-50">
      <AppNav userName={session.user.name ?? null} />
      {children}
    </div>
  );
}
