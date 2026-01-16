"use client";

import { Button } from "@/components/ui/button";

const IDEA_PARTNER_CARDS = [
  {
    title: "사진 찍기",
    description: "Try describing what appeared in the photo you took.",
    idea: "파도",
  },
  {
    title: "산책",
    description: "Describe a memorable walk you had during your Busan trip.",
    idea: "",
  },
  {
    title: "자갈치 시장",
    description:
      "What was the most interesting thing you saw at Jagalchi Market?",
    idea: "",
  },
];

interface IdeaPartnerProps {
  isOpen: boolean;
  hasScanned: boolean;
  onScan: () => void;
}

export function IdeaPartner({ isOpen, hasScanned, onScan }: IdeaPartnerProps) {
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
      ) : (
        <div className="flex flex-col gap-[10px] p-[20px]">
          <div className="w-full flex flex-col gap-[10px]">
            {IDEA_PARTNER_CARDS.map((card) => (
              <div
                key={card.title}
                className="bg-(--color-bg-card) border border-(--color-border) rounded-[10px] p-[20px] flex flex-col gap-[10px]"
              >
                <p className="text-primary text-[16px] font-medium">
                  {card.title}
                </p>
                <p className="text-primary text-[14px]">{card.description}</p>
                <input
                  type="text"
                  defaultValue={card.idea}
                  placeholder="Type your idea"
                  className="h-[34px] w-full bg-(--color-bg-primary) rounded-[5px] px-[10px] py-[5px] text-(--color-text-secondary) text-[14px] font-medium outline-none border-none placeholder:text-(--color-text-tertiary)"
                />
                <div className="flex items-center gap-[10px]">
                  <Button variant="primary" icon="variable_add">
                    Add Block
                  </Button>
                  <Button variant="cancel" icon="block">
                    Skip
                  </Button>
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-center pt-[10px]">
            <Button variant="primary" icon="replay">
              Update
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
