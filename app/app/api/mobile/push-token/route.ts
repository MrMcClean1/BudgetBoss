import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const Schema = z.object({
  token: z.string().min(1),
  platform: z.enum(["ios", "android"]),
});

// POST /api/mobile/push-token — register or refresh a push token for the current user
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

  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { token, platform } = parsed.data;

  await prisma.pushToken.upsert({
    where: { userId_token: { userId, token } },
    update: { platform, updatedAt: new Date() },
    create: { userId, token, platform },
  });

  return NextResponse.json({ ok: true });
}

// DELETE /api/mobile/push-token — remove a push token (on sign-out)
export async function DELETE(request: Request) {
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

  const parsed = z.object({ token: z.string().min(1) }).safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "token required" }, { status: 400 });
  }

  await prisma.pushToken.deleteMany({
    where: { userId, token: parsed.data.token },
  });

  return NextResponse.json({ ok: true });
}
