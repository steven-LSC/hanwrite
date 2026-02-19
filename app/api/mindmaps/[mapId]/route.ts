import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/lib/generated/prisma/client";
import { getAuthUser } from "@/lib/auth";

const getUserId = async (): Promise<string | null> => {
  const user = await getAuthUser();
  return user?.userId ?? null;
};

export async function GET(
  _request: Request,
  context: { params: Promise<{ mapId: string }> | { mapId: string } }
) {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Next.js 15: params 可能是 Promise，需要 await
  const params = await Promise.resolve(context.params);
  const mapId = params.mapId;

  const mindmap = await prisma.mindmap.findFirst({
    where: { id: mapId, userId },
    select: {
      id: true,
      title: true,
      nodes: true,
      outline: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!mindmap) {
    return NextResponse.json({ error: "Mindmap not found" }, { status: 404 });
  }

  return NextResponse.json({ mindmap });
}

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

  const body = await request.json().catch(() => ({}));
  const updates: Prisma.MindmapUpdateInput = {};

  if (typeof body?.title === "string") {
    updates.title = body.title.trim();
  }

  if (typeof body?.nodes !== "undefined") {
    if (!Array.isArray(body.nodes)) {
      return NextResponse.json(
        { error: "Invalid nodes payload" },
        { status: 400 }
      );
    }
    updates.nodes = body.nodes;
  }

  if (!updates.title && typeof updates.nodes === "undefined") {
    return NextResponse.json(
      { error: "No updates provided" },
      { status: 400 }
    );
  }

  const existing = await prisma.mindmap.findFirst({
    where: { id: mapId, userId },
    select: { id: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "Mindmap not found" }, { status: 404 });
  }

  const mindmap = await prisma.mindmap.update({
    where: { id: existing.id },
    data: updates,
    select: {
      id: true,
      title: true,
      nodes: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({ mindmap });
}
