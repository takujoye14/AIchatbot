import React, { useState } from "react";
import { ChatSession } from "../types";

interface SidebarProps {
  sessions: ChatSession[];
  activeSessionId: string | null;
  onSelectSession: (id: string) => void;
  onNewSession: () => Promise<string>;
  onDeleteSession: (id: string) => void;
  onRenameSession: (id: string, title: string) => void;
  onClearAll: () => void;
  darkMode: boolean;
  setDarkMode: (dark: boolean) => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export default function Sidebar({
  sessions,
  activeSessionId,
  onSelectSession,
  onNewSession,
  onDeleteSession,
  onRenameSession,
  onClearAll,
  darkMode,
  setDarkMode,
  isOpen,
  setIsOpen,
}: SidebarProps) {
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");

  const handleRenameSave = (id: string) => {
    if (editTitle.trim()) {
      onRenameSession(id, editTitle.trim());
    }
    setEditingSessionId(null);
  };

  return (
    <div className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-gray-200 bg-white p-4 transition-transform dark:border-gray-800 dark:bg-gray-900 md:static md:translate-x-0 ${isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}>
      <button
        onClick={async () => {
          await onNewSession();
          setIsOpen(false);
        }}
        className="mb-4 flex w-full items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
      >
        + Nouvelle discussion
      </button>

      <div className="flex-1 overflow-y-auto space-y-1">
        {sessions.map((session) => (
          <div
            key={session.id}
            className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors ${
              session.id === activeSessionId
                ? "bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-white font-medium"
                : "text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-850"
            }`}
          >
            {editingSessionId === session.id ? (
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onBlur={() => handleRenameSave(session.id)}
                onKeyDown={(e) => e.key === "Enter" && handleRenameSave(session.id)}
                className="w-full bg-transparent border-b border-blue-500 focus:outline-none text-gray-900 dark:text-white"
                autoFocus
              />
            ) : (
              <span onClick={() => onSelectSession(session.id)} className="flex-1 truncate cursor-pointer">
                {session.title}
              </span>
            )}

            <div className="flex items-center space-x-1 md:opacity-100 opacity-0 group-hover:opacity-100">
              <button onClick={() => { setEditingSessionId(session.id); setEditTitle(session.title); }} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">✏️</button>
              <button onClick={() => onDeleteSession(session.id)} className="p-1 text-gray-400 hover:text-red-500">🗑️</button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-800 space-y-2">
        <button
          onClick={() => setDarkMode(!darkMode)}
          className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-850"
        >
          <span>Mode Sombre</span>
          <span>{darkMode ? "🌙" : "☀️"}</span>
        </button>
        {sessions.length > 0 && (
          <button onClick={onClearAll} className="flex w-full items-center justify-center rounded-lg border border-red-200 px-3 py-2 text-sm text-red-600 hover:bg-red-50">
            Tout effacer
          </button>
        )}
      </div>
    </div>
  );
}