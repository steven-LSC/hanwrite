"use client";

import React, { useState } from "react";
import { FeatureStats } from "./types";
import { BehaviorHistoryModal } from "./behavior-history-modal";

interface UsageCardProps {
  title: string;
  stats: FeatureStats;
  feature: string; // feature 名稱，用於 API 查詢（例如 "expansion-hints"）
}

/**
 * Usage Card 元件
 * 顯示單一功能的使用統計
 */
export function UsageCard({ title, stats, feature }: UsageCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // 建立統計項目列表
  const statItems: Array<{ label: string; value: number | string }> = [];

  // Times Used 總是顯示
  statItems.push({
    label: "Times Used",
    value: stats.timesUsed,
  });

  // 其他統計項目（如果存在）
  if (stats.applied !== undefined) {
    statItems.push({
      label: "Applied",
      value: stats.applied,
    });
  }
  if (stats.skipped !== undefined) {
    statItems.push({
      label: "Skipped",
      value: stats.skipped,
    });
  }
  if (stats.inserted !== undefined) {
    statItems.push({
      label: "Inserted",
      value: stats.inserted,
    });
  }
  if (stats.discarded !== undefined) {
    statItems.push({
      label: "Discarded",
      value: stats.discarded,
    });
  }
  if (stats.opened !== undefined) {
    statItems.push({
      label: "Opened",
      value: stats.opened,
    });
  }
  if (stats.find !== undefined) {
    statItems.push({
      label: "Find",
      value: stats.find,
    });
  }
  if (stats.added !== undefined) {
    statItems.push({
      label: "Added",
      value: stats.added,
    });
  }
  if (stats.saved !== undefined) {
    statItems.push({
      label: "Saved",
      value: stats.saved,
    });
  }
  if (stats.vocabularySpeakerClicks !== undefined) {
    statItems.push({
      label: "Vocabulary Speaker Clicks",
      value: stats.vocabularySpeakerClicks,
    });
  }
  if (stats.vocabularyImageClicks !== undefined) {
    statItems.push({
      label: "Vocabulary Image Clicks",
      value: stats.vocabularyImageClicks,
    });
  }

  // 處理數字點擊（打開 modal）
  const handleNumberClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // 防止觸發展開/收合
    if (feature) {
      setIsModalOpen(true);
    }
  };

  return (
    <>
      <div className="bg-(--color-bg-primary) rounded-[10px] p-[15px] flex flex-col gap-[10px]">
        {/* 標題區域 */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center justify-between w-full"
        >
          <p className="font-medium text-[14px] text-(--color-text-primary)">
            {title}
            {!isExpanded && stats.timesUsed > 0 && (
              <span className="ml-[8px] text-(--color-text-tertiary) font-normal">
                ({stats.timesUsed})
              </span>
            )}
          </p>
          <span className="material-symbols-rounded text-(--color-text-secondary)">
            {isExpanded ? "expand_less" : "expand_more"}
          </span>
        </button>

        {/* 統計數據區域 */}
        {isExpanded && (
          <div className="grid grid-cols-2 gap-x-[20px] gap-y-[10px]">
            {statItems.map((item, index) => (
              <div
                key={index}
                className="flex items-center justify-between text-[14px]"
              >
                <span className="text-(--color-text-secondary)">{item.label}</span>
                {feature ? (
                  <button
                    onClick={handleNumberClick}
                    className="text-(--color-text-highlight) font-medium hover:underline cursor-pointer"
                  >
                    {typeof item.value === "number" ? item.value : item.value}
                  </button>
                ) : (
                  <span className="text-(--color-text-highlight) font-medium">
                    {typeof item.value === "number" ? item.value : item.value}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Behavior History Modal */}
      {feature && (
        <BehaviorHistoryModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          feature={feature}
          featureTitle={title}
        />
      )}
    </>
  );
}
