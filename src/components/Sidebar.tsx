import React, { useState } from "react";
import { 
  MessageSquare, 
  Plus, 
  Trash2, 
  Edit3, 
  Check, 
  X, 
  Sun, 
  Moon, 
  Sparkles, 
  Database,
  Terminal,
  LogOut
} from "lucide-react";
import { ChatSession } from "../types";

interface SidebarProps {
  sessions: ChatSession[];
  activeSessionId: string | null;
  onSelectSession: (id: string) => void;
  onNewSession: () => void;
  onDeleteSession: (id: string) => void;
  onRenameSession: (id: string, newTitle: string) => void;
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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [showConfirmClear, setShowConfirmClear] = useState(false);

  const startRename = (e: React.MouseEvent, session: ChatSession) => {
    e.stopPropagation();
    setEditingId(session.id);
    setEditTitle(session.title);
  };

  const saveRename = (e: React.MouseEvent | React.KeyboardEvent, id: string) => {
    e.stopPropagation();
    if (editTitle.trim()) {
      onRenameSession(id, editTitle.trim());
    }
    setEditingId(null);
  };

  const cancelRename = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(null);
  };

  return (
    <>
      {/* Mobile Sidebar Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden transition-opacity duration-300"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside
        id="sidebar"
        className={`
          fixed inset-y-0 left-0 z-50 flex flex-col w-72 border-r bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-900
          transition-transform duration-300 lg:static lg:translate-x-0
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        {/* Header with New Chat Button */}
        <div className="p-4 flex flex-col gap-4">
          <div className="flex items-center gap-2 px-1 py-1">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-orange-600 text-white shadow-md shadow-orange-500/20">
              <Sparkles size={16} className="animate-pulse" />
            </div>
            <div>
              <h1 className="text-sm font-bold bg-gradient-to-r from-zinc-900 to-zinc-700 dark:from-zinc-100 dark:to-zinc-300 bg-clip-text text-transparent">
                Mistral Chat
              </h1>
              <p className="text-[9px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest font-mono">
                API Client Active
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              onNewSession();
              setIsOpen(false); // Close on mobile after selection
            }}
            className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 bg-white hover:bg-zinc-100 dark:bg-zinc-900/40 dark:hover:bg-zinc-900/80 font-medium text-sm transition-all shadow-xs cursor-pointer"
          >
            <Plus size={16} className="text-orange-600 dark:text-orange-500" />
            <span>Nouvelle Discussion</span>
          </button>
        </div>

        {/* Scrollable Conversation List */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
          <div className="px-3 py-1.5 text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider select-none">
            Conversations ({sessions.length})
          </div>

          {sessions.length === 0 ? (
            <div className="px-3 py-8 text-center text-xs text-zinc-400 dark:text-zinc-500 flex flex-col items-center justify-center gap-2">
              <MessageSquare size={20} className="opacity-40" />
              <span>Aucune discussion pour l'instant. Écrivez un message pour commencer !</span>
            </div>
          ) : (
            <div className="space-y-0.5">
              {sessions.map((session) => {
                const isActive = session.id === activeSessionId;
                const isEditing = session.id === editingId;

                return (
                  <div
                    key={session.id}
                    onClick={() => {
                      if (!isEditing) {
                        onSelectSession(session.id);
                        setIsOpen(false); // Close on mobile after selection
                      }
                    }}
                    className={`
                      group relative flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer select-none
                      ${isActive 
                        ? "bg-zinc-200/50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs border border-zinc-300/40 dark:border-zinc-800/40" 
                        : "text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100/60 dark:hover:bg-zinc-900/30 hover:text-zinc-850 dark:hover:text-zinc-200"}
                    `}
                  >
                    <MessageSquare 
                      size={15} 
                      className={`shrink-0 ${isActive ? "text-orange-600 dark:text-orange-500" : "text-zinc-400 dark:text-zinc-500 group-hover:text-zinc-600 dark:group-hover:text-zinc-300"}`} 
                    />

                    {isEditing ? (
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && saveRename(e as any, session.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="flex-1 bg-white dark:bg-zinc-950 border border-orange-500 dark:border-orange-500 text-xs py-0.5 px-1.5 rounded focus:outline-none dark:text-zinc-100 font-sans"
                        autoFocus
                      />
                    ) : (
                      <span className="flex-1 truncate pr-16 text-xs">{session.title}</span>
                    )}

                    {/* Action Buttons */}
                    <div className="absolute right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                      {isEditing ? (
                        <>
                          <button
                            onClick={(e) => saveRename(e, session.id)}
                            className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 text-emerald-600 dark:text-emerald-400 cursor-pointer"
                          >
                            <Check size={14} />
                          </button>
                          <button
                            onClick={cancelRename}
                            className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400 cursor-pointer"
                          >
                            <X size={14} />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={(e) => startRename(e, session)}
                            className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
                            title="Renommer la discussion"
                          >
                            <Edit3 size={13} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteSession(session.id);
                            }}
                            className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-950/40 text-zinc-400 hover:text-red-500 dark:hover:text-red-400 cursor-pointer"
                            title="Supprimer la discussion"
                          >
                            <Trash2 size={13} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer Area */}
        <div className="p-4 border-t border-zinc-200 dark:border-zinc-900 space-y-3.5 bg-zinc-50 dark:bg-zinc-950">
          
          {/* Guest Developer Profile Block */}
          <div className="flex items-center gap-3 p-1.5 rounded-lg border border-zinc-200/50 dark:border-zinc-900 bg-white/40 dark:bg-zinc-900/20">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-orange-500 to-rose-500 shrink-0 shadow-sm" />
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 truncate">Développeur Invité</span>
              <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-mono">Mistral 7B Pro</span>
            </div>
          </div>

          {/* Actions Toolbar */}
          {sessions.length > 0 && (
            <div className="flex items-center justify-between gap-2">
              <button
                onClick={() => setShowConfirmClear(true)}
                className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold border border-zinc-200 dark:border-zinc-850 text-zinc-500 hover:text-red-600 dark:text-zinc-400 dark:hover:text-red-400 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 transition-all cursor-pointer shadow-xs"
                title="Effacer toutes les discussions"
              >
                <Trash2 size={13} className="text-red-500 dark:text-red-400" />
                <span>Effacer les Discussions</span>
              </button>
            </div>
          )}

          {/* Connection Status & Security Assurance */}
          <div className="p-2.5 rounded-xl bg-white dark:bg-zinc-900/50 border border-zinc-200/50 dark:border-zinc-900 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>Statut de l'Agent Mistral</span>
            </div>
            <span className="text-[9px] font-bold font-mono px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
              SÉCURISÉ
            </span>
          </div>

          {/* Confirmation Overlay Modal for Clearing Chats */}
          {showConfirmClear && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
              <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 max-w-sm w-full border border-zinc-200 dark:border-zinc-800 shadow-xl animate-in fade-in zoom-in duration-200">
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 mb-2">
                  Effacer toutes les discussions ?
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-6 leading-relaxed">
                  Cette action est irréversible et supprimera tout l'historique des conversations stockées localement. Êtes-vous sûr de vouloir continuer ?
                </p>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowConfirmClear(false)}
                    className="flex-1 py-2 px-3 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs font-semibold hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 cursor-pointer"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={() => {
                      onClearAll();
                      setShowConfirmClear(false);
                    }}
                    className="flex-1 py-2 px-3 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold cursor-pointer shadow-sm shadow-red-600/10"
                  >
                    Confirmer la suppression
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
