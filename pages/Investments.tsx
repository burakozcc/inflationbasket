import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store';
import { SmoothAreaChart } from '../components/Charts';
import { ScreenWrapper, BottomNav, FAB } from '../components/Shared';

export const InvestmentsPage = () => {
    const { investments, formatPrice, convertPrice, currencySymbol } = useAppStore();
    const navigate = useNavigate();
    
    // Total value based on stored base prices (TRY)
    const totalValue = investments.reduce((sum, inv) => sum + (inv.currentPrice * inv.quantity), 0);
    
    // Convert history of first item for preview
    const chartData = investments.length > 0 
        ? investments[0].history.map(p => ({...p, value: convertPrice(p.value)})) 
        : [];

    return (
        <ScreenWrapper className="pb-24">
             <div className="sticky top-0 z-20 bg-background-dark/95 backdrop-blur-md pt-4">
                <div className="flex items-center justify-between px-5 py-4">
                    <h1 className="text-2xl font-bold tracking-tight">Portfolio</h1>
                    <button onClick={() => navigate('/add?mode=investment')} className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary hover:bg-primary hover:text-black transition-colors">
                        <span className="material-symbols-outlined font-semibold">add</span>
                    </button>
                </div>
            </div>

            <main className="flex-1 flex flex-col gap-6 px-5">
                <section className="w-full">
                    <div className="flex flex-col gap-1 rounded-2xl bg-surface-dark p-6 shadow-lg border border-white/5 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                        <p className="text-gray-400 text-sm font-medium z-10">Total Portfolio Value</p>
                        <p className="text-white text-3xl font-bold tracking-tight z-10 my-1">{formatPrice(totalValue)}</p>
                        <div className="flex items-center gap-2 z-10">
                            <div className="flex items-center justify-center rounded-full bg-primary/20 px-2 py-0.5">
                                <span className="material-symbols-outlined text-primary text-sm mr-1">trending_up</span>
                                <span className="text-primary text-xs font-bold">+0.5%</span>
                            </div>
                            {/* Assuming constant mock growth for now */}
                            <p className="text-primary text-sm font-medium">+{currencySymbol}450.00 today</p>
                        </div>
                    </div>
                </section>
                
                {investments.length > 0 && (
                    <div className="rounded-xl bg-surface-dark p-4 shadow-sm border border-white/5">
                         <div className="flex justify-between items-start mb-2">
                            <p className="text-slate-400 text-sm font-medium">Portfolio Growth</p>
                             <div className="flex gap-1 bg-black/20 p-1 rounded-lg">
                                <button className="px-2 py-1 text-xs font-medium text-slate-400">1M</button>
                                <button className="px-2 py-1 text-xs font-bold bg-slate-700 text-white rounded">YTD</button>
                            </div>
                        </div>
                        <SmoothAreaChart data={chartData} color="#13ecec" height={140} />
                    </div>
                )}

                <section>
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-white text-lg font-bold leading-tight">Assets</h3>
                    </div>
                    {investments.length === 0 ? (
                        <div className="text-center p-8 text-gray-500 border border-white/5 border-dashed rounded-xl">
                            No investments yet. Add one!
                        </div>
                    ) : (
                        <div className="flex flex-col gap-3">
                            {investments.map(inv => (
                                <div key={inv.id} onClick={() => navigate(`/investment/${inv.id}`)} className="flex items-center justify-between p-4 rounded-xl bg-surface-dark border border-white/5 active:bg-white/5 transition-colors cursor-pointer">
                                    <div className="flex items-center gap-3">
                                        <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-black overflow-hidden font-bold">
                                            {inv.symbol.substring(0, 1)}
                                        </div>
                                        <div className="flex flex-col">
                                            <p className="text-white font-bold leading-none mb-1">{inv.symbol}</p>
                                            <p className="text-gray-400 text-xs font-medium">{inv.quantity} Units</p>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end">
                                        <p className="text-white font-bold leading-none mb-1">{formatPrice(inv.currentPrice)}</p>
                                        <div className="flex items-center gap-1">
                                            <span className={`material-symbols-outlined text-xs ${inv.dayChangePct >= 0 ? 'text-primary' : 'text-loss'}`}>
                                                {inv.dayChangePct >= 0 ? 'arrow_upward' : 'arrow_downward'}
                                            </span>
                                            <p className={`text-xs font-bold ${inv.dayChangePct >= 0 ? 'text-primary' : 'text-loss'}`}>{Math.abs(inv.dayChangePct)}%</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            </main>
            <FAB onClick={() => navigate('/add?mode=investment')} />
            <BottomNav />
        </ScreenWrapper>
    );
};