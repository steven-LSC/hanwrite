import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { getResponseLanguage, AI_CONFIGS } from "@/lib/ai-config";
import { convertNodesToTree, TreeNode } from "@/lib/mindmap-utils";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface IdeaPartnerCardResponse {
  nodeId: string;
  title: string;
  description: string;
}

/**
 * Idea Partner API Route
 * 接收心智圖的 nodes 和 title，使用 OpenAI 分析哪些節點可以進一步展開，
 * 並為每個選中的節點產生引導問題
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const { nodes, title } = await request.json();

    // 從 cookie 讀取設定
    const authCookie = request.cookies.get("auth-user");
    const cookieValue = authCookie?.value || "{}";
    const responseLanguage = getResponseLanguage(cookieValue);
    const config = AI_CONFIGS["idea-partner"];

    // 驗證輸入參數
    if (!nodes || !Array.isArray(nodes)) {
      const duration = Date.now() - startTime;
      console.log(`[Idea Partner] 節點驗證失敗，耗時: ${duration}ms`);
      return NextResponse.json(
        { error: "Invalid nodes" },
        { status: 400 }
      );
    }

    // 轉換成 tree 結構
    const treeNodes = convertNodesToTree(nodes);

    // 驗證節點數量
    if (treeNodes.length === 0) {
      const duration = Date.now() - startTime;
      console.log(`[Idea Partner] 節點數量為 0，耗時: ${duration}ms`);
      return NextResponse.json(
        { error: "Mind map must have at least one node" },
        { status: 400 }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      const duration = Date.now() - startTime;
      console.log(`[Idea Partner] API key 未配置，耗時: ${duration}ms`);
      return NextResponse.json(
        { error: "OpenAI API key not configured" },
        { status: 500 }
      );
    }

    // 使用配置檔的設定
    const systemPrompt = config.systemPrompt(responseLanguage);

    // 將 tree 結構轉換成文字描述，方便 LLM 理解
    const treeDescription = buildTreeDescription(treeNodes, title || "");

    // 呼叫 OpenAI API
    const completion = await openai.chat.completions.create({
      model: config.model,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `請根據以下心智圖分析哪些節點可以進一步展開，並產生引導問題：\n\n${title ? `標題：${title}\n\n` : ""}${treeDescription}`,
        },
      ],
      response_format: { type: "json_object" },
      temperature: config.temperature,
    });

    const responseContent = completion.choices[0]?.message?.content;
    if (!responseContent) {
      throw new Error("No response from OpenAI");
    }

    console.log(`[Idea Partner] 回應內容: ${responseContent}`);

    // 解析 JSON 回應
    let parsedResponse: { cards?: IdeaPartnerCardResponse[] };
    try {
      parsedResponse = JSON.parse(responseContent);
    } catch (parseError) {
      console.error("Failed to parse OpenAI response:", responseContent);
      throw new Error("Invalid JSON response from OpenAI");
    }

    // 驗證並回傳結果
    const cards = parsedResponse.cards || [];

    // 基本驗證：確保結果符合格式
    if (!Array.isArray(cards)) {
      throw new Error("Cards must be an array");
    }

    // 驗證卡片數量
    if (cards.length < 3) {
      throw new Error("Must have at least 3 cards");
    }

    // 驗證每個卡片的結構
    for (const card of cards) {
      if (!card.nodeId || typeof card.nodeId !== "string") {
        throw new Error("Invalid card nodeId");
      }
      if (!card.title || typeof card.title !== "string") {
        throw new Error("Invalid card title");
      }
      if (!card.description || typeof card.description !== "string") {
        throw new Error("Invalid card description");
      }

      // 驗證 nodeId 是否存在於 treeNodes 中
      const nodeExists = treeNodes.some((node) => node.id === card.nodeId);
      if (!nodeExists) {
        throw new Error(`Node with id ${card.nodeId} does not exist in the mind map`);
      }
    }

    const duration = Date.now() - startTime;
    console.log(`[Idea Partner] 生成完成，耗時: ${duration}ms`);

    return NextResponse.json({ cards, duration });
  } catch (error) {
    console.error("Idea Partner API error:", error);

    if (error instanceof Error) {
      const duration = Date.now() - startTime;
      console.log(`[Idea Partner] 發生錯誤: ${error.message}，耗時: ${duration}ms`);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    const duration = Date.now() - startTime;
    console.log(`[Idea Partner] 發生錯誤，耗時: ${duration}ms`);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * 將 tree 結構轉換成文字描述
 */
function buildTreeDescription(treeNodes: TreeNode[], title: string): string {
  if (treeNodes.length === 0) {
    return "心智圖為空";
  }

  // 找出根節點
  const rootNode = treeNodes.find((node) => node.parentId === null);
  if (!rootNode) {
    return "找不到根節點";
  }

  // 建立父子關係映射
  const childrenMap = new Map<string, TreeNode[]>();
  treeNodes.forEach((node) => {
    if (node.parentId) {
      const children = childrenMap.get(node.parentId) || [];
      children.push(node);
      childrenMap.set(node.parentId, children);
    }
  });

  // 遞迴建立樹狀文字描述
  function buildNodeDescription(
    node: TreeNode,
    level: number = 0
  ): string {
    const indent = "  ".repeat(level);
    let description = `${indent}- ${node.label} (id: ${node.id})\n`;

    const children = childrenMap.get(node.id) || [];
    children.forEach((child) => {
      description += buildNodeDescription(child, level + 1);
    });

    return description;
  }

  let result = `心智圖結構：\n${buildNodeDescription(rootNode)}`;
  result += `\n總共 ${treeNodes.length} 個節點。`;

  return result;
}
