import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const since = req.nextUrl.searchParams.get("since");
  const sinceDate = since ? new Date(since) : null;

  const logs = await prisma.activityLog.findMany({
    where: sinceDate && !Number.isNaN(sinceDate.getTime()) ? { createdAt: { gt: sinceDate } } : undefined,
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json({ logs });
}
