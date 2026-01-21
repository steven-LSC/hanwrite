import { NextResponse } from "next/server";
import { createId } from "@paralleldrive/cuid2";
import { type Node } from "@xyflow/react";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

const createRootNode = (): Node => ({
  id: createId(),
  position: { x: 0, y: 0 },
  data: {
    label: "",
    parentId: null,
    isNew: true,
  },
});

const getUserId = async (): Promise<string | null> => {
  const user = await getAuthUser();
  return user?.userId ?? null;
};

export async function GET() {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const mindmaps = await prisma.mindmap.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({ mindmaps });
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
      : "New Mind Map";

  const mindmap = await prisma.mindmap.create({
    data: {
      title,
      nodes: [createRootNode()],
      userId,
    },
    select: {
      id: true,
      title: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({ mindmap });
}
