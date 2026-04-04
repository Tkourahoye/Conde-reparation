import React from "react";
import { X, CheckCircle2, AlertCircle, Info, Bell, Trash2 } from "lucide-react";
import { motion as Motion, AnimatePresence } from "motion/react";
import { Button } from "./ui";

interface Notification {
  id: string;
  type: 'success' | 'alert' | 'info';
  message: string;
  time: string;
  read: boolean;
}

export const NotificationsModal = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => {
  const [notifications, setNotifications] = React.useState<Notification[]>([
    { id: "1", type: "alert", message: "Stock faible: Écran iPhone 13 (2 restants)", time: "10:45", read: false },
    { id: "2", type: "success", message: "Client Marie Curie ajouté avec succès", time: "Hier", read: true },
    { id: "3", type: "info", message: "Nouvelle mise à jour système disponible", time: "Hier", read: true },
    { id: "4", type: "alert", message: "Transaction #452 échouée - Solde insuffisant", time: "Lundi", read: true },
  ]);

  const markAllRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle2 size={16} className="text-green-400" />;
      case 'alert': return <AlertCircle size={16} className="text-red-400" />;
      default: return <Info size={16} className="text-blue-400" />;
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <Motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="w-[400px] h-[300px] bg-[#0c111a] border border-gray-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <header className="p-4 border-b border-gray-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Bell size={18} className="text-blue-500" />
                <h2 className="font-bold text-white tracking-tight">Notifications</h2>
              </div>
              <button onClick={onClose} className="p-1 hover:bg-gray-800 rounded-full transition-colors cursor-pointer">
                <X size={18} className="text-gray-400" />
              </button>
            </header>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
              {notifications.length > 0 ? (
                notifications.map((n) => (
                  <div 
                    key={n.id} 
                    className={`p-3 rounded-lg border transition-all ${n.read ? 'bg-gray-800/30 border-gray-800/50' : 'bg-blue-900/10 border-blue-500/30 shadow-lg shadow-blue-900/5'}`}
                  >
                    <div className="flex gap-3">
                      <div className="shrink-0 mt-0.5">
                        {getIcon(n.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start gap-2">
                          <p className={`text-xs leading-relaxed ${n.read ? 'text-gray-400' : 'text-gray-200 font-medium'}`}>
                            {n.message}
                          </p>
                          <span className="text-[10px] text-gray-500 shrink-0">{n.time}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-gray-600 space-y-2 opacity-50">
                  <Trash2 size={32} />
                  <p className="text-sm italic">Aucune notification</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <footer className="p-3 border-t border-gray-800 flex gap-2 shrink-0">
              <button 
                onClick={markAllRead}
                className="flex-1 py-2 text-[11px] font-bold text-gray-400 hover:text-white transition-colors"
              >
                Tout marquer comme lu
              </button>
              <button 
                onClick={onClose}
                className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[11px] font-bold transition-all"
              >
                Fermer
              </button>
            </footer>
          </Motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
