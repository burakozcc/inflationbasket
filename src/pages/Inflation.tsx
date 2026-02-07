import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { User } from '@supabase/supabase-js';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { useAppStore } from '../store';
import { supabase } from '../lib/supabase';
import { SmoothAreaChart } from '../../components/Charts';
import { ScreenWrapper, Header, BottomNav, FAB } from '../../components/Shared';
import { calcWeightedInflation } from '../lib/inflation';
import { DateRange, getDateRangeWindow } from '../lib/dateRange';
import { formatTRDate } from '../utils/date';

export type HomeBasketRow = { id: string; name: string; category: string; weight?: number; unit?: string; is_active: boolean; created_at?: string };

export const HomePage = () => {
    const { basketItems, currencySymbol, formatPrice, convertPrice, selectedRange, setSelectedRange, updateBasketItem } = useAppStore();
    const navigate = useNavigate();
    const [session, setSession] = useState<{ user: { id: string } } | null>(null);
    const [homeItems, setHomeItems] = useState<HomeBasketRow[]>([]);
    const [homeLoading, setHomeLoading] = useState(true);
    const [homeError, setHomeError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            const { data: { session: s }, error } = await supabase.auth.getSession();
            if (cancelled) return;
            setSession(s ?? null);
            if (error) {
                setHomeError(error.message);
                setHomeLoading(false);
                return;
            }
            if (!s?.user?.id) {
                setHomeLoading(false);
                return;
            }
            setHomeError(null);
            const { data, error: fetchErr } = await supabase
                .from('basket_items')
                .select('id, name, category, weight, unit, is_active, created_at')
                .eq('user_id', s.user.id)
                .eq('is_active', true)
                .order('created_at', { ascending: false });
            if (cancelled) return;
            if (fetchErr) {
                setHomeError(fetchErr.message);
                setHomeItems([]);
            } else {
                setHomeItems((data ?? []) as HomeBasketRow[]);
            }
            setHomeLoading(false);
        })();
        return () => { cancelled = true; };
    }, []);

    const handleDeactivate = async (id: string) => {
        if (!confirm('Remove this item from your active basket? You can add it again later.')) return;
        try {
            await updateBasketItem(id, { is_active: false } as any);
            setHomeItems(prev => prev.filter(i => i.id !== id));
        } catch (e) {
            setHomeError((e as Error)?.message ?? 'Failed to update');
        }
    };

    // Calculate Weighted Inflation based on the selected time range
    const totalInflation = useMemo(() => {
        return calcWeightedInflation(basketItems, selectedRange);
    }, [basketItems, selectedRange]);
    
    // Prepare Chart Data (Converted to selected currency)
    const chartData = useMemo(() => {
        if (basketItems.length === 0) return [];
        
        // Use first item as trend proxy
        if (!basketItems[0]?.history) return [];
        const fullHistory = basketItems[0].history;
        
        const { startDate } = getDateRangeWindow(selectedRange);

        // Filter and map values to current currency
        return fullHistory
            .filter(point => new Date(point.date) >= startDate)
            .map(p => ({ ...p, value: convertPrice(p.value) }));
    }, [basketItems, selectedRange, convertPrice]);

    const categoryData = useMemo(() => {
        const grouped = basketItems.reduce((acc, item) => {
            acc[item.category] = (acc[item.category] || 0) + item.price;
            return acc;
        }, {} as Record<string, number>);

        const defaultCategories = ['Groceries', 'Utilities', 'Transport', 'Entertainment', 'Housing'];
        defaultCategories.forEach(cat => {
             if (!grouped[cat] && basketItems.length === 0) grouped[cat] = 1; 
             else if (!grouped[cat]) grouped[cat] = 0;
        });

        return Object.entries(grouped)
            .map(([name, value]) => ({ name, value: convertPrice(value as number) }))
            .filter(item => item.value > 0)
            .sort((a, b) => b.value - a.value);
    }, [basketItems, convertPrice]);

    const totalMonthlySpend = basketItems.reduce((acc, item) => acc + item.price, 0);

    const COLORS = ['#3b82f6', '#13ecec', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef'];

    const getIconForCategory = (name: string) => {
        switch (name) {
            case 'Groceries': return 'shopping_basket';
            case 'Utilities': return 'bolt';
            case 'Transport': return 'directions_car';
            case 'Entertainment': return 'local_pizza';
            case 'Housing': return 'home';
            default: return 'sell';
        }
    };

    const renderCustomizedLabel = (props: any) => {
        const { cx, cy, midAngle, innerRadius, outerRadius, percent, name } = props;
        if (percent < 0.10) return null;
        const RADIAN = Math.PI / 180;
        const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
        const x = cx + radius * Math.cos(-midAngle * RADIAN);
        const y = cy + radius * Math.sin(-midAngle * RADIAN);

        return (
            <g className="pointer-events-none"> 
                <foreignObject x={x - 10} y={y - 10} width={20} height={20} style={{ overflow: 'visible' }}>
                    <div className="flex items-center justify-center w-full h-full drop-shadow-md">
                        <span className="material-symbols-outlined text-white" style={{ fontSize: '18px', textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
                            {getIconForCategory(name)}
                        </span>
                    </div>
                </foreignObject>
            </g>
        );
    };

    return (
        <ScreenWrapper className="pb-24">
            <Header title="My Inflation Basket" />
            <main className="flex flex-col gap-6 px-4 pt-2">
                <div className="group relative flex w-full flex-col overflow-hidden rounded-xl bg-surface-dark shadow-none ring-1 ring-white/10">
                    <div className="relative z-10 p-6 pb-2">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-400">Personal Inflation ({selectedRange})</span>
                            <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold ${totalInflation >= 0 ? 'bg-red-900/30 text-red-400' : 'bg-green-900/30 text-green-400'}`}>
                                <span className="material-symbols-outlined text-[14px]">{totalInflation >= 0 ? 'trending_up' : 'trending_down'}</span>
                                {totalInflation >= 5 ? 'High' : totalInflation > 0 ? 'Moderate' : 'Deflation'}
                            </span>
                        </div>
                        <div className="mt-2 flex items-baseline gap-3">
                            <h2 className="text-5xl font-extrabold tracking-tight text-white">{totalInflation.toFixed(1)}<span className="text-3xl text-primary">%</span></h2>
                        </div>
                        <p className="mt-1 text-sm font-medium text-gray-400">
                            <span className={totalInflation > 3 ? "text-red-400 font-bold" : "text-green-400 font-bold"}>
                                {totalInflation > 3 ? `+${(totalInflation - 3).toFixed(1)}%` : `-${(3 - totalInflation).toFixed(1)}%`}
                            </span> vs National Avg (3.0%)
                        </p>
                    </div>
                    <div className="relative h-40 w-full mt-2">
                        {chartData.length > 0 ? (
                            <SmoothAreaChart data={chartData} color="#13ecec" height={160} />
                        ) : (
                            <div className="flex h-full w-full items-center justify-center rounded-lg bg-white/5 border border-white/5 mx-4 my-2" style={{ width: 'calc(100% - 2rem)' }}>
                                <p className="text-sm font-medium text-gray-500">Not enough data for this period</p>
                            </div>
                        )}
                    </div>
                    <div className="flex w-full border-t border-white/5 p-2 gap-1 overflow-x-auto no-scrollbar">
                        {(['1W', '1M', '3M', '1Y', 'YTD', 'ALL'] as const).map((t) => (
                            <button key={t} onClick={() => setSelectedRange(t)} className={`flex-1 min-w-[3rem] rounded-lg py-2 text-xs font-semibold transition-all ${selectedRange === t ? 'bg-white/10 text-white shadow-sm' : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'}`}>{t}</button>
                        ))}
                    </div>
                </div>

                <div>
                    <h3 className="text-lg font-bold text-white mb-2 px-1">Basket Items</h3>
                    {!session && !homeLoading && (
                        <div className="rounded-xl bg-surface-dark border border-white/5 p-6 text-center">
                            <p className="text-gray-400 mb-4">Please log in to see your basket.</p>
                            <button onClick={() => navigate('/profile')} className="px-6 py-3 rounded-xl bg-primary text-black font-bold">Go to Login</button>
                        </div>
                    )}
                    {session && homeLoading && (
                        <div className="rounded-xl bg-surface-dark border border-white/5 p-6 text-center text-gray-400">Loading...</div>
                    )}
                    {session && !homeLoading && homeError && (
                        <div className="rounded-xl bg-red-900/20 border border-red-500/30 p-3 text-red-400 text-sm">{homeError}</div>
                    )}
                    {session && !homeLoading && !homeError && homeItems.length === 0 && (
                        <div className="rounded-xl bg-surface-dark border border-white/5 p-6 text-center text-gray-500">No active items. Add items to get started.</div>
                    )}
                    {session && !homeLoading && !homeError && homeItems.length > 0 && (
                        <div className="flex flex-col gap-2">
                            {homeItems.map(item => (
                                <div key={item.id} className="bg-surface-dark border border-white/5 rounded-xl p-3 flex items-center justify-between active:scale-[0.99] transition-transform">
                                    <div onClick={() => navigate(`/item/${item.id}`)} className="flex-1 min-w-0 cursor-pointer">
                                        <p className="text-xs text-gray-400 uppercase tracking-wider">{item.category}</p>
                                        <p className="font-bold text-white truncate">{item.name}</p>
                                    </div>
                                    <button onClick={(e) => { e.stopPropagation(); handleDeactivate(item.id); }} className="flex size-10 items-center justify-center rounded-full hover:bg-red-900/20 text-gray-400 hover:text-red-400 transition-colors" aria-label="Remove from basket">
                                        <span className="material-symbols-outlined text-lg">remove_circle_outline</span>
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div>
                    <div className="mb-2 flex items-center justify-between px-1">
                        <h3 className="text-lg font-bold text-white">Expenses by Category</h3>
                        <button onClick={() => navigate('/categories')} className="text-sm font-medium text-primary hover:text-primary/80">See All</button>
                    </div>
                    <div className="relative flex flex-col items-center justify-center rounded-2xl bg-[#13161b] p-4 shadow-lg border border-white/5 min-h-[300px]">
                         {basketItems.length === 0 ? (
                             <div className="text-gray-500 text-sm">Add items to see breakdown</div>
                         ) : (
                            <div className="relative w-full h-[260px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={categoryData} cx="50%" cy="50%" innerRadius={75} outerRadius={105} paddingAngle={4} dataKey="value" stroke="none" label={renderCustomizedLabel} labelLine={false} onClick={() => navigate('/categories')} cursor="pointer" animationDuration={1000}>
                                            {categoryData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} className="hover:opacity-80 transition-opacity outline-none" strokeWidth={0} />
                                            ))}
                                        </Pie>
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                    <span className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mb-0.5">Total</span>
                                    <span className="text-white text-2xl font-extrabold tracking-tight drop-shadow-lg">
                                        {formatPrice(totalMonthlySpend)}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-[#1c3a3a] to-[#112222] p-5 shadow-sm ring-1 ring-white/10">
                    <div className="relative z-10 flex gap-4">
                        <div className="flex-1">
                            <h4 className="text-base font-bold text-white mb-1">Weekly Insight</h4>
                            <p className="text-sm text-gray-300 leading-relaxed">
                                Your food costs are rising slower than the national average this month. Great job!
                            </p>
                        </div>
                        <div className="flex shrink-0 items-center justify-center rounded-full bg-white/10 p-3 h-fit">
                            <span className="material-symbols-outlined text-primary">lightbulb</span>
                        </div>
                    </div>
                </div>
            </main>
            <FAB onClick={() => navigate('/add?mode=basket_item')} />
            <BottomNav />
        </ScreenWrapper>
    );
};

export const BasketPage = () => {
    const { basketItems, formatPrice, authLoading, authError } = useAppStore();
    const navigate = useNavigate();
    const [user, setUser] = useState<User | null>(null);
    const [userCheckDone, setUserCheckDone] = useState(false);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            const { data: { user: u }, error } = await supabase.auth.getUser();
            if (!cancelled) {
                setUser(u ?? null);
                setUserCheckDone(true);
            }
        })();
        return () => { cancelled = true; };
    }, []);

    const totalInflation = useMemo(() => calcWeightedInflation(basketItems, '3M'), [basketItems]);

    if (userCheckDone && !user) {
        return (
            <ScreenWrapper className="pb-24">
                <Header title="My Basket" />
                <main className="flex flex-col px-4 pt-8 gap-4 items-center justify-center min-h-[40vh]">
                    <p className="text-gray-400 text-center">Please log in</p>
                    <button onClick={() => navigate('/profile')} className="mt-4 px-6 py-3 rounded-xl bg-primary text-black font-bold">Sign in</button>
                </main>
                <BottomNav />
            </ScreenWrapper>
        );
    }

    if (!userCheckDone || authLoading) {
        return (
            <ScreenWrapper className="pb-24">
                <Header title="My Basket" />
                <main className="flex flex-col px-4 pt-8 gap-4 items-center justify-center min-h-[40vh]">
                    <p className="text-gray-400">Loading basket...</p>
                </main>
                <BottomNav />
            </ScreenWrapper>
        );
    }

    return (
        <ScreenWrapper className="pb-24">
            <Header title="My Basket" />
            <main className="flex flex-col px-4 pt-4 gap-4">
                {authError && (
                    <div className="rounded-xl bg-red-900/20 border border-red-500/30 p-3 text-red-400 text-sm">
                        {authError}
                    </div>
                )}
                <div className="bg-surface-dark rounded-xl p-4 border border-white/5 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">Avg Inflation (3M)</p>
                        <h2 className="text-2xl font-bold text-white mt-1">{totalInflation.toFixed(1)}%</h2>
                    </div>
                    <div className="flex flex-col items-end">
                        <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">Items</p>
                        <h2 className="text-2xl font-bold text-white mt-1">{basketItems.length}</h2>
                    </div>
                </div>

                <div className="flex flex-col gap-3">
                    {basketItems.map(item => (
                        <div key={item.id} onClick={() => navigate(`/item/${item.id}`)} className="bg-surface-dark border border-white/5 rounded-xl p-3 flex items-center justify-between active:scale-[0.99] transition-transform cursor-pointer">
                            <div className="flex items-center gap-3">
                                <div className="size-12 rounded-lg bg-white/5 overflow-hidden">
                                     <img src={item.image} alt={item.name} className="size-full object-cover" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-white text-sm">{item.name}</h3>
                                    <p className="text-xs text-gray-400">{item.category}</p>
                                </div>
                            </div>
                            <div className="flex flex-col items-end">
                                <p className="font-bold text-white">{formatPrice(item.price)}</p>
                                <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${item.trend === 'up' ? 'bg-red-500/20 text-red-400' : item.trend === 'down' ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>
                                    {item.inflationRate > 0 ? '+' : ''}{item.inflationRate}%
                                </span>
                            </div>
                        </div>
                    ))}
                    {basketItems.length === 0 && !authError && (
                        <div className="text-center py-12 text-gray-500">
                            Your basket is empty.<br/>Add items to track inflation.
                        </div>
                    )}
                </div>
            </main>
            <FAB onClick={() => navigate('/add?mode=basket_item')} />
            <BottomNav />
        </ScreenWrapper>
    );
};

export type PriceEntryRow = { id: string; basket_item_id?: string; price_date: string; price: number; currency: string; source?: string; note?: string; created_at?: string };

export const ItemDetailPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { formatPrice } = useAppStore();
    const [session, setSession] = useState<{ user: { id: string } } | null>(null);
    const [item, setItem] = useState<{ id: string; name: string; category: string } | null>(null);
    const [entries, setEntries] = useState<PriceEntryRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!id) {
            setLoading(false);
            return;
        }
        let cancelled = false;
        (async () => {
            const { data: { session: s }, error: sessErr } = await supabase.auth.getSession();
            if (cancelled) return;
            setSession(s ?? null);
            if (sessErr || !s?.user?.id) {
                setError(sessErr?.message ?? 'Not logged in');
                setLoading(false);
                return;
            }
            const userId = s.user.id;
            const { data: itemData, error: itemErr } = await supabase
                .from('basket_items')
                .select('id, name, category')
                .eq('id', id)
                .eq('user_id', userId)
                .maybeSingle();
            if (cancelled) return;
            if (itemErr) {
                setError(itemErr.message);
                setLoading(false);
                return;
            }
            if (!itemData) {
                setItem(null);
                setEntries([]);
                setLoading(false);
                return;
            }
            setItem(itemData as { id: string; name: string; category: string });
            const { data: entriesData, error: entriesErr } = await supabase
                .from('basket_price_entries')
                .select('id, basket_item_id, price, currency, price_date, source, note, created_at')
                .eq('basket_item_id', id)
                .eq('user_id', userId)
                .order('price_date', { ascending: false })
                .limit(30);
            if (cancelled) return;
            if (entriesErr) {
                setError(entriesErr.message);
                setEntries([]);
            } else {
                setEntries((entriesData ?? []) as PriceEntryRow[]);
            }
            setLoading(false);
        })();
        return () => { cancelled = true; };
    }, [id]);

    const latestPrice = entries.length > 0 ? entries[0].price : null;
    const previousPrice = entries.length > 1 ? entries[1].price : null;
    const pctChange = latestPrice != null && previousPrice != null && previousPrice !== 0
        ? ((latestPrice - previousPrice) / previousPrice) * 100
        : null;

    const handleDeleteEntry = async (entryId: string) => {
        if (!session?.user?.id) return;
        if (!confirm('Delete this price entry?')) return;
        const { error: delErr } = await supabase
            .from('basket_price_entries')
            .delete()
            .eq('id', entryId)
            .eq('user_id', session.user.id);
        if (delErr) {
            if (import.meta.env.DEV) console.error('[ItemDetail] delete price entry error', delErr);
            setError(delErr.message);
            return;
        }
        setEntries(prev => prev.filter(e => e.id !== entryId));
    };

    if (loading) {
        return (
            <ScreenWrapper className="pb-24">
                <Header title="Item" showBack />
                <div className="p-10 text-gray-400 text-center">Loading...</div>
            </ScreenWrapper>
        );
    }
    if (!session) {
        return (
            <ScreenWrapper className="pb-24">
                <Header title="Item" showBack />
                <div className="p-6 text-center">
                    <p className="text-gray-400 mb-4">Please log in to view this item.</p>
                    <button onClick={() => navigate('/profile')} className="px-6 py-3 rounded-xl bg-primary text-black font-bold">Go to Login</button>
                </div>
            </ScreenWrapper>
        );
    }
    if (!item) {
        return (
            <ScreenWrapper className="pb-24">
                <Header title="Item Not Found" showBack />
                <div className="p-10 text-white text-center">Item not found</div>
            </ScreenWrapper>
        );
    }

    return (
        <ScreenWrapper className="pb-24">
            <header className="sticky top-0 z-30 flex w-full items-center justify-between bg-background-dark/80 px-4 pt-4 pb-4 backdrop-blur-md border-b border-white/5">
                <button onClick={() => navigate(-1)} className="flex size-10 items-center justify-center rounded-full hover:bg-white/10 transition-colors"><span className="material-symbols-outlined">arrow_back</span></button>
                <h1 className="text-lg font-bold tracking-tight text-white">{item.name}</h1>
                <div className="w-10" />
            </header>

            <main className="flex-1 flex flex-col px-4 pt-6 gap-6">
                {error && (
                    <div className="rounded-xl bg-red-900/20 border border-red-500/30 p-3 text-red-400 text-sm">{error}</div>
                )}
                <p className="text-xs text-gray-400 uppercase tracking-wider">{item.category}</p>

                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-surface-dark p-4 rounded-xl border border-white/5">
                        <p className="text-gray-400 text-xs uppercase font-bold">Latest price</p>
                        <p className="text-xl font-bold text-white mt-1">{latestPrice != null ? formatPrice(latestPrice) : '—'}</p>
                    </div>
                    <div className="bg-surface-dark p-4 rounded-xl border border-white/5">
                        <p className="text-gray-400 text-xs uppercase font-bold">Previous price</p>
                        <p className="text-xl font-bold text-white mt-1">{previousPrice != null ? formatPrice(previousPrice) : '—'}</p>
                    </div>
                </div>
                <div className="bg-surface-dark p-4 rounded-xl border border-white/5">
                    <p className="text-gray-400 text-xs uppercase font-bold">Change (latest vs previous)</p>
                    {pctChange != null ? (
                        <p className={`text-xl font-bold mt-1 ${pctChange >= 0 ? 'text-red-400' : 'text-green-400'}`}>
                            {pctChange >= 0 ? '+' : ''}{pctChange.toFixed(1)}%
                        </p>
                    ) : (
                        <p className="text-gray-500 mt-1">Insufficient data</p>
                    )}
                </div>

                <div>
                    <p className="text-sm font-bold text-gray-400 mb-3">Price history</p>
                    {entries.length === 0 ? (
                        <p className="text-gray-500 text-sm">No price entries yet.</p>
                    ) : (
                        <ul className="flex flex-col gap-2">
                            {entries.map((entry) => (
                                <li key={entry.id} className="bg-surface-dark border border-white/5 rounded-xl p-3 flex items-center justify-between">
                                    <div>
                                        <p className="text-white font-medium">{formatTRDate(entry.price_date)}</p>
                                        <p className="text-gray-400 text-sm">{formatPrice(entry.price)} {entry.currency}</p>
                                    </div>
                                    <button onClick={() => handleDeleteEntry(entry.id)} className="flex size-10 items-center justify-center rounded-full hover:bg-red-900/20 text-gray-400 hover:text-red-400 transition-colors" aria-label="Delete entry">
                                        <span className="material-symbols-outlined text-lg">delete</span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </main>

            <div className="fixed bottom-0 left-0 right-0 p-4 bg-background-dark border-t border-white/10 z-20">
                <button onClick={() => navigate(`/add?mode=price_entry&entity=basket&relatedId=${item.id}`)} className="w-full bg-primary text-black font-bold h-12 rounded-xl">Add price entry</button>
            </div>
        </ScreenWrapper>
    );
};