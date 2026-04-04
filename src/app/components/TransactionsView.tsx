import React from "react";
import {
  ChevronLeft, ArrowUpRight, ArrowDownLeft, History,
  Trash2, AlertTriangle, Clock, AlertCircle,
} from "lucide-react";
import { motion as Motion, AnimatePresence } from "motion/react";
import { Button, Input, Select } from "./ui";
import { formatCurrency } from "../utils/format";
import { api } from "../utils/api";

interface Transaction {
  id: string;
  client: string;
  produit: string;
  quantite: number;
  montant: number;
  type: 'Vente' | 'Paiement';
  date: string;
}

interface Product {
  id: string;
  nom: string;
  alias: string;
  quantite: number;
  seuil: number;
  prix: number;
  categorieId?: string;
  categorieNom?: string;
  categorieCouleur?: string;
}

interface Client {
  id: string;
  nom: string;
  telephone: string;
}

export const TransactionsView = ({ onBack }: { onBack: () => void }) => {
  const [transactions, setTransactions] = React.useState<Transaction[]>([]);
  const [products, setProducts] = React.useState<Product[]>([]);
  const [clients, setClients] = React.useState<Client[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  const [confirmDelete, setConfirmDelete] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const fetchAll = async () => {
      setIsLoading(true);
      try {
        const [txData, prodData, clientData] = await Promise.all([
          api.getTransactions(),
          api.getProducts(),
          api.getClients(),
        ]);
        const txs: Transaction[] = Array.isArray(txData) ? txData : [];
        txs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setTransactions(txs);
        setProducts(Array.isArray(prodData) ? prodData : []);
        setClients(Array.isArray(clientData) ? clientData : []);
      } catch (err) {
        console.error("Failed to fetch data:", err);
        setError("Erreur de chargement des données.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchAll();
  }, []);

  const today = new Date().toISOString().split('T')[0];

  const [form, setForm] = React.useState({
    client: "",
    produit: "",
    quantite: "1",
    montant: "",
    type: "Vente",
    date: today,
  });

  // Mode dette (uniquement disponible pour les ventes)
  const [mettrEnDette, setMettrEnDette] = React.useState(false);

  // Produit sélectionné — pour afficher la catégorie
  const selectedProduct = React.useMemo(
    () => products.find((p) => p.nom === form.produit),
    [products, form.produit]
  );

  // Vérification stock
  const stockError = React.useMemo(() => {
    if (form.type !== 'Vente' || !form.produit || !selectedProduct) return null;
    const qty = Number(form.quantite) || 0;
    if (selectedProduct.quantite <= 0) return `Rupture de stock`;
    if (qty > selectedProduct.quantite) return `Stock insuffisant — disponible : ${selectedProduct.quantite} unité(s)`;
    return null;
  }, [form.produit, form.quantite, form.type, selectedProduct]);

  // Auto-calcul du montant depuis le produit sélectionné
  React.useEffect(() => {
    if (form.type === 'Vente' && form.produit && selectedProduct) {
      const total = selectedProduct.prix * (Number(form.quantite) || 1);
      setForm((f) => ({ ...f, montant: String(total) }));
    }
  }, [form.produit, form.quantite, form.type, selectedProduct]);

  // Réinitialiser le mode dette si on change de type
  React.useEffect(() => {
    if (form.type !== 'Vente') setMettrEnDette(false);
  }, [form.type]);

  const handleAdd = async () => {
    if (!form.montant || !form.client) {
      setError("Veuillez remplir le client et le montant.");
      return;
    }
    if (form.type === 'Vente' && !form.produit) {
      setError("Veuillez sélectionner un produit pour une vente.");
      return;
    }
    if (stockError) {
      setError(stockError);
      return;
    }
    setError(null);
    setIsSaving(true);

    try {
      const newTransaction = {
        client:   form.client,
        produit:  form.type === 'Vente' ? form.produit : '-',
        quantite: form.type === 'Vente' ? Number(form.quantite) : 0,
        montant:  Number(form.montant),
        type:     form.type,
        date:     form.date,
      };

      const saved = await api.saveTransaction(newTransaction);

      // Diminuer le stock si c'est une vente
      if (form.type === 'Vente' && form.produit && selectedProduct) {
        const newQty = Math.max(0, selectedProduct.quantite - Number(form.quantite));
        const updatedProduct = { ...selectedProduct, quantite: newQty };
        const savedProd = await api.saveProduct(updatedProduct);
        setProducts(products.map((p) => p.id === savedProd.id ? savedProd : p));
      }

      // Créer une dette si "Mettre en dette" est coché
      if (mettrEnDette && form.type === 'Vente') {
        await api.saveDebt({
          clientName:    form.client,
          productName:   form.produit || 'Vente',
          amount:        Number(form.montant),
          date:          form.date,
          status:        'active',
          sourceType:    'sale',
          transactionId: saved.id,
        });

        // Log dette
        const currentUser = api.getCurrentUser();
        await api.logAction({
          type: "dette",
          description: `Dette créée pour ${form.client} — ${formatCurrency(Number(form.montant))}`,
          userId: currentUser?.id,
          userName: currentUser?.nom,
          metadata: { clientName: form.client, montant: Number(form.montant) },
        });
      }

      // Log vente
      const currentUser = api.getCurrentUser();
      await api.logAction({
        type: "vente",
        description: `Vente — ${form.client} · ${form.produit} (x${form.quantite}) · ${formatCurrency(Number(form.montant))}`,
        userId: currentUser?.id,
        userName: currentUser?.nom,
        metadata: {
          transactionId: saved.id,
          produit: form.produit,
          quantite: Number(form.quantite),
          montant: Number(form.montant),
          client: form.client,
          enDette: mettrEnDette,
        },
      });

      setTransactions([saved, ...transactions]);
      setForm({ ...form, montant: "", quantite: "1", produit: "" });
      setMettrEnDette(false);
    } catch (err) {
      console.error("Failed to save transaction:", err);
      setError("Erreur lors de l'enregistrement de la transaction.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deleteTransaction(id);
      setTransactions(transactions.filter((t) => t.id !== id));
      setConfirmDelete(null);
    } catch (err) {
      console.error("Failed to delete transaction:", err);
      setError("Erreur lors de la suppression.");
    }
  };

  const clientOptions = clients.length > 0
    ? clients.map((c) => ({ value: c.nom, label: c.nom }))
    : [{ value: form.client || "Client", label: form.client || "Client" }];

  // Options produit : avec info stock (et indication rupture)
  const productOptions = products.map((p) => ({
    value: p.nom,
    label: p.quantite <= 0
      ? `${p.nom} — Rupture de stock`
      : `${p.nom} (Stock: ${p.quantite})`,
  }));

  return (
    <Motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="h-full flex flex-col relative"
    >
      {/* ── Modal de confirmation de suppression ───────────────── */}
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
              <h3 className="text-white font-bold mb-2">Supprimer cette transaction ?</h3>
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

      {/* ── En-tête ──────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 mb-3">
        <button onClick={onBack} className="p-2 hover:bg-gray-800 rounded-full transition-colors cursor-pointer">
          <ChevronLeft size={20} className="text-gray-400" />
        </button>
        <h2 className="text-xl font-bold text-white">Transactions</h2>
      </div>

      <div className="flex-1 overflow-y-auto pr-1 space-y-4 custom-scrollbar">

        {/* ── Erreur ─────────────────────────────────────────────── */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2 text-xs text-red-400">
            {error}
          </div>
        )}

        {/* ── Formulaire d'ajout ─────────────────────────────────── */}
        <div className="bg-gray-800/30 border border-gray-700/40 rounded-2xl p-4 space-y-3">
          <h3 className="text-xs font-black text-blue-500 uppercase tracking-widest">
            Nouvelle transaction
          </h3>

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Type"
              value={form.type}
              onChange={(e: any) => setForm({ ...form, type: e.target.value, produit: '', montant: '' })}
              options={[
                { value: "Vente", label: "Vente" },
                { value: "Paiement", label: "Paiement / Recouvrement" },
              ]}
            />
            {isLoading ? (
              <div className="flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
              </div>
            ) : (
              <Select
                label="Client"
                value={form.client}
                onChange={(e: any) => setForm({ ...form, client: e.target.value })}
                options={[
                  { value: "", label: "Sélectionner..." },
                  ...clientOptions,
                ]}
              />
            )}

            {form.type === 'Vente' && (
              <>
                <Select
                  label="Produit"
                  value={form.produit}
                  onChange={(e: any) => setForm({ ...form, produit: e.target.value })}
                  options={[
                    { value: "", label: "Sélectionner..." },
                    ...productOptions,
                  ]}
                />
                <Input
                  label="Quantité"
                  type="number"
                  value={form.quantite}
                  min="1"
                  onChange={(e: any) => setForm({ ...form, quantite: e.target.value })}
                />
              </>
            )}

            <Input
              label="Montant (FGN)"
              type="number"
              placeholder="0"
              value={form.montant}
              onChange={(e: any) => setForm({ ...form, montant: e.target.value })}
            />
            <Input
              label="Date"
              type="date"
              value={form.date}
              onChange={(e: any) => setForm({ ...form, date: e.target.value })}
            />
          </div>

          {/* ── Info catégorie du produit sélectionné ─────────────── */}
          <AnimatePresence>
            {form.type === 'Vente' && form.produit && selectedProduct && (
              <Motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="flex items-center gap-2 flex-wrap px-1">
                  {/* Badge catégorie */}
                  {selectedProduct.categorieNom ? (
                    <span
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold"
                      style={{
                        backgroundColor: `${selectedProduct.categorieCouleur}20`,
                        color: selectedProduct.categorieCouleur,
                        border: `1px solid ${selectedProduct.categorieCouleur}40`,
                      }}
                    >
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: selectedProduct.categorieCouleur }}
                      />
                      {selectedProduct.categorieNom}
                    </span>
                  ) : null}
                  {/* Info stock */}
                  <span className={`text-[11px] font-semibold ${
                    selectedProduct.quantite <= 0
                      ? "text-red-400"
                      : selectedProduct.quantite <= selectedProduct.seuil
                      ? "text-amber-400"
                      : "text-green-400"
                  }`}>
                    {selectedProduct.quantite <= 0
                      ? "⚠ Rupture de stock"
                      : selectedProduct.quantite <= selectedProduct.seuil
                      ? `⚠ Stock faible : ${selectedProduct.quantite} unité(s)`
                      : `✓ En stock : ${selectedProduct.quantite} unité(s)`
                    }
                  </span>
                  {/* Prix unitaire */}
                  <span className="text-[11px] text-gray-500">
                    {formatCurrency(selectedProduct.prix)} / unité
                  </span>
                </div>
              </Motion.div>
            )}
          </AnimatePresence>

          {/* ── Alerte stock insuffisant ───────────────────────────── */}
          <AnimatePresence>
            {stockError && (
              <Motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
                  <AlertCircle size={13} className="text-red-400 shrink-0" />
                  <p className="text-[11px] text-red-400 font-semibold">{stockError}</p>
                </div>
              </Motion.div>
            )}
          </AnimatePresence>

          {/* Option dette — uniquement pour les ventes */}
          {form.type === 'Vente' && (
            <div className="space-y-2">
              <label className="flex items-center gap-3 p-3 bg-gray-900/60 rounded-xl border border-gray-700/40 cursor-pointer">
                <input
                  type="checkbox"
                  checked={mettrEnDette}
                  onChange={(e) => setMettrEnDette(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <span className="text-xs font-bold text-gray-300 flex-1">
                  Le client n'a pas payé — mettre en dette
                </span>
                {mettrEnDette && (
                  <div className="flex items-center gap-1 text-red-400 shrink-0">
                    <Clock size={13} />
                    <span className="text-[10px] font-black uppercase">Dette</span>
                  </div>
                )}
              </label>
              {mettrEnDette && (
                <Motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex items-center gap-2 bg-red-500/5 border border-red-500/20 rounded-lg px-3 py-2"
                >
                  <AlertCircle size={13} className="text-red-400 shrink-0" />
                  <p className="text-[10px] text-red-400">
                    Une dette sera créée automatiquement dans la section Dettes.
                  </p>
                </Motion.div>
              )}
            </div>
          )}

          <Button onClick={handleAdd} disabled={isSaving || !!stockError}>
            {isSaving ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <History size={18} />
            )}
            {isSaving ? "Enregistrement..." : "Ajouter Transaction"}
          </Button>
        </div>

        {/* ── Historique ─────────────────────────────────────────── */}
        <div className="border-t border-gray-800 pt-3">
          <h3 className="text-xs font-bold text-gray-500 uppercase mb-3 tracking-widest">
            Historique ({transactions.length})
          </h3>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="w-8 h-8 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
            </div>
          ) : (
            <div className="space-y-2 pb-4">
              {transactions.length === 0 ? (
                <p className="text-center text-gray-600 text-sm italic py-6">Aucune transaction</p>
              ) : (
                transactions.map((t) => (
                  <div
                    key={t.id}
                    className="bg-gray-800/50 p-3 rounded-xl border border-gray-700/50 flex justify-between items-center"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${t.type === 'Vente' ? 'bg-red-900/20' : 'bg-green-900/20'}`}>
                        {t.type === 'Vente'
                          ? <ArrowUpRight size={15} className="text-red-400" />
                          : <ArrowDownLeft size={15} className="text-green-400" />
                        }
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-white truncate">{t.client}</div>
                        <div className="text-[10px] text-gray-500 truncate">
                          {t.type === 'Vente' ? t.produit : 'Recouvrement'} · {t.date}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <div className="text-right">
                        <div className={`text-sm font-bold ${t.type === 'Vente' ? 'text-red-400' : 'text-green-400'}`}>
                          {t.type === 'Vente' ? '-' : '+'}{formatCurrency(t.montant)}
                        </div>
                        {t.type === 'Vente' && (
                          <div className="text-[10px] text-gray-500">Qté: {t.quantite}</div>
                        )}
                      </div>
                      <button
                        onClick={() => setConfirmDelete(t.id)}
                        className="p-2 bg-gray-800 hover:bg-red-900/30 rounded-lg text-gray-500 hover:text-red-400 transition-colors cursor-pointer"
                        title="Supprimer"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </Motion.div>
  );
};
