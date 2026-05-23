import { api } from "../utils/api";
import React from "react";
import {
  ChevronLeft, Search, Edit2, Trash2, Plus, Package,
  X, AlertTriangle, Save, Upload, Link, Image as ImageIcon,
  Smartphone, Tag, ChevronDown, Check, RefreshCw,
  Lock, Shield, TrendingUp, PackagePlus,
} from "lucide-react";
import { motion as Motion, AnimatePresence } from "motion/react";
import { Button, Input } from "./ui";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { formatCurrency } from "../utils/format";

interface Category {
  id: string;
  nom: string;
  couleur: string;
}

interface Product {
  id: string;
  nom: string;
  alias: string;
  quantite: number;
  seuil: number;
  prix: number;
  image: string;
  compatibilite?: string;
  dimensions?: string;
  categorieId?: string;
  categorieNom?: string;
  categorieCouleur?: string;
}

// ── Sélecteur d'image inline ────────────────────────────────────────────────
function ImagePickerInline({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [mode, setMode] = React.useState<"local" | "url">("local");
  const [urlInput, setUrlInput] = React.useState("");
  const [isDragging, setIsDragging] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (result) onChange(result);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Image</label>
        <div className="flex bg-gray-900 rounded-lg p-0.5 gap-0.5">
          <button type="button" onClick={() => setMode("local")}
            className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase transition-all cursor-pointer ${mode === "local" ? "bg-blue-600 text-white" : "text-gray-500 hover:text-gray-300"}`}>
            <Upload size={9} /> Local
          </button>
          <button type="button" onClick={() => setMode("url")}
            className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase transition-all cursor-pointer ${mode === "url" ? "bg-blue-600 text-white" : "text-gray-500 hover:text-gray-300"}`}>
            <Link size={9} /> URL
          </button>
        </div>
      </div>

      <div className="flex gap-2 items-center">
        <div className="w-12 h-12 rounded-lg bg-gray-900 border border-gray-700/60 overflow-hidden shrink-0 flex items-center justify-center">
          {value
            ? <ImageWithFallback src={value} alt="aperçu" className="w-full h-full object-cover" />
            : <ImageIcon size={16} className="text-gray-600" />
          }
        </div>

        {mode === "local" ? (
          <>
            <input ref={fileRef} type="file" accept="image/*" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
            <div
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files?.[0]; if (f) handleFile(f); }}
              className={`flex-1 h-12 rounded-xl border-2 border-dashed flex items-center justify-center gap-2 cursor-pointer transition-all text-[10px] font-bold uppercase tracking-wide ${
                isDragging ? "border-blue-500 bg-blue-500/10 text-blue-400" : "border-gray-700 hover:border-blue-500/50 hover:bg-gray-800/50 text-gray-500"
              }`}
            >
              <Upload size={13} />
              {isDragging ? "Relâcher" : "Choisir / Glisser"}
            </div>
          </>
        ) : (
          <div className="flex-1 flex gap-2 items-center">
            <input
              type="text"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && urlInput.trim()) { onChange(urlInput.trim()); setUrlInput(""); } }}
              placeholder="https://..."
              className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-2 py-2 text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500/50 placeholder:text-gray-600"
            />
            <button type="button" onClick={() => { if (urlInput.trim()) { onChange(urlInput.trim()); setUrlInput(""); } }}
              className="px-2 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition-all cursor-pointer shrink-0">
              OK
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Sélecteur de catégorie compact (pour modal édition) ─────────────────────
function CategorySelectInline({
  categories,
  value,
  onChange,
}: {
  categories: Category[];
  value: string;
  onChange: (id: string) => void;
}) {
  const [isOpen, setIsOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  const selected = categories.find((c) => c.id === value);

  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
    };
    if (isOpen) {
      document.addEventListener("mousedown", handler);
      return () => document.removeEventListener("mousedown", handler);
    }
  }, [isOpen]);

  return (
    <div className="relative" ref={ref}>
      <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1">
        Catégorie
      </label>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-2 bg-gray-800/50 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white hover:border-gray-600 transition-all cursor-pointer"
      >
        {selected ? (
          <>
            <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: selected.couleur }} />
            <span className="flex-1 text-left font-medium">{selected.nom}</span>
          </>
        ) : (
          <span className="flex-1 text-left text-gray-500">Sans catégorie</span>
        )}
        <ChevronDown size={12} className={`text-gray-500 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <Motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="absolute z-50 top-full left-0 right-0 mt-1 bg-[#0d1421] border border-gray-700 rounded-xl shadow-xl overflow-hidden"
          >
            <button
              type="button"
              onClick={() => { onChange(""); setIsOpen(false); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-400 hover:bg-gray-800 transition-colors cursor-pointer"
            >
              <span className="w-3 h-3 rounded-full shrink-0 border border-gray-600" />
              <span>Sans catégorie</span>
              {!value && <Check size={12} className="ml-auto text-blue-400" />}
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => { onChange(cat.id); setIsOpen(false); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-white hover:bg-gray-800 transition-colors cursor-pointer"
              >
                <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: cat.couleur }} />
                <span className="flex-1 text-left">{cat.nom}</span>
                {value === cat.id && <Check size={12} className="ml-auto text-blue-400" />}
              </button>
            ))}
          </Motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Composant principal ────────────────────────────────────────────────────
type SearchMode = "nom" | "compat";

export const AllProductsView = ({ onBack, onAdd }: { onBack: () => void; onAdd: () => void }) => {
  const [searchTerm, setSearchTerm]   = React.useState("");
  const [searchMode, setSearchMode]   = React.useState<SearchMode>("nom");
  const [products, setProducts]       = React.useState<Product[]>([]);
  const [categories, setCategories]   = React.useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = React.useState<string | null>(null);
  const [isLoading, setIsLoading]     = React.useState(true);
  const [error, setError]             = React.useState<string | null>(null);
  const [editingProduct, setEditingProduct] = React.useState<Product | null>(null);
  const [confirmDelete, setConfirmDelete]   = React.useState<string | null>(null);
  const [accessDeniedToast, setAccessDeniedToast] = React.useState(false);
  const [restockProduct, setRestockProduct] = React.useState<Product | null>(null);
  const [restockQty, setRestockQty] = React.useState("10");

  // Contrôle d'accès admin (synchrone, lecture directe du localStorage)
  const currentUser = React.useMemo(() => api.getCurrentUser(), []);
  const isAdmin = currentUser?.role === 'admin';

  const triggerAccessDenied = React.useCallback(() => {
    setAccessDeniedToast(true);
    setTimeout(() => setAccessDeniedToast(false), 2800);
  }, []);

  const fetchAll = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [data, cats] = await Promise.all([
        api.getProducts(),
        api.getCategories(),
      ]);
      setProducts(Array.isArray(data) ? data : []);
      setCategories(Array.isArray(cats) ? cats : []);
    } catch (err) {
      console.error("Failed to fetch products:", err);
      setError("Impossible de charger les produits.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Filtrage par catégorie + recherche ────────────────────────────────
  const filteredProducts = React.useMemo(() => {
    let list = products;

    // Filtre par catégorie sélectionnée
    if (selectedCategory) {
      list = list.filter(
        (p) => p.categorieId === selectedCategory
      );
    }

    const q = searchTerm.toLowerCase().trim();
    if (!q) return list;

    if (searchMode === "nom") {
      return list.filter((p) =>
        p.nom.toLowerCase().includes(q) ||
        (p.alias || "").toLowerCase().includes(q) ||
        (p.categorieNom || "").toLowerCase().includes(q)
      );
    }
    // Mode compatibilité
    return list.filter((p) =>
      (p.compatibilite || "").toLowerCase().includes(q)
    );
  }, [products, searchTerm, searchMode, selectedCategory]);

  // ── Tags de compatibilité mis en évidence ───────────────────────────
  const highlightedTags = React.useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    return (compat: string) => {
      if (!compat) return [];
      return compat.split(",").map((tag) => tag.trim()).filter(Boolean).map((tag) => ({
        tag,
        match: searchMode === "compat" && q.length > 0 && tag.toLowerCase().includes(q),
      }));
    };
  }, [searchTerm, searchMode]);

  const handleUpdate = async () => {
    if (!editingProduct) return;
    try {
      // Résoudre les infos de catégorie si modifiées
      const selectedCat = categories.find((c) => c.id === editingProduct.categorieId);
      const updated = await api.saveProduct({
        ...editingProduct,
        categorieNom:    selectedCat?.nom || "",
        categorieCouleur: selectedCat?.couleur || "",
      });
      setProducts(products.map((p) => p.id === updated.id ? updated : p));
      setEditingProduct(null);

      const currentUser = api.getCurrentUser();
      await api.logAction({
        type: "produit_modifié",
        description: `Produit "${updated.nom}" modifié`,
        userId: currentUser?.id,
        userName: currentUser?.nom,
        metadata: { productId: updated.id },
      });
    } catch (err) {
      console.error("Failed to update product:", err);
    }
  };

  const handleDelete = async (id: string) => {
    const product = products.find((p) => p.id === id);
    try {
      await api.deleteProduct(id);
      setProducts(products.filter((p) => p.id !== id));
      setConfirmDelete(null);

      const currentUser = api.getCurrentUser();
      await api.logAction({
        type: "produit_supprimé",
        description: `Produit "${product?.nom || id}" supprimé`,
        userId: currentUser?.id,
        userName: currentUser?.nom,
        metadata: { productId: id, nom: product?.nom },
      });
    } catch (err) {
      console.error("Failed to delete product:", err);
    }
  };

  const handleRestock = async () => {
    if (!restockProduct) return;
    const qty = Number(restockQty) || 0;
    if (qty <= 0) return;

    try {
      const newQty = restockProduct.quantite + qty;
      const updated = await api.saveProduct({
        ...restockProduct,
        quantite: newQty,
      });
      setProducts(products.map((p) => p.id === updated.id ? updated : p));
      setRestockProduct(null);
      setRestockQty("10");

      const currentUser = api.getCurrentUser();
      await api.logAction({
        type: "réapprovisionnement",
        description: `Réapprovisionnement — ${restockProduct.nom} : +${qty} unité(s) → ${newQty}`,
        userId: currentUser?.id,
        userName: currentUser?.nom,
        metadata: { productId: restockProduct.id, nom: restockProduct.nom, quantiteAjoutee: qty, nouveauStock: newQty },
      });
    } catch (err) {
      console.error("Failed to restock product:", err);
    }
  };

  // Trouver la catégorie sélectionnée pour affichage
  const activeCat = categories.find((c) => c.id === selectedCategory);

  return (
    <Motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="h-full flex flex-col relative"
    >
      {/* ══ Modal Modification ══════════════════════════════════════════ */}
      <AnimatePresence>
        {editingProduct && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <Motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-[#0c111a] border border-gray-800 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="flex items-center justify-between p-4 border-b border-gray-800 shrink-0">
                <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                  <Edit2 size={15} className="text-blue-500" />
                  Modifier Produit
                </h3>
                <button onClick={() => setEditingProduct(null)}
                  className="p-1 hover:bg-gray-800 rounded-full transition-colors text-gray-500 cursor-pointer">
                  <X size={18} />
                </button>
              </div>

              <div className="p-5 space-y-4 overflow-y-auto custom-scrollbar">
                <Input label="Nom" value={editingProduct.nom}
                  onChange={(e: any) => setEditingProduct({ ...editingProduct, nom: e.target.value })} />

                <div className="grid grid-cols-2 gap-3">
                  <Input label="Alias" value={editingProduct.alias}
                    onChange={(e: any) => setEditingProduct({ ...editingProduct, alias: e.target.value })} />
                  <Input label="Prix (FGN)" type="number" value={editingProduct.prix}
                    onChange={(e: any) => setEditingProduct({ ...editingProduct, prix: Number(e.target.value) })} />
                  <Input label="Quantité" type="number" value={editingProduct.quantite}
                    onChange={(e: any) => setEditingProduct({ ...editingProduct, quantite: Number(e.target.value) })} />
                  <Input label="Seuil" type="number" value={editingProduct.seuil}
                    onChange={(e: any) => setEditingProduct({ ...editingProduct, seuil: Number(e.target.value) })} />
                </div>

                <CategorySelectInline
                  categories={categories}
                  value={editingProduct.categorieId || ""}
                  onChange={(id) => setEditingProduct({ ...editingProduct, categorieId: id })}
                />

                <Input
                  label="Téléphones compatibles"
                  placeholder="iPhone 12, Samsung S21..."
                  value={editingProduct.compatibilite || ""}
                  onChange={(e: any) => setEditingProduct({ ...editingProduct, compatibilite: e.target.value })}
                />

                <ImagePickerInline
                  value={editingProduct.image}
                  onChange={(v) => setEditingProduct({ ...editingProduct, image: v })}
                />

                <Button onClick={handleUpdate} className="w-full">
                  <Save size={15} />
                  Sauvegarder
                </Button>
              </div>
            </Motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ══ Modal Réapprovisionnement ═══════════════════════════════════ */}
      <AnimatePresence>
        {restockProduct && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <Motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-[#0c111a] border border-green-500/30 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between p-4 border-b border-gray-800">
                <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                  <PackagePlus size={15} className="text-green-500" />
                  Réapprovisionnement Rapide
                </h3>
                <button onClick={() => setRestockProduct(null)}
                  className="p-1 hover:bg-gray-800 rounded-full transition-colors text-gray-500 cursor-pointer">
                  <X size={18} />
                </button>
              </div>

              <div className="p-5 space-y-4">
                {/* Info produit */}
                <div className="bg-gray-900/60 rounded-xl p-3 border border-gray-700/50">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-gray-800 overflow-hidden shrink-0 border border-gray-700">
                      <ImageWithFallback
                        src={restockProduct.image}
                        alt={restockProduct.nom}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-white truncate">{restockProduct.nom}</p>
                      <p className="text-[10px] text-gray-500 font-mono">{restockProduct.alias}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-[11px] font-bold ${
                          restockProduct.quantite <= 0
                            ? "text-red-400"
                            : restockProduct.quantite <= restockProduct.seuil
                            ? "text-amber-400"
                            : "text-green-400"
                        }`}>
                          Stock actuel : {restockProduct.quantite}
                        </span>
                        {restockProduct.categorieNom && (
                          <span
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold"
                            style={{
                              backgroundColor: `${restockProduct.categorieCouleur}20`,
                              color: restockProduct.categorieCouleur,
                              border: `1px solid ${restockProduct.categorieCouleur}40`,
                            }}
                          >
                            <span
                              className="w-1.5 h-1.5 rounded-full"
                              style={{ backgroundColor: restockProduct.categorieCouleur }}
                            />
                            {restockProduct.categorieNom}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quantité à ajouter */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">
                    Quantité à ajouter
                  </label>
                  <div className="flex gap-2">
                    {[5, 10, 20, 50].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setRestockQty(String(val))}
                        className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          restockQty === String(val)
                            ? "bg-green-600 text-white shadow-lg"
                            : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                        }`}
                      >
                        +{val}
                      </button>
                    ))}
                  </div>
                  <input
                    type="number"
                    min="1"
                    value={restockQty}
                    onChange={(e) => setRestockQty(e.target.value)}
                    className="w-full bg-gray-800/50 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white text-center font-bold focus:outline-none focus:ring-2 focus:ring-green-500/50"
                    placeholder="Quantité personnalisée"
                  />
                </div>

                {/* Aperçu nouveau stock */}
                <div className="bg-green-500/10 border border-green-500/30 rounded-lg px-3 py-2 flex items-center justify-between">
                  <span className="text-xs text-gray-400">Nouveau stock :</span>
                  <span className="text-lg font-black text-green-400">
                    {restockProduct.quantite + (Number(restockQty) || 0)}
                  </span>
                </div>

                {/* Boutons */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setRestockProduct(null)}
                    className="flex-1 py-2.5 bg-gray-800 hover:bg-gray-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleRestock}
                    disabled={!restockQty || Number(restockQty) <= 0}
                    className="flex-1 py-2.5 bg-green-600 hover:bg-green-500 text-white text-xs font-bold rounded-xl transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <TrendingUp size={13} />
                    Réapprovisionner
                  </button>
                </div>
              </div>
            </Motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ══ Modal Suppression ═══════════════════════════════════════════ */}
      <AnimatePresence>
        {confirmDelete && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-6">
            <Motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-[#0c111a] border border-red-500/20 rounded-2xl w-full max-w-xs p-6 text-center shadow-2xl"
            >
              <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/20">
                <AlertTriangle size={24} className="text-red-500" />
              </div>
              <h3 className="text-white font-bold mb-2">Supprimer ce produit ?</h3>
              <p className="text-xs text-gray-500 mb-6">Cette action est définitive.</p>
              <div className="flex gap-2">
                <button onClick={() => handleDelete(confirmDelete)}
                  className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl transition-all cursor-pointer">
                  Supprimer
                </button>
                <button onClick={() => setConfirmDelete(null)}
                  className="flex-1 py-2.5 bg-gray-800 hover:bg-gray-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer">
                  Annuler
                </button>
              </div>
            </Motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── En-tête ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <button onClick={onBack} className="p-2 hover:bg-gray-800 rounded-full transition-colors cursor-pointer">
            <ChevronLeft size={20} className="text-gray-400" />
          </button>
          <h2 className="text-xl font-bold text-white">Inventaire</h2>
          {/* Badge rôle non-admin */}
          {!isAdmin && (
            <span className="flex items-center gap-1 px-2 py-0.5 bg-gray-800/60 border border-gray-700/50 rounded-full text-[10px] text-gray-500 font-bold uppercase">
              <Lock size={9} /> Lecture seule
            </span>
          )}
        </div>
        {/* Bouton "Nouveau" : admin seulement */}
        {isAdmin ? (
          <button onClick={onAdd}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white rounded-xl transition-all text-xs font-bold cursor-pointer shadow-lg shadow-blue-900/10">
            <Plus size={14} /> Nouveau
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

      {/* ── Chips de filtre par catégorie ───────────────────────────────── */}
      {categories.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide mb-2 -mx-1 px-1">
          {/* Chip "Toutes" */}
          <button
            onClick={() => setSelectedCategory(null)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold uppercase tracking-wide transition-all shrink-0 cursor-pointer ${
              selectedCategory === null
                ? "bg-blue-600 text-white shadow-lg shadow-blue-900/30"
                : "bg-gray-800/60 text-gray-400 hover:text-white border border-gray-700/50"
            }`}
          >
            Toutes
            <span className={`px-1 py-0.5 rounded-full text-[9px] font-black ${
              selectedCategory === null ? "bg-white/20" : "bg-gray-700"
            }`}>
              {products.length}
            </span>
          </button>

          {/* Chips par catégorie */}
          {categories.map((cat) => {
            const count = products.filter((p) => p.categorieId === cat.id).length;
            const isActive = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(isActive ? null : cat.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold uppercase tracking-wide transition-all shrink-0 cursor-pointer border ${
                  isActive
                    ? "text-white shadow-lg"
                    : "bg-gray-800/60 text-gray-400 hover:text-white border-gray-700/50"
                }`}
                style={isActive ? {
                  backgroundColor: `${cat.couleur}25`,
                  color: cat.couleur,
                  borderColor: `${cat.couleur}50`,
                  boxShadow: `0 4px 12px ${cat.couleur}20`,
                } : {}}
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: cat.couleur }}
                />
                {cat.nom}
                <span
                  className="px-1 py-0.5 rounded-full text-[9px] font-black"
                  style={isActive
                    ? { backgroundColor: `${cat.couleur}30`, color: cat.couleur }
                    : { backgroundColor: "#374151", color: "#9ca3af" }
                  }
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* ── Barre de recherche + mode ────────────────────────────────────── */}
      <div className="space-y-2 mb-3">
        {/* Chips de mode */}
        <div className="flex gap-2">
          <button
            onClick={() => { setSearchMode("nom"); setSearchTerm(""); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold uppercase tracking-wide transition-all cursor-pointer ${
              searchMode === "nom"
                ? "bg-blue-600 text-white shadow-lg shadow-blue-900/20"
                : "bg-gray-800/60 text-gray-400 hover:text-white border border-gray-700/50"
            }`}
          >
            <Tag size={11} /> Nom / Alias
          </button>
          <button
            onClick={() => { setSearchMode("compat"); setSearchTerm(""); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold uppercase tracking-wide transition-all cursor-pointer ${
              searchMode === "compat"
                ? "bg-purple-600 text-white shadow-lg shadow-purple-900/20"
                : "bg-gray-800/60 text-gray-400 hover:text-white border border-gray-700/50"
            }`}
          >
            <Smartphone size={11} /> Compatibilité
          </button>
          {searchTerm && (
            <button onClick={() => setSearchTerm("")}
              className="ml-auto flex items-center gap-1 px-2 py-1.5 text-gray-500 hover:text-white text-[10px] cursor-pointer">
              <X size={11} /> Effacer
            </button>
          )}
        </div>

        {/* Input de recherche */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={15} />
          <input
            type="text"
            placeholder={
              searchMode === "nom"
                ? "Rechercher par nom, alias ou catégorie..."
                : "ex: Samsung S21, iPhone 13..."
            }
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`w-full bg-gray-800/50 border rounded-xl pl-9 pr-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 transition-all placeholder:text-gray-600 ${
              searchMode === "compat"
                ? "border-purple-700/40 focus:ring-purple-500/40"
                : "border-gray-700 focus:ring-blue-500/50"
            }`}
          />
        </div>

        {/* Compteur résultats + filtre actif */}
        {(searchTerm || selectedCategory) && (
          <div className="flex items-center gap-2 px-1">
            {activeCat && (
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
                style={{
                  backgroundColor: `${activeCat.couleur}20`,
                  color: activeCat.couleur,
                  border: `1px solid ${activeCat.couleur}40`,
                }}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: activeCat.couleur }} />
                {activeCat.nom}
              </span>
            )}
            <p className="text-[10px] text-gray-500">
              {filteredProducts.length} résultat(s)
              {searchMode === "compat" && searchTerm && ` compatibles avec "${searchTerm}"`}
            </p>
          </div>
        )}
      </div>

      {/* ── Liste produits ────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto pr-1 space-y-2 custom-scrollbar">
        {isLoading ? (
          <div className="h-40 flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
            <p className="text-xs text-gray-500">Chargement...</p>
          </div>
        ) : error ? (
          <div className="h-40 flex flex-col items-center justify-center gap-3">
            <p className="text-xs text-red-400 text-center">{error}</p>
            <button onClick={fetchAll}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition-all cursor-pointer">
              Réessayer
            </button>
          </div>
        ) : filteredProducts.length > 0 ? (
          <AnimatePresence mode="popLayout">
            {filteredProducts.map((p) => {
              const tags = highlightedTags(p.compatibilite || "");
              return (
                <Motion.div
                  key={p.id}
                  layout
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-gray-800/40 border border-gray-700/50 rounded-2xl p-3 flex items-start gap-3 hover:border-blue-500/30 transition-all group"
                >
                  {/* Image */}
                  <div className="w-14 h-14 rounded-xl bg-gray-900 overflow-hidden shrink-0 border border-gray-700/50 relative">
                    <ImageWithFallback
                      src={p.image}
                      alt={p.nom}
                      className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                    />
                    {/* Badge catégorie sur l'image */}
                    {p.categorieCouleur && (
                      <div
                        className="absolute bottom-0 left-0 right-0 h-1 rounded-b-xl"
                        style={{ backgroundColor: p.categorieCouleur }}
                      />
                    )}
                  </div>

                  {/* Infos */}
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h3 className="text-sm font-bold text-white truncate">{p.nom}</h3>
                          {/* Badge catégorie */}
                          {p.categorieNom && (
                            <span
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold shrink-0"
                              style={{
                                backgroundColor: `${p.categorieCouleur}20`,
                                color: p.categorieCouleur,
                                border: `1px solid ${p.categorieCouleur}40`,
                              }}
                            >
                              <span
                                className="w-1.5 h-1.5 rounded-full"
                                style={{ backgroundColor: p.categorieCouleur }}
                              />
                              {p.categorieNom}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-gray-500 font-mono tracking-wider">{p.alias}</p>
                      </div>
                      <div className="text-right shrink-0 ml-2">
                        <div className="text-sm font-black text-blue-400">{formatCurrency(p.prix)}</div>
                        <div className={`text-[10px] font-bold ${p.quantite <= p.seuil ? "text-red-400 animate-pulse" : "text-green-500/80"}`}>
                          Stock: {p.quantite}
                        </div>
                      </div>
                    </div>

                    {/* Tags de compatibilité */}
                    {tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {tags.slice(0, 4).map(({ tag, match }) => (
                          <span
                            key={tag}
                            className={`inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full transition-all ${
                              match
                                ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                                : "bg-gray-700/50 text-gray-500"
                            }`}
                          >
                            <Smartphone size={8} className={match ? "text-purple-400" : ""} />
                            {tag}
                          </span>
                        ))}
                        {tags.length > 4 && (
                          <span className="text-[9px] text-gray-600 font-bold px-1 py-0.5">
                            +{tags.length - 4}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-1.5 shrink-0">
                    {isAdmin ? (
                      <>
                        <button onClick={() => { setRestockProduct(p); setRestockQty("10"); }}
                          className="p-2 bg-gray-800 hover:bg-green-600/20 rounded-xl text-gray-400 hover:text-green-400 transition-colors cursor-pointer"
                          title="Réapprovisionner">
                          <PackagePlus size={13} />
                        </button>
                        <button onClick={() => setEditingProduct(p)}
                          className="p-2 bg-gray-800 hover:bg-blue-600/20 rounded-xl text-gray-400 hover:text-blue-400 transition-colors cursor-pointer"
                          title="Modifier">
                          <Edit2 size={13} />
                        </button>
                        <button onClick={() => setConfirmDelete(p.id)}
                          className="p-2 bg-gray-800 hover:bg-red-900/30 rounded-xl text-gray-500 hover:text-red-400 transition-colors cursor-pointer"
                          title="Supprimer">
                          <Trash2 size={13} />
                        </button>
                      </>
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
                </Motion.div>
              );
            })}
          </AnimatePresence>
        ) : (
          <div className="h-40 flex flex-col items-center justify-center text-gray-600 space-y-2">
            {selectedCategory && !searchTerm ? (
              <>
                <Package size={36} className="opacity-20" />
                <p className="text-sm italic">Aucun produit dans cette catégorie</p>
                <button
                  onClick={() => setSelectedCategory(null)}
                  className="flex items-center gap-1 text-[11px] text-blue-400 hover:underline cursor-pointer"
                >
                  <RefreshCw size={11} /> Voir tous les produits
                </button>
              </>
            ) : searchMode === "compat" && searchTerm ? (
              <>
                <Smartphone size={36} className="opacity-20" />
                <p className="text-sm italic">Aucun produit compatible avec</p>
                <p className="text-xs font-bold text-purple-400">"{searchTerm}"</p>
              </>
            ) : (
              <>
                <Package size={36} className="opacity-20" />
                <p className="text-sm italic">Aucun produit trouvé</p>
              </>
            )}
          </div>
        )}
      </div>
      {/* ── Toast accès refusé ─────────────────────────────────────────── */}
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