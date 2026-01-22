import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { OutlineSection } from "@/lib/types";
import { getResponseLanguage, getOpenaiModel } from "@/lib/ai-config";
import { convertNodesToTree, TreeNode } from "@/lib/mindmap-utils";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Outline Generator API Route
 * 接收心智圖的 title 和 nodes，使用 OpenAI 生成文章大綱
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const { title, nodes } = await request.json();

    // 從 cookie 讀取設定
    const authCookie = request.cookies.get("auth-user");
    const cookieValue = authCookie?.value || "{}";
    const responseLanguage = getResponseLanguage(cookieValue);
    const openaiModel = getOpenaiModel(cookieValue);

    // 驗證輸入參數
    if (!title || typeof title !== "string" || !title.trim()) {
      const duration = Date.now() - startTime;
      console.log(`[Outline Generator] 標題驗證失敗，耗時: ${duration}ms`);
      return NextResponse.json(
        { error: "Invalid title" },
        { status: 400 }
      );
    }

    if (!nodes || !Array.isArray(nodes)) {
      const duration = Date.now() - startTime;
      console.log(`[Outline Generator] 節點驗證失敗，耗時: ${duration}ms`);
      return NextResponse.json(
        { error: "Invalid nodes" },
        { status: 400 }
      );
    }

    // 轉換成 tree 結構
    const treeNodes = convertNodesToTree(nodes);

    // 驗證節點數量 >= 10
    if (treeNodes.length < 10) {
      const duration = Date.now() - startTime;
      console.log(
        `[Outline Generator] 節點數量不足（${treeNodes.length} < 10），耗時: ${duration}ms`
      );
      return NextResponse.json(
        { error: "Mind map must have at least 10 nodes" },
        { status: 400 }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      const duration = Date.now() - startTime;
      console.log(`[Outline Generator] API key 未配置，耗時: ${duration}ms`);
      return NextResponse.json(
        { error: "OpenAI API key not configured" },
        { status: 500 }
      );
    }

    // System prompt：固定指令，說明任務要求
    const systemPrompt = `你是一個韓文寫作助手，專門根據心智圖生成文章大綱。

**任務說明：**
根據提供的心智圖（tree 結構），生成一篇韓文文章的大綱。大綱應該包含三個區塊：introduction（開頭）、body（主體）、conclusion（結尾）。

**心智圖結構說明：**
- 每個節點包含 id、label（節點文字）和 parentId（父節點 ID，null 表示根節點）
- 根節點通常是文章的主題
- 子節點是相關的概念或細節

**回傳格式：**
請以 JSON 物件格式回傳，包含一個 "sections" 鍵，值為區塊陣列。每個區塊必須包含以下欄位：

1. **type**：區塊類型，必須是 "introduction"、"body" 或 "conclusion"
2. **description**：描述性指引（使用 ${responseLanguage}），說明這個區塊應該往哪個方向寫，提供寫作建議
3. **exampleSentence**：範例句子（韓文），必須是完整的韓文句子，且必須包含心智圖上的節點內容

**語言設定：**
- description 使用 ${responseLanguage}
- exampleSentence 使用韓文

**重要要求：**
- exampleSentence 必須引用心智圖中的節點內容（節點的文字），不能憑空創造
- exampleSentence 應該是一個完整、自然的韓文句子
- description 應該提供具體的寫作方向指引，幫助使用者知道如何展開這個段落

**範例：**
假設心智圖是關於「부산 여행」（釜山旅行）的主題，且包含節點如「해운대」、「자갈치 시장」、「부모님」、「동생」等，應該回傳：

{
  "sections": [
    {
      "type": "introduction",
      "description": "Describe who went on the trip, when it happened, and why you decided to go. Mention the people involved and the purpose of the trip.",
      "exampleSentence": "나는 부모님과 동생과 함께 여름방학에 휴식을 위해 부산 여행을 떠났다."
    },
    {
      "type": "body",
      "description": "Describe what you did during the trip, what you saw, and how you felt. Include specific places visited and activities done.",
      "exampleSentence": "해운대에서 산책을 하며 파도를 바라보니 마음이 편안해졌고, 자갈치 시장에서 신선한 해산물을 쇼핑하며 즐거운 시간을 보냈다."
    },
    {
      "type": "conclusion",
      "description": "Summarize what you learned or how the trip changed your feelings. Reflect on the experience and express your thoughts.",
      "exampleSentence": "부산 여행을 통해 부모님과 동생과의 관계가 더욱 가까워졌음을 느꼈다."
    }
  ]
}

**重要提醒：**
- 必須回傳三個區塊：introduction、body、conclusion
- 每個區塊的 exampleSentence 必須包含心智圖中的節點內容
- exampleSentence 必須是完整的韓文句子
- 請確保回傳的是有效的 JSON 格式，不要包含任何額外的文字或說明。`;

    // 將 tree 結構轉換成文字描述，方便 LLM 理解
    const treeDescription = buildTreeDescription(treeNodes, title);

    // 呼叫 OpenAI API
    const completion = await openai.chat.completions.create({
      model: openaiModel,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `請根據以下心智圖生成文章大綱：\n\n標題：${title}\n\n${treeDescription}`,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    const responseContent = completion.choices[0]?.message?.content;
    if (!responseContent) {
      throw new Error("No response from OpenAI");
    }

    console.log(`[Outline Generator] 回應內容: ${responseContent}`);

    // 解析 JSON 回應
    let parsedResponse: { sections?: OutlineSection[] };
    try {
      parsedResponse = JSON.parse(responseContent);
    } catch (parseError) {
      console.error("Failed to parse OpenAI response:", responseContent);
      throw new Error("Invalid JSON response from OpenAI");
    }

    // 驗證並回傳結果
    const sections = parsedResponse.sections || [];

    // 基本驗證：確保結果符合格式
    if (!Array.isArray(sections)) {
      throw new Error("Sections must be an array");
    }

    // 驗證區塊數量
    if (sections.length !== 3) {
      throw new Error("Must have exactly 3 sections");
    }

    // 驗證每個區塊的結構
    for (const section of sections) {
      if (
        !section.type ||
        !["introduction", "body", "conclusion"].includes(section.type)
      ) {
        throw new Error("Invalid section type");
      }
      if (!section.description || typeof section.description !== "string") {
        throw new Error("Invalid section description");
      }
      if (
        !section.exampleSentence ||
        typeof section.exampleSentence !== "string"
      ) {
        throw new Error("exampleSentence must be a string");
      }
    }

    const duration = Date.now() - startTime;
    console.log(`[Outline Generator] 生成完成，耗時: ${duration}ms`);

    return NextResponse.json({ sections });
  } catch (error) {
    console.error("Outline Generator API error:", error);

    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    const duration = Date.now() - startTime;
    console.log(`[Outline Generator] 發生錯誤，耗時: ${duration}ms`);

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
    let description = `${indent}- ${node.label}\n`;

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
