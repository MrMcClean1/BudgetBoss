import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const RegisterSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(8).max(100),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = RegisterSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { name, email, password } = parsed.data;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "Email already registered" },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { name, email, passwordHash },
      select: { id: true, email: true, name: true },
    });

    // Seed default categories for new user
    await seedDefaultCategories(user.id);

    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

async function seedDefaultCategories(userId: string) {
  const defaults = [
    { name: "Food & Drink", icon: "🍔", color: "#ef4444" },
    { name: "Shopping", icon: "🛍️", color: "#f97316" },
    { name: "Transport", icon: "🚗", color: "#eab308" },
    { name: "Housing", icon: "🏠", color: "#22c55e" },
    { name: "Entertainment", icon: "🎬", color: "#3b82f6" },
    { name: "Health", icon: "💊", color: "#8b5cf6" },
    { name: "Income", icon: "💰", color: "#10b981" },
    { name: "Savings", icon: "🏦", color: "#06b6d4" },
    { name: "Utilities", icon: "⚡", color: "#6b7280" },
    { name: "Other", icon: "📦", color: "#9ca3af" },
  ];

  await prisma.category.createMany({
    data: defaults.map((c) => ({ ...c, userId, isDefault: true })),
  });
}
