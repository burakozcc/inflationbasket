import React, { useState } from 'react';
import { useAppStore } from '../store';
import { ScreenWrapper, Header } from '../../components/Shared';

export const LinkedAccountsPage = () => {
    const { addBasketItem } = useAppStore();
    const [status, setStatus] = useState('');

    const handleAddMockData = () => {
        // Add a few dummy items to local store only (store handles sync if session active)
        addBasketItem({
            name: 'Netflix Subscription',
            category: 'Entertainment',
            price: 15.99,
            image: 'https://picsum.photos/seed/netflix/200'
        });
        addBasketItem({
            name: 'Whole Foods Market',
            category: 'Groceries',
            price: 84.32,
            image: 'https://picsum.photos/seed/wholefoods/200'
        });
        
        setStatus('Added 2 transactions from "Demo Bank"');
        setTimeout(() => setStatus(''), 4000);
    };

    return (
        <ScreenWrapper>
            <Header title="Linked Accounts" showBack={true} />
            <main className="flex flex-col p-5 gap-6">
                <div className="flex flex-col items-center justify-center py-8 text-center space-y-4">
                    <div className="h-20 w-20 bg-surface-dark rounded-full flex items-center justify-center border border-dashed border-gray-600">
                        <span className="material-symbols-outlined text-gray-500 text-3xl">account_balance</span>
                    </div>
                    <h2 className="text-xl font-bold text-white">Bank Linking</h2>
                    <p className="text-gray-400 max-w-xs text-sm">
                        Direct bank integration via Plaid/Yodlee is currently under development.
                    </p>
                </div>

                <div className="space-y-3">
                    <button 
                        disabled
                        className="w-full flex items-center justify-center gap-2 p-4 rounded-xl bg-surface-dark border border-white/5 text-gray-500 cursor-not-allowed opacity-50"
                    >
                        <span className="material-symbols-outlined">upload_file</span>
                        Import CSV (Coming Soon)
                    </button>

                    <button 
                        onClick={handleAddMockData}
                        className="w-full flex items-center justify-center gap-2 p-4 rounded-xl bg-primary/10 border border-primary/30 text-primary font-bold hover:bg-primary/20 transition-colors"
                    >
                        <span className="material-symbols-outlined">add_circle</span>
                        Add Demo Bank (Mock)
                    </button>
                </div>

                {status && (
                    <div className="bg-green-500/10 border border-green-500/20 text-green-400 p-4 rounded-xl text-center text-sm font-medium animate-fade-in">
                        {status}
                    </div>
                )}
            </main>
        </ScreenWrapper>
    );
};

export default LinkedAccountsPage;