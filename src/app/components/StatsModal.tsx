import React from "react";
import { motion as Motion, AnimatePresence } from "motion/react";
import { X, TrendingUp, TrendingDown, BarChart3, ShoppingCart, DollarSign } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from "recharts";
import { formatCurrency } from "../utils/format";

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
  quantite: number;
  seuil: number;
  prix: number;
}

interface StatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactions?: Transaction[];
  products?: Product[];
}

function getLast7DaysStats(transactions: Transaction[]) {
  const days = [];
  const dayNames = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    const dayName = dayNames[date.getDay()];
    const sales = transactions
      .filter(t => t.type === 'Vente' && t.date === dateStr)
      .reduce((sum, t) => sum + (t.montant || 0), 0);
    days.push({ name: dayName, sales, date: dateStr });
  }
  return days;
}

export const StatsModal = ({ isOpen, onClose, transactions = [], products = [] }: StatsModalProps) => {
  const weeklyData = React.useMemo(() => getLast7DaysStats(transactions), [transactions]);

  const totalThisWeek = weeklyData.reduce((sum, d) => sum + d.sales, 0);

  // Total all-time sales
  const totalAllTime = transactions
    .filter(t => t.type === 'Vente')
    .reduce((sum, t) => sum + (t.montant || 0), 0);

  const totalPayments = transactions
    .filter(t => t.type === 'Paiement')
    .reduce((sum, t) => sum + (t.montant || 0), 0);

  // Total transactions count
  const ventesCount = transactions.filter(t => t.type === 'Vente').length;

  // Best product by revenue
  const salesMap: Record<string, { quantity: number; revenue: number }> = {};
  transactions.filter(t => t.type === 'Vente').forEach(t => {
    const key = t.produit || 'Inconnu';
    if (!salesMap[key]) salesMap[key] = { quantity: 0, revenue: 0 };
    salesMap[key].quantity += (t.quantite || 1);
    salesMap[key].revenue += (t.montant || 0);
  });
  const salesEntries = Object.entries(salesMap);
  const bestProductEntry = salesEntries.length > 0
    ? salesEntries.reduce((a, b) => a[1].quantity > b[1].quantity ? a : b)
    : null;

  // Low stock count
  const lowStockCount = products.filter(p => p.quantite <= p.seuil).length;

  // Compare this week to previous week
  const todayStr = new Date().toISOString().split('T')[0];
  const prevWeekStart = new Date();
  prevWeekStart.setDate(prevWeekStart.getDate() - 13);
  const prevWeekEnd = new Date();
  prevWeekEnd.setDate(prevWeekEnd.getDate() - 7);

  const totalPrevWeek = transactions
    .filter(t => {
      if (t.type !== 'Vente') return false;
      return t.date >= prevWeekStart.toISOString().split('T')[0] &&
             t.date <= prevWeekEnd.toISOString().split('T')[0];
    })
    .reduce((sum, t) => sum + (t.montant || 0), 0);

  const growth = totalPrevWeek > 0
    ? Math.round(((totalThisWeek - totalPrevWeek) / totalPrevWeek) * 100)
    : totalThisWeek > 0 ? 100 : 0;

  const maxSale = Math.max(...weeklyData.map(d => d.sales), 1);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <Motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="bg-[#0f172a] border border-gray-800 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden"
        >
          <div className="flex items-center justify-between p-4 border-b border-gray-800">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <BarChart3 size={18} className="text-green-400" />
              </div>
              <h3 className="font-bold text-white">Statistiques</h3>
            </div>
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-800 rounded-full transition-colors text-gray-400 hover:text-white cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>

          <div className="p-4 space-y-4">
            {/* KPI Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-800/40 p-3 rounded-xl border border-gray-700/50">
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">Ventes (7j)</p>
                <div className="text-base font-black text-white leading-tight">{formatCurrency(totalThisWeek)}</div>
              </div>
              <div className="bg-gray-800/40 p-3 rounded-xl border border-gray-700/50">
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">Croissance</p>
                <div className="flex items-center gap-1">
                  {growth >= 0
                    ? <TrendingUp size={14} className="text-green-400 shrink-0" />
                    : <TrendingDown size={14} className="text-red-400 shrink-0" />
                  }
                  <span className={`text-base font-black ${growth >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {growth >= 0 ? '+' : ''}{growth}%
                  </span>
                </div>
              </div>
              <div className="bg-gray-800/40 p-3 rounded-xl border border-gray-700/50">
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">Total Ventes</p>
                <div className="flex items-center gap-1">
                  <ShoppingCart size={14} className="text-blue-400 shrink-0" />
                  <span className="text-base font-black text-blue-400">{ventesCount}</span>
                  <span className="text-[10px] text-gray-500">transactions</span>
                </div>
              </div>
              <div className="bg-gray-800/40 p-3 rounded-xl border border-gray-700/50">
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">Recouvrements</p>
                <div className="flex items-center gap-1">
                  <DollarSign size={14} className="text-purple-400 shrink-0" />
                  <span className="text-xs font-black text-purple-400 truncate">{formatCurrency(totalPayments)}</span>
                </div>
              </div>
            </div>

            {/* Best Product */}
            {bestProductEntry && (
              <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-3 flex items-center justify-between">
                <div>
                  <p className="text-[9px] font-black text-yellow-500/80 uppercase tracking-widest">⭐ Meilleure vente</p>
                  <p className="text-sm font-bold text-white truncate max-w-[140px]">{bestProductEntry[0]}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-black text-yellow-400">{bestProductEntry[1].quantity} vendu(s)</p>
                  <p className="text-[10px] text-gray-500">{formatCurrency(bestProductEntry[1].revenue)}</p>
                </div>
              </div>
            )}

            {/* Chart */}
            <div>
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-2">Ventes — 7 derniers jours</p>
              {ventesCount === 0 ? (
                <div className="h-28 flex flex-col items-center justify-center text-gray-600 text-xs italic">
                  <BarChart3 size={28} className="mb-2 opacity-20" />
                  Aucune vente enregistrée
                </div>
              ) : (
                <div className="h-28 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={weeklyData} barCategoryGap="30%">
                      <XAxis
                        dataKey="name"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#64748b', fontSize: 9 }}
                      />
                      <Tooltip
                        cursor={{ fill: 'rgba(59, 130, 246, 0.08)' }}
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="bg-[#1e293b] border border-gray-700 px-3 py-2 rounded-lg shadow-xl">
                                <p className="text-[10px] text-gray-400 font-bold uppercase">{payload[0].payload.name}</p>
                                <p className="text-sm font-black text-blue-400">{formatCurrency(Number(payload[0].value))}</p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar dataKey="sales" radius={[4, 4, 0, 0]}>
                        {weeklyData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={entry.sales === maxSale && entry.sales > 0 ? '#3b82f6' : '#1e293b'}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Low stock warning */}
            {lowStockCount > 0 && (
              <div className="bg-red-500/5 border border-red-500/20 rounded-lg px-3 py-2 flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shrink-0" />
                <p className="text-[10px] text-red-400 font-bold">
                  {lowStockCount} produit(s) en dessous du seuil de stock
                </p>
              </div>
            )}

            <button
              onClick={onClose}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-blue-900/20 cursor-pointer"
            >
              Fermer
            </button>
          </div>
        </Motion.div>
      </div>
    </AnimatePresence>
  );
};
