import React from "react";
import {
  ChevronLeft, Search, Plus, Smartphone, CheckCircle2, Trash2, Calendar,
  AlertTriangle, CreditCard, Clock, AlertCircle, X, Save, Edit2, Package,
  Wrench, DollarSign, User, FileText, Eye, TrendingUp, Ban, Lock, Shield,
} from "lucide-react";
import { motion as Motion, AnimatePresence } from "motion/react";
import { Button, Input, Select } from "./ui";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { formatCurrency } from "../utils/format";
import { api } from "../utils/api";

// Types
interface UsedPart {
  productId: string;
  productNom: string;
  quantite: number;
  prixUnitaire: number;
}

interface Repair {
  id: string;
  client: string;
  appareilType: string;
  problemeDescription: string;
  etatVisuel: string;
  dateDepot: string;
  dateLimite?: string;
  statut: 'en_attente' | 'diagnostic' | 'en_cours' | 'terminee' | 'recuperee' | 'annulee';
  piecesUtilisees: UsedPart[];
  coutMainOeuvre: number;
  prixPropose: number;
  avanceRecue: number;
  image: string;
}

interface Product {
  id: string;
  nom: string;
  quantite: number;
  prix: number;
}

interface Client {
  id: string;
  nom: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Composant principal
// ─────────────────────────────────────────────────────────────────────────────
export const RepairsView = ({ onBack }: { onBack: () => void }) => {
  const [searchTerm, setSearchTerm] = React.useState("");
  const [showForm, setShowForm] = React.useState(false);
  const [repairs, setRepairs] = React.useState<Repair[]>([]);
  const [products, setProducts] = React.useState<Product[]>([]);
  const [clients, setClients] = React.useState<Client[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = React.useState<string | null>(null);
  const [editingRepair, setEditingRepair] = React.useState<Repair | null>(null);
  const [accessDeniedToast, setAccessDeniedToast] = React.useState(false);

  // Contrôle d'accès admin
  const currentUser = React.useMemo(() => api.getCurrentUser(), []);
  const isAdmin = currentUser?.role === 'admin';

  const triggerAccessDenied = React.useCallback(() => {
    setAccessDeniedToast(true);
    setTimeout(() => setAccessDeniedToast(false), 2800);
  }, []);

  React.useEffect(() => {
    const fetchAll = async () => {
      setIsLoading(true);
      try {
        const [repairsData, productsData, clientsData] = await Promise.all([
          api.getRepairs(),
          api.getProducts(),
          api.getClients(),
        ]);
        const repairList: Repair[] = Array.isArray(repairsData) ? repairsData : [];
        repairList.sort((a, b) => new Date(b.dateDepot).getTime() - new Date(a.dateDepot).getTime());
        setRepairs(repairList);
        setProducts(Array.isArray(productsData) ? productsData : []);
        setClients(Array.isArray(clientsData) ? clientsData : []);
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
    appareilType: "",
    problemeDescription: "",
    etatVisuel: "",
    dateLimite: "",
    coutMainOeuvre: "0",
    prixPropose: "0",
    avanceRecue: "0",
  });

  const [piecesUtilisees, setPiecesUtilisees] = React.useState<UsedPart[]>([]);
  const [selectedProductId, setSelectedProductId] = React.useState("");
  const [selectedQuantite, setSelectedQuantite] = React.useState("1");

  // Calcul automatique du prix minimum
  const prixMinimum = React.useMemo(() => {
    const coutPieces = piecesUtilisees.reduce((sum, p) => sum + p.prixUnitaire * p.quantite, 0);
    const coutMO = Number(form.coutMainOeuvre) || 0;
    return coutPieces + coutMO;
  }, [piecesUtilisees, form.coutMainOeuvre]);

  // Ajouter une pièce
  const handleAddPiece = () => {
    if (!selectedProductId) return;
    const product = products.find(p => p.id === selectedProductId);
    if (!product) return;

    const qty = Number(selectedQuantite) || 1;
    if (qty > product.quantite) {
      setError(`Stock insuffisant — disponible : ${product.quantite} unité(s)`);
      return;
    }

    // Vérifier si la pièce existe déjà
    const existingIndex = piecesUtilisees.findIndex(p => p.productId === selectedProductId);
    if (existingIndex >= 0) {
      const updated = [...piecesUtilisees];
      updated[existingIndex].quantite += qty;
      setPiecesUtilisees(updated);
    } else {
      setPiecesUtilisees([
        ...piecesUtilisees,
        {
          productId: product.id,
          productNom: product.nom,
          quantite: qty,
          prixUnitaire: product.prix,
        },
      ]);
    }

    setSelectedProductId("");
    setSelectedQuantite("1");
    setError(null);
  };

  // Retirer une pièce
  const handleRemovePiece = (productId: string) => {
    setPiecesUtilisees(piecesUtilisees.filter(p => p.productId !== productId));
  };

  // Auto-calcul du prix proposé basé sur le prix minimum
  React.useEffect(() => {
    if (prixMinimum > 0) {
      setForm(f => ({ ...f, prixPropose: String(Math.ceil(prixMinimum * 1.2)) }));
    }
  }, [prixMinimum]);

  const handleAdd = async () => {
    if (!form.client || !form.appareilType || !form.problemeDescription) {
      setError("Veuillez renseigner le client, l'appareil et le problème.");
      return;
    }

    const prixPropose = Number(form.prixPropose) || 0;
    if (prixPropose < prixMinimum && prixMinimum > 0) {
      setError(`Le prix proposé ne peut pas être inférieur au prix minimum de ${formatCurrency(prixMinimum)}`);
      return;
    }

    setError(null);
    setIsSaving(true);

    try {
      // Créer la réparation
      const newRepair: Omit<Repair, 'id'> = {
        client: form.client,
        appareilType: form.appareilType,
        problemeDescription: form.problemeDescription,
        etatVisuel: form.etatVisuel || "Non renseigné",
        dateDepot: today,
        dateLimite: form.dateLimite || undefined,
        statut: 'en_attente',
        piecesUtilisees: piecesUtilisees,
        coutMainOeuvre: Number(form.coutMainOeuvre) || 0,
        prixPropose: prixPropose,
        avanceRecue: Number(form.avanceRecue) || 0,
        image: "https://images.unsplash.com/photo-1556656793-062ff98782ee?q=80&w=200&auto=format&fit=crop",
      };

      const saved = await api.saveRepair(newRepair);

      // Décrémenter le stock pour chaque pièce utilisée
      for (const piece of piecesUtilisees) {
        const product = products.find(p => p.id === piece.productId);
        if (product) {
          const newQty = Math.max(0, product.quantite - piece.quantite);
          const updatedProduct = { ...product, quantite: newQty };
          await api.saveProduct(updatedProduct);
          setProducts(products.map(p => p.id === product.id ? updatedProduct : p));

          // Log pièce utilisée
          await api.logAction({
            type: "pièce_utilisée",
            description: `Pièce "${piece.productNom}" utilisée (x${piece.quantite}) pour réparation ${form.appareilType}`,
            userId: currentUser?.id,
            userName: currentUser?.nom,
            metadata: {
              repairId: saved.id,
              productId: piece.productId,
              productNom: piece.productNom,
              quantite: piece.quantite,
            },
          });
        }
      }

      // Créer une dette si avance < prix proposé
      if (prixPropose > Number(form.avanceRecue)) {
        const montantDette = prixPropose - Number(form.avanceRecue);
        await api.saveDebt({
          clientName: form.client,
          productName: `Réparation ${form.appareilType}`,
          amount: montantDette,
          date: today,
          status: 'active',
          sourceType: 'repair',
          repairId: saved.id,
        });
      }

      // Log dépôt
      await api.logAction({
        type: "dépôt",
        description: `Dépôt — ${form.client} · ${form.appareilType} · ${form.problemeDescription}`,
        userId: currentUser?.id,
        userName: currentUser?.nom,
        metadata: {
          repairId: saved.id,
          client: form.client,
          appareil: form.appareilType,
          prixPropose: prixPropose,
        },
      });

      setRepairs([saved, ...repairs]);
      resetForm();
      setShowForm(false);
    } catch (err) {
      console.error("Failed to save repair:", err);
      setError("Erreur lors de l'enregistrement du dépôt.");
    } finally {
      setIsSaving(false);
    }
  };

  const resetForm = () => {
    setForm({
      client: "",
      appareilType: "",
      problemeDescription: "",
      etatVisuel: "",
      dateLimite: "",
      coutMainOeuvre: "0",
      prixPropose: "0",
      avanceRecue: "0",
    });
    setPiecesUtilisees([]);
    setSelectedProductId("");
    setSelectedQuantite("1");
  };

  const changeStatut = async (id: string, newStatut: Repair['statut']) => {
    const repair = repairs.find(r => r.id === id);
    if (!repair) return;

    const oldStatut = repair.statut;
    const updated: Repair = { ...repair, statut: newStatut };

    try {
      // Si passage à "recuperee" : clôture automatique avec paiement
      if (newStatut === 'recuperee') {
        const montantRestant = repair.prixPropose - repair.avanceRecue;
        if (montantRestant > 0) {
          // Créer une transaction de paiement
          await api.saveTransaction({
            client: repair.client,
            produit: `Réparation ${repair.appareilType}`,
            quantite: 0,
            montant: montantRestant,
            type: 'Paiement',
            date: today,
          });

          // Marquer les dettes associées comme payées
          const debts = await api.getDebts();
          const relatedDebts = debts.filter((d: any) => d.repairId === id && d.status === 'active');
          for (const debt of relatedDebts) {
            await api.saveDebt({ ...debt, status: 'paid' });
          }

          // Log clôture
          await api.logAction({
            type: "clôture_réparation",
            description: `Clôture réparation — ${repair.client} · ${repair.appareilType} · ${formatCurrency(repair.prixPropose)}`,
            userId: currentUser?.id,
            userName: currentUser?.nom,
            metadata: {
              repairId: id,
              montantFinal: repair.prixPropose,
              client: repair.client,
            },
          });
        }
      }

      const saved = await api.saveRepair(updated);
      setRepairs(repairs.map(r => r.id === id ? saved : r));

      // Log changement de statut
      await api.logAction({
        type: "réparation",
        description: `Réparation — ${repair.client} · ${oldStatut} → ${newStatut}`,
        userId: currentUser?.id,
        userName: currentUser?.nom,
        metadata: {
          repairId: id,
          ancienStatut: oldStatut,
          nouveauStatut: newStatut,
        },
      });
    } catch (err) {
      console.error("Failed to change status:", err);
    }
  };

  const handleDelete = async (id: string) => {
    const repair = repairs.find(r => r.id === id);
    try {
      await api.deleteRepair(id);
      setRepairs(repairs.filter(r => r.id !== id));
      setConfirmDelete(null);

      await api.logAction({
        type: "réparation_supprimée",
        description: `Réparation "${repair?.appareilType || id}" supprimée`,
        userId: currentUser?.id,
        userName: currentUser?.nom,
        metadata: { repairId: id, client: repair?.client },
      });
    } catch (err) {
      console.error("Failed to delete repair:", err);
    }
  };

  const filteredRepairs = repairs.filter(r =>
    r.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.appareilType.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.problemeDescription.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const statutCounts = {
    en_attente: repairs.filter(r => r.statut === 'en_attente').length,
    en_cours: repairs.filter(r => r.statut === 'en_cours').length,
    terminee: repairs.filter(r => r.statut === 'terminee').length,
  };

  const clientOptions = clients.length > 0
    ? clients.map(c => ({ value: c.nom, label: c.nom }))
    : [{ value: form.client || "Client", label: form.client || "Client" }];

  return (
    <Motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="h-full flex flex-col relative"
    >
      {/* ══ Modal Modification (Statut & Détails) ═══════════════════════════ */}
      <AnimatePresence>
        {editingRepair && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
            <Motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-[#0c111a] border border-gray-800 rounded-2xl w-full max-w-md shadow-2xl my-4"
            >
              <div className="flex items-center justify-between p-4 border-b border-gray-800">
                <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                  <Eye size={15} className="text-blue-500" />
                  Détails Réparation
                </h3>
                <button onClick={() => setEditingRepair(null)}
                  className="p-1 hover:bg-gray-800 rounded-full transition-colors text-gray-500 cursor-pointer">
                  <X size={18} />
                </button>
              </div>

              <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
                {/* Informations générales */}
                <div className="bg-gray-900/60 rounded-xl p-3 border border-gray-700/50 space-y-2">
                  <p className="text-xs font-bold text-gray-500 uppercase">Client</p>
                  <p className="text-sm font-bold text-white">{editingRepair.client}</p>
                  <p className="text-xs font-bold text-gray-500 uppercase mt-2">Appareil</p>
                  <p className="text-sm font-bold text-blue-400">{editingRepair.appareilType}</p>
                  <p className="text-xs font-bold text-gray-500 uppercase mt-2">Problème</p>
                  <p className="text-sm text-gray-300">{editingRepair.problemeDescription}</p>
                  <p className="text-xs font-bold text-gray-500 uppercase mt-2">État visuel</p>
                  <p className="text-sm text-gray-300">{editingRepair.etatVisuel}</p>
                </div>

                {/* Pièces utilisées */}
                {editingRepair.piecesUtilisees.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-gray-500 uppercase">Pièces utilisées</p>
                    {editingRepair.piecesUtilisees.map((piece, idx) => (
                      <div key={idx} className="bg-gray-800/50 rounded-lg p-2 flex justify-between items-center">
                        <div>
                          <p className="text-xs font-bold text-white">{piece.productNom}</p>
                          <p className="text-[10px] text-gray-500">x{piece.quantite}</p>
                        </div>
                        <p className="text-xs font-bold text-blue-400">{formatCurrency(piece.prixUnitaire * piece.quantite)}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Calcul du prix */}
                <div className="bg-gray-900/60 rounded-xl p-3 border border-gray-700/50 space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Coût main d'œuvre</span>
                    <span className="font-bold text-white">{formatCurrency(editingRepair.coutMainOeuvre)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Prix proposé</span>
                    <span className="font-bold text-blue-400">{formatCurrency(editingRepair.prixPropose)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Avance reçue</span>
                    <span className="font-bold text-green-400">{formatCurrency(editingRepair.avanceRecue)}</span>
                  </div>
                  <div className="border-t border-gray-700 pt-2 flex justify-between">
                    <span className="text-sm font-bold text-gray-400">Reste à payer</span>
                    <span className="text-sm font-black text-red-400">{formatCurrency(editingRepair.prixPropose - editingRepair.avanceRecue)}</span>
                  </div>
                </div>

                {/* Changement de statut */}
                {isAdmin && (
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-gray-500 uppercase">Changer le statut</p>
                    <div className="grid grid-cols-2 gap-2">
                      {(['en_attente', 'diagnostic', 'en_cours', 'terminee', 'recuperee', 'annulee'] as const).map(s => (
                        <button
                          key={s}
                          onClick={() => { changeStatut(editingRepair.id, s); setEditingRepair(null); }}
                          className={`py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            editingRepair.statut === s
                              ? "bg-blue-600 text-white"
                              : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                          }`}
                        >
                          {s === 'en_attente' ? 'En attente' :
                           s === 'diagnostic' ? 'Diagnostic' :
                           s === 'en_cours' ? 'En cours' :
                           s === 'terminee' ? 'Terminée' :
                           s === 'recuperee' ? 'Récupérée' : 'Annulée'}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ══ Modal Suppression ════════════════════════════════════════════════ */}
      <AnimatePresence>
        {confirmDelete && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <Motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-[#0c111a] border border-red-500/20 rounded-2xl w-full max-w-xs p-6 text-center shadow-2xl"
            >
              <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/20">
                <AlertTriangle size={24} className="text-red-500" />
              </div>
              <h3 className="text-white font-bold mb-2">Supprimer cette réparation ?</h3>
              <p className="text-xs text-gray-500 mb-6">Cette action est définitive.</p>
              <div className="flex gap-2">
                <button
                  onClick={() => handleDelete(confirmDelete)}
                  className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  Supprimer
                </button>
                <button
                  onClick={() => setConfirmDelete(null)}
                  className="flex-1 py-2.5 bg-gray-800 hover:bg-gray-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  Annuler
                </button>
              </div>
            </Motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── En-tête ────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <button onClick={onBack} className="p-2 hover:bg-gray-800 rounded-full transition-colors cursor-pointer">
            <ChevronLeft size={20} className="text-gray-400" />
          </button>
          <h2 className="text-xl font-bold text-white">Dépôts & Réparations</h2>
          {!isAdmin && (
            <span className="flex items-center gap-1 px-2 py-0.5 bg-gray-800/60 border border-gray-700/50 rounded-full text-[10px] text-gray-500 font-bold uppercase">
              <Lock size={9} /> Lecture seule
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Stats badges */}
          <div className="flex items-center gap-1.5">
            {statutCounts.en_attente > 0 && (
              <span className="text-[10px] font-black bg-orange-500/10 border border-orange-500/20 text-orange-400 px-2 py-0.5 rounded-full">
                {statutCounts.en_attente} attente
              </span>
            )}
            {statutCounts.en_cours > 0 && (
              <span className="text-[10px] font-black bg-blue-500/10 border border-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full">
                {statutCounts.en_cours} en cours
              </span>
            )}
          </div>
          {isAdmin ? (
            <button
              onClick={() => { setShowForm(!showForm); if (showForm) resetForm(); }}
              className={`p-2 rounded-lg transition-all flex items-center gap-2 text-xs font-bold cursor-pointer ${showForm ? 'bg-gray-700 text-gray-300' : 'bg-blue-600 text-white hover:bg-blue-500'}`}
            >
              {showForm ? 'Annuler' : <><Plus size={14} /> Nouveau</>}
            </button>
          ) : (
            <button
              onClick={triggerAccessDenied}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800/50 text-gray-600 rounded-xl text-xs font-bold cursor-pointer border border-gray-700/30"
              title="Accès réservé aux administrateurs"
            >
              <Lock size={13} /> Nouveau
            </button>
          )}
        </div>
      </div>

      {/* ── Erreur ──────────────────────────────────────────────────────────── */}
      {error && (
        <div className="mb-3 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2 text-xs text-red-400">
          {error}
        </div>
      )}

      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
        {/* ── Formulaire de dépôt ───────────────────────────────────────────── */}
        <AnimatePresence>
          {showForm && (
            <Motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="bg-gray-800/50 border border-blue-500/20 rounded-xl p-4 mb-4 space-y-4 overflow-hidden shadow-xl"
            >
              <h3 className="text-xs font-black text-blue-500 uppercase tracking-widest">
                Nouveau dépôt
              </h3>

              {/* Informations de base */}
              <div className="space-y-3">
                <p className="text-[10px] font-bold text-gray-500 uppercase">Informations de base</p>
                <div className="grid grid-cols-2 gap-3">
                  <Select
                    label="Client"
                    value={form.client}
                    onChange={(e: any) => setForm({ ...form, client: e.target.value })}
                    options={[{ value: "", label: "Sélectionner..." }, ...clientOptions]}
                  />
                  <Input
                    label="Type d'appareil"
                    placeholder="ex: iPhone 13, Samsung A10"
                    value={form.appareilType}
                    onChange={(e: any) => setForm({ ...form, appareilType: e.target.value })}
                  />
                </div>
                <Input
                  label="Description du problème"
                  placeholder="Décrivez le problème rencontré..."
                  value={form.problemeDescription}
                  onChange={(e: any) => setForm({ ...form, problemeDescription: e.target.value })}
                />
                <Input
                  label="État visuel à l'arrivée (optionnel)"
                  placeholder="ex: écran fissuré, batterie déchargée..."
                  value={form.etatVisuel}
                  onChange={(e: any) => setForm({ ...form, etatVisuel: e.target.value })}
                />
                <Input
                  label="Date limite (optionnel)"
                  type="date"
                  value={form.dateLimite}
                  onChange={(e: any) => setForm({ ...form, dateLimite: e.target.value })}
                />
              </div>

              {/* Pièces utilisées */}
              <div className="space-y-3 border-t border-gray-700 pt-3">
                <p className="text-[10px] font-bold text-gray-500 uppercase flex items-center gap-1.5">
                  <Package size={12} /> Pièces utilisées
                </p>
                {piecesUtilisees.length > 0 && (
                  <div className="space-y-2">
                    {piecesUtilisees.map((piece) => (
                      <div key={piece.productId} className="flex items-center gap-2 bg-gray-900/60 rounded-lg p-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-white truncate">{piece.productNom}</p>
                          <p className="text-[10px] text-gray-500">
                            {piece.quantite} x {formatCurrency(piece.prixUnitaire)} = {formatCurrency(piece.quantite * piece.prixUnitaire)}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemovePiece(piece.productId)}
                          className="p-1.5 hover:bg-red-900/30 rounded-lg text-gray-500 hover:text-red-400 transition-colors cursor-pointer"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <select
                    value={selectedProductId}
                    onChange={(e) => setSelectedProductId(e.target.value)}
                    className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  >
                    <option value="">Sélectionner une pièce...</option>
                    {products
                      .filter(p => p.quantite > 0)
                      .map(p => (
                        <option key={p.id} value={p.id}>
                          {p.nom} (Stock: {p.quantite}) — {formatCurrency(p.prix)}
                        </option>
                      ))}
                  </select>
                  <input
                    type="number"
                    min="1"
                    value={selectedQuantite}
                    onChange={(e) => setSelectedQuantite(e.target.value)}
                    className="w-16 bg-gray-900 border border-gray-700 rounded-lg px-2 py-2 text-sm text-white text-center focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  />
                  <button
                    type="button"
                    onClick={handleAddPiece}
                    disabled={!selectedProductId}
                    className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>

              {/* Calcul du prix */}
              <div className="space-y-3 border-t border-gray-700 pt-3">
                <p className="text-[10px] font-bold text-gray-500 uppercase flex items-center gap-1.5">
                  <DollarSign size={12} /> Tarification
                </p>
                <Input
                  label="Coût main d'œuvre (FGN)"
                  type="number"
                  placeholder="0"
                  value={form.coutMainOeuvre}
                  onChange={(e: any) => setForm({ ...form, coutMainOeuvre: e.target.value })}
                />
                {prixMinimum > 0 && (
                  <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg px-3 py-2">
                    <p className="text-[10px] text-gray-500">Prix minimum (pièces + main d'œuvre)</p>
                    <p className="text-sm font-bold text-blue-400">{formatCurrency(prixMinimum)}</p>
                  </div>
                )}
                <Input
                  label="Prix proposé au client (FGN)"
                  type="number"
                  placeholder="0"
                  value={form.prixPropose}
                  onChange={(e: any) => setForm({ ...form, prixPropose: e.target.value })}
                />
                {Number(form.prixPropose) < prixMinimum && prixMinimum > 0 && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2 flex items-center gap-2">
                    <AlertCircle size={14} className="text-red-400 shrink-0" />
                    <p className="text-[10px] text-red-400">
                      Attention : le prix proposé est inférieur au prix minimum
                    </p>
                  </div>
                )}
                <Input
                  label="Avance reçue (FGN)"
                  type="number"
                  placeholder="0"
                  value={form.avanceRecue}
                  onChange={(e: any) => setForm({ ...form, avanceRecue: e.target.value })}
                />
              </div>

              <Button onClick={handleAdd} disabled={isSaving}>
                {isSaving ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Save size={18} />
                )}
                {isSaving ? "Enregistrement..." : "Enregistrer le dépôt"}
              </Button>
            </Motion.div>
          )}
        </AnimatePresence>

        {/* ── Barre de recherche ───────────────────────────────────────────── */}
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

        {/* ── Liste des réparations ────────────────────────────────────────── */}
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
                const statutColors = {
                  en_attente: { bg: 'bg-orange-500/10', border: 'border-orange-500/30', text: 'text-orange-400' },
                  diagnostic: { bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', text: 'text-yellow-400' },
                  en_cours: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-400' },
                  terminee: { bg: 'bg-purple-500/10', border: 'border-purple-500/30', text: 'text-purple-400' },
                  recuperee: { bg: 'bg-green-500/10', border: 'border-green-500/30', text: 'text-green-400' },
                  annulee: { bg: 'bg-gray-500/10', border: 'border-gray-500/30', text: 'text-gray-400' },
                };
                const colors = statutColors[r.statut];

                return (
                  <div
                    key={r.id}
                    className={`bg-gray-800/40 border rounded-xl p-3 flex items-center gap-4 transition-all hover:border-blue-500/30 ${colors.border}`}
                  >
                    <div className="w-14 h-14 rounded-lg bg-gray-900 overflow-hidden shrink-0 border border-gray-700/50 relative">
                      <ImageWithFallback src={r.image} alt={r.appareilType} className="w-full h-full object-cover opacity-60" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Smartphone size={20} className="text-gray-500" />
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                        <div className="min-w-0 flex-1">
                          <h3 className="text-sm font-bold text-white truncate">{r.client}</h3>
                          <p className="text-[10px] text-blue-400 font-medium">{r.appareilType}</p>
                          <p className="text-[10px] text-gray-500 truncate mt-0.5">{r.problemeDescription}</p>
                        </div>
                        <div className="text-right ml-2">
                          <div className="text-sm font-black text-white">{formatCurrency(r.prixPropose)}</div>
                          {r.avanceRecue > 0 && (
                            <div className="text-[9px] text-green-400 font-bold">
                              Avance: {formatCurrency(r.avanceRecue)}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="mt-2 flex items-center gap-2 flex-wrap">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${colors.bg} ${colors.border} ${colors.text}`}>
                          {r.statut === 'en_attente' ? '⏳ En attente' :
                           r.statut === 'diagnostic' ? '🔍 Diagnostic' :
                           r.statut === 'en_cours' ? '⚙️ En cours' :
                           r.statut === 'terminee' ? '✓ Terminée' :
                           r.statut === 'recuperee' ? '✓ Récupérée' : '❌ Annulée'}
                        </span>
                        {r.piecesUtilisees.length > 0 && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-gray-700/50 text-gray-400">
                            <Package size={8} /> {r.piecesUtilisees.length} pièce(s)
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5 shrink-0">
                      <button
                        onClick={() => setEditingRepair(r)}
                        className="p-2 bg-gray-800 hover:bg-blue-600/20 rounded-xl text-gray-400 hover:text-blue-400 transition-colors cursor-pointer"
                        title="Voir détails"
                      >
                        <Eye size={13} />
                      </button>
                      {isAdmin ? (
                        <button
                          onClick={() => setConfirmDelete(r.id)}
                          className="p-2 bg-gray-800 hover:bg-red-900/30 rounded-xl text-gray-500 hover:text-red-400 transition-colors cursor-pointer"
                          title="Supprimer"
                        >
                          <Trash2 size={13} />
                        </button>
                      ) : (
                        <button
                          onClick={triggerAccessDenied}
                          className="p-2 bg-gray-800/40 rounded-xl text-gray-700 hover:text-gray-500 transition-colors cursor-pointer"
                          title="Accès réservé aux administrateurs"
                        >
                          <Lock size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* ── Toast accès refusé ────────────────────────────────────────────── */}
      <AnimatePresence>
        {accessDeniedToast && (
          <Motion.div
            initial={{ opacity: 0, y: 16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 380, damping: 28 }}
            className="absolute bottom-3 left-3 right-3 z-50 bg-[#130a0a] border border-red-500/40 rounded-2xl px-4 py-3 shadow-2xl flex items-center gap-3"
          >
            <div className="w-8 h-8 bg-red-500/10 rounded-full flex items-center justify-center shrink-0 border border-red-500/20">
              <Shield size={15} className="text-red-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-red-300">Accès réservé aux administrateurs</p>
              <p className="text-[10px] text-red-500/70">Contactez un administrateur pour effectuer cette action.</p>
            </div>
            <button
              onClick={() => setAccessDeniedToast(false)}
              className="p-1 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer shrink-0"
            >
              <X size={14} className="text-red-400/60" />
            </button>
          </Motion.div>
        )}
      </AnimatePresence>
    </Motion.div>
  );
};
