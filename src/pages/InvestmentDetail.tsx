import React, { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppStore } from '../store';
import { SmoothAreaChart } from '../../components/Charts';
import { ScreenWrapper, Header } from '../../components/Shared';
import { getDateRangeWindow } from '../lib/dateRange';
import { getLatestPriceOnOrBefore } from '../lib/inflation';

export const InvestmentDetailPage = () => {
    const { id } = useParams();
    const { investments, deleteInvestment, formatPrice, convertPrice, selectedRange, setSelectedRange, basketItems } = useAppStore();
    const inv = investments.find(i => i.id === id);
    const navigate = useNavigate();

    if (!inv) return <div>Investment not found</div>;

    const handleDelete = () => {
        if (confirm("Are you sure you want to remove this asset?")) {
            deleteInvestment(inv.id);
            navigate(-1);
        }
    };
    
    // Compute Filtered History based on global range
    const filteredHistory = useMemo(() => {
        const { startDate } = getDateRangeWindow(selectedRange);
        return inv.history.filter(p => new Date(p.date) >= startDate);
    }, [inv.history, selectedRange]);

    // Convert History for Chart
    const convertedHistory = useMemo(() => {
        return filteredHistory.map(p => ({ ...p, value: convertPrice(p.value) }));
    }, [filteredHistory, convertPrice]);

    // Real Return Analysis Calculation
    const analysis = useMemo(() => {
        const { startDate, endDate } = getDateRangeWindow(selectedRange);
        
        // Investment Return
        const startPriceInv = getLatestPriceOnOrBefore(inv.history, startDate);
        const endPriceInv = getLatestPriceOnOrBefore(inv.history, endDate);
        
        let nominalReturn = 0;
        if (startPriceInv && endPriceInv) {
            nominalReturn = ((endPriceInv - startPriceInv) / startPriceInv) * 100;
        }
        
        return { nominalReturn };
    }, [inv.history, selectedRange]);

    return (
        <ScreenWrapper className="pb-24 border-x border-white/5">
            <header className="sticky top-0 z-50 flex items-center justify-between px-4 py-3 bg-background-dark/90 backdrop-blur-md border-b border-white/5">
                <button onClick={() => navigate(-1)} className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-white/10 transition-colors">
                    <span className="material-symbols-outlined text-white" style={{ fontSize: '24px' }}>arrow_back_ios_new</span>
                </button>
                <div className="flex flex-col items-center">
                    <span className="text-sm font-semibold tracking-wide text-slate-400">{inv.symbol}</span>
                    <span className="text-xs font-medium text-white">{inv.name}</span>
                </div>
                <div className="flex gap-1">
                     <button onClick={() => navigate(`/add?mode=investment&editId=${inv.id}`)} className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-white/10 transition-colors">
                        <span className="material-symbols-outlined text-primary" style={{ fontSize: '20px' }}>edit</span>
                    </button>
                    <button onClick={handleDelete} className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-red-900/30 transition-colors">
                        <span className="material-symbols-outlined text-red-500" style={{ fontSize: '24px' }}>delete</span>
                    </button>
                </div>
            </header>

            <main className="flex-1 flex flex-col">
                <div className="px-6 pt-6 pb-2 text-center">
                    <h1 className="text-4xl md:text-[40px] font-bold tracking-tight text-white leading-tight">
                        {formatPrice(inv.currentPrice)}
                    </h1>
                    <div className="flex items-center justify-center gap-2 mt-2">
                        <span className={`flex items-center font-medium text-sm bg-primary/10 px-2 py-0.5 rounded-md ${inv.dayChangePct >= 0 ? 'text-primary' : 'text-loss'}`}>
                            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>{inv.dayChangePct >= 0 ? 'trending_up' : 'trending_down'}</span>
                            {inv.dayChangePct > 0 ? '+' : ''}{inv.dayChangePct}%
                        </span>
                        <span className="text-slate-400 text-sm">Today</span>
                    </div>
                </div>

                <div className="relative w-full mt-4 mb-2">
                    <SmoothAreaChart data={convertedHistory} color={inv.dayChangePct >= 0 ? "#13ecec" : "#ff6b6b"} height={220} />
                </div>
                
                {/* Range Selectors for Chart */}
                <div className="flex justify-center gap-2 mb-4 px-4">
                    {(['1W', '1M', '3M', '1Y', 'YTD', 'ALL'] as const).map(r => (
                        <button 
                            key={r} 
                            onClick={() => setSelectedRange(r)}
                            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${selectedRange === r ? 'bg-white/20 text-white' : 'text-slate-500 hover:text-white'}`}
                        >
                            {r}
                        </button>
                    ))}
                </div>

                {/* AI Analysis */}
                <div className="px-4 mb-6 mt-2">
                    <div className="relative overflow-hidden rounded-2xl bg-surface-dark border border-white/5 p-5 shadow-lg">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-bold text-white">Period Return ({selectedRange})</h2>
                            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20">
                                <span className="material-symbols-outlined text-primary animate-pulse" style={{ fontSize: '16px' }}>smart_toy</span>
                                <span className="text-xs font-bold text-primary uppercase tracking-wider">AI Insight</span>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 mb-4">
                            <StatBox label="Nominal Return" val={`${analysis.nominalReturn > 0 ? '+' : ''}${analysis.nominalReturn.toFixed(1)}%`} />
                             <div className="flex flex-col p-3 rounded-xl bg-background-dark border border-white/5 relative overflow-hidden">
                                <div className="absolute inset-0 bg-loss/10"></div>
                                <span className="text-[10px] uppercase text-loss font-bold mb-1 relative z-10">Real Rtn</span>
                                <span className="text-base font-bold text-loss relative z-10">--%</span>
                            </div>
                        </div>
                        <div className="flex gap-3 items-start">
                            <div className="w-10 h-10 rounded-full bg-loss/20 flex items-center justify-center shrink-0">
                                <span className="material-symbols-outlined text-loss" style={{ fontSize: '20px' }}>trending_down</span>
                            </div>
                            <div>
                                <p className="text-sm text-slate-300 leading-relaxed">
                                    <span className="font-bold text-loss">Calculated for {selectedRange}.</span> Comparing this asset's performance against your personal inflation rate for the same period requires more data.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="px-4 pb-8">
                    <h3 className="text-base font-semibold text-white mb-3">Key Statistics</h3>
                    <div className="rounded-2xl bg-surface-dark border border-white/5 overflow-hidden">
                         <div className="flex items-center justify-between p-4 border-b border-white/5">
                            <span className="text-sm text-slate-400">Market Cap</span>
                            <span className="text-sm font-medium text-white">2.4T</span>
                        </div>
                         <div className="flex items-center justify-between p-4">
                            <span className="text-sm text-slate-400">P/E Ratio</span>
                            <span className="text-sm font-medium text-white">28.5</span>
                        </div>
                    </div>
                </div>
            </main>

            <div className="fixed bottom-0 left-0 right-0 z-40 p-4 pt-2 bg-gradient-to-t from-background-dark via-background-dark to-transparent max-w-md mx-auto">
                <div className="flex gap-3">
                    <button onClick={() => navigate(`/add?mode=price_entry&entity=investment&relatedId=${inv.id}`)} className="flex-1 h-12 rounded-xl bg-surface-highlight hover:bg-surface-highlight/80 text-white font-semibold text-base transition-all">Add Price</button>
                    <button className="flex-[2] h-12 rounded-xl bg-primary hover:bg-primary-dim text-background-dark font-bold text-base shadow-[0_0_15px_rgba(19,236,236,0.3)] transition-all">Buy {inv.symbol}</button>
                </div>
            </div>
        </ScreenWrapper>
    );
};

const StatBox = ({label, val}: any) => (
    <div className="flex flex-col p-3 rounded-xl bg-background-dark border border-white/5">
        <span className="text-[10px] uppercase text-slate-400 font-semibold mb-1">{label}</span>
        <span className="text-base font-bold text-white">{val}</span>
    </div>
);