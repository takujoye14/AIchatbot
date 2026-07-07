export interface User {
  username: string;
  email: string;
  isAdmin: boolean;
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

export interface MistralModel {
  id: string;
  name: string;
  description: string;
  badge: string;
}

export const MISTRAL_MODELS: MistralModel[] = [
  {
    id: "mistral-small-latest",
    name: "Mistral Small",
    description: "Rapide, économique et très efficace pour les tâches quotidiennes.",
    badge: "Rapide & Intelligent",
  },
  {
    id: "open-mistral-7b",
    name: "Mistral 7B",
    description: "Le champion open-source léger, idéal pour les questions-réponses générales.",
    badge: "Open Source",
  },
  {
    id: "mistral-medium-latest",
    name: "Mistral Medium",
    description: "Excellent équilibre entre rapidité et capacités de raisonnement approfondi.",
    badge: "Équilibré",
  },
  {
    id: "mistral-large-latest",
    name: "Mistral Large",
    description: "Le modèle phare de premier plan pour le raisonnement complexe et le codage.",
    badge: "Le Plus Puissant",
  },
  {
    id: "codestral-latest",
    name: "Codestral",
    description: "Optimisé spécifiquement pour la génération de code, la révision et la logique.",
    badge: "Développeur",
  },
];

export interface StarterSuggestion {
  icon: string;
  label: string;
  prompt: string;
  color: string;
}

export const STARTER_SUGGESTIONS: StarterSuggestion[] = [
  {
    icon: "Sparkles",
    label: "Expliquer l'informatique quantique",
    prompt: "Explique l'informatique quantique en termes simples, en utilisant une analogie qu'un enfant de 10 ans comprendrait.",
    color: "from-orange-500 to-rose-600",
  },
  {
    icon: "Code",
    label: "Coder un Hook React",
    prompt: "Écris un hook React complet et personnalisé en TypeScript appelé 'useLocalStorage' qui synchronise l'état avec le stockage local.",
    color: "from-amber-500 to-orange-600",
  },
  {
    icon: "FileText",
    label: "Rédiger un Pitch Professionnel",
    prompt: "Écris un court courriel de prospection professionnelle pour un produit SaaS qui aide les concepteurs indépendants à automatiser la facturation des clients.",
    color: "from-zinc-700 to-zinc-900 border border-zinc-700",
  },
  {
    icon: "Compass",
    label: "Idées de projets secondaires",
    prompt: "J'ai 5 heures par semaine et des compétences de programmation intermédiaires. Suggère 3 idées créatives de projets secondaires avec des étapes d'action concrètes pour commencer.",
    color: "from-red-500 to-orange-600",
  },
];
