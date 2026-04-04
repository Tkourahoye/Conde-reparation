import React from "react";
import { ChevronLeft, Plus, Image as ImageIcon, Link, Upload, X, ChevronDown, Check } from "lucide-react";
import { motion as Motion, AnimatePresence } from "motion/react";
import { Button, Input } from "./ui";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { formatCurrency } from "../utils/format";
import { api } from "../utils/api";

interface Product {
  id: string;
  nom: string;
  alias: string;
  quantite: number;
  seuil: number;
  prix: number;
  dimensions: string;
  compatibilite: string;
  image: string;
  categorieId?: string;
  categorieNom?: string;
  categorieCouleur?: string;
}

interface Category {
  id: string;
  nom: string;
  couleur: string;
}

// ── Sélecteur de catégorie avec point de couleur ───────────────────────────
function CategorySelect({
  categories,
  value,
  onChange,
}: {
  categories: Category[];
  value: string;
  onChange: (id: string) => void;
}) {
  const [isOpen, setIsOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const selected = categories.find((c) => c.id === value);

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  return (
    <div className="col-span-2 relative" ref={dropdownRef}>
      <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1">
        Catégorie <span className="text-red-400">*</span>
      </label>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center gap-2 bg-gray-800/50 border rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none transition-all cursor-pointer ${
          isOpen
            ? "border-blue-500 ring-2 ring-blue-500/20"
            : "border-gray-700 hover:border-gray-600"
        }`}
      >
        {selected ? (
          <>
            <span
              className="w-3 h-3 rounded-full shrink-0 ring-1 ring-white/10"
              style={{ backgroundColor: selected.couleur }}
            />
            <span className="font-medium">{selected.nom}</span>
          </>
        ) : (
          <span className="text-gray-500">Sélectionner une catégorie…</span>
        )}
        <ChevronDown
          size={14}
          className={`ml-auto text-gray-500 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <Motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.12 }}
            className="absolute z-50 top-full left-0 right-0 mt-1 bg-[#0d1421] border border-gray-700/80 rounded-xl shadow-2xl overflow-hidden"
          >
            {categories.length === 0 ? (
              <p className="px-3 py-3 text-xs text-gray-500 italic">Aucune catégorie disponible</p>
            ) : (
              categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    onChange(cat.id);
                    setIsOpen(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-white hover:bg-gray-800/60 transition-colors cursor-pointer"
                >
                  <span
                    className="w-3 h-3 rounded-full shrink-0 ring-1 ring-white/10"
                    style={{ backgroundColor: cat.couleur }}
                  />
                  <span className="flex-1 text-left font-medium">{cat.nom}</span>
                  {value === cat.id && (
                    <Check size={13} className="text-blue-400 shrink-0" />
                  )}
                </button>
              ))
            )}
          </Motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Sélecteur d'image : URL ou fichier local ───────────────────────────────
function ImagePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (base64OrUrl: string) => void;
}) {
  const [mode, setMode] = React.useState<"url" | "local">("local");
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

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const handleUrlConfirm = () => {
    if (urlInput.trim()) {
      onChange(urlInput.trim());
      setUrlInput("");
    }
  };

  return (
    <div className="col-span-2 space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Image</label>
        <div className="flex bg-gray-900 rounded-lg p-0.5 gap-0.5">
          <button
            type="button"
            onClick={() => setMode("local")}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase transition-all cursor-pointer ${
              mode === "local" ? "bg-blue-600 text-white" : "text-gray-500 hover:text-gray-300"
            }`}
          >
            <Upload size={10} /> Local
          </button>
          <button
            type="button"
            onClick={() => setMode("url")}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase transition-all cursor-pointer ${
              mode === "url" ? "bg-blue-600 text-white" : "text-gray-500 hover:text-gray-300"
            }`}
          >
            <Link size={10} /> URL
          </button>
        </div>
      </div>

      <div className="flex gap-3 items-start">
        {/* Aperçu */}
        <div className="w-16 h-16 rounded-xl bg-gray-900 border border-gray-700/60 overflow-hidden shrink-0 flex items-center justify-center">
          {value ? (
            <div className="relative w-full h-full group">
              <ImageWithFallback src={value} alt="aperçu" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => onChange("")}
                className="absolute top-0.5 right-0.5 w-4 h-4 bg-black/70 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
              >
                <X size={9} className="text-white" />
              </button>
            </div>
          ) : (
            <ImageIcon size={22} className="text-gray-600" />
          )}
        </div>

        {/* Zone d'action */}
        <div className="flex-1">
          <AnimatePresence mode="wait">
            {mode === "local" ? (
              <Motion.div
                key="local"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileInput}
                />
                <div
                  onClick={() => fileRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  className={`w-full h-16 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-1 cursor-pointer transition-all ${
                    isDragging
                      ? "border-blue-500 bg-blue-500/10 text-blue-400"
                      : "border-gray-700 hover:border-blue-500/50 hover:bg-gray-800/50 text-gray-500"
                  }`}
                >
                  <Upload size={16} />
                  <span className="text-[10px] font-bold uppercase tracking-wide">
                    {isDragging ? "Relâcher..." : "Choisir ou glisser"}
                  </span>
                </div>
              </Motion.div>
            ) : (
              <Motion.div
                key="url"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex gap-2 h-16 items-center"
              >
                <input
                  type="text"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleUrlConfirm(); }}
                  placeholder="https://..."
                  className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-gray-600"
                />
                <button
                  type="button"
                  onClick={handleUrlConfirm}
                  className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition-all cursor-pointer shrink-0"
                >
                  OK
                </button>
              </Motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

// ── Vue principale ────────────────────────────────────────────────────────
export const AddProductView = ({ onBack }: { onBack: () => void }) => {
  const [products, setProducts] = React.useState<Product[]>([]);
  const [categories, setCategories] = React.useState<Category[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  const [successMsg, setSuccessMsg] = React.useState("");

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        const [data, cats] = await Promise.all([
          api.getProducts(),
          api.getCategories(),
        ]);
        setProducts(Array.isArray(data) ? data.slice(0, 5) : []);
        setCategories(Array.isArray(cats) ? cats : []);
      } catch (err) {
        console.error("Failed to fetch data:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const emptyForm = {
    nom: "", alias: "", quantite: "", seuil: "",
    prix: "", dimensions: "", compatibilite: "", image: "",
    categorieId: "",
  };
  const [form, setForm] = React.useState(emptyForm);

  const handleAdd = async () => {
    if (!form.nom) return;
    setIsSaving(true);

    const selectedCat = categories.find((c) => c.id === form.categorieId);
    const currentUser = api.getCurrentUser();

    const newProduct = {
      nom:             form.nom,
      alias:           form.alias,
      quantite:        Number(form.quantite),
      seuil:           Number(form.seuil),
      prix:            Number(form.prix),
      dimensions:      form.dimensions,
      compatibilite:   form.compatibilite,
      image:           form.image || "https://images.unsplash.com/photo-1556656793-062ff98782ee?q=80&w=200&auto=format&fit=crop",
      categorieId:     form.categorieId || "",
      categorieNom:    selectedCat?.nom || "",
      categorieCouleur: selectedCat?.couleur || "",
    };

    try {
      const saved = await api.saveProduct(newProduct);
      setProducts([saved, ...products].slice(0, 5));
      setForm(emptyForm);
      setSuccessMsg(`"${saved.nom}" ajouté au stock !`);
      setTimeout(() => setSuccessMsg(""), 3000);

      // Logger l'action
      await api.logAction({
        type: "produit_ajouté",
        description: `Produit "${saved.nom}" ajouté${selectedCat ? ` · ${selectedCat.nom}` : ""} · stock initial : ${saved.quantite}`,
        userId: currentUser?.id,
        userName: currentUser?.nom,
        metadata: {
          productId: saved.id,
          categorie: selectedCat?.nom || "Non catégorisé",
          stockInitial: saved.quantite,
          prix: saved.prix,
        },
      });
    } catch (err) {
      console.error("Failed to save product:", err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="h-full flex flex-col"
    >
      <div className="flex items-center gap-2 mb-3">
        <button onClick={onBack} className="p-2 hover:bg-gray-800 rounded-full transition-colors cursor-pointer">
          <ChevronLeft size={20} className="text-gray-400" />
        </button>
        <h2 className="text-xl font-bold text-white">Ajouter Produit</h2>
      </div>

      <div className="flex-1 overflow-y-auto pr-1 space-y-4 custom-scrollbar">

        {/* Message de succès */}
        <AnimatePresence>
          {successMsg && (
            <Motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="bg-green-500/10 border border-green-500/30 rounded-xl px-4 py-3 text-xs text-green-400 font-bold flex items-center gap-2"
            >
              ✓ {successMsg}
            </Motion.div>
          )}
        </AnimatePresence>

        {/* Formulaire */}
        <div className="bg-gray-800/30 border border-gray-700/40 rounded-2xl p-4">
          <h3 className="text-xs font-black text-blue-500 uppercase tracking-widest mb-4">
            Informations produit
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Nom"
              placeholder="ex: Écran OLED"
              value={form.nom}
              onChange={(e: any) => setForm({ ...form, nom: e.target.value })}
            />
            <Input
              label="Alias / Réf."
              placeholder="REF-001"
              value={form.alias}
              onChange={(e: any) => setForm({ ...form, alias: e.target.value })}
            />
            <Input
              label="Quantité"
              type="number"
              placeholder="0"
              value={form.quantite}
              onChange={(e: any) => setForm({ ...form, quantite: e.target.value })}
            />
            <Input
              label="Seuil alerte"
              type="number"
              placeholder="5"
              value={form.seuil}
              onChange={(e: any) => setForm({ ...form, seuil: e.target.value })}
            />
            <Input
              label="Prix (FGN)"
              type="number"
              placeholder="0"
              value={form.prix}
              onChange={(e: any) => setForm({ ...form, prix: e.target.value })}
            />
            <Input
              label="Dimensions"
              placeholder="150x70mm"
              value={form.dimensions}
              onChange={(e: any) => setForm({ ...form, dimensions: e.target.value })}
            />

            {/* Sélecteur de catégorie — pleine largeur */}
            <CategorySelect
              categories={categories}
              value={form.categorieId}
              onChange={(id) => setForm({ ...form, categorieId: id })}
            />

            {/* Compatibilité pleine largeur */}
            <div className="col-span-2">
              <Input
                label="Téléphones compatibles"
                placeholder="iPhone 12, Samsung S21, Redmi Note 10..."
                value={form.compatibilite}
                onChange={(e: any) => setForm({ ...form, compatibilite: e.target.value })}
              />
            </div>

            {/* ImagePicker pleine largeur */}
            <ImagePicker
              value={form.image}
              onChange={(v) => setForm({ ...form, image: v })}
            />
          </div>
        </div>

        <Button onClick={handleAdd} disabled={isSaving || !form.nom}>
          {isSaving ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Plus size={18} />
          )}
          {isSaving ? "Enregistrement..." : "Ajouter au stock"}
        </Button>

        {/* Produits récents */}
        <div className="pt-3 border-t border-gray-800">
          <h3 className="text-xs font-bold text-gray-500 uppercase mb-3 tracking-widest">
            Produits récents
          </h3>
          <div className="space-y-2 pb-4">
            {isLoading ? (
              <div className="flex justify-center py-4">
                <div className="w-6 h-6 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
              </div>
            ) : (
              products.map((p) => (
                <div
                  key={p.id}
                  className="bg-gray-800/50 p-3 rounded-xl border border-gray-700/50 flex items-center gap-3"
                >
                  <div className="w-10 h-10 rounded-lg bg-gray-900 overflow-hidden shrink-0 border border-gray-700/50">
                    <ImageWithFallback src={p.image} alt={p.nom} className="w-full h-full object-cover opacity-70" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-sm font-semibold text-white truncate">{p.nom}</span>
                      {p.categorieNom && (
                        <span
                          className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold shrink-0"
                          style={{
                            backgroundColor: `${p.categorieCouleur}20`,
                            color: p.categorieCouleur,
                            border: `1px solid ${p.categorieCouleur}40`,
                          }}
                        >
                          {p.categorieNom}
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-gray-500 truncate">
                      {p.alias}{p.compatibilite ? ` · ${p.compatibilite}` : ""}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-bold text-blue-400">{formatCurrency(p.prix)}</div>
                    <div className={`text-[10px] ${p.quantite <= p.seuil ? "text-red-400" : "text-green-400"}`}>
                      Stock: {p.quantite}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </Motion.div>
  );
};
