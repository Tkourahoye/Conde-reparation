import React from "react";
import { Package, Users, ReceiptText, LayoutGrid, Smartphone, Wallet, PlusSquare, History, Settings } from "lucide-react";
import { motion as Motion } from "motion/react";

interface MenuButtonProps {
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  sub?: string;
  color?: "blue" | "gray" | "red" | "green" | "orange";
  full?: boolean;
}

const MenuButton = ({ onClick, icon, label, sub, color = "gray", full = false }: MenuButtonProps) => {
  const colorMap = {
    blue:   "bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/20 shadow-lg",
    gray:   "bg-gray-800/70 hover:bg-gray-700 text-white border border-gray-700/60",
    red:    "bg-red-500/10 hover:bg-red-600 text-red-400 hover:text-white border border-red-500/20 hover:border-red-600",
    green:  "bg-green-500/10 hover:bg-green-600 text-green-400 hover:text-white border border-green-500/20 hover:border-green-600",
    orange: "bg-orange-500/10 hover:bg-orange-500 text-orange-400 hover:text-white border border-orange-500/20 hover:border-orange-500",
  };

  return (
    <Motion.button
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className={`
        ${full ? "col-span-2" : ""}
        ${colorMap[color]}
        w-full py-4 px-5 rounded-2xl font-semibold transition-all duration-200
        flex items-center gap-3 cursor-pointer select-none active:scale-95
      `}
    >
      <span className="shrink-0">{icon}</span>
      <span className="flex flex-col items-start min-w-0">
        <span className="text-sm font-bold leading-tight">{label}</span>
        {sub && <span className="text-[10px] font-normal opacity-60 leading-tight mt-0.5">{sub}</span>}
      </span>
    </Motion.button>
  );
};

export const MainMenu = ({ onNavigate }: { onNavigate: (view: string) => void }) => (
  <Motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -10 }}
    className="flex flex-col gap-3 w-full mt-3 pb-2"
  >
    {/* Inventaire — bouton principal pleine largeur */}
    <MenuButton
      onClick={() => onNavigate("all_products")}
      icon={<LayoutGrid size={22} />}
      label="Inventaire Complet"
      sub="Voir et gérer tous les produits"
      color="blue"
      full
    />

    {/* Dépôts Réparations — pleine largeur */}
    <MenuButton
      onClick={() => onNavigate("depot")}
      icon={<Smartphone size={22} />}
      label="Téléphones en Dépôt"
      sub="Réparations & statuts"
      color="orange"
      full
    />

    {/* Grille 2x2 */}
    <div className="grid grid-cols-2 gap-3">
      <MenuButton
        onClick={() => onNavigate("clients")}
        icon={<Users size={20} />}
        label="Clients"
        sub="Carnet & dettes"
        color="gray"
      />
      <MenuButton
        onClick={() => onNavigate("transactions")}
        icon={<ReceiptText size={20} />}
        label="Transactions"
        sub="Ventes & paiements"
        color="gray"
      />
      <MenuButton
        onClick={() => onNavigate("produits")}
        icon={<PlusSquare size={20} />}
        label="Ajouter Produit"
        sub="Nouveau stock"
        color="green"
      />
      <MenuButton
        onClick={() => onNavigate("dettes")}
        icon={<Wallet size={20} />}
        label="Dettes"
        sub="Gérer les impayés"
        color="red"
      />
      <MenuButton
        onClick={() => onNavigate("history")}
        icon={<History size={20} />}
        label="Historique"
        sub="Actions & logs"
        color="gray"
      />
      <MenuButton
        onClick={() => onNavigate("settings")}
        icon={<Settings size={20} />}
        label="Paramètres"
        sub="Configuration"
        color="gray"
      />
    </div>
  </Motion.div>
);