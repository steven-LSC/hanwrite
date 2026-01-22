import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { getResponseLanguage, getOpenaiModel } from "@/lib/ai-config";
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
    const openaiModel = getOpenaiModel(cookieValue);

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

    // System prompt：固定指令，說明任務要求
    const systemPrompt = `你是一個韓文寫作助手，專門分析心智圖節點，找出可以進一步展開的節點並產生引導問題。

**任務說明：**
根據提供的心智圖（tree 結構），分析哪些節點還有可以繼續說得更詳細的可能性，並為每個選中的節點產生一個引導問題（prompt）。

**判斷標準：**
- 節點還有可以繼續說得更詳細的可能性
- 例如：如果節點是「購物」，可以問「你當初買了什麼？」
- 例如：如果節點是「사진 찍기」（拍照），可以問「Try describing what appeared in the photo you took.」
- 例如：如果節點是「산책」（散步），可以問「Describe a memorable walk you had during your Busan trip.」
- 例如：如果節點是「자갈치 시장」（札嘎其市場），可以問「What was the most interesting thing you saw at Jagalchi Market?」
- 節點位置不限（可以是任何層級：根節點、子節點、孫節點等）
- 優先選擇那些概念較為抽象或可以進一步具體化的節點

**回傳格式：**
請以 JSON 物件格式回傳，包含一個 "cards" 鍵，值為卡片陣列。每個卡片必須包含以下欄位：

1. **nodeId**：節點的 ID（字串）
2. **title**：節點的標籤文字（韓文，與心智圖中的 label 相同）
3. **description**：引導問題（使用 ${responseLanguage}），幫助使用者進一步展開這個節點

**數量要求：**
- 必須至少回傳 3 個卡片
- 最多數量不限，可以根據心智圖的複雜度選擇更多節點

**語言設定：**
- title 使用韓文（與心智圖中的節點 label 相同）
- description 使用 ${responseLanguage}

**重要要求：**
- description 應該是一個具體的引導問題，幫助使用者思考如何進一步展開這個節點
- description 應該鼓勵使用者提供更多細節、具體的例子或相關的經驗
- 選擇的節點應該是有潛力可以進一步展開的，避免選擇已經非常具體或完整的節點

**範例：**
假設心智圖是關於「부산 여행」（釜山旅行）的主題，且包含節點如「해운대」、「자갈치 시장」、「부모님」、「동생」、「사진 찍기」、「산책」等，應該回傳：

{
  "cards": [
    {
      "nodeId": "node-1",
      "title": "사진 찍기",
      "description": "Try describing what appeared in the photo you took. What was the subject of the photo? What made you want to capture that moment?"
    },
    {
      "nodeId": "node-2",
      "title": "산책",
      "description": "Describe a memorable walk you had during your Busan trip. Where did you walk? What did you see or feel during the walk?"
    },
    {
      "nodeId": "node-3",
      "title": "자갈치 시장",
      "description": "What was the most interesting thing you saw at Jagalchi Market? Describe the atmosphere, the people, or any memorable interactions you had there."
    }
  ]
}

**重要提醒：**
- 必須回傳至少 3 個卡片
- 每個 card 的 nodeId 必須對應到心智圖中實際存在的節點 ID
- title 必須與心智圖中對應節點的 label 完全相同
- description 必須使用 ${responseLanguage}，且應該是一個具體、有幫助的引導問題
- 請確保回傳的是有效的 JSON 格式，不要包含任何額外的文字或說明。`;

    // 將 tree 結構轉換成文字描述，方便 LLM 理解
    const treeDescription = buildTreeDescription(treeNodes, title || "");

    // 呼叫 OpenAI API
    const completion = await openai.chat.completions.create({
      model: openaiModel,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `請根據以下心智圖分析哪些節點可以進一步展開，並產生引導問題：\n\n${title ? `標題：${title}\n\n` : ""}${treeDescription}`,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
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

    return NextResponse.json({ cards });
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
