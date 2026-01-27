export interface HistoricalPoint {
    date: string;
    value: number;
}

export interface BasketItem {
    id: string;
    name: string;
    category: string;
    price: number;
    lastUpdated: string;
    inflationRate: number;
    trend: 'up' | 'down' | 'stable';
    image?: string;
    history: HistoricalPoint[];
}

export interface Investment {
    id: string;
    symbol: string;
    name: string;
    type: 'stock' | 'etf' | 'crypto' | 'bond' | 'commodity' | 'fx';
    quantity: number;
    currentPrice: number;
    dayChangePct: number;
    history: HistoricalPoint[];
}

export interface UserSettings {
    currency: string;
    theme: 'light' | 'dark' | 'system';
    compactView: boolean;
    isPremium: boolean;
}

export interface AIInsightResponse {
    summary: string;
    drivers: string[];
    suggestions: string[];
    disclaimer: string;
}

export interface AIState {
    status: 'idle' | 'loading' | 'success' | 'error';
    data?: AIInsightResponse;
    error?: string;
    lastUpdatedISO?: string;
}