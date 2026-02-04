import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Log Behavior API Route
 * 記錄使用者行為
 */
export async function POST(request: NextRequest) {
  try {
    const { userId, actionName } = await request.json();

    // 驗證輸入
    if (!userId || typeof userId !== "string") {
      return NextResponse.json(
        { error: "Invalid userId" },
        { status: 400 }
      );
    }

    if (!actionName || typeof actionName !== "string") {
      return NextResponse.json(
        { error: "Invalid actionName" },
        { status: 400 }
      );
    }

    // 記錄行為
    await prisma.userBehavior.create({
      data: {
        userId,
        actionName,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(`[Log Behavior API] 記錄行為失敗:`, error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
