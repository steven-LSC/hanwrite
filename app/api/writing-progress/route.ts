import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

const getUserId = async (): Promise<string | null> => {
  const user = await getAuthUser();
  return user?.userId ?? null;
};

/**
 * Writing Progress API Route
 * 記錄寫作進度
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { writingId, characterCount, type } = await request.json();

    // 驗證輸入
    if (!writingId || typeof writingId !== "string") {
      return NextResponse.json(
        { error: "Invalid writingId" },
        { status: 400 }
      );
    }

    if (typeof characterCount !== "number" || characterCount < 0) {
      return NextResponse.json(
        { error: "Invalid characterCount" },
        { status: 400 }
      );
    }

    if (!type || typeof type !== "string" || !["start", "idle", "interval"].includes(type)) {
      return NextResponse.json(
        { error: "Invalid type. Must be 'start', 'idle', or 'interval'" },
        { status: 400 }
      );
    }

    // 記錄寫作進度
    await prisma.writingProgress.create({
      data: {
        writingId,
        userId,
        characterCount,
        type,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(`[Writing Progress API] 記錄寫作進度失敗:`, error);

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
