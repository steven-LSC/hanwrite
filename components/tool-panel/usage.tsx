"use client";

import React, { useEffect, useState } from "react";
import { UsageCard } from "./usage/usage-card";
import {
  FEATURE_CARDS,
  calculateFeatureStats,
  UsageStats,
} from "./usage/types";

/**
 * Usage 元件
 * 顯示所有功能的使用統計
 */
export function Usage() {
  const [stats, setStats] = useState<UsageStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch("/api/usage-stats");
        if (!response.ok) {
          throw new Error("Failed to fetch usage stats");
        }

        const data = await response.json();
        setStats(data.stats || {});
      } catch (err) {
        console.error("Failed to fetch usage stats:", err);
        setError(
          err instanceof Error ? err.message : "Failed to load usage stats"
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, []);

  // 載入中狀態
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-[14px] text-(--color-text-tertiary)">
          Loading usage statistics...
        </p>
      </div>
    );
  }

  // 錯誤狀態
  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-[14px] text-(--color-text-tertiary)">
          {error}
        </p>
      </div>
    );
  }

  // 沒有統計數據
  if (!stats || Object.keys(stats).length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-[14px] text-(--color-text-tertiary)">
          No usage statistics available.
        </p>
      </div>
    );
  }

  // 渲染所有功能卡片
  return (
    <div className="flex flex-col gap-[10px] p-[20px] overflow-y-auto h-full scrollbar-hide">
      <h3 className="font-medium text-[16px] text-(--color-text-primary)">Usage Statistics</h3>
      {FEATURE_CARDS.map((config) => {
        const featureStats = calculateFeatureStats(stats, config);
        // 將 title 轉換為 feature 名稱（用於 API 查詢）
        const featureMap: Record<string, string> = {
          "Idea Partner": "idea-partner",
          "Outline Generator": "outline-generator",
          "Paraphrase": "paraphrase",
          "Expansion Hints": "expansion-hints",
          "Expression Builder": "expression-builder",
          "Proficiency Report": "proficiency-report",
          "Error Detection": "error-detection",
          "Grammar Practice": "grammar-practice",
          "Reverse Outlining": "reverse-outlining",
        };
        const feature = featureMap[config.title] || "";
        
        return (
          <UsageCard
            key={config.title}
            title={config.title}
            stats={featureStats}
            feature={feature}
          />
        );
      })}
    </div>
  );
}
