import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { ProficiencyReport } from "@/lib/types";
import { getResponseLanguage, AI_CONFIGS } from "@/lib/ai-config";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Proficiency Report API Route
 * 接收韓語寫作文本，使用 OpenAI 根據 TOPIK 寫作評分標準分析並回傳結構化結果
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const { title, content } = await request.json();

    // 從 cookie 讀取設定
    const authCookie = request.cookies.get("auth-user");
    const cookieValue = authCookie?.value || "{}";
    const responseLanguage = getResponseLanguage(cookieValue);
    const config = AI_CONFIGS["proficiency-report"];

    // 驗證輸入
    if (!title || typeof title !== "string" || !title.trim()) {
      const duration = Date.now() - startTime;
      console.log(`[Proficiency Report] 輸入驗證失敗：標題無效，耗時: ${duration}ms`);
      return NextResponse.json(
        { error: "Invalid title" },
        { status: 400 }
      );
    }

    if (!content || typeof content !== "string" || !content.trim()) {
      const duration = Date.now() - startTime;
      console.log(`[Proficiency Report] 輸入驗證失敗：內容無效，耗時: ${duration}ms`);
      return NextResponse.json(
        { error: "Invalid content" },
        { status: 400 }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      const duration = Date.now() - startTime;
      console.log(`[Proficiency Report] API key 未配置，耗時: ${duration}ms`);
      return NextResponse.json(
        { error: "OpenAI API key not configured" },
        { status: 500 }
      );
    }

    // 使用配置檔的設定
    const systemPrompt = config.systemPrompt(responseLanguage);

    // 呼叫 OpenAI API
    const completion = await openai.chat.completions.create({
      model: config.model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `請分析以下韓語寫作文本：\n\n標題：${title}\n\n內容：\n${content}` },
      ],
      response_format: { type: "json_object" },
      temperature: config.temperature,
    });

    const responseContent = completion.choices[0]?.message?.content;
    if (!responseContent) {
      throw new Error("No response from OpenAI");
    }

    console.log(`[Proficiency Report] 回應內容: ${responseContent}`);

    // 解析 JSON 回應
    let parsedResponse: {
      content_task?: { level: number; comment: string };
      organization?: { level: number; comment: string };
      language_use?: { level: number; comment: string };
      register?: { level: number; comment: string };
    };
    try {
      parsedResponse = JSON.parse(responseContent);
    } catch (parseError) {
      console.error("Failed to parse OpenAI response:", responseContent);
      throw new Error("Invalid JSON response from OpenAI");
    }

    // 驗證回應格式
    if (
      !parsedResponse.content_task ||
      !parsedResponse.organization ||
      !parsedResponse.language_use ||
      !parsedResponse.register
    ) {
      throw new Error("Invalid response format: missing required fields");
    }

    // 驗證每個構面的 level 和 comment
    const requiredFields = [
      "content_task",
      "organization",
      "language_use",
      "register",
    ];
    for (const field of requiredFields) {
      const item = parsedResponse[field as keyof typeof parsedResponse];
      if (
        !item ||
        typeof item.level !== "number" ||
        item.level < 1 ||
        item.level > 6 ||
        typeof item.comment !== "string" ||
        !item.comment.trim()
      ) {
        throw new Error(`Invalid ${field}: level must be 1-6, comment must be non-empty string`);
      }
    }

    // 轉換成 ProficiencyReport 類型
    const results: ProficiencyReport = [
      {
        category: "Content & Task Achievement",
        level: parsedResponse.content_task.level,
        description: parsedResponse.content_task.comment,
      },
      {
        category: "Organization & Coherence",
        level: parsedResponse.organization.level,
        description: parsedResponse.organization.comment,
      },
      {
        category: "Language Use",
        level: parsedResponse.language_use.level,
        description: parsedResponse.language_use.comment,
      },
      {
        category: "Sociolinguistic Appropriateness",
        level: parsedResponse.register.level,
        description: parsedResponse.register.comment,
      },
    ];

    const duration = Date.now() - startTime;
    console.log(`[Proficiency Report] 分析完成，耗時: ${duration}ms`);

    return NextResponse.json({ results });
  } catch (error) {
    console.error("Proficiency Report API error:", error);

    if (error instanceof Error) {
      const duration = Date.now() - startTime;
      console.log(`[Proficiency Report] 發生錯誤: ${error.message}，耗時: ${duration}ms`);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    const duration = Date.now() - startTime;
    console.log(`[Proficiency Report] 發生錯誤，耗時: ${duration}ms`);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
