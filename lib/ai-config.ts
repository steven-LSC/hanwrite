/**
 * AI 相關功能的全局配置
 * 所有 AI API 呼叫都應該從這裡導入配置
 */

/**
 * AI 回應的語言設定
 * 用於控制 AI 回傳的翻譯、解釋等內容的語言
 * 
 * 可選值範例：
 * - "English" - 英文（預設）
 * - "Traditional Chinese" - 繁體中文
 * - "Korean" - 韓文
 * - 其他語言名稱
 */
export const RESPONSE_LANGUAGE = "English";

/**
 * OpenAI Model 設定
 * 統一管理所有 AI 功能使用的 Model
 * 
 * 可選值範例：
 * - "gpt-4.1-nano" - 輕量級模型（預設）
 * - "gpt-4o" - GPT-4 Optimized
 * - "gpt-4o-mini" - GPT-4 Optimized Mini
 * - "gpt-4-turbo" - GPT-4 Turbo
 * - 其他 OpenAI 支援的模型
 */
export const OPENAI_MODEL = "gpt-4.1-nano";
