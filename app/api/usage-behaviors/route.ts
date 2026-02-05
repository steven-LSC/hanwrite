import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

const getUserId = async (): Promise<string | null> => {
  const user = await getAuthUser();
  return user?.userId ?? null;
};

/**
 * Feature 到 actionNames 的映射
 */
const FEATURE_ACTION_MAP: Record<string, string[]> = {
  "expansion-hints": [
    "expansion-hint-generate",
    "expansion-hint-try",
    "expansion-hint-discard",
  ],
  "idea-partner": [
    "idea-partner-scan",
    "idea-partner-add-block",
    "idea-partner-skip",
  ],
  "outline-generator": [
    "outline-generator-generate",
    "outline-generator-save",
  ],
  "paraphrase": [
    "paraphrase-generate",
    "paraphrase-apply",
    "paraphrase-discard",
    "paraphrase-no-change-needed",
  ],
  "expression-builder": [
    "expression-builder-analyze",
  ],
  "proficiency-report": [
    "proficiency-report-generate",
    "proficiency-report-open",
  ],
  "error-detection": [
    "error-detection-analyze",
    "error-detection-apply",
    "error-detection-skip",
  ],
  "grammar-practice": [
    "grammar-practice-generate",
    "grammar-practice-check",
    "grammar-practice-cancel",
  ],
  "reverse-outlining": [
    "reverse-outlining-generate",
  ],
};

/**
 * Usage Behaviors API Route
 * 查詢特定功能的詳細行為記錄
 */
export async function GET(request: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const feature = searchParams.get("feature");

    if (!feature) {
      return NextResponse.json(
        { error: "Feature parameter is required" },
        { status: 400 }
      );
    }

    // 取得該功能對應的 actionNames
    const actionNames = FEATURE_ACTION_MAP[feature];
    if (!actionNames || actionNames.length === 0) {
      return NextResponse.json(
        { error: `Unknown feature: ${feature}` },
        { status: 400 }
      );
    }

    // 查詢所有相關的行為記錄
    const behaviors = await prisma.userBehavior.findMany({
      where: {
        userId,
        actionName: {
          in: actionNames,
        },
      },
      select: {
        id: true,
        actionName: true,
        resultData: true,
        timestamp: true,
      },
      orderBy: {
        timestamp: "asc",
      },
    });

    return NextResponse.json({ behaviors });
  } catch (error) {
    console.error(`[Usage Behaviors API] 查詢行為記錄失敗:`, error);

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
