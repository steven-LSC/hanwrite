"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { RecentWriting } from "@/lib/types";
import { getRecentWritings } from "@/lib/data/writings";

export function Sidebar({ currentWritingId }: { currentWritingId?: string }) {
  const [recentWritings, setRecentWritings] = useState<RecentWriting[]>([]);

  useEffect(() => {
    getRecentWritings().then(setRecentWritings);
  }, []);

  return (
    <div className="w-[192px] h-full bg-white border border-(--color-border) flex flex-col p-[20px] gap-[40px]">
      {/* Logo 區域（固定） */}
      <div className="px-[10px] py-0 shrink-0">
        <div className="relative w-full aspect-667/172">
          <Image
            src="/logo.png"
            alt="HanWrite Logo"
            fill
            className="object-contain"
          />
        </div>
      </div>

      {/* 主要導航區域（固定） */}
      <div className="flex flex-col gap-[5px] shrink-0">
        <Link
          href="/writings/new"
          className="flex items-center gap-[5px] px-[10px] py-[5px] rounded-[10px] text-(--color-text-secondary) hover:bg-slate-100 transition-colors duration-200 cursor-pointer"
        >
          <span className="material-symbols-rounded text-[20px]">
            edit_note
          </span>
          <span className="font-medium text-[14px]">New Writing</span>
        </Link>
        <Link
          href="/brainstorm"
          className="flex items-center gap-[5px] px-[10px] py-[5px] rounded-[10px] text-(--color-text-secondary) hover:bg-slate-100 transition-colors duration-200 cursor-pointer"
        >
          <span className="material-symbols-rounded text-[20px]">
            lightbulb
          </span>
          <span className="font-medium text-[14px]">Brainstorm Lab</span>
        </Link>
      </div>

      {/* Recents 列表區域（可滾動） */}
      <div className="flex flex-col gap-[10px] flex-1 overflow-hidden">
        <p className="font-normal text-[14px] text-(--color-text-tertiary)">
          Recents
        </p>
        <div className="flex flex-col gap-[5px] overflow-y-auto">
          {recentWritings.map((writing) => (
            <Link
              key={writing.id}
              href={`/writings/${writing.id}`}
              className={`px-[10px] py-[5px] rounded-[10px] hover:bg-slate-100 transition-colors duration-200 cursor-pointer ${
                currentWritingId === writing.id ? "bg-slate-100" : ""
              }`}
            >
              <p className="font-medium text-[14px] text-(--color-text-secondary) overflow-hidden text-ellipsis whitespace-nowrap">
                {writing.title}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
