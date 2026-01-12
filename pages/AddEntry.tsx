import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAppStore } from '../store';
import { ScreenWrapper } from '../components/Shared';

type EntryMode = 'basket_item' | 'price_entry' | 'investment';

export const AddEntryPage = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { addBasketItem, addInvestment, addPriceEntry, basketItems, currencySymbol } = useAppStore();

    const mode = (searchParams.get('mode') as EntryMode) || 'investment';
    const relatedId = searchParams.get('relatedId');
    const relatedItem = basketItems.find(i => i.id === relatedId);

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        symbol: '',
        category: 'Groceries',
        type: 'Stock',
        quantity: '',
        price: '',
        date: new Date().toISOString().split('T')[0]
    });

    // Prefill name if adding price entry
    useEffect(() => {
        if (mode === 'price_entry' && relatedItem) {
            setFormData(prev => ({ ...prev, name: relatedItem.name }));
        }
    }, [mode, relatedItem]);

    const isValid = () => {
        if (!formData.price) return false;
        if (mode === 'basket_item' && !formData.name) return false;
        if (mode === 'investment' && (!formData.symbol || !formData.quantity)) return false;
        return true;
    };

    const handleSubmit = () => {
        if (!isValid()) return;

        if (mode === 'basket_item') {
            addBasketItem({
                name: formData.name,
                category: formData.category,
                price: parseFloat(formData.price),
                image: `https://picsum.photos/seed/${formData.name}/200`
            });
        } else if (mode === 'investment') {
            addInvestment({
                symbol: formData.symbol.toUpperCase(),
                name: formData.name || formData.symbol.toUpperCase(), // Fallback name
                type: formData.type as any,
                quantity: parseFloat(formData.quantity),
                currentPrice: parseFloat(formData.price)
            });
        } else if (mode === 'price_entry' && relatedId) {
            addPriceEntry(relatedId, parseFloat(formData.price), formData.date);
        }

        navigate(-1);
    };

    const getTitle = () => {
        if (mode === 'basket_item') return 'New Basket Item';
        if (mode === 'price_entry') return 'Update Price';
        return 'New Investment';
    };

    return (
        <ScreenWrapper className="flex flex-col">
            <div className="sticky top-0 z-50 bg-background-dark/95 backdrop-blur-md border-b border-white/10">
                <div className="flex items-center p-4 pb-2 justify-between">
                    <button onClick={() => navigate(-1)} className="flex items-center justify-center p-2 rounded-full hover:bg-white/10 transition-colors">
                        <span className="material-symbols-outlined text-gray-400">close</span>
                    </button>
                    <h2 className="text-lg font-bold leading-tight flex-1 text-center">{getTitle()}</h2>
                    <button 
                        onClick={() => setFormData({ name: '', symbol: '', category: 'Groceries', type: 'Stock', quantity: '', price: '', date: new Date().toISOString().split('T')[0] })}
                        className="text-primary text-base font-semibold p-2 hover:opacity-80">
                        Clear
                    </button>
                </div>
            </div>

            <main className="flex-1 overflow-y-auto w-full pb-32 pt-6 px-5 gap-6 flex flex-col">
                
                {/* --- Asset Class / Category Selector --- */}
                {mode === 'investment' && (
                    <div className="flex flex-col">
                        <h3 className="text-xl font-bold leading-tight pb-3">Asset Type</h3>
                        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
                            {['Stock', 'Crypto', 'ETF', 'Commodity', 'FX'].map(t => (
                                <button key={t} onClick={() => setFormData(p => ({...p, type: t}))}
                                    className={`flex h-10 shrink-0 items-center justify-center rounded-xl px-5 border transition-all ${formData.type === t ? 'bg-primary text-black border-primary font-bold' : 'bg-surface-dark text-gray-300 border-white/5 font-medium'}`}>
                                    {t}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {mode === 'basket_item' && (
                    <div className="flex flex-col">
                        <h3 className="text-xl font-bold leading-tight pb-3">Category</h3>
                        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
                            {['Groceries', 'Utilities', 'Transport', 'Entertainment', 'Housing'].map(c => (
                                <button key={c} onClick={() => setFormData(p => ({...p, category: c}))}
                                    className={`flex h-10 shrink-0 items-center justify-center rounded-xl px-5 border transition-all ${formData.category === c ? 'bg-primary text-black border-primary font-bold' : 'bg-surface-dark text-gray-300 border-white/5 font-medium'}`}>
                                    {c}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* --- Form Fields --- */}
                <div className="flex flex-col gap-5">
                    <h3 className="text-xl font-bold leading-tight">Details</h3>

                    {/* Name / Symbol Input */}
                    {mode === 'investment' && (
                         <div className="relative">
                            <label className="block text-sm font-medium text-gray-400 mb-2 ml-1">Ticker Symbol</label>
                            <input 
                                value={formData.symbol}
                                onChange={e => setFormData(p => ({...p, symbol: e.target.value}))}
                                className="w-full h-14 pl-4 pr-4 rounded-xl bg-surface-dark border border-white/5 text-lg text-white focus:ring-2 focus:ring-primary focus:outline-none uppercase" 
                                placeholder="e.g., AAPL" 
                            />
                        </div>
                    )}

                    {(mode === 'basket_item' || mode === 'investment') && (
                        <div className="relative">
                            <label className="block text-sm font-medium text-gray-400 mb-2 ml-1">Item Name</label>
                            <input 
                                value={formData.name}
                                onChange={e => setFormData(p => ({...p, name: e.target.value}))}
                                className="w-full h-14 pl-4 pr-4 rounded-xl bg-surface-dark border border-white/5 text-lg text-white focus:ring-2 focus:ring-primary focus:outline-none" 
                                placeholder={mode === 'investment' ? "Optional Description" : "e.g., Whole Milk"} 
                            />
                        </div>
                    )}
                    
                    {/* Read-Only Name for Price Entry */}
                    {mode === 'price_entry' && (
                        <div className="p-4 rounded-xl bg-surface-dark border border-white/5">
                            <p className="text-sm text-gray-400">Updating Item</p>
                            <p className="text-xl font-bold text-white">{relatedItem?.name || 'Unknown Item'}</p>
                        </div>
                    )}

                    {mode === 'investment' && (
                        <div className="relative">
                            <label className="block text-sm font-medium text-gray-400 mb-2 ml-1">Quantity</label>
                            <input 
                                type="number"
                                value={formData.quantity}
                                onChange={e => setFormData(p => ({...p, quantity: e.target.value}))}
                                className="w-full h-14 pl-4 pr-4 rounded-xl bg-surface-dark border border-white/5 text-lg text-white focus:ring-2 focus:ring-primary focus:outline-none" 
                                placeholder="0.00" 
                            />
                        </div>
                    )}

                     {/* Price & Date Row */}
                     <div className="flex flex-row gap-4">
                        <div className="relative flex-1">
                            <label className="block text-sm font-medium text-gray-400 mb-2 ml-1">{mode === 'price_entry' ? 'New Price' : 'Price'}</label>
                             <div className="relative flex items-center">
                                <span className="absolute left-4 text-gray-500 font-bold">{currencySymbol}</span>
                                <input 
                                    type="number"
                                    value={formData.price}
                                    onChange={e => setFormData(p => ({...p, price: e.target.value}))}
                                    className="w-full h-14 pl-10 pr-4 rounded-xl bg-surface-dark border border-white/5 text-lg text-white focus:ring-2 focus:ring-primary focus:outline-none" 
                                    placeholder="0.00" 
                                />
                            </div>
                        </div>
                         <div className="relative flex-1">
                            <label className="block text-sm font-medium text-gray-400 mb-2 ml-1">Date</label>
                            <input 
                                type="date"
                                value={formData.date}
                                onChange={e => setFormData(p => ({...p, date: e.target.value}))}
                                className="w-full h-14 pl-4 pr-4 rounded-xl bg-surface-dark border border-white/5 text-lg text-white focus:ring-2 focus:ring-primary focus:outline-none"
                            />
                        </div>
                     </div>
                </div>
            </main>

            <div className="fixed bottom-0 left-0 right-0 p-5 bg-gradient-to-t from-background-dark via-background-dark to-transparent pt-10 pb-8 pointer-events-none">
                <div className="max-w-md mx-auto pointer-events-auto">
                    <button 
                        onClick={handleSubmit} 
                        disabled={!isValid()}
                        className={`w-full h-14 rounded-xl flex items-center justify-center gap-2 transition-all ${isValid() ? 'bg-primary shadow-[0_8px_20px_-4px_rgba(19,236,236,0.3)] hover:shadow-primary/40 active:scale-[0.98]' : 'bg-gray-800 text-gray-500 cursor-not-allowed'}`}>
                        <span className={`text-lg font-bold tracking-wide ${isValid() ? 'text-black' : 'text-gray-500'}`}>Save Entry</span>
                        <span className={`material-symbols-outlined ${isValid() ? 'text-black' : 'text-gray-500'}`}>check</span>
                    </button>
                </div>
            </div>
        </ScreenWrapper>
    );
};