"use client";

import { useState, useEffect } from "react";
import { type Node } from "@xyflow/react";
import { Button } from "@/components/ui/button";
import { Loading } from "@/components/ui/loading";
import { getIdeaPartnerCards, type IdeaPartnerCard } from "@/lib/data/idea-partner";
import { logBehavior } from "@/lib/log-behavior";

interface IdeaPartnerProps {
  isOpen: boolean;
  hasScanned: boolean;
  onScan: () => void;
  onAddBlock?: (nodeId: string, ideaText: string) => Promise<boolean>;
  nodes?: Node[];
  onNodeSelect?: (nodeId: string | null) => void;
}

export function IdeaPartner({
  isOpen,
  hasScanned,
  onScan,
  onAddBlock,
  nodes = [],
  onNodeSelect,
}: IdeaPartnerProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [cards, setCards] = useState<IdeaPartnerCard[]>([]);
  const [skippedCards, setSkippedCards] = useState<Set<string>>(new Set());
  const [addedCards, setAddedCards] = useState<Set<string>>(new Set());
  const [selectedCardNodeId, setSelectedCardNodeId] = useState<string | null>(
    null
  );
  const [ideaInputs, setIdeaInputs] = useState<Record<string, string>>({});

  // 當 hasScanned 改變時，fetch 卡片資料（只在第一次掃描時）
  useEffect(() => {
    if (hasScanned && nodes.length > 0 && cards.length === 0) {
      setIsLoading(true);
      getIdeaPartnerCards(nodes)
        .then(({ cards: fetchedCards, duration }) => {
          setCards(fetchedCards);
          // 初始化 ideaInputs
          const initial: Record<string, string> = {};
          fetchedCards.forEach((card) => {
            initial[card.nodeId] = card.idea;
          });
          setIdeaInputs(initial);
          // 掃描完成後記錄結果
          logBehavior("idea-partner-scan", {
            cards: fetchedCards,
            duration,
          });
        })
        .catch((error) => {
          console.error("Failed to fetch idea partner cards:", error);
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else if (!hasScanned) {
      // 重置狀態
      setCards([]);
      setIdeaInputs({});
      setSelectedCardNodeId(null);
      setSkippedCards(new Set());
      setAddedCards(new Set());
    }
  }, [hasScanned, nodes.length]); // 只依賴 nodes.length，避免 nodes 內容改變時重新 fetch

  const handleUpdate = async () => {
    setIsLoading(true);
    try {
      // 重新掃描
      onScan();
      // 等待更新完成
      await new Promise((resolve) => setTimeout(resolve, 2000));
      // 重置狀態
      setSkippedCards(new Set());
      setAddedCards(new Set());
      setSelectedCardNodeId(null);
      // 重新 fetch 卡片資料
      if (nodes.length > 0) {
        const { cards: fetchedCards } = await getIdeaPartnerCards(nodes);
        setCards(fetchedCards);
        const initial: Record<string, string> = {};
        fetchedCards.forEach((card) => {
          initial[card.nodeId] = card.idea;
        });
        setIdeaInputs(initial);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCardClick = (nodeId: string) => {
    // 如果點擊的是已選中的卡片，取消選中
    if (selectedCardNodeId === nodeId) {
      setSelectedCardNodeId(null);
      if (onNodeSelect) {
        onNodeSelect(null);
      }
    } else {
      // 選中新的卡片
      setSelectedCardNodeId(nodeId);
      if (onNodeSelect) {
        onNodeSelect(nodeId);
      }
    }
  };

  const handleSkip = (nodeId: string) => {
    // 找到對應的 card
    const card = cards.find((c) => c.nodeId === nodeId);
    // 記錄 skip 的卡片
    if (card) {
      logBehavior("idea-partner-skip", {
        card: {
          nodeId: card.nodeId,
          title: card.title,
          description: card.description,
          idea: card.idea,
        },
      });
    } else {
      logBehavior("idea-partner-skip");
    }

    // 直接標記為 skipped，不需要高亮節點
    setSkippedCards((prev) => new Set(prev).add(nodeId));
    // 如果當前選中的是這個節點，清除選中狀態
    if (selectedCardNodeId === nodeId) {
      setSelectedCardNodeId(null);
      if (onNodeSelect) {
        onNodeSelect(null);
      }
    }
  };

  const handleRevert = (nodeId: string) => {
    // 移除 skipped 狀態
    setSkippedCards((prev) => {
      const next = new Set(prev);
      next.delete(nodeId);
      return next;
    });
    // 高亮卡片和節點
    setSelectedCardNodeId(nodeId);
    if (onNodeSelect) {
      onNodeSelect(nodeId);
    }
  };

  const handleAddBlock = async (nodeId: string) => {
    const ideaText = ideaInputs[nodeId]?.trim() || "";
    if (!ideaText) {
      return;
    }

    // 確保卡片被選中
    if (selectedCardNodeId !== nodeId) {
      setSelectedCardNodeId(nodeId);
      if (onNodeSelect) {
        onNodeSelect(nodeId);
      }
    }

    if (onAddBlock) {
      // 找到對應的 card
      const card = cards.find((c) => c.nodeId === nodeId);
      // 記錄插入的整塊資訊
      logBehavior("idea-partner-add-block", {
        source: card ? {
          nodeId: card.nodeId,
          title: card.title,
          description: card.description,
        } : null,
        prompt: card?.description || "",
        input: ideaText,
      });
      // 先標記為已新增，讓卡片立即消失
      setAddedCards((prev) => new Set(prev).add(nodeId));
      // 清除選中狀態
      setSelectedCardNodeId(null);
      if (onNodeSelect) {
        onNodeSelect(null);
      }
      // 然後執行 Add Block
      await onAddBlock(nodeId, ideaText);
    }
  };

  const handleIdeaInputChange = (nodeId: string, value: string) => {
    setIdeaInputs((prev) => ({ ...prev, [nodeId]: value }));
  };

  if (!isOpen) return null;

  return (
    <div className="absolute right-[20px] top-[calc(20px+45px+6px)] w-[300px] h-[80%] bg-(--color-bg-card) border border-(--color-border) rounded-[10px] shadow-[0px_4px_10px_0px_rgba(0,0,0,0.08)] overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden z-30">
      {!hasScanned ? (
        <div className="h-full flex flex-col items-center gap-[20px] px-[20px] py-[40px] text-center">
          <p className="text-(--color-text-tertiary) text-[14px]">
            Scan your mind map to get tailored prompts and fresh ideas.
          </p>
          <Button variant="primary" icon="document_scanner" onClick={onScan}>
            Scan
          </Button>
        </div>
      ) : isLoading ? (
        <Loading text="Scanning mind map..." />
      ) : (
        <div className="flex flex-col gap-[10px] p-[20px]">
          <div className="w-full flex flex-col gap-[10px]">
            {cards.map((card) => {
              const isSkipped = skippedCards.has(card.nodeId);
              const isAdded = addedCards.has(card.nodeId);
              const isSelected = selectedCardNodeId === card.nodeId;

              // 如果已新增，不顯示卡片
              if (isAdded) {
                return null;
              }

              // Skip 狀態：只顯示 title 和 Revert 按鈕
              if (isSkipped) {
                return (
                  <div
                    key={card.nodeId}
                    className="bg-(--color-bg-card) border border-(--color-border) rounded-[10px] p-[20px] flex items-center justify-between"
                  >
                    <p className="text-(--color-text-primary) text-[16px] font-medium">
                      {card.title}
                    </p>
                    <Button
                      variant="cancel"
                      icon="undo"
                      onClick={() => handleRevert(card.nodeId)}
                    >
                      Revert
                    </Button>
                  </div>
                );
              }

              // 正常狀態：顯示完整卡片
              return (
                <div
                  key={card.nodeId}
                  onClick={() => handleCardClick(card.nodeId)}
                  className={`bg-(--color-bg-card) border rounded-[10px] p-[20px] flex flex-col gap-[10px] cursor-pointer transition-colors ${isSelected
                    ? "bg-[#DBEAFE33] border-[#DBEAFE]"
                    : "border-(--color-border)"
                    }`}
                  style={
                    isSelected
                      ? { backgroundColor: "rgba(219, 234, 254, 0.2)" }
                      : {}
                  }
                >
                  <p className="text-(--color-text-primary) text-[16px] font-medium">
                    {card.title}
                  </p>
                  <p className="text-(--color-text-primary) text-[14px]">
                    {card.description}
                  </p>
                  <input
                    type="text"
                    value={ideaInputs[card.nodeId] || ""}
                    onChange={(e) =>
                      handleIdeaInputChange(card.nodeId, e.target.value)
                    }
                    onClick={(e) => {
                      e.stopPropagation();
                      // 點擊輸入框時也選中卡片
                      if (selectedCardNodeId !== card.nodeId) {
                        setSelectedCardNodeId(card.nodeId);
                        if (onNodeSelect) {
                          onNodeSelect(card.nodeId);
                        }
                      }
                    }}
                    onFocus={() => {
                      // 聚焦時也選中卡片
                      if (selectedCardNodeId !== card.nodeId) {
                        setSelectedCardNodeId(card.nodeId);
                        if (onNodeSelect) {
                          onNodeSelect(card.nodeId);
                        }
                      }
                    }}
                    placeholder="Type your idea"
                    className="h-[34px] w-full bg-(--color-bg-primary) rounded-[5px] px-[10px] py-[5px] text-(--color-text-secondary) text-[14px] font-medium outline-none border border-(--color-border) placeholder:text-(--color-text-tertiary)"
                  />
                  <div className="flex items-center gap-[10px]" onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="primary"
                      icon="variable_add"
                      onClick={() => handleAddBlock(card.nodeId)}
                    >
                      Add Block
                    </Button>
                    <Button
                      variant="cancel"
                      icon="block"
                      onClick={() => handleSkip(card.nodeId)}
                    >
                      Skip
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex justify-center pt-[10px]">
            <Button variant="primary" icon="replay" onClick={handleUpdate}>
              Update
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
