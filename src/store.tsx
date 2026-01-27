import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { Session } from '@supabase/supabase-js';
import { BasketItem, Investment, UserSettings, HistoricalPoint, AIState } from './types';
import { supabase } from './lib/supabase';
import { generateInsights } from './services/gemini';
import { DateRange, getDateRangeWindow } from './lib/dateRange';
import { calcWeightedInflation } from './lib/inflation';
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

// --- Context Setup ---
interface AppContextType {
    session: Session | null;
    authLoading: boolean;
    authError: string | null;
    
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

    // Entitlement State
    const [isPremium, setIsPremium] = useState<boolean>(false);
    const [entitlementLoading, setEntitlementLoading] = useState<boolean>(false);

    // Global UI State
    const [selectedRange, setSelectedRange] = useState<DateRange>('3M');
    const [aiState, setAiState] = useState<AIState>({ status: 'idle' });

    // Exchange Rate State
    const [exchangeRates, setExchangeRates] = useState<Record<string, number>>(DEFAULT_RATES);

    // Initialize state from LocalStorage
    const [basketItems, setBasketItems] = useState<BasketItem[]>(() => {
        const saved = localStorage.getItem('basketItems_v2');
        return saved ? JSON.parse(saved) : initialBasket;
    });

    const [investments, setInvestments] = useState<Investment[]>(() => {
        const saved = localStorage.getItem('investments_v2');
        return saved ? JSON.parse(saved) : initialInvestments;
    });

    const [settings, setSettings] = useState<UserSettings>(() => {
        const saved = localStorage.getItem('settings_v2');
        return saved ? JSON.parse(saved) : { currency: 'TRY', theme: 'dark', compactView: false, isPremium: false };
    });

    // --- Auth & Data Sync ---
    useEffect(() => {
        // Check active session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            if (session) {
                // Immediate clear to prevent guest data flash
                setBasketItems([]);
                setInvestments([]);
                setAuthLoading(true);
                // Initialize RevenueCat
                initRevenueCat(session.user.id);
                loadRemoteData(session.user.id);
            }
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            if (session) {
                // Immediate clear to prevent guest data flash
                setBasketItems([]);
                setInvestments([]);
                setAuthLoading(true);
                // Initialize RevenueCat
                initRevenueCat(session.user.id);
                loadRemoteData(session.user.id);
            } else {
                // Logout: Clear user data to prevent leaks
                setBasketItems([]);
                setInvestments([]);
                setAuthLoading(false);
                setIsPremium(false);
                setEntitlementLoading(false);
            }
        });

        return () => subscription.unsubscribe();
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

            // 2. Fetch Basket Items & History
            const { data: bData, error: bError } = await supabase
                .from('basket_items')
                .select('*, basket_price_entries(*)')
                .eq('user_id', userId);

            if (bError) throw bError;

            if (bData) {
                const mappedBasket: BasketItem[] = bData.map((row: any) => {
                    const history = (row.basket_price_entries || [])
                        .map((e: any) => ({ date: e.date, value: e.price }))
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
                });
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
            console.error("Sync failed", error);
            setAuthError(error.message || "Failed to load data");
        } finally {
            setAuthLoading(false);
            setEntitlementLoading(false);
        }
    };

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

    // --- Persistence (Local Cache) ---
    useEffect(() => localStorage.setItem('basketItems_v2', JSON.stringify(basketItems)), [basketItems]);
    useEffect(() => localStorage.setItem('investments_v2', JSON.stringify(investments)), [investments]);
    useEffect(() => localStorage.setItem('settings_v2', JSON.stringify(settings)), [settings]);

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
        const priceInTry = convertToBase(itemData.price);
        const newItem: BasketItem = {
            ...itemData,
            price: priceInTry,
            id: crypto.randomUUID(),
            inflationRate: 0,
            trend: 'stable',
            lastUpdated: 'Just now',
            history: [{ date: new Date().toISOString().split('T')[0], value: priceInTry }]
        };
        
        // Optimistic
        setBasketItems(prev => [newItem, ...prev]);

        // Sync
        if (session) {
            try {
                await supabase.from('basket_items').insert({
                    id: newItem.id,
                    user_id: session.user.id,
                    name: newItem.name,
                    category: newItem.category,
                    quantity: 1,
                    currency: 'TRY'
                });
                await supabase.from('basket_price_entries').insert({
                    item_id: newItem.id,
                    user_id: session.user.id,
                    date: newItem.history[0].date,
                    price: priceInTry,
                    currency: 'TRY'
                });
            } catch(e) { console.error(e); }
        }
    };

    const updateBasketItem = async (id: string, updates: Partial<BasketItem>) => {
        setBasketItems(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
        if (session) {
             try {
                await supabase.from('basket_items').update({
                    name: updates.name,
                    category: updates.category
                }).eq('id', id);
             } catch(e) { console.error(e); }
        }
    };

    const addBasketPriceEntry = async (itemId: string, price: number, date: string) => {
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
            try {
                await supabase.from('basket_price_entries').upsert({
                    item_id: itemId,
                    user_id: session.user.id,
                    date: date,
                    price: priceInTry,
                    currency: 'TRY'
                }, { onConflict: 'item_id,date' });
            } catch(e) { console.error(e); }
        }
    };

    // Alias for compatibility with existing UI that calls addPriceEntry
    const addPriceEntry = (itemId: string, price: number, date: string) => {
        addBasketPriceEntry(itemId, price, date);
    };

    const deleteBasketItem = async (id: string) => {
        setBasketItems(prev => prev.filter(i => i.id !== id));
        if (session) {
            try { await supabase.from('basket_items').delete().eq('id', id); } catch(e) { console.error(e); }
        }
    };

    const addInvestment = async (invData: Omit<Investment, 'id' | 'dayChangePct' | 'history'>) => {
        const priceInTry = convertToBase(invData.currentPrice);
        const newInv: Investment = {
            ...invData,
            currentPrice: priceInTry,
            id: crypto.randomUUID(),
            dayChangePct: 0,
            history: [{ date: new Date().toISOString().split('T')[0], value: priceInTry }]
        };
        
        // Optimistic
        setInvestments(prev => [newInv, ...prev]);

        // Sync
        if (session) {
            try {
                await supabase.from('investments').insert({
                    id: newInv.id,
                    user_id: session.user.id,
                    name: newInv.name,
                    symbol: newInv.symbol,
                    type: newInv.type.toLowerCase(), // Store as lowercase in DB
                    quantity: newInv.quantity,
                    currency: 'TRY'
                });
                await supabase.from('investment_price_entries').insert({
                    investment_id: newInv.id,
                    user_id: session.user.id,
                    date: newInv.history[0].date,
                    price: priceInTry,
                    currency: 'TRY'
                });
            } catch(e) { console.error(e); }
        }
    };

    const updateInvestment = async (id: string, updates: Partial<Investment>) => {
        setInvestments(prev => prev.map(inv => inv.id === id ? { ...inv, ...updates } : inv));
        if (session) {
            try {
                const dbUpdates: any = {};
                if (updates.name) dbUpdates.name = updates.name;
                if (updates.symbol) dbUpdates.symbol = updates.symbol;
                if (updates.quantity) dbUpdates.quantity = updates.quantity;
                if (updates.type) dbUpdates.type = updates.type.toLowerCase();

                await supabase.from('investments').update(dbUpdates).eq('id', id);
            } catch(e) { console.error(e); }
        }
    };

    const addInvestmentPriceEntry = async (itemId: string, price: number, date: string) => {
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
            try {
                await supabase.from('investment_price_entries').upsert({
                    investment_id: itemId,
                    user_id: session.user.id,
                    date: date,
                    price: priceInTry,
                    currency: 'TRY'
                }, { onConflict: 'investment_id,date' });
            } catch(e) { console.error(e); }
        }
    };

    const deleteInvestment = async (id: string) => {
        setInvestments(prev => prev.filter(i => i.id !== id));
        if (session) {
            try { await supabase.from('investments').delete().eq('id', id); } catch(e) { console.error(e); }
        }
    };

    const updateSettings = async (s: Partial<UserSettings>) => {
        setSettings(prev => ({ ...prev, ...s }));
        if (session && s.currency) {
            try {
                await supabase.from('user_settings').upsert({
                    user_id: session.user.id,
                    currency: s.currency
                });
            } catch(e) { console.error(e); }
        }
    };

    return (
        <AppContext.Provider value={{ 
            session,
            authLoading,
            authError,
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
            updateSettings 
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
