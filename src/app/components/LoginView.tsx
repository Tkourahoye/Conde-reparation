import React from "react";
import { motion as Motion } from "motion/react";
import { LogIn, User, Lock, AlertCircle } from "lucide-react";
import { api } from "../utils/api";

interface LoginViewProps {
  onLogin: (user: any) => void;
}

export function LoginView({ onLogin }: LoginViewProps) {
  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const users = await api.getUsers();
      const user = users.find(
        (u: any) => u.username === username && u.password === password
      );

      if (user) {
        api.setCurrentUser(user);
        await api.logAction({
          type: "connexion",
          description: `${user.nom} s'est connecté`,
          userId: user.id,
          userName: user.nom,
        });
        onLogin(user);
      } else {
        setError("Nom d'utilisateur ou mot de passe incorrect");
      }
    } catch (err) {
      setError("Erreur de connexion");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center h-full px-6"
    >
      <div className="w-full max-w-sm">
        {/* Logo / Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-500/10 border border-blue-500/20 mb-4">
            <LogIn className="text-blue-400" size={28} />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Connexion</h2>
          <p className="text-gray-400 text-sm">
            Identifiez-vous pour accéder à l'application
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          {/* Username */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Nom d'utilisateur
            </label>
            <div className="relative">
              <User
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
                size={18}
              />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-gray-800/50 border border-gray-700 rounded-lg pl-10 pr-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
                placeholder="Entrez votre nom d'utilisateur"
                required
                autoFocus
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Mot de passe
            </label>
            <div className="relative">
              <Lock
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
                size={18}
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-gray-800/50 border border-gray-700 rounded-lg pl-10 pr-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
                placeholder="Entrez votre mot de passe"
                required
              />
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <Motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg"
            >
              <AlertCircle size={18} className="text-red-400 shrink-0" />
              <p className="text-sm text-red-400">{error}</p>
            </Motion.div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-6"
          >
            {isLoading ? "Connexion..." : "Se connecter"}
          </button>
        </form>

        {/* Default Credentials Info */}
        <div className="mt-6 p-4 bg-gray-800/30 border border-gray-700/50 rounded-lg">
          <p className="text-xs text-gray-400 text-center">
            <strong className="text-gray-300">Compte par défaut :</strong>
            <br />
            Utilisateur : <code className="text-blue-400">admin</code> / Mot de passe :{" "}
            <code className="text-blue-400">admin123</code>
          </p>
        </div>
      </div>
    </Motion.div>
  );
}
