import React from 'react';
import { ScreenWrapper, Header } from '../../components/Shared';

export const AboutPage = () => {
    return (
        <ScreenWrapper>
            <Header title="About" showBack={true} />
            <main className="flex flex-col items-center justify-center p-8 text-center flex-1 min-h-[60vh]">
                <div className="h-24 w-24 bg-gradient-to-br from-primary to-primary-dim rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20 mb-6">
                    <span className="material-symbols-outlined text-background-dark text-5xl">shopping_basket</span>
                </div>
                
                <h1 className="text-2xl font-bold text-white mb-1">My Inflation Basket</h1>
                <p className="text-gray-500 font-mono text-xs mb-6">v1.0.0 (Beta)</p>

                <p className="text-gray-300 leading-relaxed mb-8 max-w-sm">
                    Track your true cost of living. Analyze price changes in your personal basket items and investments to see your real inflation rate vs. national averages.
                </p>

                <div className="flex flex-col gap-4 w-full max-w-xs">
                    <button className="text-sm text-primary hover:underline">Privacy Policy</button>
                    <button className="text-sm text-primary hover:underline">Terms of Service</button>
                    <button className="text-sm text-gray-500 mt-4">© 2024 BurakOzcc</button>
                </div>
            </main>
        </ScreenWrapper>
    );
};

export default AboutPage;