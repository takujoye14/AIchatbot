import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  KeyRound, 
  ShieldAlert, 
  User as UserIcon, 
  CheckCircle2, 
  AlertCircle, 
  Mail, 
  Lock, 
  UserPlus, 
  ArrowLeft, 
  HelpCircle
} from "lucide-react";
import { User } from "../types";

interface LoginProps {
  onLogin: (user: User) => void;
}

interface LocalUserRecord {
  username: string;
  email: string;
  password: string;
  isAdmin: boolean;
}

const LOCAL_USERS_KEY = "mistral_user_database";

export default function Login({ onLogin }: LoginProps) {
  // Screens: "login" | "register" | "forgot"
  const [screen, setScreen] = useState<"login" | "register" | "forgot">("login");
  
  // Login fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  // Register fields
  const [regUsername, setRegUsername] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  
  // Forgot Password fields & state
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotStep, setForgotStep] = useState<1 | 2>(1); // 1: request email, 2: set new password
  const [forgotNewPassword, setForgotNewPassword] = useState("");
  const [forgotSuccessMessage, setForgotSuccessMessage] = useState("");

  // Feedback states
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Initialize the users database in localStorage if it doesn't exist
  useEffect(() => {
    const existing = localStorage.getItem(LOCAL_USERS_KEY);
    if (!existing) {
      const defaultUsers: LocalUserRecord[] = [
        {
          username: "Admin Mistral",
          email: "admin@example.com",
          password: "admin",
          isAdmin: true
        },
        {
          username: "Sophie L'Utilisatrice",
          email: "user@example.com",
          password: "user",
          isAdmin: false
        }
      ];
      localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(defaultUsers));
    }
  }, []);

  // Helper: Retrieve all registered users
  const getUsers = (): LocalUserRecord[] => {
    try {
      const data = localStorage.getItem(LOCAL_USERS_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  };

  // Helper: Save users database
  const saveUsers = (users: LocalUserRecord[]) => {
    localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(users));
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const currentEmail = email.trim().toLowerCase();
    const currentPassword = password;

    if (!currentEmail || !currentPassword) {
      setError("Veuillez remplir tous les champs.");
      return;
    }

    const users = getUsers();
    const found = users.find(u => u.email.toLowerCase() === currentEmail);

    if (found) {
      if (found.password === currentPassword) {
        setSuccess(true);
        setTimeout(() => {
          onLogin({
            username: found.username,
            email: found.email,
            isAdmin: found.isAdmin
          });
        }, 600);
      } else {
        setError("Le mot de passe saisi est incorrect.");
      }
    } else {
      setError("Aucun compte n'a été trouvé avec cette adresse e-mail.");
    }
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const name = regUsername.trim();
    const mail = regEmail.trim().toLowerCase();
    const pass = regPassword;

    if (!name || !mail || !pass) {
      setError("Veuillez remplir tous les champs.");
      return;
    }

    if (pass.length < 4) {
      setError("Le mot de passe doit contenir au moins 4 caractères.");
      return;
    }

    const users = getUsers();
    if (users.some(u => u.email.toLowerCase() === mail)) {
      setError("Cette adresse e-mail est déjà associée à un compte actif.");
      return;
    }

    const newUser: LocalUserRecord = {
      username: name,
      email: mail,
      password: pass,
      isAdmin: false
    };

    const updated = [...users, newUser];
    saveUsers(updated);

    setSuccess(true);
    setTimeout(() => {
      onLogin({
        username: newUser.username,
        email: newUser.email,
        isAdmin: newUser.isAdmin
      });
    }, 600);
  };

  const handleForgotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (forgotStep === 1) {
      const mail = forgotEmail.trim().toLowerCase();
      if (!mail) {
        setError("Veuillez entrer votre adresse e-mail.");
        return;
      }

      const users = getUsers();
      const found = users.some(u => u.email.toLowerCase() === mail);

      if (!found) {
        setError("Aucun compte n'est enregistré avec cette adresse e-mail.");
        return;
      }

      setForgotStep(2);
    } else {
      const mail = forgotEmail.trim().toLowerCase();
      const newPass = forgotNewPassword;

      if (!newPass) {
        setError("Veuillez entrer un nouveau mot de passe.");
        return;
      }

      if (newPass.length < 4) {
        setError("Le mot de passe doit contenir au moins 4 caractères.");
        return;
      }

      const users = getUsers();
      const updated = users.map(u => {
        if (u.email.toLowerCase() === mail) {
          return { ...u, password: newPass };
        }
        return u;
      });

      saveUsers(updated);
      setForgotSuccessMessage("Votre mot de passe a été réinitialisé avec succès !");
      
      setTimeout(() => {
        setEmail(mail);
        setPassword(newPass);
        setScreen("login");
        setForgotStep(1);
        setForgotEmail("");
        setForgotNewPassword("");
        setForgotSuccessMessage("");
      }, 2000);
    }
  };



  return (
    <div className="min-h-screen w-screen flex items-center justify-center bg-zinc-100 dark:bg-zinc-950 p-4 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-black/5 rounded-full blur-3xl -z-10 animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-orange-500/5 rounded-full blur-3xl -z-10" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-3xl border-2 border-black dark:border-zinc-800 shadow-2xl overflow-hidden relative"
      >
        {/* Header - Thick bold black styling */}
        <div className="p-8 pb-4 text-center border-b-2 border-black bg-zinc-50 dark:bg-zinc-950">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-black dark:bg-zinc-800 flex items-center justify-center text-white border-2 border-black shadow-md mb-4">
            <KeyRound size={28} className="stroke-[2.5]" />
          </div>
          <h2 className="text-2xl font-black uppercase tracking-tight text-black dark:text-white">
            DoxaBot
          </h2>
          <p className="text-xs font-black text-black dark:text-zinc-300 mt-2 max-w-xs mx-auto leading-relaxed">
            {screen === "login" && "Connectez-vous pour démarrer votre session sécurisée d'assistance IA"}
            {screen === "register" && "Créez votre compte d'accès sécurisé en quelques secondes"}
            {screen === "forgot" && "Récupération et réinitialisation de votre accès utilisateur"}
          </p>
        </div>

        {/* Card Body */}
        <div className="p-8">
          {success ? (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="py-10 flex flex-col items-center justify-center text-center space-y-4"
            >
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-800 border-2 border-emerald-500 flex items-center justify-center animate-bounce">
                <CheckCircle2 size={36} className="stroke-[3]" />
              </div>
              <h3 className="text-lg font-black text-black dark:text-white uppercase tracking-wider">
                CONNEXION EN COURS !
              </h3>
              <p className="text-xs font-black text-black dark:text-zinc-300">
                Préparation de votre espace de discussion sécurisé...
              </p>
            </motion.div>
          ) : (
            <AnimatePresence mode="wait">
              {screen === "login" && (
                <motion.div
                  key="login"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="space-y-4"
                >
                  {error && (
                    <div className="p-3 rounded-xl bg-red-100 text-red-950 text-xs font-black flex items-start gap-2 border-2 border-red-500">
                      <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-700 stroke-[3]" />
                      <span>{error}</span>
                    </div>
                  )}

                  <form onSubmit={handleLoginSubmit} className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-black text-black dark:text-zinc-200 uppercase tracking-wider block">
                        Adresse E-mail
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3.5 text-black dark:text-zinc-400 w-4 h-4 stroke-[2.5]" />
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="votre@email.com"
                          className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-black bg-white focus:bg-yellow-50 text-sm text-black font-black focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-black text-black dark:text-zinc-200 uppercase tracking-wider block">
                          Mot de passe
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            setError("");
                            setScreen("forgot");
                          }}
                          className="text-xs text-orange-700 hover:text-orange-900 font-black uppercase tracking-wider hover:underline cursor-pointer"
                        >
                          Mot de passe oublié ?
                        </button>
                      </div>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3.5 text-black dark:text-zinc-400 w-4 h-4 stroke-[2.5]" />
                        <input
                          type="password"
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-black bg-white focus:bg-yellow-50 text-sm text-black font-black focus:outline-none"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-3.5 px-4 rounded-xl bg-black hover:bg-zinc-800 text-white font-black text-xs uppercase tracking-widest transition-all hover:scale-[1.01] active:scale-[0.99] border-2 border-black shadow-md cursor-pointer"
                    >
                      SE CONNECTER
                    </button>
                  </form>



                  {/* Register Switch */}
                  <div className="text-center pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setError("");
                        setScreen("register");
                      }}
                      className="text-xs font-black text-black hover:text-zinc-700 transition-colors inline-flex items-center gap-1.5 cursor-pointer uppercase tracking-wider border-b-2 border-black pb-0.5"
                    >
                      <UserPlus size={14} className="stroke-[2.5]" />
                      <span>Pas encore de compte ? S'inscrire</span>
                    </button>
                  </div>
                </motion.div>
              )}

              {screen === "register" && (
                <motion.div
                  key="register"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="space-y-4"
                >
                  <button
                    type="button"
                    onClick={() => {
                      setError("");
                      setScreen("login");
                    }}
                    className="text-xs text-black hover:text-zinc-600 font-black inline-flex items-center gap-1.5 cursor-pointer uppercase tracking-wider"
                  >
                    <ArrowLeft size={14} className="stroke-[2.5]" />
                    <span>Retour à la connexion</span>
                  </button>

                  {error && (
                    <div className="p-3 rounded-xl bg-red-100 text-red-950 text-xs font-black flex items-start gap-2 border-2 border-red-500">
                      <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-700 stroke-[3]" />
                      <span>{error}</span>
                    </div>
                  )}

                  <form onSubmit={handleRegisterSubmit} className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-black text-black dark:text-zinc-200 uppercase tracking-wider block">
                        Nom d'utilisateur
                      </label>
                      <div className="relative">
                        <UserIcon className="absolute left-3 top-3.5 text-black dark:text-zinc-400 w-4 h-4 stroke-[2.5]" />
                        <input
                          type="text"
                          required
                          value={regUsername}
                          onChange={(e) => setRegUsername(e.target.value)}
                          placeholder="Ex: Sophie L."
                          className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-black bg-white focus:bg-yellow-50 text-sm text-black font-black focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-black text-black dark:text-zinc-200 uppercase tracking-wider block">
                        Adresse E-mail
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3.5 text-black dark:text-zinc-400 w-4 h-4 stroke-[2.5]" />
                        <input
                          type="email"
                          required
                          value={regEmail}
                          onChange={(e) => setRegEmail(e.target.value)}
                          placeholder="sophie@example.com"
                          className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-black bg-white focus:bg-yellow-50 text-sm text-black font-black focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-black text-black dark:text-zinc-200 uppercase tracking-wider block">
                        Mot de passe
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3.5 text-black dark:text-zinc-400 w-4 h-4 stroke-[2.5]" />
                        <input
                          type="password"
                          required
                          value={regPassword}
                          onChange={(e) => setRegPassword(e.target.value)}
                          placeholder="Minimum 4 caractères"
                          className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-black bg-white focus:bg-yellow-50 text-sm text-black font-black focus:outline-none"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-3.5 px-4 rounded-xl bg-black hover:bg-zinc-800 text-white font-black text-xs uppercase tracking-widest transition-all hover:scale-[1.01] active:scale-[0.99] border-2 border-black shadow-md cursor-pointer"
                    >
                      CRÉER MON COMPTE
                    </button>
                  </form>
                </motion.div>
              )}

              {screen === "forgot" && (
                <motion.div
                  key="forgot"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="space-y-4"
                >
                  <button
                    type="button"
                    onClick={() => {
                      setError("");
                      setScreen("login");
                      setForgotStep(1);
                    }}
                    className="text-xs text-black hover:text-zinc-600 font-black inline-flex items-center gap-1.5 cursor-pointer uppercase tracking-wider"
                  >
                    <ArrowLeft size={14} className="stroke-[2.5]" />
                    <span>Retour à la connexion</span>
                  </button>

                  {error && (
                    <div className="p-3 rounded-xl bg-red-100 text-red-950 text-xs font-black flex items-start gap-2 border-2 border-red-500">
                      <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-700 stroke-[3]" />
                      <span>{error}</span>
                    </div>
                  )}

                  {forgotSuccessMessage ? (
                    <div className="p-4 rounded-2xl bg-emerald-100 text-emerald-950 border-2 border-emerald-500 text-xs font-black space-y-2 flex flex-col items-center justify-center text-center">
                      <CheckCircle2 size={32} className="text-emerald-700 animate-bounce stroke-[3]" />
                      <span>{forgotSuccessMessage}</span>
                      <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-black">Redirection en cours...</span>
                    </div>
                  ) : (
                    <form onSubmit={handleForgotSubmit} className="space-y-4">
                      {forgotStep === 1 ? (
                        <>
                          <div className="p-3.5 rounded-2xl bg-orange-50 text-orange-950 text-xs font-black leading-relaxed border-2 border-orange-500 flex items-start gap-2.5">
                            <HelpCircle size={18} className="shrink-0 mt-0.5 text-orange-700 stroke-[2.5]" />
                            <span>
                              Étape 1 : Saisissez l'adresse e-mail de votre compte pour lancer la réinitialisation de votre mot de passe.
                            </span>
                          </div>
                          
                          <div className="space-y-1.5">
                            <label className="text-xs font-black text-black dark:text-zinc-200 uppercase tracking-wider block">
                              Votre adresse E-mail
                            </label>
                            <div className="relative">
                              <Mail className="absolute left-3 top-3.5 text-black dark:text-zinc-400 w-4 h-4 stroke-[2.5]" />
                              <input
                                type="email"
                                required
                                value={forgotEmail}
                                onChange={(e) => setForgotEmail(e.target.value)}
                                placeholder="votre@email.com"
                                className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-black bg-white focus:bg-yellow-50 text-sm text-black font-black focus:outline-none"
                              />
                            </div>
                          </div>

                          <button
                            type="submit"
                            className="w-full py-3.5 px-4 rounded-xl bg-black hover:bg-zinc-800 text-white font-black text-xs uppercase tracking-widest border-2 border-black shadow-md cursor-pointer"
                          >
                            Étape suivante
                          </button>
                        </>
                      ) : (
                        <>
                          <div className="p-3.5 rounded-2xl bg-emerald-50 text-emerald-950 text-xs font-black leading-relaxed border-2 border-emerald-500 flex items-start gap-2.5">
                            <CheckCircle2 size={18} className="shrink-0 mt-0.5 text-emerald-700 stroke-[2.5]" />
                            <span>
                              Compte identifié ! Étape 2 : Saisissez votre nouveau mot de passe pour le compte <strong>{forgotEmail}</strong>.
                            </span>
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-xs font-black text-black dark:text-zinc-200 uppercase tracking-wider block">
                              Nouveau mot de passe
                            </label>
                            <div className="relative">
                              <Lock className="absolute left-3 top-3.5 text-black dark:text-zinc-400 w-4 h-4 stroke-[2.5]" />
                              <input
                                type="password"
                                required
                                value={forgotNewPassword}
                                onChange={(e) => setForgotNewPassword(e.target.value)}
                                placeholder="Minimum 4 caractères"
                                className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-black bg-white focus:bg-yellow-50 text-sm text-black font-black focus:outline-none"
                              />
                            </div>
                          </div>

                          <button
                            type="submit"
                            className="w-full py-3.5 px-4 rounded-xl bg-black hover:bg-zinc-800 text-white font-black text-xs uppercase tracking-widest border-2 border-black shadow-md cursor-pointer"
                          >
                            Enregistrer le nouveau mot de passe
                          </button>
                        </>
                      )}
                    </form>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </div>
      </motion.div>
    </div>
  );
}
