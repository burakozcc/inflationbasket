import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { Session } from '@supabase/supabase-js';
import { BasketItem, Investment, UserSettings, HistoricalPoint, AIState } from './types';
import { supabase } from './lib/supabase';
import { enqueue, processQueue, clearQueue, type SyncAction } from './lib/syncQueue';
import { generateInsights } from './services/gemini';
import { DateRange, getDateRangeWindow } from './lib/dateRange';
import { calcWeightedInflation } from './lib/inflation';
import { getInitialOnlineStatus, subscribeToNetworkChanges } from './lib/network';
import { safeCall } from './lib/safeSupabase';
import { mergeById } from './lib/merge';
import { migrateBasketItems, migrateInvestments } from './lib/migrations';
import { isValidPrice, isValidQuantity, isValidDateISO, isNotFutureDate } from './lib/validators';
import { initRevenueCat, presentPaywall, presentCustomerCenter } from './services/revenuecat';

// --- Default/Fallback Exchange Rates (Base: TRY) ---
const DEFAULT_RATES: Record<string, number> = {
    TRY: 1,
    USD: 0.031, // Fallback
    EUR: 0.028,  // Fallback
    GBP: 0.024   // Fallback
};

// Initial Data stored in TRY (Turkish Lira)
const initialBasket: BasketItem[] = []; // Empty for sync-enabled app
const initialInvestments: Investment[] = [];

const defaultSettings: UserSettings = { currency: 'TRY', theme: 'dark', compactView: false, isPremium: false };

const STORAGE_VERSION = 2;
const BASKET_KEY = `basketItems_v${STORAGE_VERSION}`;

function mapBasketRowToItem(row: { id: string; name: string; category: string }): BasketItem {
    return {
        id: row.id,
        name: row.name,
        category: row.category,
        price: 0,
        lastUpdated: 'Synced',
        inflationRate: 0,
        trend: 'stable',
        image: `https://picsum.photos/seed/${row.name}/200`,
        history: []
    };
}
const INVEST_KEY = `investments_v${STORAGE_VERSION}`;
const SETTINGS_KEY = `settings_v${STORAGE_VERSION}`;

// --- Context Setup ---
interface AppContextType {
    session: Session | null;
    authLoading: boolean;
    authError: string | null;
    isInitializing: boolean;
    isOnline: boolean;
    isSyncing: boolean;
    lastRemoteSyncISO: string | null;

    // Entitlements
    isPremium: boolean;
    entitlementLoading: boolean;
    purchasePremium: () => Promise<boolean>;
    manageSubscription: () => Promise<void>;

    basketItems: BasketItem[];
    investments: Investment[];
    settings: UserSettings;
    currencySymbol: string;
    exchangeRates: Record<string, number>;
    convertPrice: (priceInTry: number) => number;
    formatPrice: (priceInTry: number) => string;
    
    // Actions
    addBasketItem: (item: Omit<BasketItem, 'id' | 'inflationRate' | 'trend' | 'lastUpdated' | 'history'>) => void;
    updateBasketItem: (id: string, updates: Partial<BasketItem>) => void;
    deleteBasketItem: (id: string) => void;
    
    // Legacy alias for compatibility
    addPriceEntry: (itemId: string, price: number, date: string) => void;
    // Explicit sync actions
    addBasketPriceEntry: (itemId: string, price: number, date: string) => void;
    
    addInvestment: (inv: Omit<Investment, 'id' | 'dayChangePct' | 'history'>) => void;
    updateInvestment: (id: string, updates: Partial<Investment>) => void;
    deleteInvestment: (id: string) => void;
    addInvestmentPriceEntry: (itemId: string, price: number, date: string) => void;
    
    updateSettings: (s: Partial<UserSettings>) => void;
    refetchBasket: () => Promise<void>;

    // AI & Range
    selectedRange: DateRange;
    setSelectedRange: (range: DateRange) => void;
    aiState: AIState;
    fetchAIInsights: (range: DateRange) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children?: ReactNode }) => {
    // Auth State
    const [session, setSession] = useState<Session | null>(null);
    const [authLoading, setAuthLoading] = useState<boolean>(false);
    const [authError, setAuthError] = useState<string | null>(null);
    const [isInitializing, setIsInitializing] = useState<boolean>(true);
    const [isOnline, setIsOnline] = useState(getInitialOnlineStatus());
    const [isSyncing, setIsSyncing] = useState(false);
    const [lastRemoteSyncISO, setLastRemoteSyncISO] = useState<string | null>(null);

    // Entitlement State
    const [isPremium, setIsPremium] = useState<boolean>(false);
    const [entitlementLoading, setEntitlementLoading] = useState<boolean>(false);

    // Global UI State
    const [selectedRange, setSelectedRange] = useState<DateRange>('3M');
    const [aiState, setAiState] = useState<AIState>({ status: 'idle' });

    // Exchange Rate State
    const [exchangeRates, setExchangeRates] = useState<Record<string, number>>(DEFAULT_RATES);

    // Initialize state from LocalStorage (with migration)
    const [basketItems, setBasketItems] = useState<BasketItem[]>(() => {
        const rawBasket = localStorage.getItem(BASKET_KEY);
        let initialBasket: BasketItem[] = [];
        if (rawBasket) {
            try {
                initialBasket = migrateBasketItems(JSON.parse(rawBasket));
            } catch {
                initialBasket = [];
            }
        }
        return initialBasket;
    });

    const [investments, setInvestments] = useState<Investment[]>(() => {
        const rawInvest = localStorage.getItem(INVEST_KEY);
        let initialInvest: Investment[] = [];
        if (rawInvest) {
            try {
                initialInvest = migrateInvestments(JSON.parse(rawInvest));
            } catch {
                initialInvest = [];
            }
        }
        return initialInvest;
    });

    const [settings, setSettings] = useState<UserSettings>(() => {
        const saved = localStorage.getItem(SETTINGS_KEY);
        return saved ? JSON.parse(saved) : defaultSettings;
    });

    function clearAllLocalData() {
        setBasketItems([]);
        setInvestments([]);
        setSettings(defaultSettings);
    }

    // --- Remove old storage keys on first load ---
    useEffect(() => {
        Object.keys(localStorage)
            .filter(k => k.startsWith('basketItems_') && k !== BASKET_KEY)
            .forEach(k => localStorage.removeItem(k));
        Object.keys(localStorage)
            .filter(k => k.startsWith('investments_') && k !== INVEST_KEY)
            .forEach(k => localStorage.removeItem(k));
        Object.keys(localStorage)
            .filter(k => k.startsWith('settings_') && k !== SETTINGS_KEY)
            .forEach(k => localStorage.removeItem(k));
    }, []);

    // --- Session restore on app start ---
    useEffect(() => {
        const init = async () => {
            const s = await supabase.auth.getSession();
            console.log('[auth] initial session:', !!s.data.session);
            const currentSession = s.data.session ?? null;
            setSession(currentSession);

            if (currentSession) {
                initRevenueCat(currentSession.user.id);
                await loadRemoteData(currentSession.user.id);
            } else {
                clearAllLocalData();
            }

            setIsInitializing(false);
        };

        init();
    }, []);

    // --- Auth state change (user switch / sign out) ---
    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            console.log('[auth] event:', event, 'hasSession:', !!session);
            setSession(session);

            if (event === 'SIGNED_OUT') {
                clearAllLocalData();
                clearQueue();
                setAuthLoading(false);
                setIsPremium(false);
                setEntitlementLoading(false);
            }

            if (event === 'SIGNED_IN' && session) {
                clearAllLocalData();
                setAuthLoading(true);
                initRevenueCat(session.user.id);
                loadRemoteData(session.user.id);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    useEffect(() => {
        const unsubscribe = subscribeToNetworkChanges(setIsOnline);
        return unsubscribe;
    }, []);

    const loadRemoteData = async (userId: string) => {
        setAuthLoading(true);
        setEntitlementLoading(true); // Start loading entitlements
        setAuthError(null);
        try {
            // 1. Fetch Settings
            const { data: settingsData, error: settingsError } = await supabase.from('user_settings').select('*').eq('user_id', userId).single();
            
            if (settingsError && settingsError.code !== 'PGRST116') { // Ignore "Row not found" error for new users
                 throw settingsError;
            }

            if (settingsData) {
                setSettings(prev => ({ ...prev, currency: settingsData.currency }));
            } else {
                // Create default if first time
                await supabase.from('user_settings').insert({ user_id: userId, currency: 'TRY' });
            }

            // 2. Fetch Basket Items (public.basket_items: id, user_id, name, category, created_at, updated_at)
            console.log('Fetching basket_items for user', userId);
            const { data: bData, error: bError } = await supabase
                .from('basket_items')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false });

            if (bError) {
                console.error('basket_items fetch error', bError);
                throw bError;
            }

            if (bData) {
                const mappedBasket: BasketItem[] = bData.map((row: any) => mapBasketRowToItem(row));
                setBasketItems(mappedBasket);
            }

            // 3. Fetch Investments & History
            const { data: iData, error: iError } = await supabase
                .from('investments')
                .select('*, investment_price_entries(*)')
                .eq('user_id', userId);

            if (iError) throw iError;

            if (iData) {
                const mappedInv: Investment[] = iData.map((row: any) => {
                    const history = (row.investment_price_entries || [])
                        .map((e: any) => ({ date: e.date, value: e.price }))
                        .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
                    
                    const currentPrice = history.length > 0 ? history[history.length - 1].value : 0;
                    const typeFormatted = row.type ? (row.type.charAt(0).toUpperCase() + row.type.slice(1)) : 'Stock';

                    return {
                        id: row.id,
                        name: row.name,
                        symbol: row.symbol,
                        type: typeFormatted as any,
                        quantity: row.quantity,
                        currentPrice,
                        dayChangePct: 0,
                        history
                    };
                });
                setInvestments(mappedInv);
            }

            // 4. Fetch Entitlements
            const { data: entData } = await supabase
                .from('user_entitlements')
                .select('*')
                .eq('user_id', userId)
                .maybeSingle();
            
            if (entData) {
                const now = new Date();
                const expires = entData.expires_at ? new Date(entData.expires_at) : null;
                // Premium if flag is true AND (never expires OR expires in future)
                const active = entData.is_premium && (!expires || expires > now);
                setIsPremium(active);
            } else {
                setIsPremium(false);
            }

        } catch (error: any) {
            console.error('Sync failed (basket_items/investments)', error);
            setAuthError(error.message || "Failed to load data");
        } finally {
            setAuthLoading(false);
            setEntitlementLoading(false);
        }
    };

    function mapBasketWithPrices(row: any): BasketItem {
        const entries = row.basket_price_entries || [];
        const history = entries
            .map((e: any) => ({ date: e.price_date, value: e.price }))
            .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
        const lastPrice = history.length > 0 ? history[history.length - 1].value : 0;
        const firstPrice = history.length > 0 ? history[0].value : 0;
        const inflationRate = firstPrice > 0 ? parseFloat((((lastPrice - firstPrice) / firstPrice) * 100).toFixed(1)) : 0;
        return {
            id: row.id,
            name: row.name,
            category: row.category,
            price: lastPrice,
            lastUpdated: 'Synced',
            inflationRate,
            trend: 'stable',
            image: `https://picsum.photos/seed/${row.name}/200`,
            history
        };
    }

    async function refreshRemoteData(userId: string): Promise<void> {
        try {
            const [basketRes, investRes] = await Promise.all([
                supabase.from('basket_items').select('*, basket_price_entries(*)').eq('user_id', userId).order('created_at', { ascending: false }),
                supabase.from('investments').select('*, investment_price_entries(*)').eq('user_id', userId),
            ]);

            if (!basketRes.error && basketRes.data) {
                const mappedBasket = basketRes.data.map((row: any) => mapBasketWithPrices(row));
                setBasketItems(prev => mergeById(prev, mappedBasket));
            }

            if (!investRes.error && investRes.data) {
                const mappedInv = investRes.data.map((row: any) => {
                    const history = (row.investment_price_entries || [])
                        .map((e: any) => ({ date: e.date, value: e.price }))
                        .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
                    const currentPrice = history.length > 0 ? history[history.length - 1].value : 0;
                    const typeFormatted = row.type ? (row.type.charAt(0).toUpperCase() + row.type.slice(1)) : 'Stock';
                    return {
                        id: row.id,
                        name: row.name,
                        symbol: row.symbol,
                        type: typeFormatted as Investment['type'],
                        quantity: row.quantity,
                        currentPrice,
                        dayChangePct: 0,
                        history,
                        updated_at: row.updated_at,
                    };
                });
                setInvestments(prev => mergeById(prev, mappedInv));
            }

            setLastRemoteSyncISO(new Date().toISOString());
        } catch (e) {
            console.warn('refreshRemoteData failed', e);
        }
    }

    const refetchBasket = useCallback(async () => {
        if (!session) return;
        const { data, error } = await supabase
            .from('basket_items')
            .select('*, basket_price_entries(*)')
            .eq('user_id', session.user.id)
            .order('created_at', { ascending: false });
        if (error) {
            console.error('refetchBasket failed', error);
            return;
        }
        if (data) setBasketItems(data.map((row: any) => mapBasketWithPrices(row)));
    }, [session]);

    // --- Exchange Rates ---
    useEffect(() => {
        const fetchRates = async () => {
            try {
                const response = await fetch('https://open.er-api.com/v6/latest/TRY');
                if (!response.ok) throw new Error('Network response was not ok');
                const data = await response.json();
                if (data && data.rates) {
                    setExchangeRates(prev => ({ ...prev, ...data.rates }));
                }
            } catch (error) {
                console.warn("Using offline exchange rates");
            }
        };
        fetchRates();
        const interval = setInterval(fetchRates, 600000);
        return () => clearInterval(interval);
    }, []);

    async function runSyncAction(action: SyncAction): Promise<void> {
        let res: { data?: any; error?: unknown };
        switch (action.type) {
            case 'ADD_BASKET_ITEM':
                res = await safeCall(() => supabase.from('basket_items').insert(action.payload));
                if (res.error || res.data?.error) throw res.error ?? res.data?.error;
                break;
            case 'UPDATE_BASKET_ITEM':
                res = await safeCall(() =>
                    supabase.from('basket_items').update(action.payload.data).eq('id', action.payload.id)
                );
                if (res.error || res.data?.error) throw res.error ?? res.data?.error;
                break;
            case 'DELETE_BASKET_ITEM':
                res = await safeCall(() =>
                    supabase.from('basket_items').delete().eq('id', action.payload.id)
                );
                if (res.error || res.data?.error) throw res.error ?? res.data?.error;
                break;
            case 'ADD_BASKET_PRICE':
                res = await safeCall(() =>
                    supabase.from('basket_price_entries').upsert(action.payload, { onConflict: 'item_id,date' })
                );
                if (res.error || res.data?.error) throw res.error ?? res.data?.error;
                break;
            case 'ADD_INVESTMENT':
                res = await safeCall(() => supabase.from('investments').insert(action.payload));
                if (res.error || res.data?.error) throw res.error ?? res.data?.error;
                break;
            case 'UPDATE_INVESTMENT':
                res = await safeCall(() =>
                    supabase.from('investments').update(action.payload.data).eq('id', action.payload.id)
                );
                if (res.error || res.data?.error) throw res.error ?? res.data?.error;
                break;
            case 'DELETE_INVESTMENT':
                res = await safeCall(() =>
                    supabase.from('investments').delete().eq('id', action.payload.id)
                );
                if (res.error || res.data?.error) throw res.error ?? res.data?.error;
                break;
            case 'ADD_INVESTMENT_PRICE':
                res = await safeCall(() =>
                    supabase.from('investment_price_entries').upsert(action.payload, { onConflict: 'investment_id,date' })
                );
                if (res.error || res.data?.error) throw res.error ?? res.data?.error;
                break;
            default:
                break;
        }
    }

    useEffect(() => {
        const interval = setInterval(async () => {
            if (session && isOnline) {
                setIsSyncing(true);
                try {
                    await processQueue(runSyncAction);
                } finally {
                    setIsSyncing(false);
                }
            }
        }, 5000);
        return () => clearInterval(interval);
    }, [session, isOnline]);

    useEffect(() => {
        if (!session) return;

        const interval = setInterval(() => {
            if (isOnline) {
                refreshRemoteData(session.user.id);
            }
        }, 60000);

        return () => clearInterval(interval);
    }, [session, isOnline]);

    // --- Persistence (Local Cache) ---
    useEffect(() => localStorage.setItem(BASKET_KEY, JSON.stringify(basketItems)), [basketItems]);
    useEffect(() => localStorage.setItem(INVEST_KEY, JSON.stringify(investments)), [investments]);
    useEffect(() => localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)), [settings]);

    // Theme Effect
    useEffect(() => {
        const root = window.document.documentElement;
        const isDark = settings.theme === 'dark' || (settings.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
        if (isDark) {
            root.classList.add('dark');
        } else {
            root.classList.remove('dark');
        }
    }, [settings.theme]);

    const currencySymbol = settings.currency === 'EUR' ? '€' : settings.currency === 'TRY' ? '₺' : settings.currency === 'GBP' ? '£' : '$';

    const getRate = () => exchangeRates[settings.currency] || 1;
    const convertPrice = (priceInTry: number): number => priceInTry * getRate();
    const convertToBase = (priceInSelected: number): number => {
        const rate = getRate();
        return rate === 0 ? 0 : priceInSelected / rate;
    };
    const formatPrice = (priceInTry: number): string => {
        const val = convertPrice(priceInTry);
        return `${currencySymbol}${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    // --- Actions ---

    // RevenueCat Actions
    const purchasePremium = async (): Promise<boolean> => {
        if (!session) return false;
        
        const { purchased } = await presentPaywall();
        
        if (purchased) {
            // Trigger a reload of entitlements from Supabase
            // Note: This relies on a webhook or edge function updating Supabase in the background
            await loadRemoteData(session.user.id);
            return true;
        }
        return false;
    };

    const manageSubscription = async (): Promise<void> => {
        await presentCustomerCenter();
    };

    const fetchAIInsights = useCallback(async (range: DateRange) => {
        if (!isPremium) return; // Gate at action level too
        setAiState(prev => ({ ...prev, status: 'loading' }));
        
        try {
             const { startDate, endDate } = getDateRangeWindow(range);
             const personalInflation = calcWeightedInflation(basketItems, range);

             const payload = {
                 basketItems,
                 investments,
                 settings,
                 range,
                 startDateISO: startDate.toISOString().split('T')[0],
                 endDateISO: endDate.toISOString().split('T')[0],
                 computed: { personalInflationPct: personalInflation }
             };

             const data = await generateInsights(payload);
             setAiState({ status: 'success', data, lastUpdatedISO: new Date().toISOString() });
        } catch (error: any) {
            console.error(error);
            setAiState({ status: 'error', error: error.message || 'Failed to generate insights' });
        }
    }, [basketItems, investments, settings, isPremium]);

    const addBasketItem = async (itemData: Omit<BasketItem, 'id' | 'inflationRate' | 'trend' | 'lastUpdated' | 'history'>) => {
        const quantity = 1;
        if (!isValidQuantity(quantity)) {
            console.warn('Invalid quantity rejected');
            return;
        }
        if (session) {
            const { data: row, error } = await supabase
                .from('basket_items')
                .insert([{ user_id: session.user.id, name: itemData.name, category: itemData.category }])
                .select()
                .single();
            if (error) {
                console.error('basket_items insert/delete error', error);
                enqueue({ type: 'ADD_BASKET_ITEM', payload: { user_id: session.user.id, name: itemData.name, category: itemData.category } });
                return;
            }
            const newItem: BasketItem = {
                ...mapBasketRowToItem(row),
                price: itemData.price != null ? convertToBase(itemData.price) : 0,
                lastUpdated: 'Just now',
                history: itemData.price != null ? [{ date: new Date().toISOString().split('T')[0], value: convertToBase(itemData.price) }] : []
            };
            setBasketItems(prev => [newItem, ...prev]);
            return;
        }
        const priceInTry = convertToBase(itemData.price ?? 0);
        const newItem: BasketItem = {
            ...itemData,
            price: priceInTry,
            id: globalThis.crypto.randomUUID(),
            inflationRate: 0,
            trend: 'stable',
            lastUpdated: 'Just now',
            history: itemData.price != null ? [{ date: new Date().toISOString().split('T')[0], value: priceInTry }] : []
        };
        setBasketItems(prev => [newItem, ...prev]);
    };

    const updateBasketItem = async (id: string, updates: Partial<BasketItem> & { is_active?: boolean }) => {
        setBasketItems(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
        if (session) {
            const data: Record<string, unknown> = {};
            if (updates.name !== undefined) data.name = updates.name;
            if (updates.category !== undefined) data.category = updates.category;
            if (updates.is_active !== undefined) data.is_active = updates.is_active;
            const res = await safeCall(() =>
                supabase.from('basket_items').update(data).eq('id', id)
            );
            const err = res.error ?? (res.data as any)?.error;
            if (err) {
                enqueue({ type: 'UPDATE_BASKET_ITEM', payload: { id, data } });
            }
        }
    };

    const addBasketPriceEntry = async (itemId: string, price: number, date: string) => {
        if (!isValidPrice(price) || !isValidDateISO(date) || !isNotFutureDate(date)) {
            console.warn('Invalid price entry rejected');
            return;
        }
        const priceInTry = convertToBase(price);
        
        // Optimistic
        setBasketItems(prev => prev.map(item => {
            if (item.id !== itemId) return item;
            
            const newHistory = [...item.history.filter(h => h.date !== date), { date, value: priceInTry }]
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
            
            const firstPrice = newHistory[0].value;
            const inflationRate = firstPrice === 0 ? 0 : parseFloat((((priceInTry - firstPrice) / firstPrice) * 100).toFixed(1));

            return {
                ...item,
                price: priceInTry,
                lastUpdated: 'Just now',
                history: newHistory,
                inflationRate,
                trend: priceInTry > item.price ? 'up' : priceInTry < item.price ? 'down' : 'stable'
            };
        }));

        // Sync
        if (session) {
            const payload = {
                item_id: itemId,
                user_id: session.user.id,
                date: date,
                price: priceInTry,
                currency: 'TRY'
            };
            const res = await safeCall(() =>
                supabase.from('basket_price_entries').upsert(payload, { onConflict: 'item_id,date' })
            );
            const err = res.error ?? (res.data as any)?.error;
            if (err) {
                enqueue({ type: 'ADD_BASKET_PRICE', payload });
            }
        }
    };

    // Alias for compatibility with existing UI that calls addPriceEntry
    const addPriceEntry = (itemId: string, price: number, date: string) => {
        addBasketPriceEntry(itemId, price, date);
    };

    const deleteBasketItem = async (id: string) => {
        setBasketItems(prev => prev.filter(i => i.id !== id));
        if (session) {
            const { error } = await supabase.from('basket_items').delete().eq('id', id);
            if (error) {
                console.error('basket_items insert/delete error', error);
                enqueue({ type: 'DELETE_BASKET_ITEM', payload: { id } });
            }
        }
    };

    const addInvestment = async (invData: Omit<Investment, 'id' | 'dayChangePct' | 'history'>) => {
        if (!isValidQuantity(invData.quantity)) {
            console.warn('Invalid investment quantity rejected');
            return;
        }
        const priceInTry = convertToBase(invData.currentPrice);
        const newInv: Investment = {
            ...invData,
            currentPrice: priceInTry,
            id: globalThis.crypto.randomUUID(),
            dayChangePct: 0,
            history: [{ date: new Date().toISOString().split('T')[0], value: priceInTry }]
        };
        
        // Optimistic
        setInvestments(prev => [newInv, ...prev]);

        // Sync
        if (session) {
            const row = {
                id: newInv.id,
                user_id: session.user.id,
                name: newInv.name,
                symbol: newInv.symbol,
                type: newInv.type.toLowerCase(), // Store as lowercase in DB
                quantity: newInv.quantity,
                currency: 'TRY'
            };
            const insertResult = await safeCall(() => supabase.from('investments').insert(row));
            const insertErr = insertResult.error ?? (insertResult.data as any)?.error;
            if (insertErr) {
                enqueue({ type: 'ADD_INVESTMENT', payload: row });
                return;
            }
            const pricePayload = {
                investment_id: newInv.id,
                user_id: session.user.id,
                date: newInv.history[0].date,
                price: priceInTry,
                currency: 'TRY'
            };
            const priceResult = await safeCall(() =>
                supabase.from('investment_price_entries').insert(pricePayload)
            );
            const priceErr = priceResult.error ?? (priceResult.data as any)?.error;
            if (priceErr) {
                enqueue({ type: 'ADD_INVESTMENT_PRICE', payload: pricePayload });
            }
        }
    };

    const updateInvestment = async (id: string, updates: Partial<Investment>) => {
        setInvestments(prev => prev.map(inv => inv.id === id ? { ...inv, ...updates } : inv));
        if (session) {
            const dbUpdates: any = {};
            if (updates.name) dbUpdates.name = updates.name;
            if (updates.symbol) dbUpdates.symbol = updates.symbol;
            if (updates.quantity) dbUpdates.quantity = updates.quantity;
            if (updates.type) dbUpdates.type = updates.type.toLowerCase();
            const res = await safeCall(() =>
                supabase.from('investments').update(dbUpdates).eq('id', id)
            );
            const err = res.error ?? (res.data as any)?.error;
            if (err) {
                enqueue({ type: 'UPDATE_INVESTMENT', payload: { id, data: dbUpdates } });
            }
        }
    };

    const addInvestmentPriceEntry = async (itemId: string, price: number, date: string) => {
        if (!isValidPrice(price) || !isValidDateISO(date) || !isNotFutureDate(date)) {
            console.warn('Invalid price entry rejected');
            return;
        }
        const priceInTry = convertToBase(price);
        
        // Optimistic
        setInvestments(prev => prev.map(item => {
            if (item.id !== itemId) return item;
            const newHistory = [...item.history.filter(h => h.date !== date), { date, value: priceInTry }]
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
            return { ...item, currentPrice: priceInTry, history: newHistory };
        }));

        // Sync
        if (session) {
            const payload = {
                investment_id: itemId,
                user_id: session.user.id,
                date: date,
                price: priceInTry,
                currency: 'TRY'
            };
            const res = await safeCall(() =>
                supabase.from('investment_price_entries').upsert(payload, { onConflict: 'investment_id,date' })
            );
            const err = res.error ?? (res.data as any)?.error;
            if (err) {
                enqueue({ type: 'ADD_INVESTMENT_PRICE', payload });
            }
        }
    };

    const deleteInvestment = async (id: string) => {
        setInvestments(prev => prev.filter(i => i.id !== id));
        if (session) {
            const res = await safeCall(() =>
                supabase.from('investments').delete().eq('id', id)
            );
            const err = res.error ?? (res.data as any)?.error;
            if (err) {
                enqueue({ type: 'DELETE_INVESTMENT', payload: { id } });
            }
        }
    };

    const updateSettings = async (s: Partial<UserSettings>) => {
        setSettings(prev => ({ ...prev, ...s }));
        if (session && s.currency) {
            await safeCall(() =>
                supabase.from('user_settings').upsert({
                    user_id: session.user.id,
                    currency: s.currency
                })
            );
        }
    };

    return (
        <AppContext.Provider value={{ 
            session,
            authLoading,
            authError,
            isInitializing,
            isOnline,
            isSyncing,
            lastRemoteSyncISO,
            isPremium,
            entitlementLoading,
            purchasePremium,
            manageSubscription,
            basketItems, 
            investments, 
            settings, 
            currencySymbol, 
            exchangeRates, 
            selectedRange,
            aiState,
            setSelectedRange,
            fetchAIInsights,
            convertPrice,
            formatPrice,
            addBasketItem, 
            updateBasketItem,
            addBasketPriceEntry,
            addPriceEntry, // Exposed alias
            deleteBasketItem,
            addInvestment, 
            updateInvestment,
            addInvestmentPriceEntry,
            deleteInvestment, 
            updateSettings,
            refetchBasket 
        }}>
            {children}
        </AppContext.Provider>
    );
};

export const useAppStore = () => {
    const context = useContext(AppContext);
    if (!context) throw new Error("useAppStore must be used within AppProvider");
    return context;
};
