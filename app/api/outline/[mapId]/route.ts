import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { OutlineData } from "@/lib/types";

const getUserId = async (): Promise<string | null> => {
  const user = await getAuthUser();
  return user?.userId ?? null;
};

/**
 * 更新 outline 欄位
 * 驗證使用者權限後，直接更新 Mindmap 的 outline 欄位
 */
export async function PUT(
  request: Request,
  context: { params: Promise<{ mapId: string }> | { mapId: string } }
) {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Next.js 15: params 可能是 Promise，需要 await
  const params = await Promise.resolve(context.params);
  const mapId = params.mapId;

  // 檢查 mindmap 是否存在且屬於該使用者
  const existing = await prisma.mindmap.findFirst({
    where: { id: mapId, userId },
    select: { id: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "Mindmap not found" }, { status: 404 });
  }

  // 解析請求 body
  const body = await request.json().catch(() => ({}));

  // 驗證 outline 資料格式
  if (!body.outline || typeof body.outline !== "object") {
    return NextResponse.json(
      { error: "Invalid outline payload" },
      { status: 400 }
    );
  }

  const outline = body.outline as OutlineData;

  // 基本驗證：確保有 title 和 sections
  if (
    !outline.title ||
    typeof outline.title !== "string" ||
    !Array.isArray(outline.sections)
  ) {
    return NextResponse.json(
      { error: "Invalid outline format" },
      { status: 400 }
    );
  }

  // 更新 outline 欄位
  // 使用 JSON.parse/stringify 確保類型符合 Prisma 的 JSON 欄位要求
  const mindmap = await prisma.mindmap.update({
    where: { id: existing.id },
    data: { outline: JSON.parse(JSON.stringify(outline)) as any },
    select: {
      id: true,
      title: true,
      nodes: true,
      outline: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({ mindmap });
}
