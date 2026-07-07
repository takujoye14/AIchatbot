import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  X, 
  User as UserIcon, 
  Lock, 
  ShieldCheck, 
  Mail, 
  CheckCircle2, 
  AlertCircle,
  Save,
  Users,
  Trash2,
  UserPlus,
  KeyRound
} from "lucide-react";
import { User } from "../types";

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  onUpdateUser: (updatedUser: User) => void;
}

interface LocalUserRecord {
  username: string;
  email: string;
  password: string;
  isAdmin: boolean;
}

const LOCAL_USERS_KEY = "mistral_user_database";

export default function ProfileModal({ isOpen, onClose, currentUser, onUpdateUser }: ProfileModalProps) {
  // If user is admin, allow 3 tabs, otherwise only 2
  const [activeTab, setActiveTab] = useState<"profile" | "security" | "users">("profile");
  
  // Profile Form States (Mainly bold black text styling)
  const [username, setUsername] = useState(currentUser.username);
  const [profileSuccess, setProfileSuccess] = useState("");
  const [profileError, setProfileError] = useState("");

  // Security Form States
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [securitySuccess, setSecuritySuccess] = useState("");
  const [securityError, setSecurityError] = useState("");

  // Admin User Management States
  const [usersList, setUsersList] = useState<LocalUserRecord[]>([]);
  const [selectedUserEmail, setSelectedUserEmail] = useState<string | null>(null);
  
  // Selected user edit fields
  const [editUsername, setEditUsername] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editIsAdmin, setEditIsAdmin] = useState(false);
  const [adminSuccess, setAdminSuccess] = useState("");
  const [adminError, setAdminError] = useState("");

  // Add new user states
  const [showAddForm, setShowAddForm] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserIsAdmin, setNewUserIsAdmin] = useState(false);

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

  // Sync users list when active tab is 'users'
  const refreshUsersList = () => {
    const list = getUsers();
    setUsersList(list);
  };

  useEffect(() => {
    if (isOpen) {
      refreshUsersList();
    }
  }, [isOpen, activeTab]);

  if (!isOpen) return null;

  // Handle Username Update for Current User
  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError("");
    setProfileSuccess("");

    const newUsername = username.trim();
    if (!newUsername) {
      setProfileError("Le nom d'utilisateur ne peut pas être vide.");
      return;
    }

    const users = getUsers();
    const updatedUsers = users.map(user => {
      if (user.email.toLowerCase() === currentUser.email.toLowerCase()) {
        return { ...user, username: newUsername };
      }
      return user;
    });

    saveUsers(updatedUsers);
    
    // Notify parent App component to update state
    onUpdateUser({
      ...currentUser,
      username: newUsername
    });

    setProfileSuccess("Profil mis à jour avec succès !");
    setTimeout(() => setProfileSuccess(""), 3000);
  };

  // Handle Password Update for Current User
  const handleUpdatePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setSecurityError("");
    setSecuritySuccess("");

    if (!oldPassword || !newPassword || !confirmPassword) {
      setSecurityError("Veuillez remplir tous les champs.");
      return;
    }

    if (newPassword.length < 4) {
      setSecurityError("Le nouveau mot de passe doit contenir au moins 4 caractères.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setSecurityError("Le nouveau mot de passe et sa confirmation ne correspondent pas.");
      return;
    }

    const users = getUsers();
    const userIndex = users.findIndex(user => user.email.toLowerCase() === currentUser.email.toLowerCase());

    if (userIndex === -1) {
      setSecurityError("Compte utilisateur introuvable.");
      return;
    }

    const userRecord = users[userIndex];

    // Verify current password
    if (userRecord.password !== oldPassword) {
      setSecurityError("L'ancien mot de passe est incorrect.");
      return;
    }

    // Update password
    userRecord.password = newPassword;
    users[userIndex] = userRecord;
    saveUsers(users);

    setSecuritySuccess("Votre mot de passe a été modifié avec succès !");
    setOldPassword("");
    setNewPassword("");
    setConfirmPassword("");

    setTimeout(() => setSecuritySuccess(""), 4000);
  };

  // Select a user to edit from management list
  const handleSelectUserToEdit = (user: LocalUserRecord) => {
    setSelectedUserEmail(user.email);
    setEditUsername(user.username);
    setEditPassword(user.password);
    setEditIsAdmin(user.isAdmin);
    setAdminError("");
    setAdminSuccess("");
    setShowAddForm(false);
  };

  // Save changes to edited user
  const handleSaveEditedUser = (e: React.FormEvent) => {
    e.preventDefault();
    setAdminError("");
    setAdminSuccess("");

    if (!selectedUserEmail) return;

    const trimmedName = editUsername.trim();
    if (!trimmedName) {
      setAdminError("Le nom d'utilisateur ne peut pas être vide.");
      return;
    }

    if (editPassword.length < 4) {
      setAdminError("Le mot de passe doit contenir au moins 4 caractères.");
      return;
    }

    const users = getUsers();
    const updated = users.map(u => {
      if (u.email.toLowerCase() === selectedUserEmail.toLowerCase()) {
        // Prevent editing own admin status to avoid self lock-out
        const finalIsAdmin = u.email.toLowerCase() === currentUser.email.toLowerCase() ? u.isAdmin : editIsAdmin;
        return {
          ...u,
          username: trimmedName,
          password: editPassword,
          isAdmin: finalIsAdmin
        };
      }
      return u;
    });

    saveUsers(updated);
    setAdminSuccess("Utilisateur modifié avec succès !");
    refreshUsersList();

    // If we updated ourselves, trigger App state sync
    if (selectedUserEmail.toLowerCase() === currentUser.email.toLowerCase()) {
      onUpdateUser({
        ...currentUser,
        username: trimmedName,
        isAdmin: currentUser.isAdmin // preserve own admin
      });
    }

    setTimeout(() => {
      setSelectedUserEmail(null);
      setAdminSuccess("");
    }, 1500);
  };

  // Delete user account
  const handleDeleteUser = (emailToDelete: string) => {
    if (emailToDelete.toLowerCase() === currentUser.email.toLowerCase()) {
      setAdminError("Vous ne pouvez pas supprimer votre propre compte administrateur.");
      return;
    }

    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer définitivement le compte de ${emailToDelete} ?`)) {
      return;
    }

    const users = getUsers();
    const updated = users.filter(u => u.email.toLowerCase() !== emailToDelete.toLowerCase());
    saveUsers(updated);

    setAdminSuccess("Utilisateur supprimé avec succès !");
    setSelectedUserEmail(null);
    refreshUsersList();
    setTimeout(() => setAdminSuccess(""), 2000);
  };

  // Add new user
  const handleAddNewUser = (e: React.FormEvent) => {
    e.preventDefault();
    setAdminError("");
    setAdminSuccess("");

    const name = newUsername.trim();
    const mail = newUserEmail.trim().toLowerCase();
    const pass = newUserPassword;

    if (!name || !mail || !pass) {
      setAdminError("Veuillez remplir tous les champs.");
      return;
    }

    if (pass.length < 4) {
      setAdminError("Le mot de passe doit contenir au moins 4 caractères.");
      return;
    }

    const users = getUsers();
    if (users.some(u => u.email.toLowerCase() === mail)) {
      setAdminError("Cet e-mail est déjà utilisé par un autre compte.");
      return;
    }

    const newUser: LocalUserRecord = {
      username: name,
      email: mail,
      password: pass,
      isAdmin: newUserIsAdmin
    };

    saveUsers([...users, newUser]);
    setAdminSuccess(`L'utilisateur ${name} a été créé !`);
    
    // Reset add states
    setNewUsername("");
    setNewUserEmail("");
    setNewUserPassword("");
    setNewUserIsAdmin(false);
    setShowAddForm(false);
    refreshUsersList();

    setTimeout(() => setAdminSuccess(""), 3000);
  };

  return (
    <div className="fixed inset-0 bg-zinc-950/80 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="bg-white dark:bg-zinc-900 w-full max-w-2xl rounded-3xl border-2 border-black dark:border-zinc-800 shadow-2xl overflow-hidden"
      >
        {/* Header - Styled with Black Bold Text */}
        <div className="p-6 pb-4 border-b-2 border-black dark:border-zinc-850 flex items-center justify-between bg-zinc-50 dark:bg-zinc-950">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-black text-white dark:bg-zinc-800 dark:text-zinc-200">
              <UserIcon size={20} />
            </div>
            <div>
              <h3 className="font-extrabold text-black dark:text-white text-lg tracking-tight">
                MON COMPTE & SÉCURITÉ
              </h3>
              <p className="text-xs font-bold text-black dark:text-zinc-400 mt-0.5">
                Gérez votre profil utilisateur et accédez aux paramètres de sécurité
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-black hover:bg-zinc-200 dark:text-zinc-400 dark:hover:bg-zinc-850 cursor-pointer transition-colors border border-black"
          >
            <X size={18} className="stroke-[3]" />
          </button>
        </div>

        {/* Tab switchers - Bold black borders and texts */}
        <div className="flex bg-zinc-100 dark:bg-zinc-950/60 p-1 border-b-2 border-black dark:border-zinc-850">
          <button
            onClick={() => {
              setActiveTab("profile");
              setSelectedUserEmail(null);
              setShowAddForm(false);
            }}
            className={`flex-1 py-3 text-xs font-black rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 border ${
              activeTab === "profile"
                ? "bg-black text-white dark:bg-zinc-900 dark:text-orange-400 shadow-xs border-black"
                : "text-black hover:bg-zinc-200 dark:text-zinc-400 dark:hover:text-zinc-800 border-transparent"
            }`}
          >
            <UserIcon size={14} className="stroke-[2.5]" />
            <span>MON PROFIL</span>
          </button>
          
          <button
            onClick={() => {
              setActiveTab("security");
              setSelectedUserEmail(null);
              setShowAddForm(false);
            }}
            className={`flex-1 py-3 text-xs font-black rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 border ${
              activeTab === "security"
                ? "bg-black text-white dark:bg-zinc-900 dark:text-orange-400 shadow-xs border-black"
                : "text-black hover:bg-zinc-200 dark:text-zinc-400 dark:hover:text-zinc-800 border-transparent"
            }`}
          >
            <Lock size={14} className="stroke-[2.5]" />
            <span>SÉCURITÉ & MOT DE PASSE</span>
          </button>

          {currentUser.isAdmin && (
            <button
              onClick={() => {
                setActiveTab("users");
                setSelectedUserEmail(null);
                setShowAddForm(false);
              }}
              className={`flex-1 py-3 text-xs font-black rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 border ${
                activeTab === "users"
                  ? "bg-emerald-700 text-white dark:bg-emerald-900 dark:text-emerald-300 shadow-xs border-black"
                  : "text-emerald-800 hover:bg-emerald-50 dark:text-emerald-500 border-transparent"
              }`}
            >
              <Users size={14} className="stroke-[2.5]" />
              <span>GESTION DES COMPTES</span>
            </button>
          )}
        </div>

        {/* Content area */}
        <div className="p-6 max-h-[500px] overflow-y-auto">
          <AnimatePresence mode="wait">
            {activeTab === "profile" && (
              <motion.form
                key="profile-tab"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                onSubmit={handleUpdateProfile}
                className="space-y-4"
              >
                {profileSuccess && (
                  <div className="p-3 rounded-xl bg-emerald-100 text-emerald-950 text-xs font-black flex items-center gap-2 border-2 border-emerald-500">
                    <CheckCircle2 size={16} className="shrink-0 text-emerald-700 stroke-[3]" />
                    <span>{profileSuccess}</span>
                  </div>
                )}

                {profileError && (
                  <div className="p-3 rounded-xl bg-red-100 text-red-950 text-xs font-black flex items-center gap-2 border-2 border-red-500">
                    <AlertCircle size={16} className="shrink-0 text-red-700 stroke-[3]" />
                    <span>{profileError}</span>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-black text-black dark:text-zinc-200 uppercase tracking-wider block">
                    Adresse E-mail (Non modifiable)
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 text-black dark:text-zinc-400 w-4 h-4 stroke-[2.5]" />
                    <input
                      type="text"
                      disabled
                      value={currentUser.email}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border-2 border-black bg-zinc-100 text-xs text-black font-black cursor-not-allowed"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-black text-black dark:text-zinc-200 uppercase tracking-wider block">
                    Nom d'utilisateur actuel
                  </label>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-3 text-black dark:text-zinc-400 w-4 h-4 stroke-[2.5]" />
                    <input
                      type="text"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border-2 border-black bg-white text-xs text-black font-black focus:outline-none focus:bg-yellow-50"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="text-xs font-black text-black dark:text-zinc-200 uppercase tracking-wider block">
                    Type de privilèges associés
                  </span>
                  <div className="flex items-center gap-2.5 px-3 py-3 rounded-xl border-2 border-black bg-zinc-50 dark:bg-zinc-950 text-xs font-black text-black">
                    {currentUser.isAdmin ? (
                      <>
                        <ShieldCheck size={18} className="text-emerald-600 stroke-[3] shrink-0 animate-bounce" />
                        <span>Administrateur Système (Accès complet au Master Prompt)</span>
                      </>
                    ) : (
                      <>
                        <UserIcon size={18} className="text-orange-600 stroke-[3] shrink-0" />
                        <span>Membre standard (Accès utilisateur standard)</span>
                      </>
                    )}
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 px-4 rounded-xl bg-black hover:bg-zinc-800 text-white font-black text-xs transition-all hover:scale-[1.01] active:scale-[0.99] border-2 border-black shadow-md cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Save size={14} className="stroke-[2.5]" />
                  <span>ENREGISTRER MES MODIFICATIONS</span>
                </button>
              </motion.form>
            )}

            {activeTab === "security" && (
              <motion.form
                key="security-tab"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                onSubmit={handleUpdatePassword}
                className="space-y-4"
              >
                {securitySuccess && (
                  <div className="p-3 rounded-xl bg-emerald-100 text-emerald-950 text-xs font-black flex items-center gap-2 border-2 border-emerald-500">
                    <CheckCircle2 size={16} className="shrink-0 text-emerald-700 stroke-[3]" />
                    <span>{securitySuccess}</span>
                  </div>
                )}

                {securityError && (
                  <div className="p-3 rounded-xl bg-red-100 text-red-950 text-xs font-black flex items-center gap-2 border-2 border-red-500">
                    <AlertCircle size={16} className="shrink-0 text-red-700 stroke-[3]" />
                    <span>{securityError}</span>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-black text-black dark:text-zinc-200 uppercase tracking-wider block">
                    Mot de passe actuel
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 text-black dark:text-zinc-400 w-4 h-4 stroke-[2.5]" />
                    <input
                      type="password"
                      required
                      value={oldPassword}
                      onChange={(e) => setOldPassword(e.target.value)}
                      placeholder="Saisissez votre mot de passe actuel"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border-2 border-black bg-white text-xs text-black font-black focus:outline-none focus:bg-yellow-50 placeholder-zinc-500"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-black text-black dark:text-zinc-200 uppercase tracking-wider block">
                    Nouveau mot de passe
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 text-black dark:text-zinc-400 w-4 h-4 stroke-[2.5]" />
                    <input
                      type="password"
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Minimum 4 caractères"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border-2 border-black bg-white text-xs text-black font-black focus:outline-none focus:bg-yellow-50 placeholder-zinc-500"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-black text-black dark:text-zinc-200 uppercase tracking-wider block">
                    Confirmer le nouveau mot de passe
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 text-black dark:text-zinc-400 w-4 h-4 stroke-[2.5]" />
                    <input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Retapez le nouveau mot de passe"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border-2 border-black bg-white text-xs text-black font-black focus:outline-none focus:bg-yellow-50 placeholder-zinc-500"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 px-4 rounded-xl bg-black hover:bg-zinc-800 text-white font-black text-xs transition-all hover:scale-[1.01] active:scale-[0.99] border-2 border-black shadow-md cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Lock size={14} className="stroke-[2.5]" />
                  <span>MODIFIER MON MOT DE PASSE</span>
                </button>
              </motion.form>
            )}

            {activeTab === "users" && currentUser.isAdmin && (
              <motion.div
                key="users-tab"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="space-y-6"
              >
                {adminSuccess && (
                  <div className="p-3 rounded-xl bg-emerald-100 text-emerald-950 text-xs font-black flex items-center gap-2 border-2 border-emerald-500">
                    <CheckCircle2 size={16} className="shrink-0 text-emerald-700 stroke-[3]" />
                    <span>{adminSuccess}</span>
                  </div>
                )}

                {adminError && (
                  <div className="p-3 rounded-xl bg-red-100 text-red-950 text-xs font-black flex items-center gap-2 border-2 border-red-500">
                    <AlertCircle size={16} className="shrink-0 text-red-700 stroke-[3]" />
                    <span>{adminError}</span>
                  </div>
                )}

                <div className="flex items-center justify-between border-b-2 border-zinc-200 pb-3">
                  <h4 className="text-sm font-black text-black uppercase tracking-wider">
                    Liste des Comptes Enregistrés ({usersList.length})
                  </h4>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddForm(!showAddForm);
                      setSelectedUserEmail(null);
                      setAdminError("");
                      setAdminSuccess("");
                    }}
                    className="px-3 py-1.5 rounded-lg border-2 border-emerald-600 hover:bg-emerald-50 text-emerald-700 text-xs font-black flex items-center gap-1 cursor-pointer transition-all"
                  >
                    <UserPlus size={14} className="stroke-[2.5]" />
                    <span>{showAddForm ? "Fermer" : "Ajouter un compte"}</span>
                  </button>
                </div>

                {/* Create New User Form */}
                {showAddForm && (
                  <form onSubmit={handleAddNewUser} className="p-4 rounded-2xl border-2 border-black bg-zinc-50 space-y-4 animate-in slide-in-from-top-2 duration-200">
                    <div className="flex items-center gap-2 text-xs font-black text-black">
                      <UserPlus size={16} className="text-emerald-600 stroke-[2.5]" />
                      <span>CRÉER UN NOUVEL UTILISATEUR</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-black uppercase">Nom d'utilisateur</label>
                        <input
                          type="text"
                          required
                          value={newUsername}
                          onChange={(e) => setNewUsername(e.target.value)}
                          placeholder="Ex: Sophie L."
                          className="w-full px-3 py-2 rounded-xl border-2 border-black bg-white text-xs text-black font-black"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-black uppercase">E-mail de connexion</label>
                        <input
                          type="email"
                          required
                          value={newUserEmail}
                          onChange={(e) => setNewUserEmail(e.target.value)}
                          placeholder="sophie@example.com"
                          className="w-full px-3 py-2 rounded-xl border-2 border-black bg-white text-xs text-black font-black"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-black uppercase">Mot de passe de départ</label>
                        <input
                          type="password"
                          required
                          value={newUserPassword}
                          onChange={(e) => setNewUserPassword(e.target.value)}
                          placeholder="Min. 4 caractères"
                          className="w-full px-3 py-2 rounded-xl border-2 border-black bg-white text-xs text-black font-black"
                        />
                      </div>

                      <div className="flex items-center mt-6">
                        <label className="flex items-center gap-2 text-xs font-black text-black cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={newUserIsAdmin}
                            onChange={(e) => setNewUserIsAdmin(e.target.checked)}
                            className="w-4 h-4 border-2 border-black rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                          />
                          <span>Accorder les droits Administrateur</span>
                        </label>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setShowAddForm(false)}
                        className="px-4 py-2 rounded-xl border-2 border-black hover:bg-zinc-200 text-xs font-black cursor-pointer"
                      >
                        Annuler
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white border-2 border-black text-xs font-black cursor-pointer"
                      >
                        Créer le compte
                      </button>
                    </div>
                  </form>
                )}

                {/* User Edit Form */}
                {selectedUserEmail && (
                  <form onSubmit={handleSaveEditedUser} className="p-4 rounded-2xl border-2 border-black bg-yellow-50 space-y-4 animate-in slide-in-from-top-2 duration-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs font-black text-black">
                        <KeyRound size={16} className="text-orange-600 stroke-[2.5]" />
                        <span>MODIFIER LE COMPTE : <span className="underline">{selectedUserEmail}</span></span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedUserEmail(null)}
                        className="text-xs font-black text-red-600 hover:underline"
                      >
                        Fermer l'éditeur
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-black uppercase">Nom d'utilisateur</label>
                        <input
                          type="text"
                          required
                          value={editUsername}
                          onChange={(e) => setEditUsername(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border-2 border-black bg-white text-xs text-black font-black"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-black uppercase">Mot de passe actuel / Nouveau</label>
                        <input
                          type="text"
                          required
                          value={editPassword}
                          onChange={(e) => setEditPassword(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border-2 border-black bg-white text-xs text-black font-black font-mono"
                        />
                      </div>

                      <div className="flex items-center mt-6">
                        <label className="flex items-center gap-2 text-xs font-black text-black cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={editIsAdmin}
                            disabled={selectedUserEmail.toLowerCase() === currentUser.email.toLowerCase()}
                            onChange={(e) => setEditIsAdmin(e.target.checked)}
                            className="w-4 h-4 border-2 border-black rounded text-orange-600 focus:ring-orange-500 cursor-pointer disabled:cursor-not-allowed"
                          />
                          <span>Droits d'administration</span>
                        </label>
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-2 border-t border-zinc-300">
                      <button
                        type="button"
                        onClick={() => handleDeleteUser(selectedUserEmail)}
                        className="px-3 py-2 rounded-xl bg-red-100 hover:bg-red-200 text-red-700 border-2 border-red-600 text-xs font-black flex items-center gap-1 cursor-pointer transition-all"
                      >
                        <Trash2 size={13} className="stroke-[2.5]" />
                        <span>Supprimer ce compte</span>
                      </button>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedUserEmail(null)}
                          className="px-4 py-2 rounded-xl border-2 border-black hover:bg-zinc-200 text-xs font-black cursor-pointer"
                        >
                          Annuler
                        </button>
                        <button
                          type="submit"
                          className="px-4 py-2 rounded-xl bg-black hover:bg-zinc-800 text-white border-2 border-black text-xs font-black cursor-pointer"
                        >
                          Enregistrer
                        </button>
                      </div>
                    </div>
                  </form>
                )}

                {/* Users List Table */}
                <div className="border-2 border-black rounded-2xl overflow-hidden bg-white">
                  <div className="grid grid-cols-12 gap-2 bg-zinc-100 p-3 text-xs font-black text-black uppercase border-b-2 border-black">
                    <div className="col-span-4">Utilisateur</div>
                    <div className="col-span-5">E-mail</div>
                    <div className="col-span-1 text-center">Type</div>
                    <div className="col-span-2 text-right">Actions</div>
                  </div>

                  <div className="divide-y divide-zinc-200 max-h-64 overflow-y-auto">
                    {usersList.map((u) => (
                      <div
                        key={u.email}
                        className={`grid grid-cols-12 gap-2 p-3 text-xs font-black items-center transition-colors ${
                          selectedUserEmail?.toLowerCase() === u.email.toLowerCase()
                            ? "bg-yellow-50"
                            : u.email.toLowerCase() === currentUser.email.toLowerCase()
                            ? "bg-zinc-50"
                            : "hover:bg-zinc-50"
                        }`}
                      >
                        <div className="col-span-4 truncate text-black flex items-center gap-1.5">
                          <UserIcon size={14} className="text-zinc-600 stroke-[2.5]" />
                          <span className="truncate">{u.username}</span>
                        </div>
                        
                        <div className="col-span-5 truncate text-black font-mono font-bold select-all">
                          {u.email}
                        </div>
                        
                        <div className="col-span-1 text-center">
                          {u.isAdmin ? (
                            <span className="bg-emerald-100 text-emerald-800 border border-emerald-400 px-1.5 py-0.5 rounded text-[10px] font-black uppercase">
                              Admin
                            </span>
                          ) : (
                            <span className="bg-orange-100 text-orange-800 border border-orange-400 px-1.5 py-0.5 rounded text-[10px] font-black uppercase">
                              User
                            </span>
                          )}
                        </div>

                        <div className="col-span-2 text-right flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleSelectUserToEdit(u)}
                            className="px-2 py-1 rounded border-2 border-black hover:bg-yellow-100 text-[10px] font-black uppercase cursor-pointer"
                          >
                            Éditer
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
