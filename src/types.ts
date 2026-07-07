export interface User {
  id: string;
  username: string;
}

export interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  model: string;
  createdAt: number;
}

// AJOUTEZ CETTE CONSTANTE ICI POUR CORRIGER L'ERREUR D'IMPORT
export const MISTRAL_MODELS = [
  { id: "mistral-small-latest", name: "Mistral Small" },
  { id: "mistral-medium-latest", name: "Mistral Medium" },
  { id: "mistral-large-latest", name: "Mistral Large" },
  { id: "pixtral-12b-2409", name: "Pixtral (12B)" },
  { id: "open-mistral-7b", name: "Mistral 7B" }
];