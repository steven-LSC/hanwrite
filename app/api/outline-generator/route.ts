import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { OutlineSection } from "@/lib/types";
import { getResponseLanguage, AI_CONFIGS } from "@/lib/ai-config";
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
    const config = AI_CONFIGS["outline-generator"];

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

    // 使用配置檔的設定
    const systemPrompt = config.systemPrompt(responseLanguage);

    // 將 tree 結構轉換成文字描述，方便 LLM 理解
    const treeDescription = buildTreeDescription(treeNodes, title);

    // 呼叫 OpenAI API
    const completion = await openai.chat.completions.create({
      model: config.model,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `請根據以下心智圖生成文章大綱：\n\n標題：${title}\n\n${treeDescription}`,
        },
      ],
      response_format: { type: "json_object" },
      temperature: config.temperature,
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

    return NextResponse.json({ sections, duration });
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
