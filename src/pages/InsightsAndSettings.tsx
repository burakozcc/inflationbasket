import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store';
import { ScreenWrapper, Header, BottomNav } from '../../components/Shared';
import { SmoothAreaChart } from '../../components/Charts';
import { DateRange } from '../lib/dateRange';

export const AIInsightsPage = () => {
    const { 
        basketItems, 
        fetchAIInsights, 
        aiState, 
        selectedRange, 
        setSelectedRange,
        isPremium,          
        entitlementLoading,
        purchasePremium    
    } = useAppStore();

    // Auto-fetch for Premium users on mount or range change
    useEffect(() => {
        if (isPremium) {
            fetchAIInsights(selectedRange);
        }
    }, [isPremium, selectedRange, fetchAIInsights]);

    const handleUnlock = async () => {
        await purchasePremium();
    };

    const handleRefresh = () => {
        fetchAIInsights(selectedRange);
    };

    if (entitlementLoading) {
        return (
            <ScreenWrapper className="pb-40">
                <Header title="AI Insights" />
                <div className="flex-1 flex flex-col items-center justify-center p-10 opacity-70">
                    <div className="size-10 rounded-full border-4 border-primary/20 border-t-primary animate-spin mb-4"></div>
                    <p className="text-gray-400 font-medium text-sm animate-pulse">Verifying subscription...</p>
                </div>
                <BottomNav />
            </ScreenWrapper>
        );
    }

    return (
        <ScreenWrapper className="pb-24">
            <header className="sticky top-0 z-50 backdrop-blur-md bg-[#112222]/80 border-b border-white/5 px-4 pt-4 pb-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-white text-lg font-bold tracking-tight">AI Insights</h2>
                    <div className="flex items-center px-3 py-1 rounded-full bg-primary/20 border border-primary/30">
                        <span className="material-symbols-outlined text-primary text-[16px] mr-1">verified</span>
                        <p className="text-primary text-xs font-bold tracking-wide uppercase">Premium</p>
                    </div>
                </div>
            </header>
            
            <main className="flex-1 flex flex-col p-5 gap-6 relative">
                {/* Premium Lock Overlay - Gated by Entitlement (isPremium) */}
                {!isPremium && (
                    <div className="absolute inset-0 z-20 backdrop-blur-md bg-background-dark/80 flex flex-col items-center justify-center p-8 text-center rounded-xl h-full">
                        <span className="material-symbols-outlined text-primary text-6xl mb-4">lock</span>
                        <h2 className="text-2xl font-bold text-white mb-2">Unlock AI Insights</h2>
                        <p className="text-gray-400 mb-6">Get personalized inflation tracking and investment analysis powered by Gemini.</p>
                        <button onClick={handleUnlock} className="bg-primary text-black font-bold py-3 px-8 rounded-xl shadow-[0_0_20px_rgba(19,236,236,0.4)] hover:scale-105 transition-transform">
                            Unlock Premium
                        </button>
                    </div>
                )}

                {/* Range Selector */}
                <div className="flex w-full bg-white/5 p-1 rounded-lg">
                    {(['1M', '3M', '1Y', 'YTD'] as const).map((t) => (
                        <button key={t} onClick={() => setSelectedRange(t)} className={`flex-1 rounded-md py-1.5 text-xs font-bold transition-all ${selectedRange === t ? 'bg-white/10 text-white shadow-sm' : 'text-gray-400'}`}>{t}</button>
                    ))}
                </div>

                {/* Loading State */}
                {aiState.status === 'loading' && (
                    <div className="flex flex-col items-center justify-center py-12 animate-pulse">
                        <div className="size-16 rounded-full bg-primary/20 flex items-center justify-center mb-4">
                            <span className="material-symbols-outlined text-primary text-3xl animate-spin">sync</span>
                        </div>
                        <p className="text-primary font-medium">Analyzing your basket...</p>
                    </div>
                )}

                {/* Error State */}
                {aiState.status === 'error' && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 text-center">
                         <span className="material-symbols-outlined text-red-400 text-4xl mb-2">error</span>
                         <p className="text-red-200 mb-4">{aiState.error}</p>
                         <button onClick={handleRefresh} className="text-xs font-bold bg-red-500/20 px-4 py-2 rounded text-red-300 hover:bg-red-500/30">Retry Analysis</button>
                    </div>
                )}

                {/* Success State - Real Data */}
                {aiState.status === 'success' && aiState.data && (
                    <>
                        <div className="flex flex-col items-center justify-center py-2">
                            <div className="relative flex items-center justify-center size-16">
                                <div className="absolute inset-0 bg-primary rounded-full animate-pulse blur-xl opacity-30"></div>
                                <div className="relative bg-gradient-to-br from-gray-800 to-black rounded-full size-12 flex items-center justify-center border border-white/10 shadow-lg">
                                    <span className="material-symbols-outlined text-primary text-[24px]">auto_awesome</span>
                                </div>
                            </div>
                            <p className="mt-2 text-primary/60 text-[10px] font-bold tracking-wider uppercase">Gemini Analysis Active</p>
                        </div>

                        <div className="relative w-full">
                            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5 shadow-xl">
                                <h3 className="text-primary font-bold text-sm uppercase tracking-wider mb-2">Summary</h3>
                                <p className="text-white text-base leading-relaxed font-light">
                                    {aiState.data.summary}
                                </p>
                            </div>
                        </div>

                        {aiState.data.drivers.length > 0 && (
                            <section>
                                <h3 className="text-white text-sm font-bold px-1 mb-2 flex items-center gap-2 text-gray-400 uppercase tracking-wider">
                                    <span className="material-symbols-outlined text-primary text-sm">trending_up</span>
                                    Key Drivers
                                </h3>
                                <ul className="bg-[#162a2a]/60 backdrop-blur-md border border-white/5 rounded-2xl p-4 shadow-lg flex flex-col gap-2">
                                    {aiState.data.drivers.map((driver, i) => (
                                        <li key={i} className="flex gap-2 items-start text-sm text-gray-300">
                                            <span className="text-primary font-bold">•</span>
                                            {driver}
                                        </li>
                                    ))}
                                </ul>
                            </section>
                        )}

                        {aiState.data.suggestions.length > 0 && (
                            <section>
                                <h3 className="text-white text-sm font-bold px-1 mb-2 flex items-center gap-2 text-gray-400 uppercase tracking-wider">
                                    <span className="material-symbols-outlined text-primary text-sm">lightbulb</span>
                                    Suggestions
                                </h3>
                                <ul className="bg-[#162a2a]/60 backdrop-blur-md border border-white/5 rounded-2xl p-4 shadow-lg flex flex-col gap-2">
                                    {aiState.data.suggestions.map((suggestion, i) => (
                                        <li key={i} className="flex gap-2 items-start text-sm text-gray-300">
                                            <span className="text-primary font-bold">•</span>
                                            {suggestion}
                                        </li>
                                    ))}
                                </ul>
                            </section>
                        )}
                        
                        <p className="text-[10px] text-gray-600 text-center px-4 mt-2">{aiState.data.disclaimer}</p>
                    </>
                )}

                {/* Blurred background content for locked state */}
                 {!isPremium && (
                     <div className="opacity-20 pointer-events-none filter blur-sm">
                        <div className="bg-white/5 p-5 rounded-2xl mb-4 h-32"></div>
                        <div className="bg-white/5 p-5 rounded-2xl h-40"></div>
                     </div>
                 )}

            </main>

            <BottomNav />
        </ScreenWrapper>
    );
};

export const SettingsPage = () => {
    const { settings, updateSettings, isPremium, purchasePremium, manageSubscription } = useAppStore();
    return (
        <ScreenWrapper>
            <Header title="Settings" />
            <main className="flex-1 px-4 py-6 space-y-8">
                <section>
                    <h3 className="text-gray-400 text-xs font-medium uppercase tracking-wider pl-4 mb-2">Appearance</h3>
                    <div className="bg-surface-dark rounded-xl overflow-hidden shadow-sm border border-white/5">
                        <div className="p-4 border-b border-white/5">
                             <div className="flex items-center gap-3 mb-4">
                                <div className="flex items-center justify-center rounded-lg bg-surface-highlight text-primary shrink-0 size-8">
                                    <span className="material-symbols-outlined text-[20px]">palette</span>
                                </div>
                                <span className="text-white text-base font-medium">App Theme</span>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                                {['System', 'Light', 'Dark'].map((theme) => (
                                    <div key={theme} onClick={() => updateSettings({ theme: theme.toLowerCase() as any })} 
                                        className={`flex flex-col items-center justify-center p-3 rounded-lg border cursor-pointer transition-all ${settings.theme === theme.toLowerCase() ? 'border-primary bg-primary/10' : 'border-white/10 bg-[#152828]'}`}>
                                        <span className={`material-symbols-outlined mb-1 ${settings.theme === theme.toLowerCase() ? 'text-primary' : 'text-gray-400'}`}>
                                            {theme === 'System' ? 'settings_brightness' : theme === 'Light' ? 'light_mode' : 'dark_mode'}
                                        </span>
                                        <span className={`text-xs font-medium ${settings.theme === theme.toLowerCase() ? 'text-primary' : 'text-gray-300'}`}>{theme}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>
                <section>
                     <h3 className="text-gray-400 text-xs font-medium uppercase tracking-wider pl-4 mb-2">Preferences</h3>
                     <div className="bg-surface-dark rounded-xl overflow-hidden shadow-sm border border-white/5">
                         {['Turkish Lira (TRY)', 'US Dollar (USD)', 'Euro (EUR)'].map((curr) => {
                             const code = curr.match(/\(([^)]+)\)/)?.[1] || 'USD';
                             const isSelected = settings.currency === code;
                             return (
                                <div key={curr} onClick={() => updateSettings({ currency: code })} className={`flex items-center justify-between p-4 cursor-pointer border-b border-white/5 last:border-0 transition-colors ${isSelected ? 'bg-primary/5' : 'hover:bg-white/5'}`}>
                                    <span className={`text-sm font-medium ${isSelected ? 'text-primary' : 'text-gray-200'}`}>{curr}</span>
                                    {isSelected && <span className="material-symbols-outlined text-primary">check</span>}
                                </div>
                             );
                         })}
                     </div>
                </section>
                <section>
                     <h3 className="text-gray-400 text-xs font-medium uppercase tracking-wider pl-4 mb-2">Account</h3>
                     <div className="bg-surface-dark rounded-xl overflow-hidden shadow-sm border border-white/5">
                         <div onClick={() => isPremium ? manageSubscription() : purchasePremium()} className="flex items-center justify-between p-4 cursor-pointer hover:bg-white/5">
                             <span className="text-gray-200 text-sm font-medium">Premium Status</span>
                             <span className={`text-xs font-bold px-2 py-1 rounded ${isPremium ? 'bg-primary/20 text-primary' : 'bg-gray-700 text-gray-400'}`}>
                                {isPremium ? 'ACTIVE (Manage)' : 'GET PREMIUM'}
                             </span>
                         </div>
                     </div>
                </section>
            </main>
            <BottomNav />
        </ScreenWrapper>
    );
};