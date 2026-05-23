import React from "react";
import { motion as Motion, AnimatePresence } from "motion/react";
import {
  ArrowLeft,
  Settings,
  Tag,
  Users,
  Palette,
  Plus,
  Edit2,
  Trash2,
  Sun,
  Moon,
  Shield,
  User,
  Lock,
  AlertCircle,
  Check,
} from "lucide-react";
import { api } from "../utils/api";

interface SettingsViewProps {
  onBack: () => void;
  currentUser: any;
  appTheme: 'dark' | 'light';
  onThemeChange: (theme: 'dark' | 'light') => void;
}

type Tab = "categories" | "users" | "theme" | "general";

export function SettingsView({ onBack, currentUser, appTheme, onThemeChange }: SettingsViewProps) {
  const [activeTab, setActiveTab] = React.useState<Tab>("categories");
  const [categories, setCategories] = React.useState<any[]>([]);
  const [users, setUsers] = React.useState<any[]>([]);

  // Category form
  const [categoryForm, setCategoryForm] = React.useState({
    id: "",
    nom: "",
    couleur: "#3b82f6",
  });
  const [isEditingCategory, setIsEditingCategory] = React.useState(false);

  // User form
  const [userForm, setUserForm] = React.useState({
    id: "",
    nom: "",
    username: "",
    password: "",
    role: "user" as "admin" | "user",
  });
  const [isEditingUser, setIsEditingUser] = React.useState(false);
  const [userError, setUserError] = React.useState("");

  const loadData = React.useCallback(async () => {
    const [cats, usrs] = await Promise.all([
      api.getCategories(),
      api.getUsers(),
    ]);
    setCategories(cats);
    setUsers(usrs);
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  // ── Category Management ─────────────────────────────────────────────────
  const handleSaveCategory = async () => {
    if (!categoryForm.nom.trim()) return;

    await api.saveCategory(categoryForm);
    await api.logAction({
      type: "produit",
      description: isEditingCategory
        ? `Catégorie "${categoryForm.nom}" modifiée`
        : `Catégorie "${categoryForm.nom}" créée`,
      userId: currentUser.id,
      userName: currentUser.nom,
    });

    setCategoryForm({ id: "", nom: "", couleur: "#3b82f6" });
    setIsEditingCategory(false);
    loadData();
  };

  const handleEditCategory = (cat: any) => {
    setCategoryForm(cat);
    setIsEditingCategory(true);
  };

  const handleDeleteCategory = async (id: string, nom: string) => {
    if (
      !confirm(
        `Supprimer la catégorie "${nom}" ? Cette action est irréversible.`
      )
    )
      return;

    await api.deleteCategory(id);
    await api.logAction({
      type: "produit",
      description: `Catégorie "${nom}" supprimée`,
      userId: currentUser.id,
      userName: currentUser.nom,
    });

    loadData();
  };

  // ── User Management ─────────────────────────────────────────────────────
  const handleSaveUser = async () => {
    setUserError("");

    if (!userForm.nom.trim() || !userForm.username.trim()) {
      setUserError("Le nom et le nom d'utilisateur sont requis");
      return;
    }

    if (!isEditingUser && !userForm.password.trim()) {
      setUserError("Le mot de passe est requis pour un nouvel utilisateur");
      return;
    }

    // Check duplicate username
    const duplicate = users.find(
      (u) => u.username === userForm.username && u.id !== userForm.id
    );
    if (duplicate) {
      setUserError("Ce nom d'utilisateur existe déjà");
      return;
    }

    await api.saveUser(userForm);
    await api.logAction({
      type: "connexion",
      description: isEditingUser
        ? `Utilisateur "${userForm.nom}" modifié`
        : `Utilisateur "${userForm.nom}" créé`,
      userId: currentUser.id,
      userName: currentUser.nom,
    });

    setUserForm({ id: "", nom: "", username: "", password: "", role: "user" });
    setIsEditingUser(false);
    loadData();
  };

  const handleEditUser = (user: any) => {
    setUserForm({ ...user, password: "" }); // Don't show password
    setIsEditingUser(true);
    setUserError("");
  };

  const handleDeleteUser = async (id: string, nom: string) => {
    if (id === currentUser.id) {
      alert("Vous ne pouvez pas supprimer votre propre compte");
      return;
    }

    if (
      !confirm(
        `Supprimer l'utilisateur "${nom}" ? Cette action est irréversible.`
      )
    )
      return;

    await api.deleteUser(id);
    await api.logAction({
      type: "connexion",
      description: `Utilisateur "${nom}" supprimé`,
      userId: currentUser.id,
      userName: currentUser.nom,
    });

    loadData();
  };

  // ── Theme Management ────────────────────────────────────────────────────
  const handleThemeChange = async (theme: "dark" | "light") => {
    onThemeChange(theme);

    await api.logAction({
      type: "thème_modifié",
      description: `Thème changé en mode ${
        theme === "dark" ? "sombre" : "clair"
      }`,
      userId: currentUser.id,
      userName: currentUser.nom,
    });
  };

  const tabs = [
    { id: "categories" as Tab, label: "Catégories", icon: Tag },
    { id: "users" as Tab, label: "Utilisateurs", icon: Users },
    { id: "theme" as Tab, label: "Thème", icon: Palette },
  ];

  return (
    <Motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      className="flex flex-col h-full"
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={onBack}
          className="p-2 hover:bg-gray-800 rounded-lg transition-colors cursor-pointer"
        >
          <ArrowLeft size={20} className="text-gray-300" />
        </button>
        <div>
          <h2 className="text-xl font-bold text-white">Paramètres</h2>
          <p className="text-xs text-gray-400">
            Configuration de l'application
          </p>
        </div>
      </div>

      {/* ── Accès refusé — non-admin ─────────────────────────────────── */}
      {currentUser?.role !== "admin" ? (
        <Motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex-1 flex flex-col items-center justify-center text-center px-6"
        >
          <div className="w-20 h-20 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-5">
            <Lock size={36} className="text-red-400" />
          </div>
          <h3 className="text-lg font-black text-white mb-2">Accès restreint</h3>
          <p className="text-sm text-gray-400 mb-1">
            Cette section est réservée aux administrateurs.
          </p>
          <p className="text-xs text-gray-600 mb-8">
            Connectez-vous avec un compte administrateur pour accéder aux paramètres.
          </p>
          <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-800/60 border border-gray-700/50 rounded-xl">
            <User size={14} className="text-gray-500" />
            <span className="text-sm text-gray-400">
              Connecté en tant que <span className="text-white font-semibold">{currentUser?.nom}</span>
            </span>
            <span className="ml-1 px-2 py-0.5 bg-gray-700/60 text-gray-400 rounded-full text-[10px] font-bold uppercase">
              Utilisateur
            </span>
          </div>
          <button
            onClick={onBack}
            className="mt-6 flex items-center gap-2 px-5 py-2.5 bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white rounded-xl text-sm font-bold transition-all cursor-pointer"
          >
            <ArrowLeft size={15} /> Retour au menu
          </button>
        </Motion.div>
      ) : (
        <>
          {/* Tabs */}
          <div className="flex gap-2 mb-4 overflow-x-auto pb-2 scrollbar-hide">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors whitespace-nowrap cursor-pointer ${
                    activeTab === tab.id
                      ? "bg-blue-500 text-white"
                      : "bg-gray-800/50 text-gray-300 hover:bg-gray-800"
                  }`}
                >
                  <Icon size={16} />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <AnimatePresence mode="wait">
              {/* ── CATEGORIES TAB ──────────────────────────────── */}
              {activeTab === "categories" && (
                <Motion.div
                  key="categories"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-4"
                >
                  {/* Category Form */}
                  <div className="p-4 bg-gray-800/30 border border-gray-700/50 rounded-lg">
                    <h3 className="text-sm font-semibold text-white mb-3">
                      {isEditingCategory
                        ? "Modifier la catégorie"
                        : "Nouvelle catégorie"}
                    </h3>
                    <div className="space-y-3">
                      <input
                        type="text"
                        value={categoryForm.nom}
                        onChange={(e) =>
                          setCategoryForm({ ...categoryForm, nom: e.target.value })
                        }
                        placeholder="Nom de la catégorie"
                        className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
                      />
                      <div className="flex items-center gap-3">
                        <label className="text-sm text-gray-300">Couleur :</label>
                        <input
                          type="color"
                          value={categoryForm.couleur}
                          onChange={(e) =>
                            setCategoryForm({
                              ...categoryForm,
                              couleur: e.target.value,
                            })
                          }
                          className="w-12 h-10 rounded cursor-pointer border border-gray-700"
                        />
                        <div className="flex-1" />
                        {isEditingCategory && (
                          <button
                            onClick={() => {
                              setCategoryForm({
                                id: "",
                                nom: "",
                                couleur: "#3b82f6",
                              });
                              setIsEditingCategory(false);
                            }}
                            className="px-3 py-1.5 text-sm text-gray-400 hover:text-white transition-colors cursor-pointer"
                          >
                            Annuler
                          </button>
                        )}
                        <button
                          onClick={handleSaveCategory}
                          disabled={!categoryForm.nom.trim()}
                          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                        >
                          {isEditingCategory ? "Modifier" : "Ajouter"}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Categories List */}
                  <div className="space-y-2">
                    {categories.map((cat) => (
                      <div
                        key={cat.id}
                        className="p-3 bg-gray-800/30 border border-gray-700/50 rounded-lg flex items-center gap-3"
                      >
                        <div
                          className="w-4 h-4 rounded"
                          style={{ backgroundColor: cat.couleur }}
                        />
                        <span className="flex-1 text-sm text-white font-medium">
                          {cat.nom}
                        </span>
                        <button
                          onClick={() => handleEditCategory(cat)}
                          className="p-1.5 hover:bg-gray-700 rounded transition-colors cursor-pointer"
                        >
                          <Edit2 size={14} className="text-blue-400" />
                        </button>
                        <button
                          onClick={() => handleDeleteCategory(cat.id, cat.nom)}
                          className="p-1.5 hover:bg-gray-700 rounded transition-colors cursor-pointer"
                        >
                          <Trash2 size={14} className="text-red-400" />
                        </button>
                      </div>
                    ))}
                  </div>
                </Motion.div>
              )}

              {/* ── USERS TAB ───────────────────────────────────── */}
              {activeTab === "users" && (
                <Motion.div
                  key="users"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-4"
                >
                  {/* User Form */}
                  <div className="p-4 bg-gray-800/30 border border-gray-700/50 rounded-lg">
                    <h3 className="text-sm font-semibold text-white mb-3">
                      {isEditingUser
                        ? "Modifier l'utilisateur"
                        : "Nouvel utilisateur"}
                    </h3>
                    <div className="space-y-3">
                      <input
                        type="text"
                        value={userForm.nom}
                        onChange={(e) =>
                          setUserForm({ ...userForm, nom: e.target.value })
                        }
                        placeholder="Nom complet"
                        className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
                      />
                      <input
                        type="text"
                        value={userForm.username}
                        onChange={(e) =>
                          setUserForm({ ...userForm, username: e.target.value })
                        }
                        placeholder="Nom d'utilisateur"
                        className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
                      />
                      <input
                        type="password"
                        value={userForm.password}
                        onChange={(e) =>
                          setUserForm({ ...userForm, password: e.target.value })
                        }
                        placeholder={
                          isEditingUser
                            ? "Nouveau mot de passe (laisser vide pour ne pas changer)"
                            : "Mot de passe"
                        }
                        className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
                      />
                      <div className="flex items-center gap-3">
                        <label className="text-sm text-gray-300">Rôle :</label>
                        <select
                          value={userForm.role}
                          onChange={(e) =>
                            setUserForm({
                              ...userForm,
                              role: e.target.value as "admin" | "user",
                            })
                          }
                          className="bg-gray-800/50 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors cursor-pointer"
                        >
                          <option value="user">Utilisateur</option>
                          <option value="admin">Administrateur</option>
                        </select>
                        <div className="flex-1" />
                        {isEditingUser && (
                          <button
                            onClick={() => {
                              setUserForm({
                                id: "",
                                nom: "",
                                username: "",
                                password: "",
                                role: "user",
                              });
                              setIsEditingUser(false);
                              setUserError("");
                            }}
                            className="px-3 py-1.5 text-sm text-gray-400 hover:text-white transition-colors cursor-pointer"
                          >
                            Annuler
                          </button>
                        )}
                        <button
                          onClick={handleSaveUser}
                          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition-colors cursor-pointer"
                        >
                          {isEditingUser ? "Modifier" : "Ajouter"}
                        </button>
                      </div>
                      {userError && (
                        <div className="flex items-center gap-2 p-2 bg-red-500/10 border border-red-500/20 rounded-lg">
                          <AlertCircle size={14} className="text-red-400" />
                          <p className="text-xs text-red-400">{userError}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Users List */}
                  <div className="space-y-2">
                    {users.map((user) => (
                      <div
                        key={user.id}
                        className="p-3 bg-gray-800/30 border border-gray-700/50 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center ${
                              user.role === "admin"
                                ? "bg-blue-500/10 border border-blue-500/20"
                                : "bg-gray-700/50 border border-gray-600/20"
                            }`}
                          >
                            {user.role === "admin" ? (
                              <Shield size={18} className="text-blue-400" />
                            ) : (
                              <User size={18} className="text-gray-400" />
                            )}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-white">
                              {user.nom}
                              {user.id === currentUser.id && (
                                <span className="ml-2 text-xs text-blue-400">
                                  (Vous)
                                </span>
                              )}
                            </p>
                            <p className="text-xs text-gray-400">
                              @{user.username} ·{" "}
                              {user.role === "admin"
                                ? "Administrateur"
                                : "Utilisateur"}
                            </p>
                          </div>
                          <button
                            onClick={() => handleEditUser(user)}
                            className="p-1.5 hover:bg-gray-700 rounded transition-colors cursor-pointer"
                          >
                            <Edit2 size={14} className="text-blue-400" />
                          </button>
                          {user.id !== currentUser.id && (
                            <button
                              onClick={() => handleDeleteUser(user.id, user.nom)}
                              className="p-1.5 hover:bg-gray-700 rounded transition-colors cursor-pointer"
                            >
                              <Trash2 size={14} className="text-red-400" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </Motion.div>
              )}

              {/* ── THEME TAB ───────────────────────────────────── */}
              {activeTab === "theme" && (
                <Motion.div
                  key="theme"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-4"
                >
                  <div className="p-4 bg-gray-800/30 border border-gray-700/50 rounded-lg">
                    <h3 className="text-sm font-semibold text-white mb-4">
                      Apparence de l'application
                    </h3>

                    <div className="grid grid-cols-2 gap-3">
                      {/* Dark Theme */}
                      <button
                        onClick={() => handleThemeChange("dark")}
                        className={`p-4 rounded-lg border-2 transition-all cursor-pointer ${
                          appTheme === "dark"
                            ? "border-blue-500 bg-blue-500/10"
                            : "border-gray-700 bg-gray-800/30 hover:bg-gray-800/50"
                        }`}
                      >
                        <div className="flex flex-col items-center gap-2">
                          <div className="w-12 h-12 rounded-full bg-gray-900 flex items-center justify-center">
                            <Moon size={24} className="text-blue-400" />
                          </div>
                          <span className="text-sm font-medium text-white">
                            Sombre
                          </span>
                          {appTheme === "dark" && (
                            <div className="flex items-center gap-1 text-xs text-blue-400">
                              <Check size={12} />
                              <span>Actif</span>
                            </div>
                          )}
                        </div>
                      </button>

                      {/* Light Theme */}
                      <button
                        onClick={() => handleThemeChange("light")}
                        className={`p-4 rounded-lg border-2 transition-all cursor-pointer ${
                          appTheme === "light"
                            ? "border-blue-500 bg-blue-500/10"
                            : "border-gray-700 bg-gray-800/30 hover:bg-gray-800/50"
                        }`}
                      >
                        <div className="flex flex-col items-center gap-2">
                          <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                            <Sun size={24} className="text-yellow-500" />
                          </div>
                          <span className="text-sm font-medium text-white">
                            Clair
                          </span>
                          {appTheme === "light" && (
                            <div className="flex items-center gap-1 text-xs text-blue-400">
                              <Check size={12} />
                              <span>Actif</span>
                            </div>
                          )}
                        </div>
                      </button>
                    </div>

                    <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                      <p className="text-xs text-blue-400">
                        Le thème sélectionné s'applique à l'ensemble de l'application et est automatiquement sauvegardé.
                      </p>
                    </div>
                  </div>
                </Motion.div>
              )}
            </AnimatePresence>
          </div>
        </>
      )}
    </Motion.div>
  );
}