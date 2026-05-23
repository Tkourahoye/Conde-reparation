import React from "react";
import { motion as Motion, AnimatePresence } from "motion/react";
import { MainMenu } from "./components/MainMenu";
import { AddProductView } from "./components/AddProductView";
import { ClientsView } from "./components/ClientsView";
import { TransactionsView } from "./components/TransactionsView";
import { NotificationsModal } from "./components/NotificationsModal";
import { StatsModal } from "./components/StatsModal";
import { ProductInfoModal } from "./components/ProductInfoModal";
import { AllProductsView } from "./components/AllProductsView";
import { RepairsView } from "./components/RepairsView";
import { DebtsView } from "./components/DebtsView";
import { LoginView } from "./components/LoginView";
import { HistoryView } from "./components/HistoryView";
import { SettingsView } from "./components/SettingsView";
import { Bell, BarChart3, Trophy, TrendingDown, LogOut } from "lucide-react";
import { api, bootstrapFromServer } from "./utils/api";
import { formatCurrency } from "./utils/format";

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
  image: string;
}

interface ProductInfo {
  name: string;
  alias: string;
  quantity: number;
  sales: number;
  image: string;
}

const DEFAULT_IMAGE = "https://images.unsplash.com/photo-1556656793-062ff98782ee?q=80&w=200&auto=format&fit=crop";

const EMPTY_PRODUCT_INFO: ProductInfo = {
  name: "Aucune donnée",
  alias: "Ajoutez des transactions pour voir les stats",
  quantity: 0,
  sales: 0,
  image: DEFAULT_IMAGE,
};

export default function App() {
  const [currentView, setCurrentView] = React.useState("menu");
  const [currentUser, setCurrentUser] = React.useState<any>(null);
  const [isNotificationsOpen, setIsNotificationsOpen] = React.useState(false);
  const [isStatsOpen, setIsStatsOpen] = React.useState(false);
  const [isBestProductOpen, setIsBestProductOpen] = React.useState(false);
  const [isWorstProductOpen, setIsWorstProductOpen] = React.useState(false);

  const [allTransactions, setAllTransactions] = React.useState<Transaction[]>([]);
  const [allProducts, setAllProducts] = React.useState<Product[]>([]);
  const [notification, setNotification] = React.useState("Chargement…");
  const [connectionStatus, setConnectionStatus] = React.useState<'ok' | 'syncing' | 'error'>('ok');

  // ── Thème ───────────────────────────────────────────────────────────────
  const [appTheme, setAppTheme] = React.useState<'dark' | 'light'>(() => {
    // Charger depuis localStorage au montage pour éviter le flash
    try {
      const settings = localStorage.getItem('conde_settings');
      if (settings) {
        const parsed = JSON.parse(settings);
        return parsed.theme || 'dark';
      }
    } catch {}
    return 'dark';
  });

  const loadAppData = React.useCallback(async () => {
    const [txData, prodData, debtData, repairData] = await Promise.all([
      api.getTransactions(),
      api.getProducts(),
      api.getDebts(),
      api.getRepairs(),
    ]);

    const txs: Transaction[]  = Array.isArray(txData)    ? txData    : [];
    const prods: Product[]    = Array.isArray(prodData)   ? prodData  : [];
    const debts: any[]        = Array.isArray(debtData)   ? debtData  : [];
    const repairs: any[]      = Array.isArray(repairData) ? repairData : [];

    setAllTransactions(txs);
    setAllProducts(prods);

    const activeStandaloneDebts = debts.filter((d: any) => d.status === 'active').length;
    const activeRepairDebts     = repairs.filter((r: any) => r.paiementStatut === 'dette').length;
    const totalActiveDebts      = activeStandaloneDebts + activeRepairDebts;
    const lowStockProds         = prods.filter((p: Product) => p.quantite <= p.seuil).length;

    const notes: string[] = [];
    if (totalActiveDebts > 0) notes.push(`${totalActiveDebts} dette(s) active(s)`);
    if (lowStockProds > 0)    notes.push(`${lowStockProds} produit(s) stock faible`);

    setNotification(notes.length > 0
      ? `⚠  ${notes.join('  ·  ')}`
      : "Système prêt  ·  Conde Réparation");

    return { prods, txs };
  }, []);

  React.useEffect(() => {
    // Check if user is logged in
    const user = api.getCurrentUser();
    setCurrentUser(user);

    setConnectionStatus('ok');
    loadAppData();

    setConnectionStatus('syncing');
    bootstrapFromServer().then(({ ok }) => {
      if (ok) {
        loadAppData().then(() => setConnectionStatus('ok'));
      } else {
        setConnectionStatus('ok');
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleBack = React.useCallback(() => {
    setCurrentView("menu");
    loadAppData();
  }, [loadAppData]);

  const handleLogin = React.useCallback((user: any) => {
    setCurrentUser(user);
    setCurrentView("menu");
    loadAppData();
  }, [loadAppData]);

  const handleLogout = React.useCallback(async () => {
    if (!confirm("Êtes-vous sûr de vouloir vous déconnecter ?")) return;

    await api.logAction({
      type: "déconnexion",
      description: `${currentUser?.nom} s'est déconnecté`,
      userId: currentUser?.id,
      userName: currentUser?.nom,
    });

    api.logout();
    setCurrentUser(null);
    setCurrentView("login");
  }, [currentUser]);

  // ── Changer le thème ─────────────────────────────────────────────────────
  const handleThemeChange = React.useCallback(async (newTheme: 'dark' | 'light') => {
    setAppTheme(newTheme);
    const newSettings = { theme: newTheme };
    await api.saveSettings(newSettings);
  }, []);

  // ── Mémoïsations (avant tout return conditionnel) ────────────────────
  const salesByProduct = React.useMemo(() => {
    const map: Record<string, { name: string; quantity: number; revenue: number }> = {};
    allTransactions
      .filter(t => t.type === 'Vente')
      .forEach(t => {
        const key = t.produit || "Inconnu";
        if (!map[key]) map[key] = { name: key, quantity: 0, revenue: 0 };
        map[key].quantity += (t.quantite || 1);
        map[key].revenue  += (t.montant || 0);
      });
    return Object.values(map);
  }, [allTransactions]);

  const bestProduct = React.useMemo((): ProductInfo => {
    if (salesByProduct.length === 0) return EMPTY_PRODUCT_INFO;
    const best = salesByProduct.reduce((a, b) => a.quantity > b.quantity ? a : b);
    const prod = allProducts.find(p => p.nom === best.name);
    return {
      name: best.name,
      alias: `${best.quantity} vente(s) · ${formatCurrency(best.revenue)}`,
      quantity: best.quantity,
      sales: best.revenue,
      image: prod?.image || DEFAULT_IMAGE,
    };
  }, [salesByProduct, allProducts]);

  const worstProduct = React.useMemo((): ProductInfo => {
    if (salesByProduct.length < 2) return EMPTY_PRODUCT_INFO;
    const worst = salesByProduct.reduce((a, b) => a.quantity < b.quantity ? a : b);
    const prod  = allProducts.find(p => p.nom === worst.name);
    return {
      name: worst.name,
      alias: `${worst.quantity} vente(s) · ${formatCurrency(worst.revenue)}`,
      quantity: worst.quantity,
      sales: worst.revenue,
      image: prod?.image || DEFAULT_IMAGE,
    };
  }, [salesByProduct, allProducts]);

  // If not logged in, show login screen
  if (!currentUser) {
    return (
      <div className="bg-[#05070a] min-h-dvh flex sm:items-center sm:justify-center font-sans text-gray-100">
        <div className="w-full sm:max-w-[430px] min-h-dvh sm:min-h-0 sm:h-[844px] bg-[#0c111a] sm:rounded-[2.5rem] sm:border sm:border-gray-800/80 sm:shadow-2xl overflow-hidden flex flex-col relative">
          <header className="pt-5 pb-2 px-4 sm:px-6 shrink-0 relative flex flex-col items-center">
            <div className="text-center">
              <Motion.h1 layoutId="title" className="text-2xl font-black tracking-tight text-white">
                Conde <span className="text-blue-500">Réparation</span>
              </Motion.h1>
              <div className="h-0.5 w-12 bg-blue-600 mx-auto mt-1 rounded-full opacity-50" />
            </div>
          </header>
          <main className="flex-1 px-4 sm:px-8 pb-3 overflow-hidden min-h-0">
            <LoginView onLogin={handleLogin} />
          </main>
        </div>
      </div>
    );
  }

  return (
    /* Fond plein écran, centré sur desktop */
    <div className={`min-h-dvh flex sm:items-center sm:justify-center font-sans transition-colors ${
      appTheme === 'dark' ? 'bg-[#05070a] text-gray-100' : 'bg-gray-100 text-gray-900'
    }`}>
      {/* Conteneur principal : plein écran sur mobile, cadre téléphone sur desktop */}
      <div className={`w-full sm:max-w-[430px] min-h-dvh sm:min-h-0 sm:h-[844px] sm:rounded-[2.5rem] sm:border sm:shadow-2xl overflow-hidden flex flex-col relative transition-colors ${
        appTheme === 'dark'
          ? 'bg-[#0c111a] sm:border-gray-800/80'
          : 'bg-white sm:border-gray-300'
      }`}>

        {/* ── Modals ─────────────────────────────────────────── */}
        <NotificationsModal isOpen={isNotificationsOpen} onClose={() => setIsNotificationsOpen(false)} />
        <StatsModal
          isOpen={isStatsOpen}
          onClose={() => setIsStatsOpen(false)}
          transactions={allTransactions}
          products={allProducts}
        />
        <ProductInfoModal
          isOpen={isBestProductOpen}
          onClose={() => setIsBestProductOpen(false)}
          type="best"
          product={bestProduct}
        />
        <ProductInfoModal
          isOpen={isWorstProductOpen}
          onClose={() => setIsWorstProductOpen(false)}
          type="worst"
          product={worstProduct}
        />

        {/* ── En-tête ─────────────────────────────────────────── */}
        <header className="pt-5 pb-2 px-4 sm:px-6 shrink-0 relative flex flex-col items-center">
          <div className="w-full flex justify-between items-center mb-3">
            {/* Icônes de raccourcis */}
            <div className="flex-1 max-w-[60%] relative group overflow-hidden">
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide snap-x pr-8">
                <button
                  onClick={() => setIsBestProductOpen(true)}
                  className={`p-2.5 hover:bg-yellow-500/10 border hover:border-yellow-500/30 rounded-xl transition-all group/btn cursor-pointer shadow-lg snap-start shrink-0 ${
                    appTheme === 'dark' ? 'bg-gray-800/40 border-gray-700/50' : 'bg-gray-100 border-gray-300'
                  }`}
                  title="Produit le plus vendu"
                >
                  <Trophy size={17} className={`group-hover/btn:text-yellow-400 transition-all group-hover/btn:scale-110 ${
                    appTheme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                  }`} />
                </button>
                <button
                  onClick={() => setIsWorstProductOpen(true)}
                  className={`p-2.5 hover:bg-red-500/10 border hover:border-red-500/30 rounded-xl transition-all group/btn cursor-pointer shadow-lg snap-start shrink-0 ${
                    appTheme === 'dark' ? 'bg-gray-800/40 border-gray-700/50' : 'bg-gray-100 border-gray-300'
                  }`}
                  title="Produit le moins vendu"
                >
                  <TrendingDown size={17} className={`group-hover/btn:text-red-400 transition-all group-hover/btn:scale-110 ${
                    appTheme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                  }`} />
                </button>
                <button
                  onClick={() => setIsStatsOpen(true)}
                  className={`p-2.5 hover:bg-green-500/10 border hover:border-green-500/30 rounded-xl transition-all group/btn cursor-pointer shadow-lg snap-start shrink-0 ${
                    appTheme === 'dark' ? 'bg-gray-800/40 border-gray-700/50' : 'bg-gray-100 border-gray-300'
                  }`}
                  title="Statistiques"
                >
                  <BarChart3 size={17} className={`group-hover/btn:text-green-400 transition-all group-hover/btn:scale-110 ${
                    appTheme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                  }`} />
                </button>
              </div>
              <div className={`absolute right-0 top-0 bottom-1 w-8 bg-gradient-to-l to-transparent pointer-events-none ${
                appTheme === 'dark' ? 'from-[#0c111a]' : 'from-white'
              }`} />
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsNotificationsOpen(true)}
                className={`p-2.5 rounded-xl transition-colors group cursor-pointer ${
                  appTheme === 'dark' ? 'hover:bg-gray-800' : 'hover:bg-gray-100'
                }`}
                title="Notifications"
              >
                <div className="relative">
                  <Bell size={19} className={`group-hover:text-blue-400 transition-colors ${
                    appTheme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                  }`} />
                  <div className={`absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 border-2 rounded-full ${
                    appTheme === 'dark' ? 'border-[#0c111a]' : 'border-white'
                  }`} />
                </div>
              </button>

              <button
                onClick={handleLogout}
                className="p-2.5 hover:bg-red-500/10 rounded-xl transition-colors group cursor-pointer"
                title={`Déconnexion (${currentUser?.nom})`}
              >
                <LogOut size={19} className={`group-hover:text-red-400 transition-colors ${
                  appTheme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                }`} />
              </button>
            </div>
          </div>

          <div className="text-center">
            <Motion.h1 layoutId="title" className={`text-2xl font-black tracking-tight ${
              appTheme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>
              Conde <span className="text-blue-500">Réparation</span>
            </Motion.h1>
            <div className="h-0.5 w-12 bg-blue-600 mx-auto mt-1 rounded-full opacity-50" />
            <p className={`text-[10px] mt-1 ${
              appTheme === 'dark' ? 'text-gray-500' : 'text-gray-600'
            }`}>
              {currentUser?.nom} • {currentUser?.role === 'admin' ? 'Administrateur' : 'Utilisateur'}
            </p>
          </div>
        </header>

        {/* ── Contenu principal ───────────────────────────────── */}
        <main className="flex-1 px-4 sm:px-8 pb-3 overflow-hidden min-h-0">
          <AnimatePresence mode="wait">
            {currentView === "menu" ? (
              <MainMenu key="menu" onNavigate={setCurrentView} />
            ) : currentView === "all_products" ? (
              <AllProductsView key="all_products" onBack={handleBack} onAdd={() => setCurrentView("produits")} />
            ) : currentView === "depot" ? (
              <RepairsView key="depot" onBack={handleBack} />
            ) : currentView === "dettes" ? (
              <DebtsView key="dettes" onBack={handleBack} />
            ) : currentView === "produits" ? (
              <AddProductView key="produits" onBack={handleBack} />
            ) : currentView === "clients" ? (
              <ClientsView key="clients" onBack={handleBack} />
            ) : currentView === "transactions" ? (
              <TransactionsView key="transactions" onBack={handleBack} />
            ) : currentView === "login" ? (
              <LoginView key="login" onBack={handleBack} />
            ) : currentView === "history" ? (
              <HistoryView key="history" onBack={handleBack} />
            ) : currentView === "settings" ? (
              <SettingsView
                key="settings"
                onBack={handleBack}
                currentUser={currentUser}
                appTheme={appTheme}
                onThemeChange={handleThemeChange}
              />
            ) : (
              <Motion.div
                key="other"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center h-full text-gray-500 italic"
              >
                <p>Module en cours de développement...</p>
                <button
                  onClick={handleBack}
                  className="mt-4 text-blue-400 hover:underline text-sm not-italic cursor-pointer"
                >
                  Retour au menu
                </button>
              </Motion.div>
            )}
          </AnimatePresence>
        </main>

        {/* ── Pied de page / notification ─────────────────────── */}
        <footer className="h-10 bg-[#080c14] border-t border-gray-800/50 px-4 flex items-center shrink-0">
          <div className="flex items-center gap-2 w-full">
            <div
              className={`w-1.5 h-1.5 rounded-full shrink-0 animate-pulse ${
                connectionStatus === 'syncing'
                  ? 'bg-yellow-500'
                  : notification.startsWith('⚠')
                  ? 'bg-amber-500'
                  : 'bg-blue-500'
              }`}
            />
            <p className={`text-[10px] font-medium truncate uppercase tracking-tight ${
              connectionStatus === 'syncing'
                ? 'text-yellow-400/70'
                : notification.startsWith('⚠')
                ? 'text-amber-400'
                : 'text-gray-400'
            }`}>
              {connectionStatus === 'syncing'
                ? `${notification}  ·  sync serveur…`
                : notification}
            </p>
          </div>
        </footer>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1f2937; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #3b82f6; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        select {
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236b7280' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 0.75rem center;
          background-size: 1rem;
          padding-right: 2.5rem;
        }
      `}</style>
    </div>
  );
}