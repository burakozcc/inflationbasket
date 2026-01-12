import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { BasketItem, Investment, UserSettings, HistoricalPoint } from './types';

// --- Exchange Rates (Base: TRY) ---
// In a real production app, fetch these from an API like https://api.exchangerate-api.com/v4/latest/TRY
const EXCHANGE_RATES: Record<string, number> = {
    TRY: 1,
    USD: 0.0305, // ~32.80 TRY per USD
    EUR: 0.0280  // ~35.70 TRY per EUR
};

// --- Mock Data Generators (Fallbacks) ---
const generateHistory = (startPrice: number, points: number = 20, volatility: number = 0.05): HistoricalPoint[] => {
    let currentPrice = startPrice;
    return Array.from({ length: points }).map((_, i) => {
        const change = currentPrice * (Math.random() * volatility - (volatility / 2) + 0.002);
        currentPrice += change;
        return {
            date: new Date(Date.now() - (points - i) * 86400000).toISOString().split('T')[0],
            value: currentPrice
        };
    });
};

// Initial Data stored in TRY
const initialBasket: BasketItem[] = [
    {
        id: '1', name: 'Whole Wheat Bread', category: 'Groceries', price: 35.00, lastUpdated: 'Today', inflationRate: 12, trend: 'up',
        image: 'https://picsum.photos/seed/bread/200', history: generateHistory(32.0, 365, 0.1)
    },
    {
        id: '2', name: 'Unleaded Gas (L)', category: 'Transport', price: 43.50, lastUpdated: '2h ago', inflationRate: -2, trend: 'down',
        image: 'https://picsum.photos/seed/gas/200', history: generateHistory(45.0, 365, 0.05)
    },
];

const initialInvestments: Investment[] = [
    { id: '1', symbol: 'AAPL', name: 'Apple Inc.', type: 'Stock', quantity: 15.0, currentPrice: 5750.50, dayChangePct: 1.2, history: generateHistory(5200, 365, 0.08) },
    { id: '2', symbol: 'BTC', name: 'Bitcoin', type: 'Crypto', quantity: 0.45, currentPrice: 2150000.00, dayChangePct: 4.2, history: generateHistory(1900000, 365, 0.2) },
];

// --- Context Setup ---
interface AppContextType {
    basketItems: BasketItem[];
    investments: Investment[];
    settings: UserSettings;
    currencySymbol: string;
    convertPrice: (priceInTry: number) => number;
    formatPrice: (priceInTry: number) => string;
    addBasketItem: (item: Omit<BasketItem, 'id' | 'inflationRate' | 'trend' | 'lastUpdated' | 'history'>) => void;
    addPriceEntry: (itemId: string, price: number, date: string) => void;
    deleteBasketItem: (id: string) => void;
    addInvestment: (inv: Omit<Investment, 'id' | 'dayChangePct' | 'history'>) => void;
    deleteInvestment: (id: string) => void;
    updateSettings: (s: Partial<UserSettings>) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children?: ReactNode }) => {
    // Initialize state from LocalStorage or fallbacks
    const [basketItems, setBasketItems] = useState<BasketItem[]>(() => {
        const saved = localStorage.getItem('basketItems');
        return saved ? JSON.parse(saved) : initialBasket;
    });

    const [investments, setInvestments] = useState<Investment[]>(() => {
        const saved = localStorage.getItem('investments');
        return saved ? JSON.parse(saved) : initialInvestments;
    });

    const [settings, setSettings] = useState<UserSettings>(() => {
        const saved = localStorage.getItem('settings');
        // Default to TRY as per requirements
        return saved ? JSON.parse(saved) : { currency: 'TRY', theme: 'dark', compactView: false, isPremium: false };
    });

    // Persistence Effects
    useEffect(() => localStorage.setItem('basketItems', JSON.stringify(basketItems)), [basketItems]);
    useEffect(() => localStorage.setItem('investments', JSON.stringify(investments)), [investments]);
    useEffect(() => localStorage.setItem('settings', JSON.stringify(settings)), [settings]);

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

    const currencySymbol = settings.currency === 'EUR' ? '€' : settings.currency === 'TRY' ? '₺' : '$';

    // --- Currency Conversion Logic ---
    const getRate = () => EXCHANGE_RATES[settings.currency] || 1;

    // Convert stored TRY value -> Display Currency
    const convertPrice = (priceInTry: number): number => {
        return priceInTry * getRate();
    };

    // Convert Input Currency -> Base TRY (for storage)
    const convertToBase = (priceInSelected: number): number => {
        return priceInSelected / getRate();
    };

    const formatPrice = (priceInTry: number): string => {
        const val = convertPrice(priceInTry);
        return `${currencySymbol}${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    // --- Actions ---

    const addBasketItem = (itemData: Omit<BasketItem, 'id' | 'inflationRate' | 'trend' | 'lastUpdated' | 'history'>) => {
        const priceInTry = convertToBase(itemData.price);
        const newItem: BasketItem = {
            ...itemData,
            price: priceInTry, // Store in Base
            id: crypto.randomUUID(),
            inflationRate: 0,
            trend: 'stable',
            lastUpdated: 'Just now',
            history: [{ date: new Date().toISOString().split('T')[0], value: priceInTry }]
        };
        setBasketItems(prev => [newItem, ...prev]);
    };

    const addPriceEntry = (itemId: string, price: number, date: string) => {
        const priceInTry = convertToBase(price);
        setBasketItems(prev => prev.map(item => {
            if (item.id !== itemId) return item;

            const newHistory = [...item.history, { date, value: priceInTry }].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
            
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
    };

    const deleteBasketItem = (id: string) => {
        setBasketItems(prev => prev.filter(i => i.id !== id));
    };

    const addInvestment = (invData: Omit<Investment, 'id' | 'dayChangePct' | 'history'>) => {
        const priceInTry = convertToBase(invData.currentPrice);
        const newInv: Investment = {
            ...invData,
            currentPrice: priceInTry,
            id: crypto.randomUUID(),
            dayChangePct: 0,
            history: generateHistory(priceInTry, 5, 0.02)
        };
        setInvestments(prev => [newInv, ...prev]);
    };

    const deleteInvestment = (id: string) => {
        setInvestments(prev => prev.filter(i => i.id !== id));
    };

    const updateSettings = (s: Partial<UserSettings>) => setSettings(prev => ({ ...prev, ...s }));

    return (
        <AppContext.Provider value={{ 
            basketItems, 
            investments, 
            settings, 
            currencySymbol,
            convertPrice,
            formatPrice,
            addBasketItem, 
            addPriceEntry, 
            deleteBasketItem,
            addInvestment, 
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