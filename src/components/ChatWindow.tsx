import React, { useState, useRef, useEffect } from "react";
import { 
  Send, 
  Menu, 
  Bot, 
  User as UserIcon, 
  Sparkles, 
  Cpu, 
  ArrowDown, 
  Terminal, 
  ChevronDown,
  Code,
  FileText,
  Compass,
  AlertTriangle,
  FileSpreadsheet,
  Eye,
  X,
  Loader2,
  Settings,
  Lock,
  Unlock,
  Save,
  LogOut,
  ShieldCheck,
  Info
} from "lucide-react";
import * as XLSX from "xlsx";
import { ChatSession, MISTRAL_MODELS, STARTER_SUGGESTIONS, Message, User } from "../types";
import MarkdownRenderer from "./MarkdownRenderer";
import ProfileModal from "./ProfileModal";

interface ChatWindowProps {
  session: ChatSession | null;
  onSendMessage: (content: string) => void;
  isLoading: boolean;
  selectedModelId: string;
  onChangeModel: (modelId: string) => void;
  onToggleSidebar: () => void;
  currentUser: User | null;
  onLogout: () => void;
  onUpdateUser: (updatedUser: User) => void;
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
  onUpdateUser,
}: ChatWindowProps) {
  const [inputText, setInputText] = useState("");
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [maskedKey, setMaskedKey] = useState("4tiN...EGTt");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // States for user profile
  const [showProfileModal, setShowProfileModal] = useState(false);

  // States for Master Prompt configuration
  const [masterPrompt, setMasterPrompt] = useState("");
  const [tempPrompt, setTempPrompt] = useState("");
  const [showPromptModal, setShowPromptModal] = useState(false);
  const [isSavingPrompt, setIsSavingPrompt] = useState(false);

  // States for Excel Import
  const [excelAttachment, setExcelAttachment] = useState<{
    fileName: string;
    fileSize: string;
    sheets: {
      name: string;
      rows: any[][];
      markdown: string;
    }[];
  } | null>(null);
  const [isReadingExcel, setIsReadingExcel] = useState(false);
  const [showAttachmentPreview, setShowAttachmentPreview] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeModel = MISTRAL_MODELS.find(m => m.id === selectedModelId) || MISTRAL_MODELS[0];

  // Helper to convert sheet rows matrix to markdown table format
  const convertSheetToMarkdown = (sheetData: any[][]): string => {
    if (!sheetData || sheetData.length === 0) return "";
    const maxCols = Math.max(...sheetData.map(row => (row ? row.length : 0)));
    if (maxCols === 0) return "";

    const formattedRows = sheetData.map(row => {
      const newRow = Array(maxCols).fill("");
      for (let i = 0; i < maxCols; i++) {
        const cellVal = row ? row[i] : "";
        newRow[i] = cellVal !== undefined && cellVal !== null ? String(cellVal).replace(/\|/g, "\\|").trim() : "";
      }
      return newRow;
    });

    const headers = formattedRows[0].map((h, i) => h || `Colonne ${i + 1}`);
    const dataRows = formattedRows.slice(1);

    const headerLine = `| ${headers.join(" | ")} |`;
    const separatorLine = `| ${Array(maxCols).fill("---").join(" | ")} |`;
    const contentLines = dataRows.map(row => `| ${row.join(" | ")} |`);

    return [headerLine, separatorLine, ...contentLines].join("\n");
  };

  const handleExcelImport = (file: File) => {
    const isExcel = file.name.endsWith(".xlsx") || file.name.endsWith(".xls") || file.name.endsWith(".csv");
    if (!isExcel) {
      alert("Format non supporté. Veuillez importer un document Excel (.xlsx, .xls) ou un fichier CSV.");
      return;
    }

    setIsReadingExcel(true);
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const parsedSheets: { name: string; rows: any[][]; markdown: string }[] = [];

        workbook.SheetNames.forEach((sheetName) => {
          const worksheet = workbook.Sheets[sheetName];
          const rows = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });
          if (rows && rows.length > 0) {
            const cleanRows = rows.filter(row => row && row.length > 0);
            if (cleanRows.length > 0) {
              const markdown = convertSheetToMarkdown(cleanRows);
              parsedSheets.push({
                name: sheetName,
                rows: cleanRows,
                markdown
              });
            }
          }
        });

        if (parsedSheets.length === 0) {
          alert("Le document Excel semble vide ou illisible.");
          setIsReadingExcel(false);
          return;
        }

        const sizeFormatted = file.size > 1024 * 1024 
          ? `${(file.size / (1024 * 1024)).toFixed(1)} MB` 
          : `${(file.size / 1024).toFixed(1)} KB`;

        setExcelAttachment({
          fileName: file.name,
          fileSize: sizeFormatted,
          sheets: parsedSheets
        });
        setShowAttachmentPreview(true);
      } catch (err) {
        console.error("Error reading Excel:", err);
        alert("Erreur lors de la lecture du fichier Excel. Assurez-vous qu'il n'est pas corrompu.");
      } finally {
        setIsReadingExcel(false);
      }
    };

    reader.readAsArrayBuffer(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleExcelImport(file);
    }
  };

  // Fetch the active configuration and master prompt from backend
  useEffect(() => {
    fetch("/api/config")
      .then((res) => res.json())
      .then((data) => {
        if (data && data.maskedKey && data.maskedKey !== "None") {
          setMaskedKey(data.maskedKey);
        }
      })
      .catch((err) => console.error("Failed to load active API key configuration mask:", err));

    fetch("/api/prompt")
      .then((res) => res.json())
      .then((data) => {
        if (data && data.masterPrompt) {
          setMasterPrompt(data.masterPrompt);
          setTempPrompt(data.masterPrompt);
        }
      })
      .catch((err) => console.error("Failed to load master prompt:", err));
  }, []);

  const handleSaveMasterPrompt = async () => {
    setIsSavingPrompt(true);
    try {
      const response = await fetch("/api/prompt", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt: tempPrompt }),
      });
      if (response.ok) {
        const data = await response.json();
        if (data && data.masterPrompt) {
          setMasterPrompt(data.masterPrompt);
          setTempPrompt(data.masterPrompt);
        }
        setShowPromptModal(false);
      } else {
        alert("Erreur lors de la mise à jour du Master Prompt.");
      }
    } catch (error) {
      console.error("Error saving master prompt:", error);
      alert("Erreur de connexion. Impossible d'enregistrer le Master Prompt.");
    } finally {
      setIsSavingPrompt(false);
    }
  };

  // Auto scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [session?.messages, isLoading]);

  // Click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowModelDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSend = () => {
    if ((!inputText.trim() && !excelAttachment) || isLoading) return;

    let finalPrompt = inputText.trim();

    if (excelAttachment) {
      let sheetsMarkdown = "";
      excelAttachment.sheets.forEach((sheet) => {
        const totalRows = sheet.rows.length;
        const rowsToSend = sheet.rows.slice(0, 150);
        const truncatedCount = totalRows - rowsToSend.length;

        sheetsMarkdown += `### Feuille : ${sheet.name} (${totalRows} lignes, ${sheet.rows[0]?.length || 0} colonnes)\n`;
        sheetsMarkdown += convertSheetToMarkdown(rowsToSend);

        if (truncatedCount > 0) {
          sheetsMarkdown += `\n\n*(Note : ${truncatedCount} lignes supplémentaires ont été tronquées pour optimiser l'envoi)*\n`;
        }
        sheetsMarkdown += "\n\n";
      });

      finalPrompt = `[Données du fichier Excel joint : ${excelAttachment.fileName} (${excelAttachment.fileSize})]
${sheetsMarkdown.trim()}
[Fin des données Excel]

${finalPrompt || "Analyse ce document Excel et fais-moi un résumé détaillé en français."}`;
    }

    onSendMessage(finalPrompt);
    setInputText("");
    setExcelAttachment(null);
    setShowAttachmentPreview(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const selectStarter = (prompt: string) => {
    onSendMessage(prompt);
  };

  // Helper to map suggestion icons
  const renderStarterIcon = (iconName: string) => {
    switch (iconName) {
      case "Sparkles": return <Sparkles size={16} />;
      case "Code": return <Code size={16} />;
      case "FileText": return <FileText size={16} />;
      case "Compass": return <Compass size={16} />;
      default: return <Sparkles size={16} />;
    }
  };

  return (
    <div 
      id="chat-window-container" 
      className="flex-1 flex flex-col h-full bg-zinc-100/50 dark:bg-zinc-900 overflow-hidden relative"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isDragging && (
        <div className="absolute inset-0 bg-zinc-950/80 backdrop-blur-xs z-50 flex flex-col items-center justify-center p-6 border-4 border-dashed border-emerald-500 rounded-2xl m-4 pointer-events-none transition-all animate-in fade-in duration-200">
          <div className="p-4 rounded-full bg-emerald-500/10 text-emerald-400 mb-4 animate-bounce">
            <FileSpreadsheet size={48} />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">Déposez votre fichier Excel ici</h3>
          <p className="text-sm text-zinc-400 text-center max-w-xs leading-relaxed">
            Glissez-déposez n'importe quel document .xlsx, .xls ou .csv pour l'importer et l'analyser avec Mistral.
          </p>
        </div>
      )}
      
      {/* Top Navigation Bar */}
      <header className="h-16 shrink-0 flex items-center justify-between px-4 border-b border-zinc-200 dark:border-zinc-900 bg-white dark:bg-zinc-950/80 backdrop-blur-md z-30">
        
        {/* Left Side: Mobile Menu Button & Model Selector */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleSidebar}
            className="lg:hidden p-2 rounded-lg text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-all cursor-pointer"
            title="Ouvrir le menu"
          >
            <Menu size={20} />
          </button>

          {/* Serif Logo and Token Mask from Design HTML */}
          <div className="flex items-center gap-2 mr-1">
            <span className="font-serif italic text-lg md:text-xl tracking-tight text-zinc-900 dark:text-white">Mistral</span>
            <span className="px-1.5 py-0.5 rounded border border-zinc-300 dark:border-zinc-800 text-[9px] text-zinc-500 dark:text-zinc-400 font-mono uppercase tracking-wider">
              {maskedKey}
            </span>
          </div>

          <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-800 hidden sm:block"></div>

          {/* Static Model Indicator Label */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-800 dark:text-zinc-200 text-xs font-semibold shadow-xs select-none">
            <Cpu size={13} className="text-orange-500 animate-pulse" />
            <span>{activeModel.name}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 font-mono">
              {activeModel.badge}
            </span>
          </div>
        </div>

        {/* Right Side: User profile, master prompt configuration button, logout */}
        <div className="flex items-center gap-3">
          {currentUser && (
            <div className="flex items-center gap-2">
              {/* User identity badge displaying name and email in bold black */}
              <button
                onClick={() => setShowProfileModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border-2 bg-yellow-50 hover:bg-yellow-100 border-black text-black transition-colors cursor-pointer shadow-sm"
                title="Gérer mon compte & Sécurité"
              >
                {currentUser.isAdmin ? (
                  <ShieldCheck size={14} className="text-emerald-700 shrink-0 stroke-[3] animate-pulse" />
                ) : (
                  <UserIcon size={14} className="text-zinc-900 shrink-0 stroke-[3]" />
                )}
                <span className="text-[11px] font-black truncate max-w-[120px] sm:max-w-[200px] text-black">
                  {currentUser.username} ({currentUser.email})
                </span>
                <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-black border border-black uppercase ${
                  currentUser.isAdmin 
                    ? "bg-emerald-100 text-emerald-950" 
                    : "bg-zinc-100 text-zinc-950"
                }`}>
                  {currentUser.isAdmin ? "Admin" : "Membre"}
                </span>
              </button>

              {/* Master Prompt Button - Bold Black theme */}
              <button
                onClick={() => {
                  setTempPrompt(masterPrompt);
                  setShowPromptModal(true);
                }}
                className={`p-1.5 px-3 rounded-xl border-2 transition-all duration-200 cursor-pointer flex items-center gap-1.5 text-xs font-black shadow-sm ${
                  currentUser.isAdmin
                    ? "bg-emerald-50 hover:bg-emerald-100 border-black text-black animate-pulse"
                    : "bg-white hover:bg-zinc-100 border-black text-black"
                }`}
                title={currentUser.isAdmin ? "Configurer le Master Prompt" : "Voir le Master Prompt actif"}
              >
                <Settings size={14} className={`stroke-[2.5] ${currentUser.isAdmin ? "animate-spin-slow text-emerald-700" : "text-black"}`} />
                <span className="hidden sm:inline uppercase tracking-wider">{currentUser.isAdmin ? "Master Prompt" : "Prompt IA"}</span>
              </button>

              {/* Logout Button */}
              <button
                onClick={onLogout}
                className="p-1.5 rounded-xl border-2 border-black bg-red-100 hover:bg-red-200 text-red-950 font-black transition-all cursor-pointer shadow-sm hover:scale-105 active:scale-95"
                title="Se déconnecter"
              >
                <LogOut size={14} className="stroke-[2.5]" />
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Message Area */}
      <div className="flex-1 overflow-y-auto px-4 py-6 md:px-8 space-y-6">
        {!session || session.messages.length === 0 ? (
          
          /* Welcome Stage & Quick Prompts */
          <div className="max-w-3xl mx-auto h-full flex flex-col justify-center items-center py-10 md:py-16 text-center select-none">
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-orange-500 via-orange-600 to-rose-600 text-white flex items-center justify-center shadow-lg shadow-orange-600/20 mb-6 relative animate-bounce-slow">
              <Bot size={32} />
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white dark:border-zinc-900" />
            </div>

            <h2 className="text-2xl md:text-3xl font-bold font-serif italic tracking-tight text-zinc-900 dark:text-zinc-100 mb-2">
              Comment puis-je vous aider aujourd'hui ?
            </h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-md mb-10 leading-relaxed">
              Posez vos questions, rédigez des documents, révisez de la logique ou générez du code avec le moteur ultra-performant de Mistral AI.
            </p>

            {/* Quick Prompt Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl text-left">
              {STARTER_SUGGESTIONS.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => selectStarter(suggestion.prompt)}
                  className="group p-4 rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 hover:border-orange-500 dark:hover:border-orange-600/80 text-left transition-all duration-300 hover:shadow-md cursor-pointer flex gap-3.5"
                >
                  <div className={`shrink-0 w-8 h-8 rounded-xl bg-gradient-to-br ${suggestion.color} text-white flex items-center justify-center shadow-xs`}>
                    {renderStarterIcon(suggestion.icon)}
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-zinc-800 dark:text-zinc-200 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
                      {suggestion.label}
                    </h4>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-500 leading-normal line-clamp-2">
                      {suggestion.prompt}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          
          /* Message List */
          <div className="max-w-3xl mx-auto space-y-6">
            {session.messages.map((message) => {
              const isUser = message.role === "user";
              
              return (
                <div
                  key={message.id}
                  className={`flex gap-4 ${isUser ? "justify-end" : "justify-start"} animate-in fade-in duration-300`}
                >
                  {/* Assistant Avatar */}
                  {!isUser && (
                    <div className="shrink-0 w-8 h-8 rounded-lg bg-orange-600 text-white flex items-center justify-center shadow-sm select-none">
                      <Bot size={16} />
                    </div>
                  )}

                  {/* Message Bubble */}
                  <div
                    className={`
                      max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-xs
                      ${isUser 
                        ? "bg-zinc-800 text-zinc-100 rounded-br-none border border-zinc-750" 
                        : "bg-white dark:bg-zinc-950 text-zinc-800 dark:text-zinc-200 border border-zinc-200/50 dark:border-zinc-850 rounded-bl-none"}
                    `}
                  >
                    {isUser ? (
                      (() => {
                        const hasExcel = message.content.includes("[Données du fichier Excel joint :");
                        if (hasExcel) {
                          const regex = /\[Données du fichier Excel joint : (.*?) \((.*?)\)\]\n([\s\S]*?)\n\[Fin des données Excel\]\n\n([\s\S]*)/;
                          const match = message.content.match(regex);
                          if (match) {
                            const fileName = match[1];
                            const fileSize = match[2];
                            const userPromptText = match[4];
                            
                            return (
                              <div className="space-y-3">
                                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/15 dark:bg-emerald-500/20 text-emerald-100 border border-emerald-500/20 max-w-sm">
                                  <FileSpreadsheet size={16} className="text-emerald-400 shrink-0" />
                                  <div className="flex flex-col min-w-0">
                                    <span className="text-xs font-bold text-emerald-200 truncate">{fileName}</span>
                                    <span className="text-[10px] text-emerald-400 font-mono">{fileSize} • Document Excel joint</span>
                                  </div>
                                </div>
                                <p className="whitespace-pre-wrap font-bold text-zinc-100">{userPromptText}</p>
                              </div>
                            );
                          }
                        }
                        return <p className="whitespace-pre-wrap font-bold text-zinc-100">{message.content}</p>;
                      })()
                    ) : (
                      <MarkdownRenderer content={message.content} />
                    )}

                    {/* Timestamp */}
                    <div className={`text-[10px] mt-1.5 text-right font-mono ${isUser ? "text-zinc-400" : "text-zinc-400 dark:text-zinc-500"}`}>
                      {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>

                  {/* User Avatar */}
                  {isUser && (
                    <div className="shrink-0 w-8 h-8 rounded-lg bg-zinc-200 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 flex items-center justify-center shadow-xs select-none">
                      <UserIcon size={16} />
                    </div>
                  )}
                </div>
              );
            })}

            {/* Typing Loader Skeleton */}
            {isLoading && (
              <div className="flex gap-4 justify-start animate-pulse">
                <div className="shrink-0 w-8 h-8 rounded-lg bg-orange-600 text-white flex items-center justify-center shadow-sm">
                  <Bot size={16} />
                </div>
                <div className="bg-white dark:bg-zinc-950 text-zinc-800 dark:text-zinc-200 border border-zinc-200/50 dark:border-zinc-850 rounded-2xl rounded-bl-none px-4 py-4 max-w-[85%] min-w-[120px] shadow-xs">
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-orange-600 dark:bg-orange-500 rounded-full animate-bounce duration-300" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-orange-600 dark:bg-orange-500 rounded-full animate-bounce duration-300" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 bg-orange-600 dark:bg-orange-500 rounded-full animate-bounce duration-300" style={{ animationDelay: '300ms' }} />
                  </div>
                  <span className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-2 block font-mono select-none">
                    Mistral réfléchit...
                  </span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Action Panel */}
      <footer className="p-4 border-t border-zinc-200 dark:border-zinc-900 bg-white dark:bg-zinc-950/80 backdrop-blur-md shrink-0">
        <div className="max-w-3xl mx-auto">
          
          {/* Input Box Wrapper */}
          <div className="relative rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 focus-within:border-orange-500 dark:focus-within:border-orange-500 focus-within:ring-2 focus-within:ring-orange-100 dark:focus-within:ring-orange-950/20 shadow-xs transition-all flex flex-col">
            
            {/* Live Excel Attachment Preview Block */}
            {excelAttachment && (
              <div className="flex flex-col border-b border-zinc-200/60 dark:border-zinc-800/80 bg-emerald-500/5 dark:bg-emerald-950/10 p-3 rounded-t-2xl animate-in slide-in-from-top-1 duration-200">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="p-2 rounded-lg bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                      <FileSpreadsheet size={16} />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 truncate">
                        {excelAttachment.fileName}
                      </span>
                      <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-mono">
                        {excelAttachment.fileSize} • {excelAttachment.sheets.length} feuille(s)
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => setShowAttachmentPreview(!showAttachmentPreview)}
                      className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-650 dark:text-zinc-300 hover:bg-zinc-150/80 dark:hover:bg-zinc-800 text-[11px] font-bold cursor-pointer transition-colors flex items-center gap-1"
                      title="Aperçu des données"
                    >
                      <Eye size={12} />
                      <span>{showAttachmentPreview ? "Masquer l'aperçu" : "Aperçu"}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setExcelAttachment(null);
                        setShowAttachmentPreview(false);
                      }}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 cursor-pointer transition-colors"
                      title="Supprimer le fichier"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>

                {/* In-place dataset preview tables */}
                {showAttachmentPreview && (
                  <div className="mt-3 max-h-48 overflow-auto rounded-xl border border-zinc-200/80 dark:border-zinc-850 bg-white dark:bg-zinc-950 p-2 text-[11px] space-y-4 shadow-inner">
                    {excelAttachment.sheets.map((sheet, sIdx) => {
                      const headers = sheet.rows[0] || [];
                      const rows = sheet.rows.slice(1, 6); // Display first 5 data rows
                      return (
                        <div key={sIdx} className="space-y-1.5">
                          <div className="flex items-center justify-between text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider px-1">
                            <span>Feuille : {sheet.name}</span>
                            <span>{sheet.rows.length} lignes x {headers.length} col.</span>
                          </div>
                          <div className="overflow-x-auto border border-zinc-100 dark:border-zinc-900 rounded-lg">
                            <table className="w-full text-left border-collapse">
                              <thead>
                                <tr className="bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-150 dark:border-zinc-800 font-bold text-zinc-700 dark:text-zinc-300">
                                  {headers.map((h, hIdx) => (
                                    <th key={hIdx} className="px-2 py-1 border-r border-zinc-100 dark:border-zinc-900 last:border-r-0 truncate max-w-[120px]">
                                      {h !== undefined && h !== null ? String(h) : `Col ${hIdx + 1}`}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900 text-zinc-600 dark:text-zinc-405 font-mono text-[10px]">
                                {rows.map((row, rIdx) => (
                                  <tr key={rIdx} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30">
                                    {headers.map((_, colIdx) => (
                                      <td key={colIdx} className="px-2 py-1 border-r border-zinc-100 dark:border-zinc-900 last:border-r-0 truncate max-w-[120px]">
                                        {row[colIdx] !== undefined && row[colIdx] !== null ? String(row[colIdx]) : ""}
                                      </td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          {sheet.rows.length > 6 && (
                            <div className="text-[9px] text-zinc-400 dark:text-zinc-500 italic text-right px-1">
                              + {sheet.rows.length - 6} autres lignes non affichées dans l'aperçu
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Input Element */}
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isLoading ? "Veuillez patienter, génération en cours..." : `Écrivez à ${activeModel.name}... (Entrée pour envoyer, Maj+Entrée pour passer à la ligne)`}
              disabled={isLoading}
              rows={Math.min(6, inputText.split('\n').length || 1)}
              className="w-full bg-transparent border-0 resize-none px-4 pt-3 pb-2 text-sm text-black dark:text-white font-black focus:outline-none min-h-[44px]"
            />

            {/* Input Actions Area */}
            <div className="flex items-center justify-between px-3 pb-2.5 pt-1 border-t border-zinc-100 dark:border-zinc-800/50">
              
              {/* Left action tags */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-semibold font-mono text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/50 px-2 py-0.5 rounded-md">
                  {activeModel.name}
                </span>
                <span className="text-[10px] text-zinc-400 dark:text-zinc-500 select-none">
                  {inputText.length} caracts
                </span>

                {/* Hidden Excel File Selector */}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleExcelImport(file);
                    e.target.value = "";
                  }}
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isReadingExcel || isLoading}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-900 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/20 dark:hover:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold cursor-pointer transition-all shadow-3xs"
                  title="Importer un fichier Excel (.xlsx, .xls, .csv)"
                >
                  {isReadingExcel ? (
                    <Loader2 size={12} className="animate-spin text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <FileSpreadsheet size={12} className="text-emerald-600 dark:text-emerald-400" />
                  )}
                  <span>{isReadingExcel ? "Lecture..." : "Importer Excel"}</span>
                </button>
              </div>

              {/* Send Button */}
              <button
                onClick={handleSend}
                disabled={(!inputText.trim() && !excelAttachment) || isLoading}
                className={`
                  p-2 rounded-xl transition-all flex items-center justify-center cursor-pointer
                  ${(inputText.trim() || excelAttachment) && !isLoading
                    ? "bg-orange-600 hover:bg-orange-700 text-white hover:scale-105 active:scale-95 shadow-xs"
                    : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-600 cursor-not-allowed"}
                `}
                title="Envoyer le message"
              >
                <Send size={15} />
              </button>
            </div>
          </div>

          {/* Prompt warning footnote */}
          <p className="text-[10px] text-center text-zinc-400 dark:text-zinc-500 mt-2 select-none leading-relaxed">
            Mistral Chat peut commettre des erreurs. Vérifiez les informations importantes.
          </p>
        </div>
      </footer>

      {/* Master Prompt Custom Modal */}
      {showPromptModal && (
        <div className="fixed inset-0 bg-zinc-950/80 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-lg rounded-3xl border-2 border-black dark:border-zinc-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-6 pb-4 border-b-2 border-black flex items-center justify-between bg-zinc-50 dark:bg-zinc-950">
              <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-xl border-2 border-black ${currentUser?.isAdmin ? "bg-emerald-500/10 text-emerald-850 dark:text-emerald-400" : "bg-zinc-100 text-zinc-900"}`}>
                  {currentUser?.isAdmin ? <Unlock size={18} className="stroke-[2.5]" /> : <Lock size={18} className="stroke-[2.5]" />}
                </div>
                <div>
                  <h3 className="font-black text-black dark:text-zinc-100 text-base uppercase tracking-tight">
                    {currentUser?.isAdmin ? "Configuration du Master Prompt" : "Master Prompt Actif (Lecture seule)"}
                  </h3>
                  <p className="text-xs font-black text-black mt-0.5">
                    {currentUser?.isAdmin 
                      ? "Définit les règles absolues de réponse du modèle" 
                      : "Règles système imposées par l'administrateur"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowPromptModal(false)}
                className="p-1.5 rounded-lg text-black hover:bg-zinc-200 cursor-pointer border border-black transition-colors"
              >
                <X size={16} className="stroke-[2.5]" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-4">
              {currentUser?.isAdmin ? (
                <>
                  <div className="p-3.5 rounded-xl bg-yellow-50 text-black text-xs font-black leading-relaxed border-2 border-black flex items-start gap-2.5">
                    <Info size={18} className="shrink-0 mt-0.5 text-yellow-800 stroke-[2.5]" />
                    <span>
                      En tant qu'administrateur, vous pouvez modifier ces consignes système. Elles seront transmises au moteur de discussion pour chaque message envoyé par les utilisateurs.
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-black text-black uppercase tracking-wider block">
                        Consignes Système Globales (Prompt)
                      </label>
                      <button
                        type="button"
                        onClick={() => setTempPrompt("Tu es un assistant IA intelligent et amical. Tu dois impérativement répondre en français de manière concise.")}
                        className="text-xs text-orange-700 hover:text-orange-900 font-black uppercase tracking-wider hover:underline cursor-pointer"
                      >
                        Réinitialiser par défaut
                      </button>
                    </div>
                    <textarea
                      value={tempPrompt}
                      onChange={(e) => setTempPrompt(e.target.value)}
                      placeholder="Saisissez le Master Prompt ici..."
                      rows={6}
                      className="w-full px-4 py-3 rounded-xl border-2 border-black bg-white focus:bg-yellow-50 text-xs text-black font-black placeholder-zinc-500 focus:outline-none font-mono leading-relaxed"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="p-3.5 rounded-xl bg-zinc-100 text-black text-xs font-black leading-relaxed border-2 border-black flex items-start gap-2.5">
                    <Lock size={18} className="shrink-0 mt-0.5 text-black stroke-[2.5]" />
                    <span>
                      Le Master Prompt est configuré et verrouillé par l'administrateur. Toutes les réponses de l'IA se conforment à ces consignes spécifiques.
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-black uppercase tracking-wider block">
                      Consignes Actuellement Appliquées
                    </label>
                    <div className="w-full px-4 py-3 rounded-xl border-2 border-black bg-zinc-50 text-xs text-black font-black font-mono leading-relaxed max-h-48 overflow-y-auto select-text">
                      {masterPrompt || "Aucun Master Prompt particulier n'est défini."}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-6 pt-4 bg-zinc-50 dark:bg-zinc-950/20 border-t-2 border-black flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowPromptModal(false)}
                className="px-4 py-2 rounded-xl border-2 border-black hover:bg-zinc-100 text-xs font-black cursor-pointer uppercase tracking-wider"
              >
                {currentUser?.isAdmin ? "Annuler" : "Fermer"}
              </button>
              
              {currentUser?.isAdmin && (
                <button
                  type="button"
                  onClick={handleSaveMasterPrompt}
                  disabled={isSavingPrompt}
                  className="px-4 py-2 rounded-xl bg-black hover:bg-zinc-800 disabled:bg-zinc-400 text-white border-2 border-black text-xs font-black cursor-pointer flex items-center gap-1.5 uppercase tracking-wider"
                >
                  {isSavingPrompt ? (
                    <>
                      <Loader2 size={13} className="animate-spin" />
                      <span>Enregistrement...</span>
                    </>
                  ) : (
                    <>
                      <Save size={13} className="stroke-[2.5]" />
                      <span>Enregistrer</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* User Profile and Password Update Modal */}
      {currentUser && (
        <ProfileModal
          isOpen={showProfileModal}
          onClose={() => setShowProfileModal(false)}
          currentUser={currentUser}
          onUpdateUser={onUpdateUser}
        />
      )}
    </div>
  );
}
