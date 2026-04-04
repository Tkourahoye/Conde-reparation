/**
 * api.ts — localStorage-first data layer
 *
 * All reads/writes are instant via localStorage.
 * Fire-and-forget server sync runs in the background; any timeout or
 * network error is silently ignored so the app never blocks.
 */
import { projectId, publicAnonKey } from '/utils/supabase/info';

const BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-e7ee43e7`;

const READ_HEADERS = {
  'Authorization': `Bearer ${publicAnonKey}`,
  'apikey': publicAnonKey,
};
const WRITE_HEADERS = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${publicAnonKey}`,
  'apikey': publicAnonKey,
};

// ── localStorage helpers ───────────────────────────────────────────────────
const K = {
  products:     'conde_products',
  clients:      'conde_clients',
  transactions: 'conde_transactions',
  repairs:      'conde_repairs',
  debts:        'conde_debts',
  actions:      'conde_actions',
  categories:   'conde_categories',
  users:        'conde_users',
  settings:     'conde_settings',
  currentUser:  'conde_current_user',
};

function lsRead<T>(key: string): T[] {
  try { return JSON.parse(localStorage.getItem(key) || '[]') as T[]; }
  catch { return []; }
}
function lsWrite<T>(key: string, list: T[]): void {
  try { localStorage.setItem(key, JSON.stringify(list)); } catch { /* quota */ }
}
function lsUpsert<T extends { id: string }>(key: string, item: T): T {
  const list = lsRead<T>(key);
  const idx = list.findIndex((i: any) => i.id === item.id);
  if (idx >= 0) list[idx] = item; else list.push(item);
  lsWrite(key, list);
  return item;
}
function lsRemove(key: string, id: string): void {
  lsWrite(key, lsRead<any>(key).filter((i: any) => i.id !== id));
}

// ── Background server sync (fire-and-forget, 45 s timeout) ────────────────
async function serverFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 45_000);
  try {
    const res = await fetch(url, { ...init, signal: ctrl.signal });
    clearTimeout(t);
    return res;
  } finally {
    clearTimeout(t);
  }
}
function bgSync(fn: () => Promise<any>): void {
  fn().catch(() => { /* silent — server may be unreachable */ });
}

// ── One-time bootstrap: pull server data into localStorage ─────────────────
let _bootstrapped = false;
export async function bootstrapFromServer(): Promise<{ ok: boolean }> {
  if (_bootstrapped) return { ok: false };
  _bootstrapped = true;
  try {
    const entries: Array<[string, string]> = [
      [K.products, 'products'],
      [K.clients, 'clients'],
      [K.transactions, 'transactions'],
      [K.repairs, 'repairs'],
      [K.debts, 'debts'],
    ];
    const results = await Promise.allSettled(
      entries.map(async ([lsKey, route]) => {
        const res = await serverFetch(`${BASE_URL}/${route}`, { headers: READ_HEADERS });
        if (!res.ok) return;
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) lsWrite(lsKey, data);
      })
    );
    const anyOk = results.some(r => r.status === 'fulfilled');
    return { ok: anyOk };
  } catch {
    return { ok: false };
  }
}

// ── Public API ─────────────────────────────────────────────────────────────
export const api = {
  // --- Products ---
  getProducts: async () => lsRead<any>(K.products),

  saveProduct: async (product: any) => {
    const item = { ...product, id: product.id || crypto.randomUUID() };
    lsUpsert(K.products, item);
    bgSync(() => serverFetch(`${BASE_URL}/products`, {
      method: 'POST', headers: WRITE_HEADERS, body: JSON.stringify(item),
    }));
    return item;
  },

  deleteProduct: async (id: string) => {
    lsRemove(K.products, id);
    bgSync(() => serverFetch(`${BASE_URL}/products/${id}`, { method: 'DELETE', headers: READ_HEADERS }));
    return { success: true };
  },

  // --- Clients ---
  getClients: async () => lsRead<any>(K.clients),

  saveClient: async (client: any) => {
    const item = { ...client, id: client.id || crypto.randomUUID() };
    lsUpsert(K.clients, item);
    bgSync(() => serverFetch(`${BASE_URL}/clients`, {
      method: 'POST', headers: WRITE_HEADERS, body: JSON.stringify(item),
    }));
    return item;
  },

  deleteClient: async (id: string) => {
    lsRemove(K.clients, id);
    bgSync(() => serverFetch(`${BASE_URL}/clients/${id}`, { method: 'DELETE', headers: READ_HEADERS }));
    return { success: true };
  },

  // --- Transactions ---
  getTransactions: async () => lsRead<any>(K.transactions),

  saveTransaction: async (tx: any) => {
    const item = { ...tx, id: tx.id || crypto.randomUUID() };
    lsUpsert(K.transactions, item);
    bgSync(() => serverFetch(`${BASE_URL}/transactions`, {
      method: 'POST', headers: WRITE_HEADERS, body: JSON.stringify(item),
    }));
    return item;
  },

  deleteTransaction: async (id: string) => {
    lsRemove(K.transactions, id);
    bgSync(() => serverFetch(`${BASE_URL}/transactions/${id}`, { method: 'DELETE', headers: READ_HEADERS }));
    return { success: true };
  },

  // --- Repairs ---
  getRepairs: async () => lsRead<any>(K.repairs),

  saveRepair: async (repair: any) => {
    const item = { ...repair, id: repair.id || crypto.randomUUID() };
    lsUpsert(K.repairs, item);
    bgSync(() => serverFetch(`${BASE_URL}/repairs`, {
      method: 'POST', headers: WRITE_HEADERS, body: JSON.stringify(item),
    }));
    return item;
  },

  deleteRepair: async (id: string) => {
    lsRemove(K.repairs, id);
    bgSync(() => serverFetch(`${BASE_URL}/repairs/${id}`, { method: 'DELETE', headers: READ_HEADERS }));
    return { success: true };
  },

  // --- Debts ---
  getDebts: async () => lsRead<any>(K.debts),

  saveDebt: async (debt: any) => {
    const item = { ...debt, id: debt.id || crypto.randomUUID() };
    lsUpsert(K.debts, item);
    bgSync(() => serverFetch(`${BASE_URL}/debts`, {
      method: 'POST', headers: WRITE_HEADERS, body: JSON.stringify(item),
    }));
    return item;
  },

  deleteDebt: async (id: string) => {
    lsRemove(K.debts, id);
    bgSync(() => serverFetch(`${BASE_URL}/debts/${id}`, { method: 'DELETE', headers: READ_HEADERS }));
    return { success: true };
  },

  // --- Actions (History Log) ---
  getActions: async () => lsRead<any>(K.actions),

  logAction: async (action: any) => {
    const item = {
      ...action,
      id: action.id || crypto.randomUUID(),
      timestamp: action.timestamp || new Date().toISOString(),
    };
    const actions = lsRead<any>(K.actions);
    actions.unshift(item); // Add to beginning
    lsWrite(K.actions, actions);
    return item;
  },

  // --- Categories ---
  getCategories: async () => {
    const cats = lsRead<any>(K.categories);
    if (cats.length === 0) {
      // Default categories
      const defaults = [
        { id: crypto.randomUUID(), nom: 'Batterie', couleur: '#3b82f6' },
        { id: crypto.randomUUID(), nom: 'Écran', couleur: '#10b981' },
        { id: crypto.randomUUID(), nom: 'Plaquette', couleur: '#f59e0b' },
        { id: crypto.randomUUID(), nom: 'Caméra', couleur: '#8b5cf6' },
        { id: crypto.randomUUID(), nom: 'Connecteur', couleur: '#ec4899' },
        { id: crypto.randomUUID(), nom: 'Autre', couleur: '#6b7280' },
      ];
      lsWrite(K.categories, defaults);
      return defaults;
    }
    return cats;
  },

  saveCategory: async (category: any) => {
    const item = { ...category, id: category.id || crypto.randomUUID() };
    lsUpsert(K.categories, item);
    return item;
  },

  deleteCategory: async (id: string) => {
    lsRemove(K.categories, id);
    return { success: true };
  },

  // --- Users ---
  getUsers: async () => {
    const users = lsRead<any>(K.users);
    if (users.length === 0) {
      // Create default admin user
      const admin = {
        id: crypto.randomUUID(),
        nom: 'Administrateur',
        username: 'admin',
        password: 'admin123',
        role: 'admin',
        createdAt: new Date().toISOString(),
      };
      lsWrite(K.users, [admin]);
      return [admin];
    }
    return users;
  },

  saveUser: async (user: any) => {
    const item = {
      ...user,
      id: user.id || crypto.randomUUID(),
      createdAt: user.createdAt || new Date().toISOString(),
    };
    lsUpsert(K.users, item);
    return item;
  },

  deleteUser: async (id: string) => {
    lsRemove(K.users, id);
    return { success: true };
  },

  getCurrentUser: () => {
    try {
      const user = localStorage.getItem(K.currentUser);
      return user ? JSON.parse(user) : null;
    } catch {
      return null;
    }
  },

  setCurrentUser: (user: any) => {
    try {
      localStorage.setItem(K.currentUser, JSON.stringify(user));
    } catch { /* quota */ }
  },

  logout: () => {
    try {
      localStorage.removeItem(K.currentUser);
    } catch { /* quota */ }
  },

  // --- Settings ---
  getSettings: async () => {
    try {
      const settings = localStorage.getItem(K.settings);
      if (!settings) {
        const defaults = { theme: 'dark' };
        localStorage.setItem(K.settings, JSON.stringify(defaults));
        return defaults;
      }
      return JSON.parse(settings);
    } catch {
      return { theme: 'dark' };
    }
  },

  saveSettings: async (settings: any) => {
    try {
      localStorage.setItem(K.settings, JSON.stringify(settings));
      return settings;
    } catch {
      return settings;
    }
  },
};