import React from "react";
import {
  ChevronLeft, CheckCircle2, Clock, Search, Wallet, User,
  Smartphone, AlertCircle, Wrench, ReceiptText, Plus, X,
} from "lucide-react";
import { motion as Motion, AnimatePresence } from "motion/react";
import { formatCurrency } from "../utils/format";
import { api } from "../utils/api";

// ── Types ──────────────────────────────────────────────────────────────────
interface Debt {
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

interface Repair {
  id: string;
  client: string;
  telephoneModel: string;
  sommeTotale: number;
  dateDepot: string;
  dateLimite: string;
  statut: "en_attente" | "recupere";
  paiementStatut: "paye" | "dette";
}

// ── Icône selon la source ───────────────────────────────────────────────────
function SourceBadge({ sourceType }: { sourceType?: string }) {
  if (sourceType === "repair") {
    return (
      <span className="flex items-center gap-1 text-[9px] font-black text-orange-400/70 uppercase tracking-tighter">
        <Wrench size={9} /> Réparation
      </span>
    );
  }
  if (sourceType === "sale") {
    return (
      <span className="flex items-center gap-1 text-[9px] font-black text-blue-400/70 uppercase tracking-tighter">
        <ReceiptText size={9} /> Vente
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 text-[9px] font-black text-gray-500 uppercase tracking-tighter">
      <Wallet size={9} /> Manuel
    </span>
  );
}

// ── Composant principal ───────────────────────────────────────────────────
export const DebtsView = ({ onBack }: { onBack: () => void }) => {
  const [searchTerm, setSearchTerm]   = React.useState("");
  const [debts, setDebts]             = React.useState<Debt[]>([]);
  const [repairs, setRepairs]         = React.useState<Repair[]>([]);
  const [clients, setClients]         = React.useState<any[]>([]);
  const [isLoading, setIsLoading]     = React.useState(true);
  const [payingId, setPayingId]       = React.useState<string | null>(null);

  // Modal "Nouvelle dette directe"
  const [showNewDebt, setShowNewDebt] = React.useState(false);
  const [newDebtForm, setNewDebtForm] = React.useState({
    clientName: "", productName: "", amount: "",
  });
  const [isSavingNew, setIsSavingNew] = React.useState(false);

  React.useEffect(() => {
    const fetchAll = async () => {
      try {
        const [debtData, repairData, clientData] = await Promise.all([
          api.getDebts(),
          api.getRepairs(),
          api.getClients(),
        ]);
        setDebts(Array.isArray(debtData) ? debtData : []);
        setRepairs(Array.isArray(repairData) ? repairData : []);
        setClients(Array.isArray(clientData) ? clientData : []);
      } catch (err) {
        console.error("Failed to fetch debts:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAll();
  }, []);

  // ── Liste unifiée des dettes actives ────────────────────────────────
  // 1. Dettes autonomes (status: 'active') depuis api.getDebts()
  // 2. Réparations avec paiementStatut: 'dette' non déjà couvertes
  const unifiedDebts = React.useMemo(() => {
    const standaloneDebts: Debt[] = debts.filter(d => d.status === "active");

    // IDs de réparations déjà couvertes par une entrée standalone
    const coveredRepairIds = new Set(
      debts.filter(d => d.sourceType === "repair").map(d => d.repairId)
    );

    // Réparations non encore couvertes
    const repairDebts: Debt[] = repairs
      .filter(r => r.paiementStatut === "dette" && !coveredRepairIds.has(r.id))
      .map(r => ({
        id: `repair-inline-${r.id}`,
        clientName: r.client,
        productName: r.telephoneModel,
        amount: r.sommeTotale,
        date: r.dateDepot,
        status: "active" as const,
        sourceType: "repair" as const,
        repairId: r.id,
      }));

    return [...standaloneDebts, ...repairDebts]
      .filter(d =>
        d.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.productName?.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [debts, repairs, searchTerm]);

  const totalActiveAmount = unifiedDebts.reduce((acc, d) => acc + (d.amount || 0), 0);

  // ── Payer une dette ─────────────────────────────────────────────────
  const handlePay = async (debt: Debt) => {
    setPayingId(debt.id);
    try {
      if (!debt.id.startsWith("repair-inline-")) {
        // Entrée dette autonome → marquer comme payée
        const updated   = { ...debt, status: "paid" as const };
        const saved     = await api.saveDebt(updated);
        setDebts(debts.map(d => d.id === debt.id ? saved : d));

        // Si liée à une réparation, mettre à jour aussi la réparation
        if (debt.sourceType === "repair" && debt.repairId) {
          const repair = repairs.find(r => r.id === debt.repairId);
          if (repair) {
            const updatedRepair = { ...repair, paiementStatut: "paye" as const };
            const savedRepair   = await api.saveRepair(updatedRepair);
            setRepairs(repairs.map(r => r.id === debt.repairId ? savedRepair : r));
          }
        }
      } else {
        // Réparation inline (pas encore d'entrée standalone) → mettre à jour la réparation
        if (debt.repairId) {
          const repair = repairs.find(r => r.id === debt.repairId);
          if (repair) {
            const updatedRepair = { ...repair, paiementStatut: "paye" as const };
            const savedRepair   = await api.saveRepair(updatedRepair);
            setRepairs(repairs.map(r => r.id === debt.repairId ? savedRepair : r));
          }
        }
      }
    } catch (err) {
      console.error("Failed to pay debt:", err);
    } finally {
      setPayingId(null);
    }
  };

  // ── Créer une nouvelle dette directe ───────────────────────────────
  const handleCreateDebt = async () => {
    if (!newDebtForm.clientName || !newDebtForm.amount) return;
    setIsSavingNew(true);
    try {
      const today = new Date().toISOString().split("T")[0];
      const newDebt = {
        clientName:  newDebtForm.clientName,
        productName: newDebtForm.productName || "Achat divers",
        amount:      Number(newDebtForm.amount),
        date:        today,
        status:      "active" as const,
        sourceType:  "standalone" as const,
      };
      const saved = await api.saveDebt(newDebt);
      setDebts([...debts, saved]);
      setShowNewDebt(false);
      setNewDebtForm({ clientName: "", productName: "", amount: "" });
    } catch (err) {
      console.error("Failed to create debt:", err);
    } finally {
      setIsSavingNew(false);
    }
  };

  // Options clients pour le formulaire
  const clientOptions = clients.map(c => c.nom || c.clientName || "").filter(Boolean);

  // ─────────────────────────────────────────────────────────────────────
  return (
    <Motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="h-full flex flex-col"
    >
      {/* ── En-tête ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <button onClick={onBack} className="p-2 hover:bg-gray-800 rounded-full transition-colors cursor-pointer">
            <ChevronLeft size={20} className="text-gray-400" />
          </button>
          <h2 className="text-xl font-bold text-white">Dettes</h2>
        </div>

        <div className="flex items-center gap-3">
          {/* Résumé */}
          <div className="text-right">
            <span className="text-[10px] font-black text-red-500 uppercase tracking-widest block">Total Dû</span>
            <span className="text-base font-black text-white">{formatCurrency(totalActiveAmount)}</span>
            <span className="text-[9px] text-gray-500 block">{unifiedDebts.length} active(s)</span>
          </div>
          {/* Bouton nouvelle dette */}
          <button
            onClick={() => setShowNewDebt(true)}
            className="p-2 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white border border-red-500/20 rounded-xl transition-all cursor-pointer"
            title="Nouvelle dette"
          >
            <Plus size={16} />
          </button>
        </div>
      </div>

      {/* ── Barre de recherche ─────────────────────────────────────────── */}
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
        <input
          type="text"
          placeholder="Rechercher par client ou produit..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-gray-800 border border-gray-700 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-gray-600"
        />
      </div>

      {/* ── Liste des dettes actives ──────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto pr-1 space-y-3 custom-scrollbar min-h-0">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {unifiedDebts.length > 0 ? (
              unifiedDebts.map(debt => (
                <Motion.div
                  key={debt.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8, x: -20 }}
                  className="bg-gray-800/40 border border-gray-700/50 rounded-2xl p-4 flex items-center gap-3 hover:border-red-500/20 transition-all"
                >
                  {/* Icône source */}
                  <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20 text-red-400 shrink-0">
                    {debt.sourceType === "repair"
                      ? <Wrench size={16} />
                      : debt.sourceType === "sale"
                      ? <ReceiptText size={16} />
                      : <Wallet size={18} />
                    }
                  </div>

                  {/* Infos */}
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <User size={11} className="text-gray-500 shrink-0" />
                          <h3 className="text-sm font-bold text-white truncate">{debt.clientName}</h3>
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Smartphone size={10} className="text-blue-500 shrink-0" />
                          <p className="text-[10px] text-blue-400 font-medium truncate">{debt.productName}</p>
                        </div>
                        <SourceBadge sourceType={debt.sourceType} />
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-sm font-black text-white">{formatCurrency(debt.amount)}</div>
                        <div className="flex items-center justify-end gap-1 text-[9px] text-gray-500 font-bold uppercase mt-0.5">
                          <Clock size={9} /> {debt.date}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Bouton Payer */}
                  <button
                    onClick={() => handlePay(debt)}
                    disabled={payingId === debt.id}
                    className="bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-3 py-2 rounded-xl text-[10px] font-black uppercase transition-all shadow-lg shadow-green-900/20 cursor-pointer flex items-center gap-1.5 shrink-0"
                  >
                    {payingId === debt.id ? (
                      <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <CheckCircle2 size={12} />
                    )}
                    Payer
                  </button>
                </Motion.div>
              ))
            ) : (
              <Motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="h-40 flex flex-col items-center justify-center text-gray-600 space-y-2"
              >
                <AlertCircle size={40} className="opacity-20 text-green-500" />
                <p className="text-sm italic">Aucune dette active</p>
                <p className="text-xs text-gray-600">Toutes les dettes ont été réglées</p>
              </Motion.div>
            )}
          </AnimatePresence>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════
           MODAL : Nouvelle dette directe
      ══════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {showNewDebt && (
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
                    <Wallet size={14} className="text-red-400" />
                  </div>
                  <h3 className="text-sm font-bold text-white">Nouvelle dette</h3>
                </div>
                <button
                  onClick={() => setShowNewDebt(false)}
                  className="p-1.5 hover:bg-gray-800 rounded-lg text-gray-500 hover:text-white transition-colors cursor-pointer"
                >
                  <X size={14} />
                </button>
              </div>

              <div className="space-y-3 mb-5">
                {/* Nom du client (sélection ou saisie libre) */}
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
                    Client
                  </label>
                  {clientOptions.length > 0 ? (
                    <select
                      value={newDebtForm.clientName}
                      onChange={(e) => setNewDebtForm({ ...newDebtForm, clientName: e.target.value })}
                      className="w-full bg-gray-800/60 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-red-500/50 transition-all appearance-none cursor-pointer"
                    >
                      <option value="">Sélectionner un client...</option>
                      {clientOptions.map(name => (
                        <option key={name} value={name}>{name}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={newDebtForm.clientName}
                      onChange={(e) => setNewDebtForm({ ...newDebtForm, clientName: e.target.value })}
                      placeholder="Nom du client"
                      className="w-full bg-gray-800/60 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-red-500/50 placeholder:text-gray-600 transition-all"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
                    Description
                  </label>
                  <input
                    type="text"
                    value={newDebtForm.productName}
                    onChange={(e) => setNewDebtForm({ ...newDebtForm, productName: e.target.value })}
                    placeholder="ex: Achat écran, réparation..."
                    className="w-full bg-gray-800/60 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-red-500/50 placeholder:text-gray-600 transition-all"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
                    Montant (FGN)
                  </label>
                  <input
                    type="number"
                    value={newDebtForm.amount}
                    onChange={(e) => setNewDebtForm({ ...newDebtForm, amount: e.target.value })}
                    placeholder="0"
                    className="w-full bg-gray-800/60 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-red-500/50 placeholder:text-gray-600 transition-all"
                    onKeyDown={(e) => { if (e.key === "Enter") handleCreateDebt(); }}
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleCreateDebt}
                  disabled={isSavingNew || !newDebtForm.clientName || !newDebtForm.amount}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-red-600 hover:bg-red-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  {isSavingNew ? (
                    <Motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                      className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full"
                    />
                  ) : (
                    <Plus size={13} />
                  )}
                  {isSavingNew ? "Enregistrement…" : "Créer la dette"}
                </button>
                <button
                  onClick={() => setShowNewDebt(false)}
                  className="flex-1 py-2.5 bg-gray-800 hover:bg-gray-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
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
