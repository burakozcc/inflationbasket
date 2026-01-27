import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store';
import { supabase } from '../lib/supabase';

export const ProfilePage = () => {
    const navigate = useNavigate();
    const { settings, session, manageSubscription, purchasePremium } = useAppStore();
    const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');

        try {
            if (authMode === 'signup') {
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: { emailRedirectTo: 'myinflationbasket://auth/callback' }
                });
                if (error) throw error;
                setMessage('Check your email for the confirmation link!');
            } else {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;
                // Session update handled by store listener
            }
        } catch (err: any) {
            setMessage(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/');
    };

    const handleManagePlan = async () => {
        if (settings.isPremium) {
            await manageSubscription();
        } else {
            await purchasePremium();
        }
    };

    if (!session) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background-dark p-6">
                <div className="w-full max-w-md bg-surface-dark p-8 rounded-2xl border border-white/10 shadow-xl">
                    <h2 className="text-2xl font-bold text-white mb-2 text-center">{authMode === 'signin' ? 'Welcome Back' : 'Create Account'}</h2>
                    <p className="text-gray-400 text-center mb-6 text-sm">Sync your basket across devices</p>
                    
                    <form onSubmit={handleAuth} className="flex flex-col gap-4">
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase ml-1">Email</label>
                            <input 
                                type="email" 
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                className="w-full bg-background-dark border border-white/10 rounded-xl p-3 text-white focus:border-primary focus:outline-none mt-1"
                                placeholder="you@example.com"
                                required
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase ml-1">Password</label>
                            <input 
                                type="password" 
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                className="w-full bg-background-dark border border-white/10 rounded-xl p-3 text-white focus:border-primary focus:outline-none mt-1"
                                placeholder="••••••••"
                                required
                            />
                        </div>

                        {message && (
                            <div className={`text-sm p-3 rounded-lg ${message.includes('Check') ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                                {message}
                            </div>
                        )}

                        <button 
                            type="submit" 
                            disabled={loading}
                            className="bg-primary text-black font-bold py-3.5 rounded-xl hover:bg-primary-dim transition-colors mt-2 disabled:opacity-50"
                        >
                            {loading ? 'Please wait...' : authMode === 'signin' ? 'Sign In' : 'Sign Up'}
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <p className="text-sm text-gray-400">
                            {authMode === 'signin' ? "Don't have an account?" : "Already have an account?"}
                            <button 
                                onClick={() => { setAuthMode(authMode === 'signin' ? 'signup' : 'signin'); setMessage(''); }}
                                className="text-primary font-bold ml-2 hover:underline"
                            >
                                {authMode === 'signin' ? 'Sign Up' : 'Log In'}
                            </button>
                        </p>
                    </div>
                    
                    <button onClick={() => navigate(-1)} className="w-full mt-4 text-gray-500 text-sm hover:text-white">Cancel</button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen w-full max-w-md mx-auto bg-[#fafafa] dark:bg-[#18181b] text-slate-900 dark:text-white relative overflow-x-hidden shadow-2xl transition-colors duration-200 font-sans">
            {/* Top App Bar */}
            <header className="sticky top-0 z-50 flex items-center justify-between px-4 py-3 bg-[#fafafa]/80 dark:bg-[#18181b]/80 backdrop-blur-md">
                <button 
                    onClick={() => navigate(-1)}
                    className="flex items-center justify-center p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                >
                    <span className="material-symbols-outlined text-2xl dark:text-white">arrow_back_ios_new</span>
                </button>
                <h1 className="text-lg font-bold tracking-tight dark:text-white">Profile</h1>
                <div className="w-10"></div>
            </header>

            <main className="flex-1 flex flex-col items-center px-4 pt-4 pb-12 w-full">
                {/* Profile Header Section */}
                <div className="flex flex-col items-center w-full mb-8 relative z-10">
                    <div className="relative group">
                        <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-[#13ecec] via-[#0ea5a5] to-[#5F755F] opacity-30 blur-xl group-hover:opacity-50 transition duration-500"></div>
                        <div 
                            className="relative h-32 w-32 rounded-full border-4 border-[#fafafa] dark:border-[#18181b] overflow-hidden bg-[#252629] flex items-center justify-center"
                        >
                             <span className="text-4xl font-bold text-gray-500">{session.user.email?.substring(0,2).toUpperCase()}</span>
                        </div>
                        {settings.isPremium && (
                            <div className="absolute -bottom-3 left-1/2 transform -translate-x-1/2 bg-[#252629] border border-[#13ecec]/50 text-[#13ecec] px-3 py-1 rounded-full text-xs font-bold shadow-lg flex items-center gap-1 backdrop-blur-sm">
                                <span className="material-symbols-outlined text-[14px]">star</span>
                                PREMIUM
                            </div>
                        )}
                    </div>
                    
                    <div className="mt-6 text-center">
                        <h2 className="text-xl font-bold dark:text-white leading-tight break-all px-4">{session.user.email}</h2>
                        <p className="text-slate-500 dark:text-slate-400 font-medium text-sm mt-1">{settings.isPremium ? 'Premium Member' : 'Free Plan'}</p>
                    </div>
                </div>

                {/* Settings List Group */}
                <div className="w-full flex flex-col gap-4">
                    <MenuItem 
                        icon="person" 
                        title="Personal Info" 
                        subtitle="Details & Preferences" 
                        onClick={() => navigate('/profile/personal-info')}
                    />
                     <MenuItem 
                        icon="lock" 
                        title="Security" 
                        subtitle="Password & Auth" 
                        onClick={() => navigate('/profile/security')}
                    />
                    <MenuItem 
                        icon="account_balance" 
                        title="Linked Accounts" 
                        subtitle="Bank Connections" 
                        onClick={() => navigate('/profile/linked-accounts')}
                    />
                    <MenuItem 
                        icon="credit_card" 
                        title="Manage Plan" 
                        subtitle={settings.isPremium ? "Active Subscription" : "Upgrade to Premium"} 
                        badge={settings.isPremium ? "ACTIVE" : "UPGRADE"} 
                        onClick={handleManagePlan}
                    />
                    <MenuItem 
                        icon="help" 
                        title="Help & Support" 
                        subtitle="FAQ & Contact" 
                        onClick={() => navigate('/profile/help')}
                    />
                    <MenuItem 
                        icon="info" 
                        title="About" 
                        subtitle="Version & Legal" 
                        onClick={() => navigate('/profile/about')}
                    />
                </div>

                {/* Footer Section */}
                <div className="mt-12 w-full flex flex-col items-center gap-6">
                    <button 
                        onClick={handleLogout}
                        className="w-full py-4 rounded-xl border border-[#13ecec]/30 hover:bg-[#13ecec]/5 active:bg-[#13ecec]/10 text-[#13ecec] font-bold tracking-wide transition-all duration-200 flex items-center justify-center gap-2"
                    >
                        <span className="material-symbols-outlined">logout</span>
                        Log Out
                    </button>
                    <p className="text-xs text-slate-500 dark:text-slate-600">v1.0.0 (Beta)</p>
                </div>
            </main>
        </div>
    );
};

const MenuItem = ({ icon, title, subtitle, badge, onClick }: { icon: string; title: string; subtitle: string; badge?: string; onClick?: () => void }) => (
    <button 
        onClick={onClick}
        className="group w-full flex items-center justify-between p-4 bg-white dark:bg-[#252629] rounded-xl shadow-[0_0_20px_-5px_rgba(19,236,236,0.15)] hover:shadow-[0_0_25px_-5px_rgba(19,236,236,0.3)] transition-all duration-300 border border-transparent dark:border-white/5 hover:border-[#13ecec]/30"
    >
        <div className="flex items-center gap-4">
            <div className="flex items-center justify-center h-12 w-12 rounded-full bg-[#13ecec]/10 text-[#13ecec] group-hover:bg-[#13ecec] group-hover:text-[#252629] transition-colors duration-300">
                <span className="material-symbols-outlined">{icon}</span>
            </div>
            <div className="text-left">
                <div className="flex items-center gap-2">
                    <p className="font-semibold text-slate-800 dark:text-white text-base">{title}</p>
                    {badge && (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badge === 'ACTIVE' || badge === 'ONLINE' ? 'bg-[#5F755F]/20 text-[#5F755F] border-[#5F755F]/30' : 'bg-gray-500/20 text-gray-400 border-gray-500/30'}`}>{badge}</span>
                    )}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>
            </div>
        </div>
        <span className="material-symbols-outlined text-slate-400 group-hover:text-[#13ecec] transition-colors">chevron_right</span>
    </button>
);