import React from "react";
import { motion as Motion, AnimatePresence } from "motion/react";
import { X, Trophy, TrendingDown, Package, ShoppingCart, DollarSign } from "lucide-react";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { formatCurrency } from "../utils/format";

interface ProductStatsProps {
  isOpen: boolean;
  onClose: () => void;
  type: "best" | "worst";
  product: {
    name: string;
    alias: string;
    quantity: number;
    sales: number;
    image: string;
  };
}

export const ProductInfoModal = ({ isOpen, onClose, type, product }: ProductStatsProps) => {
  if (!isOpen) return null;

  const isBest = type === "best";

  return (
    <AnimatePresence>
      <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <Motion.div 
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="bg-[#0f172a] border border-gray-800 rounded-2xl w-full max-w-xs shadow-2xl overflow-hidden"
        >
          <div className="flex items-center justify-between p-4 border-b border-gray-800">
            <div className="flex items-center gap-2">
              <div className={`p-2 rounded-lg ${isBest ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                {isBest ? <Trophy size={18} className="text-green-400" /> : <TrendingDown size={18} className="text-red-400" />}
              </div>
              <h3 className="font-bold text-white text-sm">
                {isBest ? "Plus vendu" : "Moins vendu"}
              </h3>
            </div>
            <button 
              onClick={onClose}
              className="p-1 hover:bg-gray-800 rounded-full transition-colors text-gray-400 hover:text-white cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>

          <div className="p-5 flex flex-col items-center text-center">
            <div className="w-24 h-24 rounded-2xl bg-gray-900 border border-gray-800 overflow-hidden mb-4 relative shadow-inner">
              <ImageWithFallback src={product.image} alt={product.name} className="w-full h-full object-cover" />
            </div>
            
            <h4 className="text-lg font-black text-white leading-tight">{product.name}</h4>
            <p className="text-xs text-blue-400 font-bold mb-4">{product.alias}</p>

            <div className="grid grid-cols-2 gap-3 w-full">
              <div className="bg-gray-800/40 p-3 rounded-xl border border-gray-700/50">
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <ShoppingCart size={12} className="text-gray-500" />
                  <span className="text-[10px] text-gray-500 font-bold uppercase">Unités</span>
                </div>
                <div className="text-xl font-black text-white">{product.quantity}</div>
              </div>
              <div className="bg-gray-800/40 p-3 rounded-xl border border-gray-700/50">
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <DollarSign size={12} className="text-gray-500" />
                  <span className="text-[10px] text-gray-500 font-bold uppercase">Chiffre</span>
                </div>
                <div className="text-sm font-black text-blue-400">{formatCurrency(product.sales)}</div>
              </div>
            </div>

            <button 
              onClick={onClose}
              className={`w-full mt-6 py-2.5 rounded-xl text-xs font-bold transition-all shadow-lg ${
                isBest ? 'bg-green-600 hover:bg-green-500 shadow-green-900/20' : 'bg-red-600 hover:bg-red-500 shadow-red-900/20'
              } text-white`}
            >
              Fermer
            </button>
          </div>
        </Motion.div>
      </div>
    </AnimatePresence>
  );
};