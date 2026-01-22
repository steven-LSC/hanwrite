/**
 * AI 相關功能的全局配置
 * 所有 AI API 呼叫都應該從這裡導入配置
 */

/**
 * 從 cookie 字串解析並取得 AI 回應的語言設定
 * @param cookieValue cookie 字串（auth-user cookie 的值）
 * @returns 語言設定字串
 */
export function getResponseLanguage(cookieValue: string): string {
    try {
        const parsed = JSON.parse(cookieValue)
        if (parsed?.responseLanguage) {
            return parsed.responseLanguage
        }
    } catch {
        // 解析失敗時使用預設值
    }
    return "繁體中文"
}

/**
 * 從 cookie 字串解析並取得 OpenAI Model 設定
 * @param cookieValue cookie 字串（auth-user cookie 的值）
 * @returns Model 設定字串
 */
export function getOpenaiModel(cookieValue: string): string {
    try {
        const parsed = JSON.parse(cookieValue)
        if (parsed?.openaiModel) {
            return parsed.openaiModel
        }
    } catch {
        // 解析失敗時使用預設值
    }
    return "gpt-4.1-mini"
}
