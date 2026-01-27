import React from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';

export const BottomNav = () => {
    const location = useLocation();
    const isActive = (path: string) => location.pathname === path;

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 flex h-20 w-full max-w-md mx-auto items-start justify-around border-t border-white/5 bg-background-light/95 dark:bg-background-dark/95 pt-3 pb-8 backdrop-blur-lg">
            <NavItem to="/" icon="dashboard" label="Home" active={isActive('/')} />
            <NavItem to="/basket" icon="receipt_long" label="Basket" active={isActive('/basket')} />
            <NavItem to="/investments" icon="pie_chart" label="Invest" active={isActive('/investments')} />
            <NavItem to="/insights" icon="insights" label="Insights" active={isActive('/insights')} />
            <NavItem to="/settings" icon="settings" label="Settings" active={isActive('/settings')} />
        </nav>
    );
};

const NavItem = ({ to, icon, label, active }: { to: string; icon: string; label: string; active: boolean }) => (
    <Link to={to} className={`group flex flex-col items-center justify-center gap-1 transition-colors ${active ? 'text-primary' : 'text-gray-400 hover:text-white'}`}>
        <span className={`material-symbols-outlined text-[26px] ${active ? 'filled' : ''}`}>{icon}</span>
        <span className="text-[10px] font-medium">{label}</span>
    </Link>
);

export const ScreenWrapper = ({ children, className = "" }: { children?: React.ReactNode; className?: string }) => {
    return (
        <div className={`min-h-screen w-full max-w-md mx-auto bg-background-light dark:bg-background-dark text-slate-900 dark:text-white relative overflow-x-hidden shadow-2xl ${className}`}>
            {children}
        </div>
    );
};

export const Header = ({ title, showBack = false, rightAction }: { title: string; showBack?: boolean; rightAction?: React.ReactNode }) => {
    const navigate = useNavigate();
    return (
        <header className="sticky top-0 z-30 flex w-full items-center justify-between bg-background-light/80 dark:bg-background-dark/80 px-4 pt-4 pb-4 backdrop-blur-md border-b border-white/5">
            <div className="flex items-center gap-3">
                {showBack ? (
                    <button onClick={() => navigate(-1)} className="flex size-10 items-center justify-center rounded-full hover:bg-white/10 transition-colors">
                        <span className="material-symbols-outlined">arrow_back</span>
                    </button>
                ) : (
                    <button className="flex size-10 items-center justify-center rounded-full hover:bg-white/10 transition-colors">
                        <span className="material-symbols-outlined">menu</span>
                    </button>
                )}
                <h1 className="text-xl font-bold tracking-tight truncate max-w-[200px]">{title}</h1>
            </div>
            {rightAction || (
                <button 
                    onClick={() => navigate('/profile')}
                    className="flex size-10 items-center justify-center overflow-hidden rounded-full border border-gray-700 bg-surface-dark hover:border-primary/50 transition-colors"
                >
                    <span className="material-symbols-outlined text-gray-400">account_circle</span>
                </button>
            )}
        </header>
    );
};

export const FAB = ({ onClick, icon = "add" }: { onClick: () => void; icon?: string }) => (
    <button
        onClick={onClick}
        className="fixed bottom-24 right-4 z-40 flex size-14 items-center justify-center rounded-[1rem] bg-primary text-background-dark shadow-[0_4px_16px_rgba(19,236,236,0.4)] hover:scale-105 active:scale-95 transition-all"
        style={{ right: 'max(1rem, calc(50% - 224px + 1rem))' }} // Clamp using max() to ensure it stays visible on mobile while centering on desktop
    >
        <span className="material-symbols-outlined text-3xl">{icon}</span>
    </button>
);