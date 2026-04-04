import React from "react";
import { motion as Motion } from "motion/react";
import {
  ArrowLeft,
  Filter,
  Calendar,
  User,
  Activity,
  Search,
  X,
} from "lucide-react";
import { api } from "../utils/api";
import { formatCurrency } from "../utils/format";

interface HistoryViewProps {
  onBack: () => void;
}

const ACTION_TYPES = [
  { value: "all", label: "Tous", color: "gray" },
  { value: "vente", label: "Vente", color: "green" },
  { value: "paiement", label: "Paiement", color: "blue" },
  { value: "depot", label: "Dépôt", color: "purple" },
  { value: "dette", label: "Dette", color: "orange" },
  { value: "produit", label: "Produit", color: "cyan" },
  { value: "client", label: "Client", color: "pink" },
  { value: "connexion", label: "Connexion", color: "indigo" },
];

export function HistoryView({ onBack }: HistoryViewProps) {
  const [actions, setActions] = React.useState<any[]>([]);
  const [filterType, setFilterType] = React.useState("all");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [isFilterOpen, setIsFilterOpen] = React.useState(false);

  const loadActions = React.useCallback(async () => {
    const data = await api.getActions();
    setActions(data);
  }, []);

  React.useEffect(() => {
    loadActions();
  }, [loadActions]);

  const filteredActions = React.useMemo(() => {
    let filtered = actions;

    // Filter by type
    if (filterType !== "all") {
      filtered = filtered.filter((action) => action.type === filterType);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (action) =>
          action.description?.toLowerCase().includes(query) ||
          action.userName?.toLowerCase().includes(query) ||
          action.type?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [actions, filterType, searchQuery]);

  const getActionColor = (type: string) => {
    const actionType = ACTION_TYPES.find((t) => t.value === type);
    return actionType?.color || "gray";
  };

  const getActionIcon = (type: string) => {
    const colorMap: Record<string, string> = {
      green: "text-green-400",
      blue: "text-blue-400",
      purple: "text-purple-400",
      orange: "text-orange-400",
      cyan: "text-cyan-400",
      pink: "text-pink-400",
      indigo: "text-indigo-400",
      gray: "text-gray-400",
    };
    const color = getActionColor(type);
    return colorMap[color] || "text-gray-400";
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "À l'instant";
    if (diffMins < 60) return `Il y a ${diffMins} min`;
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    if (diffDays === 1) return "Hier";
    if (diffDays < 7) return `Il y a ${diffDays} jours`;

    return date.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

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
          <h2 className="text-xl font-bold text-white">Historique</h2>
          <p className="text-xs text-gray-400">
            {filteredActions.length} action(s)
          </p>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex gap-2 mb-4">
        {/* Search */}
        <div className="flex-1 relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
            size={16}
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher..."
            className="w-full bg-gray-800/50 border border-gray-700 rounded-lg pl-9 pr-9 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-700 rounded transition-colors cursor-pointer"
            >
              <X size={14} className="text-gray-400" />
            </button>
          )}
        </div>

        {/* Filter Button */}
        <button
          onClick={() => setIsFilterOpen(!isFilterOpen)}
          className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors cursor-pointer ${
            filterType !== "all"
              ? "bg-blue-500 text-white"
              : "bg-gray-800/50 border border-gray-700 text-gray-300 hover:bg-gray-800"
          }`}
        >
          <Filter size={16} />
          <span className="text-sm font-medium">Filtrer</span>
        </button>
      </div>

      {/* Filter Options */}
      {isFilterOpen && (
        <Motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="mb-4 p-3 bg-gray-800/30 border border-gray-700/50 rounded-lg"
        >
          <div className="flex flex-wrap gap-2">
            {ACTION_TYPES.map((type) => (
              <button
                key={type.value}
                onClick={() => {
                  setFilterType(type.value);
                  setIsFilterOpen(false);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  filterType === type.value
                    ? `bg-${type.color}-500 text-white`
                    : "bg-gray-700/50 text-gray-300 hover:bg-gray-700"
                }`}
              >
                {type.label}
              </button>
            ))}
          </div>
        </Motion.div>
      )}

      {/* Actions List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2">
        {filteredActions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <Activity size={48} className="mb-3 opacity-30" />
            <p className="text-sm">Aucune action trouvée</p>
            {(filterType !== "all" || searchQuery) && (
              <button
                onClick={() => {
                  setFilterType("all");
                  setSearchQuery("");
                }}
                className="mt-2 text-blue-400 hover:underline text-xs cursor-pointer"
              >
                Réinitialiser les filtres
              </button>
            )}
          </div>
        ) : (
          filteredActions.map((action) => (
            <Motion.div
              key={action.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 bg-gray-800/30 border border-gray-700/50 rounded-lg hover:bg-gray-800/50 transition-colors"
            >
              <div className="flex items-start gap-3">
                {/* Icon */}
                <div
                  className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                    action.type === "vente"
                      ? "bg-green-500/10"
                      : action.type === "paiement"
                      ? "bg-blue-500/10"
                      : action.type === "depot"
                      ? "bg-purple-500/10"
                      : action.type === "dette"
                      ? "bg-orange-500/10"
                      : action.type === "produit"
                      ? "bg-cyan-500/10"
                      : action.type === "client"
                      ? "bg-pink-500/10"
                      : action.type === "connexion"
                      ? "bg-indigo-500/10"
                      : "bg-gray-500/10"
                  }`}
                >
                  <Activity
                    size={16}
                    className={getActionIcon(action.type)}
                  />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white font-medium mb-1">
                    {action.description}
                  </p>
                  <div className="flex items-center gap-3 text-xs text-gray-400">
                    <div className="flex items-center gap-1">
                      <User size={12} />
                      <span>{action.userName || "Système"}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar size={12} />
                      <span>{formatDate(action.timestamp)}</span>
                    </div>
                  </div>
                  {action.details && (
                    <div className="mt-2 text-xs text-gray-500">
                      {action.details}
                    </div>
                  )}
                </div>
              </div>
            </Motion.div>
          ))
        )}
      </div>
    </Motion.div>
  );
}
