import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

const getUserId = async (): Promise<string | null> => {
  const user = await getAuthUser();
  return user?.userId ?? null;
};

export async function GET(
  _request: Request,
  context: { params: Promise<{ writingId: string }> | { writingId: string } }
) {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Next.js 15: params 可能是 Promise，需要 await
  const params = await Promise.resolve(context.params);
  const writingId = params.writingId;

  const writing = await prisma.writing.findFirst({
    where: { id: writingId, userId },
    select: {
      id: true,
      title: true,
      content: true,
      characterCount: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!writing) {
    return NextResponse.json({ error: "Writing not found" }, { status: 404 });
  }

  return NextResponse.json({ writing });
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ writingId: string }> | { writingId: string } }
) {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Next.js 15: params 可能是 Promise，需要 await
  const params = await Promise.resolve(context.params);
  const writingId = params.writingId;

  const body = await request.json().catch(() => ({}));
  const title =
    typeof body?.title === "string" && body.title.trim()
      ? body.title.trim()
      : "Untitled";
  const content = typeof body?.content === "string" ? body.content : "";

  // 驗證 title 和 content 都不為空
  if (!title.trim() || !content.trim()) {
    return NextResponse.json(
      { error: "Title and content are required" },
      { status: 400 }
    );
  }

  const characterCount = content.length;

  // 檢查文章是否存在且屬於當前使用者
  const existing = await prisma.writing.findFirst({
    where: { id: writingId, userId },
    select: { id: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "Writing not found" }, { status: 404 });
  }

  // 更新文章
  const writing = await prisma.writing.update({
    where: { id: existing.id },
    data: {
      title,
      content,
      characterCount,
    },
    select: {
      id: true,
      title: true,
      content: true,
      characterCount: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({ writing });
}
