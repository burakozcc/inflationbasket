import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store';
import { ScreenWrapper, Header, BottomNav } from '../components/Shared';
import { SmoothAreaChart } from '../components/Charts';

export const AIInsightsPage = () => {
    const { basketItems, settings, updateSettings, currencySymbol } = useAppStore();
    const demoChartData = basketItems.length > 0 ? basketItems[0].history : [];

    const handleUnlock = () => {
        if(confirm(`Upgrade to Premium for ${currencySymbol}4.99/mo? (Mock Payment)`)) {
            updateSettings({ isPremium: true });
        }
    };

    return (
        <ScreenWrapper className="pb-40">
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
                {/* Premium Lock Overlay */}
                {!settings.isPremium && (
                    <div className="absolute inset-0 z-20 backdrop-blur-md bg-background-dark/80 flex flex-col items-center justify-center p-8 text-center rounded-xl">
                        <span className="material-symbols-outlined text-primary text-6xl mb-4">lock</span>
                        <h2 className="text-2xl font-bold text-white mb-2">Unlock AI Insights</h2>
                        <p className="text-gray-400 mb-6">Get personalized inflation tracking and investment analysis powered by Gemini.</p>
                        <button onClick={handleUnlock} className="bg-primary text-black font-bold py-3 px-8 rounded-xl shadow-[0_0_20px_rgba(19,236,236,0.4)]">
                            Unlock for {currencySymbol}4.99
                        </button>
                    </div>
                )}

                <div className="flex flex-col items-center justify-center py-4">
                    <div className="relative flex items-center justify-center size-20">
                        <div className="absolute inset-0 bg-primary rounded-full animate-pulse blur-xl opacity-40"></div>
                        <div className="relative bg-gradient-to-br from-gray-800 to-black rounded-full size-16 flex items-center justify-center border border-white/10 shadow-2xl">
                            <span className="material-symbols-outlined text-primary text-[32px]">auto_awesome</span>
                        </div>
                    </div>
                    <p className="mt-3 text-primary/80 text-sm font-medium tracking-wider uppercase">Analysis Complete</p>
                </div>

                <div className="relative w-full">
                    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5 rounded-tl-sm shadow-xl">
                        <div className="flex flex-col gap-2">
                            <p className="text-white text-base leading-relaxed font-light">
                                <span className="text-primary font-medium">Good news!</span> Based on your last 10 receipts, your personal inflation rate is <span className="bg-primary/20 text-primary px-1 rounded">3.4%</span>.
                            </p>
                            <p className="text-gray-300 text-sm leading-relaxed">
                                That's lower than the national average. Switching your milk brand saved you <span className="text-white font-semibold">{currencySymbol}12</span> this month.
                            </p>
                        </div>
                    </div>
                </div>

                <section className="flex flex-col gap-3">
                    <h3 className="text-white text-lg font-bold px-1 flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary">monitoring</span>
                        Inflation Forecast
                    </h3>
                    <div className="bg-[#162a2a]/60 backdrop-blur-md border border-white/5 rounded-2xl p-5 shadow-lg">
                        <div className="flex justify-between items-start mb-2">
                             <div>
                                <p className="text-gray-400 text-sm font-medium">3-Month Trend</p>
                                <div className="flex items-baseline gap-2 mt-1">
                                    <h4 className="text-3xl font-bold text-white tracking-tight">+1.2%</h4>
                                    <span className="text-xs text-primary font-medium bg-primary/10 px-1.5 py-0.5 rounded">Predicted Rise</span>
                                </div>
                            </div>
                        </div>
                        <SmoothAreaChart data={demoChartData} color="#13ecec" height={120} />
                    </div>
                </section>
            </main>

            {/* Floating Action Button for AI Question */}
            <div className="fixed bottom-20 left-0 right-0 z-40 mx-auto w-full max-w-md px-4 pb-6 pt-12 bg-gradient-to-t from-background-dark via-background-dark/95 to-transparent pointer-events-none">
                <button className="pointer-events-auto w-full bg-primary hover:bg-[#0fd6d6] active:scale-[0.98] transition-all text-[#102222] font-bold text-base py-3.5 px-6 rounded-xl shadow-[0_4px_20px_rgba(19,236,236,0.3)] flex items-center justify-center gap-2">
                    <span className="material-symbols-outlined">chat_spark</span>
                    Ask AI a Question
                </button>
            </div>

            <BottomNav />
        </ScreenWrapper>
    );
};

export const SettingsPage = () => {
    const { settings, updateSettings } = useAppStore();
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
                         <div onClick={() => updateSettings({ isPremium: !settings.isPremium })} className="flex items-center justify-between p-4 cursor-pointer hover:bg-white/5">
                             <span className="text-gray-200 text-sm font-medium">Premium Status</span>
                             <span className={`text-xs font-bold px-2 py-1 rounded ${settings.isPremium ? 'bg-primary/20 text-primary' : 'bg-gray-700 text-gray-400'}`}>
                                {settings.isPremium ? 'ACTIVE' : 'FREE'}
                             </span>
                         </div>
                     </div>
                </section>
            </main>
            <BottomNav />
        </ScreenWrapper>
    );
};