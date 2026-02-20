"use client";

import { useState } from "react";
import { useTaskLists } from "@/hooks/useTaskLists";
import CreateListModal from "./CreateListModal";

export default function ListSidebar() {
  const { lists, createList } = useTaskLists();
  const [showCreate, setShowCreate] = useState(false);

  const handleCreate = async (name: string, color: string) => {
    await createList({ name, color });
  };

  return (
    <>
      <div className="space-y-1">
        {lists
          .filter((l) => !l.is_default)
          .map((list) => (
            <div
              key={list.id}
              className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-text-secondary hover:bg-bg-tertiary hover:text-text-primary transition-colors cursor-pointer"
            >
              <span
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: list.color }}
              />
              {list.name}
            </div>
          ))}

        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-3 px-3 py-2 w-full rounded-xl text-sm text-accent hover:bg-accent/5 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          New list
        </button>
      </div>

      <CreateListModal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        onCreate={handleCreate}
      />
    </>
  );
}
