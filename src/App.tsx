import React, { useState, useEffect } from "react";
import Sidebar from "./components/Sidebar";
import ChatWindow from "./components/ChatWindow";
import Login from "./components/Login";
import { ChatSession, Message, User } from "./types";

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem("mistral_current_user");
    return saved ? JSON.parse(saved) : null;
  });

  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [selectedModelId, setSelectedModelId] = useState(() => localStorage.getItem("mistral_selected_model_id") || "mistral-small-latest");
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem("mistral_dark_mode") === "true");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Charger les sessions de l'utilisateur depuis Supabase
  useEffect(() => {
    if (!currentUser?.id) return;
    const fetchConvs = async () => {
      try {
        const res = await fetch(`/api/conversations?userId=${currentUser.id}`);
        if (res.ok) {
          const data = await res.json();
          const mapped: ChatSession[] = data.map((c: any) => ({
            id: c.id,
            title: c.title,
            messages: [],
            model: selectedModelId,
            createdAt: new Date(c.created_at).getTime()
          }));
          setSessions(mapped);
          if (mapped.length > 0) setActiveSessionId(mapped[0].id);
        }
      } catch (e) {
        console.error(e);
      }
    };
    fetchConvs();
  }, [currentUser]);

  // Charger l'historique des messages de la session active
  useEffect(() => {
    if (!activeSessionId || !currentUser) return;
    const fetchMsgs = async () => {
      try {
        const res = await fetch(`/api/conversations/${activeSessionId}/messages`);
        if (res.ok) {
          const data = await res.json();
          const mapped: Message[] = data.map((m: any) => ({
            id: m.id,
            role: m.role,
            content: m.content,
            timestamp: new Date(m.created_at).getTime()
          }));
          setSessions(prev => prev.map(s => s.id === activeSessionId ? { ...s, messages: mapped } : s));
        }
      } catch (e) {
        console.error(e);
      }
    };
    fetchMsgs();
  }, [activeSessionId]);

  useEffect(() => {
    localStorage.setItem("mistral_selected_model_id", selectedModelId);
  }, [selectedModelId]);

  useEffect(() => {
    localStorage.setItem("mistral_dark_mode", String(darkMode));
    if (darkMode) document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
  }, [darkMode]);

  const createNewSession = async (): Promise<string> => {
    if (!currentUser?.id) return "";
    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentUser.id, title: "Nouvelle Discussion" })
      });
      if (!res.ok) return "";
      const newConv = await res.json();
      const newSession: ChatSession = {
        id: newConv.id,
        title: newConv.title,
        messages: [],
        model: selectedModelId,
        createdAt: new Date(newConv.created_at).getTime()
      };
      setSessions(prev => [newSession, ...prev]);
      setActiveSessionId(newConv.id);
      return newConv.id;
    } catch (e) {
      console.error(e);
      return "";
    }
  };

  const handleSendMessage = async (content: string) => {
    if (!content.trim() || isLoading || !currentUser?.id) return;

    let currentId = activeSessionId;
    if (!currentId || sessions.length === 0) {
      currentId = await createNewSession();
      if (!currentId) return;
    }

    const currentSession = sessions.find(s => s.id === currentId);
    const prevMsgs = currentSession ? currentSession.messages : [];

    const userMsg: Message = { id: `u_${Date.now()}`, role: "user", content, timestamp: Date.now() };
    const nextMsgs = [...prevMsgs, userMsg];

    setSessions(prev => prev.map(s => {
      if (s.id === currentId) {
        const updatedTitle = s.title === "Nouvelle Discussion" ? (content.substring(0, 30) + "...") : s.title;
        return { ...s, title: updatedTitle, messages: nextMsgs };
      }
      return s;
    }));

    setIsLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: selectedModelId,
          messages: nextMsgs.map(m => ({ role: m.role, content: m.content })),
          stream: true,
          conversationId: currentId,
          userId: currentUser.id
        })
      });

      if (!res.ok) throw new Error("Erreur de transmission");

      const reader = res.body?.getReader();
      if (!reader) throw new Error("Flux indisponible");

      const assistantMsgId = `a_${Date.now()}`;
      setSessions(prev => prev.map(s => s.id === currentId ? {
        ...s,
        messages: [...s.messages, { id: assistantMsgId, role: "assistant", content: "", timestamp: Date.now() }]
      } : s));

      const decoder = new TextDecoder();
      let assistantText = "";
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const clean = line.trim();
          if (clean.startsWith("data: ") && !clean.includes("[DONE]")) {
            try {
              const parsed = JSON.parse(clean.substring(6));
              const txt = parsed.choices?.[0]?.delta?.content || "";
              if (txt) {
                assistantText += txt;
                setSessions(prev => prev.map(s => s.id === currentId ? {
                  ...s,
                  messages: s.messages.map(m => m.id === assistantMsgId ? { ...m, content: assistantText } : m)
                } : s));
              }
            } catch (e) {}
          }
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!currentUser) return <Login onLogin={(u) => { setCurrentUser(u); localStorage.setItem("mistral_current_user", JSON.stringify(u)); }} />;

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-gray-50 dark:bg-gray-950 font-sans antialiased text-gray-900 dark:text-gray-100">
      <Sidebar
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelectSession={setActiveSessionId}
        onNewSession={createNewSession}
        onDeleteSession={(id) => setSessions(p => p.filter(s => s.id !== id))}
        onRenameSession={(id, t) => setSessions(p => p.map(s => s.id === id ? { ...s, title: t } : s))}
        onClearAll={() => { setSessions([]); setActiveSessionId(null); }}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        isOpen={sidebarOpen}
        setIsOpen={setSidebarOpen}
      />
      <ChatWindow
        session={sessions.find(s => s.id === activeSessionId) || null}
        onSendMessage={handleSendMessage}
        isLoading={isLoading}
        selectedModelId={selectedModelId}
        onChangeModel={setSelectedModelId}
        onToggleSidebar={() => setSidebarOpen(true)}
        currentUser={currentUser}
        onLogout={() => { setCurrentUser(null); localStorage.removeItem("mistral_current_user"); setSessions([]); setActiveSessionId(null); }}
        onUpdateUser={setCurrentUser}
      />
    </div>
  );
}