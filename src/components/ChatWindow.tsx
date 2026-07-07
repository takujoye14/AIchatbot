import React, { useState, useRef, useEffect } from "react";
import { Message, User } from "../types";

const MISTRAL_MODELS = [
  { id: "mistral-small-latest", name: "Mistral Small" },
  { id: "mistral-medium-latest", name: "Mistral Medium" },
  { id: "mistral-large-latest", name: "Mistral Large" },
  { id: "pixtral-12b-2409", name: "Pixtral (12B)" },
  { id: "open-mistral-7b", name: "Mistral 7B" }
];

const STARTER_SUGGESTIONS = [
  { label: "Explique le RLS dans Supabase", icon: "🔒" },
  { label: "Écris une route Express en TypeScript", icon: "🚀" },
  { label: "Optimise un state React", icon: "⚛️" }
];

interface ChatWindowProps {
  session: { id: string; title: string; messages: Message[] } | null;
  onSendMessage: (content: string) => void;
  isLoading: boolean;
  selectedModelId: string;
  onChangeModel: (modelId: string) => void;
  onToggleSidebar: () => void;
  currentUser: User;
  onLogout: () => void;
  onUpdateUser: (user: User) => void;
}

export default function ChatWindow({
  session,
  onSendMessage,
  isLoading,
  selectedModelId,
  onChangeModel,
  onToggleSidebar,
  currentUser,
  onLogout,
}: ChatWindowProps) {
  const [input, setInput] = useState("");
  const [showPromptModal, setShowPromptModal] = useState(false);
  const [masterPrompt, setMasterPrompt] = useState("");
  const [isSavingPrompt, setIsSavingPrompt] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const fetchMasterPrompt = async () => {
    try {
      const response = await fetch(`/api/prompt?userId=${currentUser.id}`);
      if (response.ok) {
        const data = await response.json();
        setMasterPrompt(data.masterPrompt);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const saveMasterPrompt = async () => {
    setIsSavingPrompt(true);
    try {
      const response = await fetch("/api/prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentUser.id, prompt: masterPrompt }),
      });
      if (response.ok) setShowPromptModal(false);
    } catch (error) {
      console.error(error);
    } finally {
      setIsSavingPrompt(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    onSendMessage(input.trim());
    setInput("");
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [session?.messages, isLoading]);

  return (
    <div className="flex flex-1 flex-col h-full bg-white dark:bg-gray-900 transition-colors">
      {/* Header d'origine */}
      <header className="flex h-16 items-center justify-between border-b border-gray-200 px-4 dark:border-gray-800 bg-white dark:bg-gray-900">
        <div className="flex items-center space-x-3">
          <button onClick={onToggleSidebar} className="rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-800 md:hidden">
            ☰
          </button>
          <select
            value={selectedModelId}
            onChange={(e) => onChangeModel(e.target.value)}
            className="rounded-lg border border-gray-300 bg-transparent px-3 py-1.5 text-sm font-medium text-gray-700 focus:outline-none dark:border-gray-700 dark:text-gray-300"
          >
            {MISTRAL_MODELS.map((m) => (
              <option key={m.id} value={m.id} className="dark:bg-gray-900">
                {m.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => { fetchMasterPrompt(); setShowPromptModal(true); }}
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 transition-colors"
          >
            ⚙️ System Prompt
          </button>
          <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
            {currentUser.username}
          </span>
          <button onClick={onLogout} className="rounded-lg p-2 text-gray-400 hover:text-red-500">
            🚪
          </button>
        </div>
      </header>

      {/* Zone de messages d'origine */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {!session || session.messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <h1 className="mb-2 text-2xl font-bold text-gray-800 dark:text-white">
              Que puis-je faire pour toi aujourd'hui ?
            </h1>
            <p className="mb-8 text-sm text-gray-500 dark:text-gray-400">
              Pose une question ou sélectionne un sujet de départ.
            </p>
            <div className="grid w-full max-w-lg grid-cols-1 gap-2 sm:grid-cols-3">
              {STARTER_SUGGESTIONS.map((s, idx) => (
                <button
                  key={idx}
                  onClick={() => onSendMessage(s.label)}
                  className="flex flex-col items-start rounded-xl border border-gray-200 p-3 text-left hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-850 transition-colors"
                >
                  <span className="mb-1 text-lg">{s.icon}</span>
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{s.label}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-3xl space-y-4">
            {session.messages.map((m) => (
              <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                    m.role === "user"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
                  }`}
                >
                  <div className="whitespace-pre-wrap">{m.content}</div>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="rounded-2xl bg-gray-100 px-4 py-2.5 dark:bg-gray-800">
                  <span className="flex space-x-1">
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.3s]"></span>
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.15s]"></span>
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400"></span>
                  </span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Boîte d'envoi d'origine */}
      <footer className="border-t border-gray-200 p-4 dark:border-gray-800 bg-white dark:bg-gray-900">
        <form onSubmit={handleSubmit} className="mx-auto flex max-w-3xl space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Envoyer un message à Mistral..."
            disabled={isLoading}
            className="flex-1 rounded-xl border border-gray-300 bg-transparent px-4 py-3 text-sm text-gray-900 focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:text-white"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-medium text-white hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-800 transition-colors"
          >
            Envoyer
          </button>
        </form>
      </footer>

      {/* Modal Prompt */}
      {showPromptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900 border dark:border-gray-800">
            <h2 className="mb-2 text-lg font-bold text-gray-900 dark:text-white">Configuration du System Prompt</h2>
            <p className="mb-4 text-xs text-gray-500 dark:text-gray-400">Modifiez les instructions de comportement fondamentales de votre agent.</p>
            <textarea
              value={masterPrompt}
              onChange={(e) => setMasterPrompt(e.target.value)}
              rows={6}
              className="w-full rounded-xl border border-gray-300 bg-transparent p-3 text-sm text-gray-900 focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:text-white"
            />
            <div className="mt-4 flex justify-end space-x-2">
              <button onClick={() => setShowPromptModal(false)} className="rounded-xl px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800">Annuler</button>
              <button onClick={saveMasterPrompt} disabled={isSavingPrompt} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">{isSavingPrompt ? "Sauvegarde..." : "Enregistrer"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}