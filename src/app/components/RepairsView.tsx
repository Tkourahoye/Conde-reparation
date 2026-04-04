import React from "react";
import { ChevronLeft, Search, Plus, Smartphone, CheckCircle2, Trash2, Calendar, AlertTriangle, CreditCard, Clock, AlertCircle } from "lucide-react";
import { motion as Motion, AnimatePresence } from "motion/react";
import { Button, Input } from "./ui";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { formatCurrency } from "../utils/format";
import { api } from "../utils/api";

interface Repair {
  id: string;
  client: string;
  telephoneModel: string;
  sommeTotale: number;
  dateDepot: string;
  dateLimite: string;
  statut: 'en_attente' | 'recupere';
  paiementStatut: 'paye' | 'dette';
  image: string;
}

export const RepairsView = ({ onBack }: { onBack: () => void }) => {
  const [searchTerm, setSearchTerm] = React.useState("");
  const [showForm, setShowForm] = React.useState(false);
  const [repairs, setRepairs] = React.useState<Repair[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = React.useState<string | null>(null);

  React.useEffect(() => {
    const fetchRepairs = async () => {
      try {
        const data = await api.getRepairs();
        const repairList: Repair[] = Array.isArray(data) ? data : [];
        // Sort by dateDepot descending
        repairList.sort((a, b) => new Date(b.dateDepot).getTime() - new Date(a.dateDepot).getTime());
        setRepairs(repairList);
      } catch (err) {
        console.error("Failed to fetch repairs:", err);
        setError("Erreur de chargement des réparations.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchRepairs();
  }, []);

  const [form, setForm] = React.useState({
    client: "",
    telephoneModel: "",
    sommeTotale: "",
    dateLimite: "",
    payeImmediatement: true,
  });

  const today = new Date().toISOString().split('T')[0];

  const handleAdd = async () => {
    if (!form.client || !form.telephoneModel) {
      setError("Veuillez renseigner le client et le modèle.");
      return;
    }
    setError(null);
    setIsSaving(true);

    const newRepair: Omit<Repair, 'id'> = {
      client: form.client,
      telephoneModel: form.telephoneModel,
      sommeTotale: Number(form.sommeTotale) || 0,
      dateDepot: today,
      dateLimite: form.dateLimite || today,
      statut: 'en_attente',
      paiementStatut: form.payeImmediatement ? 'paye' : 'dette',
      image: "https://images.unsplash.com/photo-1556656793-062ff98782ee?q=80&w=200&auto=format&fit=crop",
    };

    try {
      const saved = await api.saveRepair(newRepair);

      // If it's a debt, create a standalone debt entry for DebtsView
      if (!form.payeImmediatement) {
        await api.saveDebt({
          clientName: form.client,
          productName: form.telephoneModel,
          amount: Number(form.sommeTotale) || 0,
          date: today,
          status: 'active',
          sourceType: 'repair',
          repairId: saved.id,
        });
      }

      setRepairs([saved, ...repairs]);
      setForm({ client: "", telephoneModel: "", sommeTotale: "", dateLimite: "", payeImmediatement: true });
      setShowForm(false);
    } catch (err) {
      console.error("Failed to save repair:", err);
      setError("Erreur lors de l'enregistrement du dépôt.");
    } finally {
      setIsSaving(false);
    }
  };

  const toggleStatut = async (id: string) => {
    const repair = repairs.find(r => r.id === id);
    if (!repair) return;
    const updated: Repair = {
      ...repair,
      statut: repair.statut === 'recupere' ? 'en_attente' : 'recupere',
    };
    try {
      const saved = await api.saveRepair(updated);
      setRepairs(repairs.map(r => r.id === id ? saved : r));
    } catch (err) {
      console.error("Failed to toggle status:", err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deleteRepair(id);
      setRepairs(repairs.filter(r => r.id !== id));
      setConfirmDelete(null);
    } catch (err) {
      console.error("Failed to delete repair:", err);
    }
  };

  const filteredRepairs = repairs.filter(r =>
    r.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.telephoneModel.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const isOverdue = (deadline: string) => {
    return new Date(deadline) < new Date(today);
  };

  const pendingCount = repairs.filter(r => r.statut === 'en_attente').length;
  const debtCount = repairs.filter(r => r.paiementStatut === 'dette').length;

  return (
    <Motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="h-full flex flex-col relative"
    >
      {/* Confirm Delete Modal */}
      <AnimatePresence>
        {confirmDelete && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <Motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-[#0f172a] border border-red-500/30 rounded-2xl w-full max-w-xs p-6 text-center shadow-2xl"
            >
              <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/20">
                <AlertTriangle size={24} className="text-red-500" />
              </div>
              <h3 className="text-white font-bold mb-2">Supprimer ce dépôt ?</h3>
              <p className="text-xs text-gray-500 mb-6">Cette action est définitive.</p>
              <div className="flex gap-2">
                <button
                  onClick={() => handleDelete(confirmDelete)}
                  className="flex-1 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  Supprimer
                </button>
                <button
                  onClick={() => setConfirmDelete(null)}
                  className="flex-1 py-2 bg-gray-800 hover:bg-gray-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  Annuler
                </button>
              </div>
            </Motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <button onClick={onBack} className="p-2 hover:bg-gray-800 rounded-full transition-colors cursor-pointer">
            <ChevronLeft size={20} className="text-gray-400" />
          </button>
          <h2 className="text-xl font-bold text-white">Dépôts & Réparations</h2>
        </div>
        <div className="flex items-center gap-2">
          {/* Stats badges */}
          <div className="flex items-center gap-1.5">
            {pendingCount > 0 && (
              <span className="text-[10px] font-black bg-orange-500/10 border border-orange-500/20 text-orange-400 px-2 py-0.5 rounded-full">
                {pendingCount} en attente
              </span>
            )}
            {debtCount > 0 && (
              <span className="text-[10px] font-black bg-red-500/10 border border-red-500/20 text-red-400 px-2 py-0.5 rounded-full">
                {debtCount} dette(s)
              </span>
            )}
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className={`p-2 rounded-lg transition-all flex items-center gap-2 text-xs font-bold cursor-pointer ${showForm ? 'bg-gray-700 text-gray-300' : 'bg-blue-600 text-white hover:bg-blue-500'}`}
          >
            {showForm ? 'Annuler' : <><Plus size={14} /> Nouveau</>}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-3 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2 text-xs text-red-400">
          {error}
        </div>
      )}

      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
        {/* Form */}
        <AnimatePresence>
          {showForm && (
            <Motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="bg-gray-800/50 border border-blue-500/20 rounded-xl p-4 mb-4 space-y-4 overflow-hidden shadow-xl"
            >
              <div className="grid grid-cols-2 gap-3">
                <Input label="Client" placeholder="Nom du client" value={form.client} onChange={(e: any) => setForm({ ...form, client: e.target.value })} />
                <Input label="Modèle" placeholder="ex: iPhone 13" value={form.telephoneModel} onChange={(e: any) => setForm({ ...form, telephoneModel: e.target.value })} />
                <Input label="Total (FGN)" type="number" placeholder="0" value={form.sommeTotale} onChange={(e: any) => setForm({ ...form, sommeTotale: e.target.value })} />
                <Input label="Date Limite" type="date" value={form.dateLimite} onChange={(e: any) => setForm({ ...form, dateLimite: e.target.value })} />
              </div>

              <div className="flex items-center gap-3 p-3 bg-gray-900/50 rounded-lg border border-gray-700/30">
                <label className="flex items-center gap-2 cursor-pointer w-full">
                  <input
                    type="checkbox"
                    checked={form.payeImmediatement}
                    onChange={(e) => setForm({ ...form, payeImmediatement: e.target.checked })}
                    className="w-4 h-4 rounded border-gray-700 bg-gray-800 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-xs font-bold text-gray-300">Paiement immédiat</span>
                </label>
                {!form.payeImmediatement && (
                  <div className="flex items-center gap-1.5 text-red-400 shrink-0">
                    <Clock size={14} />
                    <span className="text-[10px] font-black uppercase">Dette</span>
                  </div>
                )}
              </div>

              {!form.payeImmediatement && (
                <div className="bg-red-500/5 border border-red-500/20 rounded-lg px-3 py-2 flex items-center gap-2">
                  <AlertCircle size={14} className="text-red-400 shrink-0" />
                  <p className="text-[10px] text-red-400">
                    Une dette sera automatiquement créée dans la section Dettes.
                  </p>
                </div>
              )}

              <Button onClick={handleAdd} disabled={isSaving}>
                {isSaving ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : null}
                {isSaving ? "Enregistrement..." : "Enregistrer le dépôt"}
              </Button>
            </Motion.div>
          )}
        </AnimatePresence>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
          <input
            type="text"
            placeholder="Rechercher un dépôt..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-gray-600"
          />
        </div>

        {/* List */}
        {isLoading ? (
          <div className="flex justify-center py-10">
            <div className="w-8 h-8 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-3 pb-4">
            {filteredRepairs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-gray-600 space-y-2">
                <Smartphone size={36} className="opacity-20" />
                <p className="text-sm italic">Aucun dépôt enregistré</p>
              </div>
            ) : (
              filteredRepairs.map(r => {
                const overdue = r.statut === 'en_attente' && isOverdue(r.dateLimite);
                const isDebt = r.paiementStatut === 'dette';
                return (
                  <div
                    key={r.id}
                    className={`bg-gray-800/40 border rounded-xl p-3 flex items-center gap-4 transition-all ${overdue ? 'border-red-500/50 bg-red-900/5' : 'border-gray-700/50'}`}
                  >
                    <div className="w-14 h-14 rounded-lg bg-gray-900 overflow-hidden shrink-0 border border-gray-700/50 relative">
                      <ImageWithFallback src={r.image} alt={r.telephoneModel} className="w-full h-full object-cover opacity-60" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Smartphone size={20} className="text-gray-500" />
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-sm font-bold text-white truncate">{r.client}</h3>
                          <p className="text-[10px] text-blue-400 font-medium">{r.telephoneModel}</p>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-black text-white">{formatCurrency(r.sommeTotale)}</div>
                          <div className={`flex items-center gap-1 text-[9px] font-black uppercase tracking-tighter mt-1 ${isDebt ? 'text-red-400' : 'text-green-400'}`}>
                            {isDebt ? <><Clock size={10} /> Dette</> : <><CreditCard size={10} /> Payé</>}
                          </div>
                        </div>
                      </div>

                      <div className="mt-2 flex items-center gap-3 text-[10px]">
                        <div className="flex items-center gap-1 text-gray-500 font-medium">
                          <Calendar size={10} /> {r.dateDepot}
                        </div>
                        <div className={`flex items-center gap-1 font-bold ${overdue ? 'text-red-400' : 'text-gray-500'}`}>
                          {overdue && <AlertTriangle size={10} />}
                          Echéance: {r.dateLimite}
                        </div>
                        <div className={`font-bold text-[9px] uppercase ${r.statut === 'recupere' ? 'text-green-500' : 'text-orange-400'}`}>
                          {r.statut === 'recupere' ? '✓ Récupéré' : '⏳ En attente'}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 shrink-0">
                      <button
                        onClick={() => toggleStatut(r.id)}
                        className={`p-1.5 rounded-lg transition-colors cursor-pointer ${r.statut === 'recupere' ? 'bg-green-600/20 text-green-400' : 'hover:bg-gray-700 text-gray-500 hover:text-green-400'}`}
                        title={r.statut === 'recupere' ? "Remettre en attente" : "Marquer comme récupéré"}
                      >
                        <CheckCircle2 size={16} />
                      </button>
                      <button
                        onClick={() => setConfirmDelete(r.id)}
                        className="p-1.5 hover:bg-red-900/30 rounded-lg text-gray-500 hover:text-red-400 transition-colors cursor-pointer"
                        title="Supprimer"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </Motion.div>
  );
};
