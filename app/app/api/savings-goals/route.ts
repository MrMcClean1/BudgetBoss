import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canCreateSavingsGoal } from "@/lib/server/feature-gates";
import { z } from "zod";

const CreateSchema = z.object({
  name: z.string().min(1),
  targetAmount: z.number().positive(),
  currentAmount: z.number().min(0).optional(),
  targetDate: z.string().nullable().optional(),
  icon: z.string().nullable().optional(),
  color: z.string().nullable().optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  const goals = await prisma.savingsGoal.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(
    goals.map((g) => {
      const target = Number(g.targetAmount);
      const current = Number(g.currentAmount);
      return {
        id: g.id,
        name: g.name,
        targetAmount: target,
        currentAmount: current,
        targetDate: g.targetDate?.toISOString() ?? null,
        icon: g.icon,
        color: g.color,
        isCompleted: g.isCompleted,
        percentComplete: target > 0 ? Math.min((current / target) * 100, 100) : 0,
        createdAt: g.createdAt.toISOString(),
      };
    })
  );
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { name, targetAmount, currentAmount, targetDate, icon, color } = parsed.data;

  const featureCheck = await canCreateSavingsGoal(userId);
  if (!featureCheck.allowed) {
    return NextResponse.json(
      { error: featureCheck.reason, upgradeRequired: featureCheck.upgradeRequired },
      { status: 403 }
    );
  }

  const goal = await prisma.savingsGoal.create({
    data: {
      userId,
      name,
      targetAmount,
      currentAmount: currentAmount ?? 0,
      targetDate: targetDate ? new Date(targetDate) : null,
      icon: icon ?? null,
      color: color ?? null,
    },
  });

  const target = Number(goal.targetAmount);
  const current = Number(goal.currentAmount);
  return NextResponse.json(
    {
      id: goal.id,
      name: goal.name,
      targetAmount: target,
      currentAmount: current,
      targetDate: goal.targetDate?.toISOString() ?? null,
      icon: goal.icon,
      color: goal.color,
      isCompleted: goal.isCompleted,
      percentComplete: target > 0 ? Math.min((current / target) * 100, 100) : 0,
      createdAt: goal.createdAt.toISOString(),
    },
    { status: 201 }
  );
}
