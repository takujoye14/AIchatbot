import React, { useState, useEffect } from "react";
import Sidebar from "./components/Sidebar";
import ChatWindow from "./components/ChatWindow";
import Login from "./components/Login";
import { ChatSession, Message, User } from "./types";

export default function App() {
  // User login state
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem("mistral_current_user");
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  // Load session history from localStorage, individualized per user
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    try {
      const savedUser = localStorage.getItem("mistral_current_user");
      if (savedUser) {
        const parsedUser = JSON.parse(savedUser);
        const userKey = `mistral_chat_sessions_${parsedUser.email.toLowerCase()}`;
        const saved = localStorage.getItem(userKey);
        return saved ? JSON.parse(saved) : [];
      }
      return [];
    } catch (e) {
      console.error("Failed to load sessions from local storage:", e);
      return [];
    }
  });

  // Load active session ID from localStorage, individualized per user
  const [activeSessionId, setActiveSessionId] = useState<string | null>(() => {
    try {
      const savedUser = localStorage.getItem("mistral_current_user");
      if (savedUser) {
        const parsedUser = JSON.parse(savedUser);
        const activeKey = `mistral_active_session_id_${parsedUser.email.toLowerCase()}`;
        return localStorage.getItem(activeKey) || null;
      }
      return null;
    } catch (e) {
      return null;
    }
  });

  // Load selected model from localStorage
  const [selectedModelId, setSelectedModelId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem("mistral_selected_model_id");
      return saved || "mistral-small-latest";
    } catch (e) {
      return "mistral-small-latest";
    }
  });

  // Load dark mode setting, fallback to system preference
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem("mistral_dark_mode");
      if (saved !== null) {
        return saved === "true";
      }
      return window.matchMedia("(prefers-color-scheme: dark)").matches;
    } catch (e) {
      return false;
    }
  });

  // Sidebar toggle state (for mobile drawers)
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Sync sessions to localStorage whenever they change, individualized per user
  useEffect(() => {
    if (!currentUser) return;
    try {
      const userKey = `mistral_chat_sessions_${currentUser.email.toLowerCase()}`;
      localStorage.setItem(userKey, JSON.stringify(sessions));
    } catch (e) {
      console.error("Failed to write sessions to local storage:", e);
    }
  }, [sessions, currentUser]);

  // Sync activeSessionId to localStorage, individualized per user
  useEffect(() => {
    if (!currentUser) return;
    const activeKey = `mistral_active_session_id_${currentUser.email.toLowerCase()}`;
    if (activeSessionId) {
      localStorage.setItem(activeKey, activeSessionId);
    } else {
      localStorage.removeItem(activeKey);
    }
  }, [activeSessionId, currentUser]);

  // Sync selected model to localStorage
  useEffect(() => {
    localStorage.setItem("mistral_selected_model_id", selectedModelId);
  }, [selectedModelId]);

  // Handle setting/removing HTML "dark" class
  useEffect(() => {
    try {
      localStorage.setItem("mistral_dark_mode", String(darkMode));
      if (darkMode) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    } catch (e) {
      console.error("Failed to apply dark mode class:", e);
    }
  }, [darkMode]);

  // Find currently active session
  const activeSession = sessions.find((s) => s.id === activeSessionId) || null;

  // Create a new session
  const createNewSession = (): string => {
    const newId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newSession: ChatSession = {
      id: newId,
      title: "Nouvelle Discussion",
      messages: [],
      model: selectedModelId,
      createdAt: Date.now(),
    };
    setSessions((prev) => [newSession, ...prev]);
    setActiveSessionId(newId);
    return newId;
  };

  const handleSelectSession = (id: string) => {
    setActiveSessionId(id);
  };

  const handleDeleteSession = (id: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== id));
    if (activeSessionId === id) {
      const remaining = sessions.filter((s) => s.id !== id);
      setActiveSessionId(remaining.length > 0 ? remaining[0].id : null);
    }
  };

  const handleRenameSession = (id: string, newTitle: string) => {
    setSessions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, title: newTitle } : s))
    );
  };

  const handleClearAll = () => {
    setSessions([]);
    setActiveSessionId(null);
  };

  const handleSendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;

    // 1. Determine or create active session
    let currentSessionId = activeSessionId;
    let isBrandNewSession = false;
    let existingMessages: Message[] = [];

    if (!currentSessionId || !activeSession) {
      currentSessionId = createNewSession();
      isBrandNewSession = true;
      existingMessages = [];
    } else {
      existingMessages = activeSession.messages;
    }

    const userMsg: Message = {
      id: `msg_${Date.now()}_user`,
      role: "user",
      content,
      timestamp: Date.now(),
    };

    const targetSessionMessages = [...existingMessages, userMsg];

    // Optimistically update session messages in state
    setSessions((prev) =>
      prev.map((s) => {
        if (s.id === currentSessionId) {
          // If session was "Nouvelle Discussion", automatically rename it to a snippet of the first prompt
          let newTitle = s.title;
          if (s.title === "Nouvelle Discussion" || isBrandNewSession) {
            newTitle = content.length > 30 ? `${content.substring(0, 30).trim()}...` : content;
          }

          return {
            ...s,
            title: newTitle,
            messages: targetSessionMessages,
          };
        }
        return s;
      })
    );

    setIsLoading(true);

    try {
      // 2. Call local full-stack endpoint with stream option
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: selectedModelId,
          messages: targetSessionMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          stream: true,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.details || "Échec de la récupération de la réponse du serveur Mistral AI.");
      }

      // Check if standard web stream reader is available
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("Aucun flux de données reçu du serveur.");
      }

      // Initialize empty assistant message in state
      const assistantMsgId = `msg_${Date.now()}_assistant`;
      const initialAssistantMsg: Message = {
        id: assistantMsgId,
        role: "assistant",
        content: "",
        timestamp: Date.now(),
      };

      setSessions((prev) =>
        prev.map((s) => {
          if (s.id === currentSessionId) {
            return {
              ...s,
              messages: [...s.messages, initialAssistantMsg],
            };
          }
          return s;
        })
      );

      const decoder = new TextDecoder();
      let assistantContent = "";
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;

        // Process SSE formatted chunks line by line
        const lines = buffer.split("\n");
        // Keep the last partial line in buffer
        buffer = lines.pop() || "";

        for (const line of lines) {
          const cleanLine = line.trim();
          if (!cleanLine) continue;
          if (cleanLine === "data: [DONE]") continue;

          if (cleanLine.startsWith("data: ")) {
            const jsonStr = cleanLine.substring(6);
            try {
              const parsed = JSON.parse(jsonStr);
              const deltaContent = parsed.choices?.[0]?.delta?.content || "";
              if (deltaContent) {
                assistantContent += deltaContent;
                // Update active assistant message content in real time
                setSessions((prev) =>
                  prev.map((s) => {
                    if (s.id === currentSessionId) {
                      return {
                        ...s,
                        messages: s.messages.map((m) =>
                          m.id === assistantMsgId ? { ...m, content: assistantContent } : m
                        ),
                      };
                    }
                    return s;
                  })
                );
              }
            } catch (e) {
              // Ignore incomplete lines/parsing errors for temporary stream chunks
            }
          }
        }
      }

      // Handle any remaining data in the buffer
      if (buffer && buffer.startsWith("data: ")) {
        const cleanLine = buffer.trim();
        if (cleanLine !== "data: [DONE]" && cleanLine.startsWith("data: ")) {
          const jsonStr = cleanLine.substring(6);
          try {
            const parsed = JSON.parse(jsonStr);
            const deltaContent = parsed.choices?.[0]?.delta?.content || "";
            if (deltaContent) {
              assistantContent += deltaContent;
              setSessions((prev) =>
                prev.map((s) => {
                  if (s.id === currentSessionId) {
                    return {
                      ...s,
                      messages: s.messages.map((m) =>
                        m.id === assistantMsgId ? { ...m, content: assistantContent } : m
                      ),
                    };
                  }
                  return s;
                })
              );
            }
          } catch (e) {
            // Ignored
          }
        }
      }

    } catch (err: any) {
      console.error("API Call failed:", err);
      
      const errorMsg: Message = {
        id: `msg_${Date.now()}_error`,
        role: "assistant",
        content: `⚠️ **Erreur de Service:** ${err.message || "Une erreur inattendue est survenue lors de la communication avec le moteur Mistral AI."}\n\n*Veuillez vérifier que le serveur de développement est actif et que votre connexion réseau est opérationnelle.*`,
        timestamp: Date.now(),
      };

      setSessions((prev) =>
        prev.map((s) => {
          if (s.id === currentSessionId) {
            return {
              ...s,
              messages: [...s.messages, errorMsg],
            };
          }
          return s;
        })
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem("mistral_current_user", JSON.stringify(user));

    // Load user-specific sessions and active session
    const userKey = `mistral_chat_sessions_${user.email.toLowerCase()}`;
    try {
      const saved = localStorage.getItem(userKey);
      const loadedSessions = saved ? JSON.parse(saved) : [];
      setSessions(loadedSessions);

      const activeKey = `mistral_active_session_id_${user.email.toLowerCase()}`;
      const savedActiveId = localStorage.getItem(activeKey);
      if (savedActiveId && loadedSessions.some((s: ChatSession) => s.id === savedActiveId)) {
        setActiveSessionId(savedActiveId);
      } else {
        setActiveSessionId(loadedSessions.length > 0 ? loadedSessions[0].id : null);
      }
    } catch (e) {
      console.error("Failed to load user-specific sessions upon login:", e);
      setSessions([]);
      setActiveSessionId(null);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem("mistral_current_user");
    setSessions([]);
    setActiveSessionId(null);
  };

  if (!currentUser) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-gray-50 dark:bg-gray-950 font-sans">
      
      {/* Sidebar for Navigation and Settings */}
      <Sidebar
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelectSession={handleSelectSession}
        onNewSession={createNewSession}
        onDeleteSession={handleDeleteSession}
        onRenameSession={handleRenameSession}
        onClearAll={handleClearAll}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        isOpen={sidebarOpen}
        setIsOpen={setSidebarOpen}
      />

      {/* Primary Chat Activity Area */}
      <ChatWindow
        session={activeSession}
        onSendMessage={handleSendMessage}
        isLoading={isLoading}
        selectedModelId={selectedModelId}
        onChangeModel={setSelectedModelId}
        onToggleSidebar={() => setSidebarOpen(true)}
        currentUser={currentUser}
        onLogout={handleLogout}
        onUpdateUser={handleLogin}
      />
    </div>
  );
}
