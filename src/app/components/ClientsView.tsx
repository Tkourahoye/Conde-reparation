import React from "react";
import {
  ChevronLeft, UserPlus, User, Edit2, Trash2,
  CheckCircle2, Clock, AlertTriangle, Search,
  X, Save, PlusCircle, ReceiptText, Wrench, Wallet,
} from "lucide-react";
import { motion as Motion, AnimatePresence } from "motion/react";
import { Button, Input } from "./ui";
import { formatCurrency } from "../utils/format";
import { api } from "../utils/api";

// ── Types ──────────────────────────────────────────────────────────────────
interface Client {
  id: string;
  nom: string;
  telephone: string;
}

interface GlobalDebt {
  id: string;
  clientName: string;
  productName: string;
  amount: number;
  date: string;
  status: "active" | "paid";
  sourceType?: "repair" | "sale" | "standalone";
  repairId?: string;
  transactionId?: string;
}

// ── Icône selon la source de la dette ─────────────────────────────────────
function DebtSourceIcon({ sourceType }: { sourceType?: string }) {
  if (sourceType === "repair")  return <Wrench size={11} />;
  if (sourceType === "sale")    return <ReceiptText size={11} />;
  return <Wallet size={11} />;
}

// ── Composant principal ───────────────────────────────────────────────────
export const ClientsView = ({ onBack }: { onBack: () => void }) => {
  const [searchTerm, setSearchTerm]   = React.useState("");
  const [clients, setClients]         = React.useState<Client[]>([]);
  const [globalDebts, setGlobalDebts] = React.useState<GlobalDebt[]>([]);
  const [isLoading, setIsLoading]     = React.useState(true);

  // ── Charger clients + dettes globales ───────────────────────────────
  React.useEffect(() => {
    const fetchAll = async () => {
      try {
        const [clientData, debtData] = await Promise.all([
          api.getClients(),
          api.getDebts(),
        ]);
        setClients(Array.isArray(clientData) ? clientData : []);
        setGlobalDebts(Array.isArray(debtData) ? debtData : []);
      } catch (err) {
        console.error("Failed to fetch clients/debts:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAll();
  }, []);

  // ── États des formulaires ────────────────────────────────────────────
  const [form, setForm]                           = React.useState({ nom: "", telephone: "" });
  const [editingClient, setEditingClient]         = React.useState<Client | null>(null);
  const [editForm, setEditForm]                   = React.useState({ nom: "", telephone: "" });
  const [confirmDelete, setConfirmDelete]         = React.useState<string | null>(null);
  const [isSaving, setIsSaving]                   = React.useState(false);

  // Pour la modal "Nouvelle dette"
  const [addDebtFor, setAddDebtFor]               = React.useState<Client | null>(null);
  const [debtForm, setDebtForm]                   = React.useState({ description: "", montant: "" });
  const [isSavingDebt, setIsSavingDebt]           = React.useState(false);

  // ── Modal d'édition client ───────────────────────────────────────────
  const openEditModal = (client: Client) => {
    setEditingClient(client);
    setEditForm({ nom: client.nom, telephone: client.telephone });
  };
  const closeEditModal = () => {
    setEditingClient(null);
    setEditForm({ nom: "", telephone: "" });
  };

  // ── CRUD Clients ─────────────────────────────────────────────────────
  const handleAdd = async () => {
    if (!form.nom || !form.telephone) return;
    try {
      const saved = await api.saveClient({ nom: form.nom, telephone: form.telephone });
      setClients([saved, ...clients]);
      setForm({ nom: "", telephone: "" });
    } catch (err) {
      console.error("Failed to save client:", err);
    }
  };

  const handleUpdate = async () => {
    if (!editingClient || !editForm.nom || !editForm.telephone) return;
    setIsSaving(true);
    try {
      const updated = await api.saveClient({ ...editingClient, nom: editForm.nom, telephone: editForm.telephone });
      setClients(clients.map(c => c.id === updated.id ? updated : c));
      closeEditModal();
    } catch (err) {
      console.error("Failed to update client:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deleteClient(id);
      setClients(clients.filter(c => c.id !== id));
      setConfirmDelete(null);
    } catch (err) {
      console.error("Failed to delete client:", err);
    }
  };

  // ── Dettes par client (source globale) ──────────────────────────────
  const getClientDebts = (clientNom: string) =>
    globalDebts
      .filter(d => d.clientName === clientNom)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const getActiveDebtTotal = (clientNom: string) =>
    globalDebts
      .filter(d => d.clientName === clientNom && d.status === "active")
      .reduce((acc, d) => acc + (d.amount || 0), 0);

  // ── Payer une dette ─────────────────────────────────────────────────
  const handlePayDebt = async (debt: GlobalDebt) => {
    try {
      const updated = { ...debt, status: "paid" as const };
      const saved   = await api.saveDebt(updated);
      setGlobalDebts(globalDebts.map(d => d.id === debt.id ? saved : d));
    } catch (err) {
      console.error("Failed to pay debt:", err);
    }
  };

  // ── Créer une nouvelle dette pour un client ──────────────────────────
  const handleAddDebt = async () => {
    if (!addDebtFor || !debtForm.montant) return;
    setIsSavingDebt(true);
    try {
      const today = new Date().toISOString().split("T")[0];
      const newDebt = {
        clientName: addDebtFor.nom,
        productName: debtForm.description || "Achat divers",
        amount: Number(debtForm.montant),
        date: today,
        status: "active" as const,
        sourceType: "standalone" as const,
      };
      const saved = await api.saveDebt(newDebt);
      setGlobalDebts([...globalDebts, saved]);
      setAddDebtFor(null);
      setDebtForm({ description: "", montant: "" });
    } catch (err) {
      console.error("Failed to save debt:", err);
    } finally {
      setIsSavingDebt(false);
    }
  };

  // ── Filtre recherche ─────────────────────────────────────────────────
  const filteredClients = clients.filter(c =>
    c.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.telephone.includes(searchTerm)
  );

  // ─────────────────────────────────────────────────────────────────────
  return (
    <Motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="h-full flex flex-col"
    >
      {/* En-tête */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <button onClick={onBack} className="p-2 hover:bg-gray-800 rounded-full transition-colors cursor-pointer">
            <ChevronLeft size={20} className="text-gray-400" />
          </button>
          <h2 className="text-xl font-bold text-white">Clients</h2>
        </div>
        <div className="relative w-44">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" size={13} />
          <input
            type="text"
            placeholder="Rechercher..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-gray-800/50 border border-gray-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500/50 placeholder:text-gray-600"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pr-1 space-y-5 custom-scrollbar min-h-0">

        {/* ── Formulaire Nouveau client ───────────────────────────── */}
        <div className="bg-gray-800/30 p-4 rounded-2xl border border-gray-700/50">
          <h3 className="text-xs font-black text-blue-500 uppercase tracking-widest mb-3">
            Nouveau client
          </h3>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <Input
              label="Nom Complet"
              placeholder="ex: Jean Dupont"
              value={form.nom}
              onChange={(e: any) => setForm({ ...form, nom: e.target.value })}
            />
            <Input
              label="Téléphone"
              placeholder="06..."
              value={form.telephone}
              onChange={(e: any) => setForm({ ...form, telephone: e.target.value })}
            />
          </div>
          <Button onClick={handleAdd}>
            <UserPlus size={16} />
            Enregistrer le client
          </Button>
        </div>

        {/* ── Liste des clients ───────────────────────────────────── */}
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="w-8 h-8 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-4 pb-4">
            {filteredClients.map(client => {
              const debts       = getClientDebts(client.nom);
              const activeTotal = getActiveDebtTotal(client.nom);
              return (
                <div key={client.id} className="bg-gray-800/40 rounded-2xl border border-gray-700/50 overflow-hidden">

                  {/* En-tête client */}
                  <div className="p-3 flex items-center justify-between border-b border-gray-700/30 bg-gray-900/20">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-blue-500/10 flex items-center justify-center border border-blue-500/20 shrink-0">
                        <User size={16} className="text-blue-400" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-sm font-bold text-white truncate">{client.nom}</h4>
                        <p className="text-[10px] text-gray-500 font-medium">{client.telephone}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 ml-2">
                      {/* Total dette active */}
                      <div className="text-right">
                        <p className="text-[9px] text-gray-500 font-black uppercase tracking-tighter">Dette</p>
                        <p className={`text-sm font-black ${activeTotal > 0 ? 'text-red-400' : 'text-green-400'}`}>
                          {formatCurrency(activeTotal)}
                        </p>
                      </div>
                      {/* Actions */}
                      <div className="flex items-center gap-1">
                        {/* Nouvelle dette */}
                        <button
                          onClick={() => { setAddDebtFor(client); setDebtForm({ description: "", montant: "" }); }}
                          className="p-1.5 hover:bg-red-900/20 rounded-lg text-gray-400 hover:text-red-400 transition-colors cursor-pointer"
                          title="Nouvelle dette"
                        >
                          <PlusCircle size={14} />
                        </button>
                        {/* Modifier */}
                        <button
                          onClick={() => openEditModal(client)}
                          className="p-1.5 hover:bg-blue-900/30 rounded-lg text-gray-400 hover:text-blue-400 transition-colors cursor-pointer"
                          title="Modifier"
                        >
                          <Edit2 size={14} />
                        </button>
                        {/* Supprimer */}
                        <button
                          onClick={() => setConfirmDelete(client.id)}
                          className="p-1.5 hover:bg-red-900/20 rounded-lg text-gray-400 hover:text-red-400 transition-colors cursor-pointer"
                          title="Supprimer"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Historique des dettes du client */}
                  {debts.length > 0 && (
                    <div className="bg-gray-900/40 p-3 space-y-1.5">
                      <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest px-1 mb-2">
                        Historique dettes
                      </p>
                      {debts.map(debt => (
                        <div
                          key={debt.id}
                          className="flex items-center justify-between py-2 px-3 bg-gray-800/30 rounded-xl border border-gray-700/20"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className={`p-1.5 rounded-md shrink-0 ${debt.status === 'paid' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                              {debt.status === 'paid' ? <CheckCircle2 size={12} /> : <Clock size={12} />}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1">
                                <p className="text-xs font-bold text-white">{formatCurrency(debt.amount)}</p>
                                <span className={`flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                                  debt.sourceType === 'repair' ? 'bg-orange-500/10 text-orange-400' :
                                  debt.sourceType === 'sale'   ? 'bg-blue-500/10 text-blue-400' :
                                  'bg-gray-700 text-gray-400'
                                }`}>
                                  <DebtSourceIcon sourceType={debt.sourceType} />
                                  {debt.sourceType === 'repair' ? 'Répar.' : debt.sourceType === 'sale' ? 'Vente' : 'Manuel'}
                                </span>
                              </div>
                              <p className="text-[9px] text-gray-500 truncate">
                                {debt.productName} · {debt.date}
                              </p>
                            </div>
                          </div>

                          {debt.status === 'active' ? (
                            <button
                              onClick={() => handlePayDebt(debt)}
                              className="px-2.5 py-1 bg-green-600 hover:bg-green-500 text-white text-[10px] font-black uppercase rounded-lg transition-all cursor-pointer shadow-lg shadow-green-900/20 shrink-0 ml-2"
                            >
                              Payer
                            </button>
                          ) : (
                            <span className="text-[9px] font-black text-green-500 uppercase tracking-tighter shrink-0 ml-2">
                              Payée
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Si pas de dettes */}
                  {debts.length === 0 && (
                    <div className="px-4 py-2 text-[10px] text-gray-600 italic text-center">
                      Aucune dette enregistrée
                    </div>
                  )}
                </div>
              );
            })}

            {filteredClients.length === 0 && !isLoading && (
              <div className="flex flex-col items-center justify-center py-10 text-gray-600 space-y-1">
                <User size={36} className="opacity-20" />
                <p className="text-sm italic">Aucun client trouvé</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════
           MODAL : Modifier le client
      ══════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {editingClient && (
          <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <Motion.div
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 10 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="bg-[#0f172a] border border-blue-500/20 rounded-2xl w-full max-w-xs p-6 shadow-2xl shadow-blue-900/20"
            >
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                    <Edit2 size={14} className="text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Modifier le client</h3>
                    <p className="text-[9px] text-gray-500 uppercase tracking-widest font-black">
                      {editingClient.nom}
                    </p>
                  </div>
                </div>
                <button
                  onClick={closeEditModal}
                  className="p-1.5 hover:bg-gray-800 rounded-lg text-gray-500 hover:text-white transition-colors cursor-pointer"
                >
                  <X size={14} />
                </button>
              </div>

              <div className="space-y-3 mb-5">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
                    Nom Complet
                  </label>
                  <input
                    type="text"
                    value={editForm.nom}
                    onChange={(e) => setEditForm({ ...editForm, nom: e.target.value })}
                    className="w-full bg-gray-800/60 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500/50 placeholder:text-gray-600 transition-all"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
                    Téléphone
                  </label>
                  <input
                    type="text"
                    value={editForm.telephone}
                    onChange={(e) => setEditForm({ ...editForm, telephone: e.target.value })}
                    className="w-full bg-gray-800/60 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500/50 placeholder:text-gray-600 transition-all"
                    onKeyDown={(e) => { if (e.key === "Enter") handleUpdate(); }}
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleUpdate}
                  disabled={isSaving || !editForm.nom || !editForm.telephone}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  {isSaving ? (
                    <Motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                      className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full"
                    />
                  ) : (
                    <Save size={13} />
                  )}
                  {isSaving ? "Sauvegarde…" : "Mettre à jour"}
                </button>
                <button
                  onClick={closeEditModal}
                  className="flex-1 py-2.5 bg-gray-800 hover:bg-gray-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  Annuler
                </button>
              </div>
            </Motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ══════════════════════════════════════════════════════════════
           MODAL : Nouvelle dette pour un client
      ══════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {addDebtFor && (
          <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <Motion.div
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 10 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="bg-[#0f172a] border border-red-500/20 rounded-2xl w-full max-w-xs p-6 shadow-2xl shadow-red-900/20"
            >
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                    <PlusCircle size={14} className="text-red-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Nouvelle dette</h3>
                    <p className="text-[9px] text-gray-500 uppercase tracking-widest font-black">
                      {addDebtFor.nom}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setAddDebtFor(null)}
                  className="p-1.5 hover:bg-gray-800 rounded-lg text-gray-500 hover:text-white transition-colors cursor-pointer"
                >
                  <X size={14} />
                </button>
              </div>

              <div className="space-y-3 mb-5">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
                    Description
                  </label>
                  <input
                    type="text"
                    value={debtForm.description}
                    onChange={(e) => setDebtForm({ ...debtForm, description: e.target.value })}
                    placeholder="ex: Achat écran, réparation..."
                    className="w-full bg-gray-800/60 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-red-500/50 focus:border-red-500/50 placeholder:text-gray-600 transition-all"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
                    Montant (FGN)
                  </label>
                  <input
                    type="number"
                    value={debtForm.montant}
                    onChange={(e) => setDebtForm({ ...debtForm, montant: e.target.value })}
                    placeholder="0"
                    className="w-full bg-gray-800/60 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-red-500/50 focus:border-red-500/50 placeholder:text-gray-600 transition-all"
                    onKeyDown={(e) => { if (e.key === "Enter") handleAddDebt(); }}
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleAddDebt}
                  disabled={isSavingDebt || !debtForm.montant}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-red-600 hover:bg-red-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  {isSavingDebt ? (
                    <Motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                      className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full"
                    />
                  ) : (
                    <PlusCircle size={13} />
                  )}
                  {isSavingDebt ? "Enregistrement…" : "Créer la dette"}
                </button>
                <button
                  onClick={() => setAddDebtFor(null)}
                  className="flex-1 py-2.5 bg-gray-800 hover:bg-gray-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  Annuler
                </button>
              </div>
            </Motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ══════════════════════════════════════════════════════════════
           MODAL : Confirmation suppression client
      ══════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {confirmDelete && (
          <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <Motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-[#0f172a] border border-red-500/30 rounded-2xl w-full max-w-xs p-6 text-center shadow-2xl shadow-red-900/20"
            >
              <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/20">
                <AlertTriangle size={24} className="text-red-500" />
              </div>
              <h3 className="text-white font-bold mb-2">Supprimer le client ?</h3>
              <p className="text-xs text-gray-500 mb-6 leading-relaxed">
                Cette action est irréversible. Les dettes associées dans le registre global resteront enregistrées.
              </p>
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
    </Motion.div>
  );
};
