/**
 * Usage Stats 相關類型定義
 */

/**
 * 整體統計資料結構
 * key 為 actionName，value 為使用次數
 */
export type UsageStats = Record<string, number>;

/**
 * 行為記錄資料結構
 */
export interface BehaviorRecord {
  id: string;
  actionName: string;
  resultData: any;
  timestamp: string;
}

/**
 * Behavior History Modal Props
 */
export interface BehaviorHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  feature: string;
  featureTitle: string;
}

/**
 * 單一功能的統計資料
 */
export interface FeatureStats {
  timesUsed: number;
  applied?: number;
  skipped?: number;
  inserted?: number;
  discarded?: number;
  opened?: number;
  find?: number;
  added?: number;
  saved?: number;
  vocabularySpeakerClicks?: number;
  vocabularyImageClicks?: number;
  generated?: number;
  canceled?: number;
  checked?: number;
}

/**
 * 功能卡片配置
 */
export interface FeatureCardConfig {
  title: string;
  actionNames: {
    timesUsed: string;
    applied?: string;
    skipped?: string;
    inserted?: string;
    discarded?: string;
    opened?: string;
    find?: string;
    added?: string;
    saved?: string;
    vocabularySpeakerClicks?: string;
    vocabularyImageClicks?: string;
    generated?: string;
    canceled?: string;
    checked?: string;
  };
}

/**
 * 前端顯示的功能卡片配置
 */
export const FEATURE_CARDS: FeatureCardConfig[] = [
  {
    title: "Idea Partner",
    actionNames: {
      timesUsed: "idea-partner-scan",
      added: "idea-partner-add-block",
      skipped: "idea-partner-skip",
    },
  },
  {
    title: "Outline Generator",
    actionNames: {
      timesUsed: "outline-generator-generate",
      saved: "outline-generator-save",
    },
  },
  {
    title: "Paraphrase",
    actionNames: {
      timesUsed: "paraphrase-generate",
      applied: "paraphrase-apply",
      discarded: "paraphrase-discard",
    },
  },
  {
    title: "Expansion Hints",
    actionNames: {
      timesUsed: "expansion-hint-generate",
      inserted: "expansion-hint-insert",
      discarded: "expansion-hint-discard",
    },
  },
  {
    title: "Expression Builder",
    actionNames: {
      timesUsed: "expression-builder-analyze",
    },
  },
  {
    title: "Proficiency Report",
    actionNames: {
      timesUsed: "proficiency-report-generate",
      opened: "proficiency-report-open",
    },
  },
  {
    title: "Error Detection",
    actionNames: {
      timesUsed: "error-detection-analyze",
      applied: "error-detection-apply",
      skipped: "error-detection-skip",
      vocabularySpeakerClicks: "vocab-speaker-click",
      vocabularyImageClicks: "vocab-image-click",
    },
  },
  {
    title: "Grammar Practice",
    actionNames: {
      timesUsed: "grammar-practice-generate",
      checked: "grammar-practice-check",
      canceled: "grammar-practice-cancel",
    },
  },
  {
    title: "Reverse Outlining",
    actionNames: {
      timesUsed: "reverse-outlining-generate",
    },
  },
];

/**
 * 從 UsageStats 計算單一功能的統計資料
 */
export function calculateFeatureStats(
  stats: UsageStats,
  config: FeatureCardConfig
): FeatureStats {
  const result: FeatureStats = {
    timesUsed: stats[config.actionNames.timesUsed] || 0,
  };

  if (config.actionNames.applied) {
    result.applied = stats[config.actionNames.applied] || 0;
  }
  if (config.actionNames.skipped) {
    result.skipped = stats[config.actionNames.skipped] || 0;
  }
  if (config.actionNames.inserted) {
    result.inserted = stats[config.actionNames.inserted] || 0;
  }
  if (config.actionNames.discarded) {
    result.discarded = stats[config.actionNames.discarded] || 0;
  }
  if (config.actionNames.opened) {
    result.opened = stats[config.actionNames.opened] || 0;
  }
  if (config.actionNames.find) {
    result.find = stats[config.actionNames.find] || 0;
  }
  if (config.actionNames.added) {
    result.added = stats[config.actionNames.added] || 0;
  }
  if (config.actionNames.saved) {
    result.saved = stats[config.actionNames.saved] || 0;
  }
  if (config.actionNames.vocabularySpeakerClicks) {
    result.vocabularySpeakerClicks =
      stats[config.actionNames.vocabularySpeakerClicks] || 0;
  }
  if (config.actionNames.vocabularyImageClicks) {
    result.vocabularyImageClicks =
      stats[config.actionNames.vocabularyImageClicks] || 0;
  }
  if (config.actionNames.generated) {
    result.generated = stats[config.actionNames.generated] || 0;
  }
  if (config.actionNames.canceled) {
    result.canceled = stats[config.actionNames.canceled] || 0;
  }
  if (config.actionNames.checked) {
    result.checked = stats[config.actionNames.checked] || 0;
  }

  return result;
}
