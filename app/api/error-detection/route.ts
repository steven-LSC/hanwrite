import { NextRequest, NextResponse } from "next/server";
import { GrammarErrorInput, VocabErrorInput } from "@/lib/types";
import { getResponseLanguage, AI_CONFIGS } from "@/lib/ai-config";
import OpenAI from "openai";
import https from "node:https";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// 強制使用 Node.js runtime，確保可使用 node:https 客製 TLS 設定
export const runtime = "nodejs";

/**
 * Bareun API 當前回傳的憑證鏈缺少 intermediate cert，會造成 Node.js 出現
 * UNABLE_TO_VERIFY_LEAF_SIGNATURE。這裡明確提供 intermediate CA 供驗證。
 */
const BAREUN_INTERMEDIATE_CA_PEM = `-----BEGIN CERTIFICATE-----
MIIGTDCCBDSgAwIBAgIQOXpmzCdWNi4NqofKbqvjsTANBgkqhkiG9w0BAQwFADBf
MQswCQYDVQQGEwJHQjEYMBYGA1UEChMPU2VjdGlnbyBMaW1pdGVkMTYwNAYDVQQD
Ey1TZWN0aWdvIFB1YmxpYyBTZXJ2ZXIgQXV0aGVudGljYXRpb24gUm9vdCBSNDYw
HhcNMjEwMzIyMDAwMDAwWhcNMzYwMzIxMjM1OTU5WjBgMQswCQYDVQQGEwJHQjEY
MBYGA1UEChMPU2VjdGlnbyBMaW1pdGVkMTcwNQYDVQQDEy5TZWN0aWdvIFB1Ymxp
YyBTZXJ2ZXIgQXV0aGVudGljYXRpb24gQ0EgRFYgUjM2MIIBojANBgkqhkiG9w0B
AQEFAAOCAY8AMIIBigKCAYEAljZf2HIz7+SPUPQCQObZYcrxLTHYdf1ZtMRe7Yeq
RPSwygz16qJ9cAWtWNTcuICc++p8Dct7zNGxCpqmEtqifO7NvuB5dEVexXn9RFFH
12Hm+NtPRQgXIFjx6MSJcNWuVO3XGE57L1mHlcQYj+g4hny90aFh2SCZCDEVkAja
EMMfYPKuCjHuuF+bzHFb/9gV8P9+ekcHENF2nR1efGWSKwnfG5RawlkaQDpRtZTm
M64TIsv/r7cyFO4nSjs1jLdXYdz5q3a4L0NoabZfbdxVb+CUEHfB0bpulZQtH1Rv
38e/lIdP7OTTIlZh6OYL6NhxP8So0/sht/4J9mqIGxRFc0/pC8suja+wcIUna0HB
pXKfXTKpzgis+zmXDL06ASJf5E4A2/m+Hp6b84sfPAwQ766rI65mh50S0Di9E3Pn
2WcaJc+PILsBmYpgtmgWTR9eV9otfKRUBfzHUHcVgarub/XluEpRlTtZudU5xbFN
xx/DgMrXLUAPaI60fZ6wA+PTAgMBAAGjggGBMIIBfTAfBgNVHSMEGDAWgBRWc1hk
lfmSGrASKgRieaFAFYghSTAdBgNVHQ4EFgQUaMASFhgOr872h6YyV6NGUV3LBycw
DgYDVR0PAQH/BAQDAgGGMBIGA1UdEwEB/wQIMAYBAf8CAQAwHQYDVR0lBBYwFAYI
KwYBBQUHAwEGCCsGAQUFBwMCMBsGA1UdIAQUMBIwBgYEVR0gADAIBgZngQwBAgEw
VAYDVR0fBE0wSzBJoEegRYZDaHR0cDovL2NybC5zZWN0aWdvLmNvbS9TZWN0aWdv
UHVibGljU2VydmVyQXV0aGVudGljYXRpb25Sb290UjQ2LmNybDCBhAYIKwYBBQUH
AQEEeDB2ME8GCCsGAQUFBzAChkNodHRwOi8vY3J0LnNlY3RpZ28uY29tL1NlY3Rp
Z29QdWJsaWNTZXJ2ZXJBdXRoZW50aWNhdGlvblJvb3RSNDYucDdjMCMGCCsGAQUF
BzABhhdodHRwOi8vb2NzcC5zZWN0aWdvLmNvbTANBgkqhkiG9w0BAQwFAAOCAgEA
YtOC9Fy+TqECFw40IospI92kLGgoSZGPOSQXMBqmsGWZUQ7rux7cj1du6d9rD6C8
ze1B2eQjkrGkIL/OF1s7vSmgYVafsRoZd/IHUrkoQvX8FZwUsmPu7amgBfaY3g+d
q1x0jNGKb6I6Bzdl6LgMD9qxp+3i7GQOnd9J8LFSietY6Z4jUBzVoOoz8iAU84OF
h2HhAuiPw1ai0VnY38RTI+8kepGWVfGxfBWzwH9uIjeooIeaosVFvE8cmYUB4TSH
5dUyD0jHct2+8ceKEtIoFU/FfHq/mDaVnvcDCZXtIgitdMFQdMZaVehmObyhRdDD
4NQCs0gaI9AAgFj4L9QtkARzhQLNyRf87Kln+YU0lgCGr9HLg3rGO8q+Y4ppLsOd
unQZ6ZxPNGIfOApbPVf5hCe58EZwiWdHIMn9lPP6+F404y8NNugbQixBber+x536
WrZhFZLjEkhp7fFXf9r32rNPfb74X/U90Bdy4lzp3+X1ukh1BuMxA/EEhDoTOS3l
7ABvc7BYSQubQ2490OcdkIzUh3ZwDrakMVrbaTxUM2p24N6dB+ns2zptWCva6jzW
r8IWKIMxzxLPv5Kt3ePKcUdvkBU/smqujSczTzzSjIoR5QqQA6lN1ZRSnuHIWCvh
JEltkYnTAH41QJ6SAWO66GrrUESwN/cgZzL4JLEqz1Y=
-----END CERTIFICATE-----`;

const BAREUN_ROOT_CA_PEM = `-----BEGIN CERTIFICATE-----
MIIFijCCA3KgAwIBAgIQdY39i658BwD6qSWn4cetFDANBgkqhkiG9w0BAQwFADBf
MQswCQYDVQQGEwJHQjEYMBYGA1UEChMPU2VjdGlnbyBMaW1pdGVkMTYwNAYDVQQD
Ey1TZWN0aWdvIFB1YmxpYyBTZXJ2ZXIgQXV0aGVudGljYXRpb24gUm9vdCBSNDYw
HhcNMjEwMzIyMDAwMDAwWhcNNDYwMzIxMjM1OTU5WjBfMQswCQYDVQQGEwJHQjEY
MBYGA1UEChMPU2VjdGlnbyBMaW1pdGVkMTYwNAYDVQQDEy1TZWN0aWdvIFB1Ymxp
YyBTZXJ2ZXIgQXV0aGVudGljYXRpb24gUm9vdCBSNDYwggIiMA0GCSqGSIb3DQEB
AQUAA4ICDwAwggIKAoICAQCTvtU2UnXYASOgHEdCSe5jtrch/cSV1UgrJnwUUxDa
ef0rty2k1Cz66jLdScK5vQ9IPXtamFSvnl0xdE8H/FAh3aTPaE8bEmNtJZlMKpnz
SDBh+oF8HqcIStw+KxwfGExxqjWMrfhu6DtK2eWUAtaJhBOqbchPM8xQljeSM9xf
iOefVNlI8JhD1mb9nxc4Q8UBUQvX4yMPFF1bFOdLvt30yNoDN9HWOaEhUTCDsG3X
ME6WW5HwcCSrv0WBZEMNvSE6Lzzpng3LILVCJ8zab5vuZDCQOc2TZYEhMbUjUDM3
IuM47fgxMMxF/mL50V0yeUKH32rMVhlATc6qu/m1dkmU8Sf4kaWD5QazYw6A3OAS
VYCmO2a0OYctyPDQ0RTp5A1NDvZdV3LFOxxHVp3i1fuBYYzMTYCQNFu31xR13NgE
SJ/AwSiItOkcyqex8Va3e0lMWeUgFaiEAin6OJRpmkkGj80feRQXEgyDet4fsZfu
+Zd4KKTIRJLpfSYFplhym3kT2BFfrsU4YjRosoYwjviQYZ4ybPUHNs2iTG7sijbt
8uaZFURww3y8nDnAtOFr94MlI1fZEoDlSfB1D++N6xybVCi0ITz8fAr/73trdf+L
HaAZBav6+CuBQug4urv7qv094PPK306Xlynt8xhW6aWWrL3DkJiy4Pmi1KZHQ3xt
zwIDAQABo0IwQDAdBgNVHQ4EFgQUVnNYZJX5khqwEioEYnmhQBWIIUkwDgYDVR0P
AQH/BAQDAgGGMA8GA1UdEwEB/wQFMAMBAf8wDQYJKoZIhvcNAQEMBQADggIBAC9c
mTz8Bl6MlC5w6tIyMY208FHVvArzZJ8HXtXBc2hkeqK5Duj5XYUtqDdFqij0lgVQ
YKlJfp/imTYpE0RHap1VIDzYm/EDMrraQKFz6oOht0SmDpkBm+S8f74TlH7Kph52
gDY9hAaLMyZlbcp+nv4fjFg4exqDsQ+8FxG75gbMY/qB8oFM2gsQa6H61SilzwZA
Fv97fRheORKkU55+MkIQpiGRqRxOF3yEvJ+M0ejf5lG5Nkc/kLnHvALcWxxPDkjB
JYOcCj+esQMzEhonrPcibCTRAUH4WAP+JWgiH5paPHxsnnVI84HxZmduTILA7rpX
DhjvLpr3Etiga+kFpaHpaPi8TD8SHkXoUsCjvxInebnMMTzD9joiFgOgyY9mpFui
TdaBJQbpdqQACj7LzTWb4OE4y2BThihCQRxEV+ioratF4yUQvNs+ZUH7G6aXD+u5
dHn5HrwdVw1Hr8Mvn4dGp+smWg9WY7ViYG4A++MnESLn/pmPNPW56MORcr3Ywx65
LvKRRFHQV80MNNVIIb/bE/FmJUNS0nAiNs2fxBx1IK1jcmMGDw4nztJqDby1ORrp
0XZ60Vzk50lJLVU3aPAaOpg+VBeHVOmmJ1CJeyAvP/+/oYtKR5j/K3tJPsMpRmAY
QqszKbrAKbkTidOIijlBO8n9pu0f9GBj39ItVQGL
-----END CERTIFICATE-----`;

async function callBareunApi(
  content: string,
  apiKey: string
): Promise<BareunApiResponse> {
  const allowInsecureTlsFallback =
    process.env.BAREUN_INSECURE_TLS_FALLBACK !== "false";

  try {
    return await requestBareunApi(content, apiKey, true);
  } catch (error) {
    if (!isTlsCertificateError(error) || !allowInsecureTlsFallback) {
      throw error;
    }

    console.warn(
      "[Error Detection] Bareun TLS certificate verification failed; retrying with insecure TLS fallback."
    );
    return requestBareunApi(content, apiKey, false);
  }
}

function isTlsCertificateError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const code = (error as Error & { code?: string }).code;
  return (
    code === "UNABLE_TO_VERIFY_LEAF_SIGNATURE" ||
    code === "UNABLE_TO_GET_ISSUER_CERT"
  );
}

function requestBareunApi(
  content: string,
  apiKey: string,
  strictTls: boolean
): Promise<BareunApiResponse> {
  const requestBody = JSON.stringify({
    document: { content },
  });

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        protocol: "https:",
        hostname: "api.bareun.ai",
        path: "/bareun.RevisionService/CorrectError",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "api-key": apiKey,
          "Content-Length": Buffer.byteLength(requestBody),
        },
        timeout: 15000,
        ...(strictTls
          ? { ca: [BAREUN_INTERMEDIATE_CA_PEM, BAREUN_ROOT_CA_PEM] }
          : { rejectUnauthorized: false }),
      },
      (res) => {
        let responseText = "";
        res.setEncoding("utf8");

        res.on("data", (chunk) => {
          responseText += chunk;
        });

        res.on("end", () => {
          const statusCode = res.statusCode ?? 500;
          if (statusCode < 200 || statusCode >= 300) {
            reject(
              new Error(
                `Bareun API error (${strictTls ? "strict" : "insecure"} TLS): ${statusCode} - ${
                  responseText || "No response body"
                }`
              )
            );
            return;
          }

          try {
            const parsed = JSON.parse(responseText) as BareunApiResponse;
            resolve(parsed);
          } catch {
            reject(new Error("Bareun API response is not valid JSON"));
          }
        });
      }
    );

    req.on("timeout", () => {
      req.destroy(new Error("Bareun API request timed out"));
    });

    req.on("error", (error) => {
      reject(error);
    });

    req.write(requestBody);
    req.end();
  });
}

/**
 * Bareun API 回應型別
 */
interface BareunRevisedBlock {
  origin: {
    content: string;
    beginOffset: number;
    length: number;
  };
  revised: string;
  revisions: Array<{
    revised: string;
    score: number;
    category: string;
    helpId: string;
  }>;
  nested: any[];
  lemma: string;
  pos: string;
}

interface BareunHelp {
  id: string;
  category: string;
  comment: string;
  examples: string[];
  ruleArticle: string;
}

interface BareunApiResponse {
  origin: string;
  revised: string;
  revisedBlocks: BareunRevisedBlock[];
  whitespaceCleanupRanges: any[];
  revisedSentences: Array<{
    origin: string;
    revised: string;
  }>;
  helps: Record<string, BareunHelp>;
  language: string;
  tokensCount: number;
}

/**
 * 清理文字中的亂碼字元
 * 移除替換字元 (U+FFFD) 和其他無效的 Unicode 字元
 */
function cleanText(text: string): string {
  if (!text) return text;
  
  // 移除替換字元 (�) 和其他無效的 Unicode 字元
  return text
    .replace(/\uFFFD/g, '') // 移除替換字元
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, '') // 移除控制字元
    .trim();
}

/**
 * 從 Bareun API 回應中解析文法錯誤
 */
function parseGrammarErrors(
  bareunData: BareunApiResponse
): Array<{ type: "grammar"; data: GrammarErrorInput }> {
  const results: Array<{ type: "grammar"; data: GrammarErrorInput }> = [];

  if (bareunData.revisedBlocks && Array.isArray(bareunData.revisedBlocks)) {
    for (const block of bareunData.revisedBlocks) {
      // 檢查是否有 revisions
      if (!block.revisions || block.revisions.length === 0) {
        continue;
      }

      const firstRevision = block.revisions[0];
      const helpId = firstRevision.helpId;
      const category = firstRevision.category;

      // 如果沒有 helpId，跳過這個錯誤
      if (!helpId) {
        console.log(`[Error Detection] 跳過沒有 helpId 的錯誤: ${block.origin.content}`);
        continue;
      }

      // 只處理 GRAMMER, STANDARD, SPACING 類別的錯誤
      if (category !== "GRAMMER" && category !== "STANDARD" && category !== "SPACING") {
        console.log(`[Error Detection] 跳過 category 為 ${category} 的錯誤: ${block.origin.content}`);
        continue;
      }

      // 從 helps 中取得說明
      const help = bareunData.helps?.[helpId];
      if (!help) {
        console.log(`[Error Detection] 找不到 helpId 對應的說明: ${helpId}`);
        // 即使沒有 help，也建立錯誤記錄，使用預設值
      }

      // 建立 GrammarErrorInput（不包含 example，將由 enhancement function 生成）
      // 清理亂碼字元
      const grammarError: GrammarErrorInput = {
        grammarName: cleanText(helpId), // 直接使用 helpId
        grammarError: cleanText(block.origin.content), // origin.content
        correctSentence: cleanText(firstRevision.revised), // revisions[0].revised
        explanation: cleanText(help?.comment || ""), // helps[helpId].comment
        example: "", // 將由 enhancement function 生成
      };

      // 驗證必要欄位
      if (
        grammarError.grammarError &&
        grammarError.correctSentence &&
        grammarError.grammarName
      ) {
        results.push({
          type: "grammar",
          data: grammarError,
        });
      } else {
        console.log(`[Error Detection] 跳過缺少必要欄位的錯誤:`, grammarError);
      }
    }
  }

  return results;
}

/**
 * 增強文法錯誤資訊
 * 使用 LLM 將 grammar title 轉換成好讀的文法名稱、翻譯 explanation，
 * 並根據正確文法和文章內容生成 in-context 例句
 */
async function enhanceGrammarErrors(
  grammarErrors: GrammarErrorInput[],
  content: string,
  responseLanguage: string
): Promise<GrammarErrorInput[]> {
  // 如果沒有錯誤，直接返回
  if (!grammarErrors || grammarErrors.length === 0) {
    return grammarErrors;
  }

  if (!process.env.OPENAI_API_KEY) {
    console.warn("[Grammar Enhancement] OpenAI API key 未配置，跳過增強");
    return grammarErrors;
  }

  // 使用配置檔的設定
  const config = AI_CONFIGS["grammar-enhancement"];
  const systemPrompt = config.systemPrompt(responseLanguage);

  // 構建用戶輸入
  const errorsData = grammarErrors.map((error) => ({
    grammarName: error.grammarName,
    grammarError: error.grammarError,
    correctSentence: error.correctSentence,
    explanation: error.explanation,
  }));

  const userPrompt = `請處理以下文法錯誤：

文章內容：
${content}

文法錯誤列表：
${JSON.stringify(errorsData, null, 2)}`;

  try {
    // 呼叫 OpenAI API
    const completion = await openai.chat.completions.create({
      model: config.model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      temperature: config.temperature,
    });

    const responseContent = completion.choices[0]?.message?.content;
    if (!responseContent) {
      throw new Error("No response from OpenAI");
    }

    console.log(`[Grammar Enhancement] 回應內容: ${responseContent}`);

    // 解析 JSON 回應
    let parsedResponse: { errors: Array<{ grammarName: string; explanation: string; example: string }> };
    try {
      parsedResponse = JSON.parse(responseContent);
    } catch (parseError) {
      console.error("[Grammar Enhancement] Failed to parse OpenAI response:", responseContent);
      throw new Error("Invalid JSON response from OpenAI");
    }

    // 驗證回應格式
    if (!Array.isArray(parsedResponse.errors) || parsedResponse.errors.length !== grammarErrors.length) {
      throw new Error("Invalid response format: errors array length mismatch");
    }

    // 合併增強後的資料
    const enhancedErrors: GrammarErrorInput[] = grammarErrors.map((error, index) => {
      const enhanced = parsedResponse.errors[index];
      if (!enhanced) {
        console.warn(`[Grammar Enhancement] 缺少第 ${index} 個錯誤的增強資料，使用原始資料`);
        return {
          ...error,
          example: "", // 原本的 example 已經移除，這裡設為空字串
        };
      }

      return {
        ...error,
        grammarName: cleanText(enhanced.grammarName || error.grammarName),
        explanation: cleanText(enhanced.explanation || error.explanation),
        example: cleanText(enhanced.example || ""),
      };
    });

    return enhancedErrors;
  } catch (error) {
    console.error("[Grammar Enhancement] 發生錯誤:", error);
    // 如果增強失敗，返回原始錯誤（但 example 設為空字串）
    return grammarErrors.map((error) => ({
      ...error,
      example: "",
    }));
  }
}

/**
 * 檢查並增強單字拼寫錯誤資訊
 * 使用 LLM 檢查韓文文章中的單字拼寫錯誤，並根據詞性提供相關學習資訊
 */
async function enhanceVocabErrors(
  content: string,
  responseLanguage: string
): Promise<VocabErrorInput[]> {
  if (!content || !content.trim()) {
    return [];
  }

  if (!process.env.OPENAI_API_KEY) {
    console.warn("[Vocab Enhancement] OpenAI API key 未配置，跳過單字檢查");
    return [];
  }

  // 使用配置檔的設定
  const config = AI_CONFIGS["vocab-enhancement"];
  const systemPrompt = config.systemPrompt(responseLanguage);

  const userPrompt = `請檢查以下韓文文章中的單字拼寫錯誤：

文章內容：
${content}`;

  try {
    // 呼叫 OpenAI API
    const completion = await openai.chat.completions.create({
      model: config.model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      temperature: config.temperature,
    });

    const responseContent = completion.choices[0]?.message?.content;
    if (!responseContent) {
      throw new Error("No response from OpenAI");
    }

    console.log(`[Vocab Enhancement] 回應內容: ${responseContent}`);

    // 解析 JSON 回應
    let parsedResponse: { vocabErrors: VocabErrorInput[] };
    try {
      parsedResponse = JSON.parse(responseContent);
    } catch (parseError) {
      console.error("[Vocab Enhancement] Failed to parse OpenAI response:", responseContent);
      throw new Error("Invalid JSON response from OpenAI");
    }

    // 驗證回應格式
    if (!Array.isArray(parsedResponse.vocabErrors)) {
      throw new Error("Invalid response format: vocabErrors should be an array");
    }

    // 驗證每個錯誤的必要欄位
    const validatedErrors: VocabErrorInput[] = parsedResponse.vocabErrors
      .map((error, index) => {
        // 驗證必要欄位
        if (
          !error.vocabError ||
          !error.correctWord ||
          !error.partOfSpeech ||
          !error.translation ||
          !error.example ||
          !Array.isArray(error.synonyms)
        ) {
          console.warn(`[Vocab Enhancement] 第 ${index} 個錯誤缺少必要欄位，跳過`);
          return null;
        }

        // 根據詞性驗證特定欄位
        const partOfSpeech = error.partOfSpeech.toLowerCase();
        if (partOfSpeech === "noun") {
          if (!error.relatedWords || !Array.isArray(error.relatedWords)) {
            console.warn(`[Vocab Enhancement] 名詞錯誤缺少 relatedWords，跳過`);
            return null;
          }
          if (!error.imageSearchKeyword) {
            console.warn(`[Vocab Enhancement] 名詞錯誤缺少 imageSearchKeyword，跳過`);
            return null;
          }
        } else if (partOfSpeech === "verb") {
          if (!error.relatedWords || !Array.isArray(error.relatedWords)) {
            console.warn(`[Vocab Enhancement] 動詞錯誤缺少 relatedWords，跳過`);
            return null;
          }
        } else if (partOfSpeech === "adjective" || partOfSpeech === "adverb") {
          if (!error.antonyms || !Array.isArray(error.antonyms)) {
            console.warn(`[Vocab Enhancement] ${partOfSpeech} 錯誤缺少 antonyms，跳過`);
            return null;
          }
        }

        // 確保陣列長度不超過3
        const vocabError: VocabErrorInput = {
          vocabError: error.vocabError,
          correctWord: error.correctWord,
          partOfSpeech: error.partOfSpeech,
          translation: error.translation,
          example: error.example,
          synonyms: error.synonyms.slice(0, 3),
          relatedWords: error.relatedWords ? error.relatedWords.slice(0, 3) : undefined,
          antonyms: error.antonyms ? error.antonyms.slice(0, 3) : undefined,
          imageSearchKeyword: error.imageSearchKeyword,
        };

        return vocabError;
      })
      .filter((error): error is VocabErrorInput => error !== null);

    return validatedErrors;
  } catch (error) {
    console.error("[Vocab Enhancement] 發生錯誤:", error);
    // 如果檢查失敗，返回空陣列
    return [];
  }
}

/**
 * Error Detection API Route
 * 接收韓語寫作文本，使用 Bareun AI 分析錯誤並回傳結構化結果
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const { content } = await request.json();

    // 從 cookie 讀取設定
    const authCookie = request.cookies.get("auth-user");
    const cookieValue = authCookie?.value || "{}";
    const responseLanguage = getResponseLanguage(cookieValue);

    // 驗證輸入
    if (!content || typeof content !== "string" || !content.trim()) {
      const duration = Date.now() - startTime;
      console.log(`[Error Detection] 輸入驗證失敗：內容無效，耗時: ${duration}ms`);
      return NextResponse.json(
        { error: "Invalid content" },
        { status: 400 }
      );
    }

    if (!process.env.BAREUN_API_KEY) {
      const duration = Date.now() - startTime;
      console.log(`[Error Detection] API key 未配置，耗時: ${duration}ms`);
      return NextResponse.json(
        { error: "Bareun API key not configured" },
        { status: 500 }
      );
    }

    let bareunData: BareunApiResponse;
    try {
      bareunData = await callBareunApi(content, process.env.BAREUN_API_KEY!);
    } catch (error) {
      console.error("[Error Detection][Stage: bareun-api] 呼叫失敗:", error);
      throw error;
    }
    console.log(`[Error Detection] Bareun API 回應:`, JSON.stringify(bareunData, null, 2));

    // 解析文法錯誤
    const grammarResults = parseGrammarErrors(bareunData);

    // 提取文法錯誤資料進行增強（不需要先排序，最後會統一排序）
    const grammarErrorsToEnhance: GrammarErrorInput[] = grammarResults.map(
      (result) => result.data
    );

    // 使用 Promise.all 並行執行文法增強和單字檢查
    const [enhancedGrammarErrors, vocabErrors] = await Promise.all([
      enhanceGrammarErrors(
        grammarErrorsToEnhance,
        content,
        responseLanguage
      ).catch((error) => {
        console.error("[Error Detection] 文法增強失敗:", error);
        return grammarErrorsToEnhance.map((error) => ({
          ...error,
          example: "",
        }));
      }),
      enhanceVocabErrors(content, responseLanguage).catch((error) => {
        console.error("[Error Detection] 單字檢查失敗:", error);
        return [];
      }),
    ]);

    // 將增強後的文法錯誤轉換回原格式
    const enhancedGrammarResults = enhancedGrammarErrors.map((error) => ({
      type: "grammar" as const,
      data: error,
    }));

    // 將單字錯誤轉換為統一格式
    const vocabResults = vocabErrors.map((error) => ({
      type: "vocab" as const,
      data: error,
    }));

    // 合併所有錯誤
    const allResults = [...enhancedGrammarResults, ...vocabResults];

    // 統一排序：按照錯誤在文章中的出現順序
    const sortedAllResults = allResults.sort((a, b) => {
      // 取得錯誤文字
      const textA = a.type === "grammar" ? a.data.grammarError : a.data.vocabError;
      const textB = b.type === "grammar" ? b.data.grammarError : b.data.vocabError;

      // 找到錯誤文字在文章中的位置
      const indexA = content.indexOf(textA);
      const indexB = content.indexOf(textB);

      // 如果找不到，放在最後
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;

      return indexA - indexB;
    });

    const duration = Date.now() - startTime;
    console.log(
      `[Error Detection] 分析完成，找到 ${enhancedGrammarResults.length} 個文法錯誤和 ${vocabResults.length} 個單字錯誤，總計 ${sortedAllResults.length} 個錯誤，耗時: ${duration}ms`
    );

    return NextResponse.json({ results: sortedAllResults, duration });
  } catch (error) {
    console.error("Error Detection API error:", error);

    if (error instanceof Error) {
      const duration = Date.now() - startTime;
      console.log(`[Error Detection] 發生錯誤: ${error.message}，耗時: ${duration}ms`);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    const duration = Date.now() - startTime;
    console.log(`[Error Detection] 發生錯誤，耗時: ${duration}ms`);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
