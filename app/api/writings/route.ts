import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

const getUserId = async (): Promise<string | null> => {
  const user = await getAuthUser();
  return user?.userId ?? null;
};

export async function GET() {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const writings = await prisma.writing.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({ writings });
}

export async function POST(request: Request) {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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

  const writing = await prisma.writing.create({
    data: {
      title,
      content,
      characterCount,
      userId,
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
