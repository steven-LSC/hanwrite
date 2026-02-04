import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

const getUserId = async (): Promise<string | null> => {
  const user = await getAuthUser();
  return user?.userId ?? null;
};

/**
 * Usage Stats API Route
 * 查詢使用者行為統計數據
 */
export async function GET() {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 查詢所有行為記錄
    const behaviors = await prisma.userBehavior.findMany({
      where: { userId },
      select: {
        actionName: true,
        resultData: true,
      },
    });

    // 統計每個 actionName 的次數
    const stats: Record<string, number> = {};
    behaviors.forEach((behavior) => {
      stats[behavior.actionName] = (stats[behavior.actionName] || 0) + 1;
    });

    // 返回所有行為的完整統計數據（即使前端目前不顯示）
    return NextResponse.json({ stats });
  } catch (error) {
    console.error(`[Usage Stats API] 查詢統計數據失敗:`, error);

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
