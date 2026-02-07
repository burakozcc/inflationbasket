import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAppStore } from '../store';
import { supabase } from '../lib/supabase';
import { toISODate } from '../utils/date';
import { ScreenWrapper } from '../../components/Shared';
import { BasketItem, Investment } from '../types';

type EntryMode = 'basket_item' | 'price_entry' | 'investment';
type EntityType = 'basket' | 'investment';

export const AddEntryPage = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { addBasketItem, updateBasketItem, addInvestment, updateInvestment, addBasketPriceEntry, addInvestmentPriceEntry, basketItems, investments, currencySymbol, refetchBasket } = useAppStore();

    const mode = (searchParams.get('mode') as EntryMode) || 'investment';
    const relatedId = searchParams.get('relatedId');
    const editId = searchParams.get('editId');
    const entityType = (searchParams.get('entity') as EntityType) || 'basket';
    
    // Find item if in edit mode or adding price
    const relatedItem = useMemo(() => {
        if (!relatedId) return null;
        if (entityType === 'investment') return investments.find(i => i.id === relatedId);
        return basketItems.find(i => i.id === relatedId);
    }, [relatedId, entityType, basketItems, investments]);
    
    const editItem = useMemo(() => {
        if (!editId) return null;
        if (mode === 'basket_item') return basketItems.find(i => i.id === editId);
        if (mode === 'investment') return investments.find(i => i.id === editId);
        return null;
    }, [editId, mode, basketItems, investments]);

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        symbol: '',
        category: 'Groceries',
        type: 'stock',
        quantity: '',
        price: '',
        date: new Date().toISOString().split('T')[0]
    });
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [debugText, setDebugText] = useState<string>('');

    const pushDebug = (msg: string) => {
        if (import.meta.env.DEV) {
            const line = `[${new Date().toISOString().slice(11, 19)}] ${msg}`;
            console.log(line);
            setDebugText(prev => (prev ? prev + '\n' + line : line));
        }
    };

    // Prefill for Price Entry
    useEffect(() => {
        if (mode === 'price_entry' && relatedItem) {
            setFormData(prev => ({ ...prev, name: relatedItem.name }));
        }
    }, [mode, relatedItem]);

    // Prefill for Edit Mode
    useEffect(() => {
        if (editItem) {
            setFormData({
                name: editItem.name,
                symbol: (editItem as Investment).symbol || '',
                category: (editItem as BasketItem).category || 'Groceries',
                type: (editItem as Investment).type || 'stock',
                quantity: (editItem as Investment).quantity?.toString() || '',
                price: '', 
                date: new Date().toISOString().split('T')[0]
            });
        }
    }, [editItem]);

    const isValid = () => {
        // Validation Rules
        if (!editId) {
            // Price checks for new items and price entries
            if (!formData.price) return false;
            if (parseFloat(formData.price) <= 0) return false;
        }

        // Date validation for price entry
        if (!editId) {
             const selectedDate = new Date(formData.date);
             const today = new Date();
             today.setHours(23, 59, 59, 999);
             if (selectedDate > today) return false;
        }

        if (mode === 'basket_item' && !formData.name) return false;
        if (mode === 'investment' && (!formData.symbol || !formData.quantity)) return false;
        return true;
    };

    const handleSubmit = async () => {
        if (import.meta.env.DEV) {
            pushDebug('SAVE CLICKED (handleSubmit entered)');
            pushDebug(`mode=${mode} editId=${editId ?? 'null'} relatedId=${relatedId ?? 'null'} entity=${entityType}`);
        }
        setSubmitError(null);

        if (!isValid()) {
            if (import.meta.env.DEV) pushDebug('INVALID FORM - submit blocked');
            return;
        }

        if (editId) {
            // --- EDIT MODE ---
            if (mode === 'basket_item') {
                updateBasketItem(editId, {
                    name: formData.name,
                    category: formData.category
                });
            } else if (mode === 'investment') {
                updateInvestment(editId, {
                    name: formData.name || formData.symbol.toUpperCase(),
                    symbol: formData.symbol.toUpperCase(),
                    type: formData.type as any,
                    quantity: parseFloat(formData.quantity)
                });
            }
            navigate(-1);
            return;
        }

        if (mode === 'basket_item') {
            // --- NEW BASKET ITEM: Save Entry (Supabase) ---
            try {
                const { data: { session }, error: sessErr } = await supabase.auth.getSession();
                if (import.meta.env.DEV) pushDebug('SESSION=' + (session ? 'OK' : 'MISSING') + (sessErr ? ' err=' + sessErr.message : ''));
                if (!session?.user?.id) throw new Error('AUTH_REQUIRED');
                const userId = session.user.id;

                const nameTrimmed = formData.name.trim();
                const priceNumber = parseFloat(formData.price);
                const priceDateISO = toISODate(formData.date);

                if (import.meta.env.DEV) pushDebug('STEP 2: upsert basket_items');
                const { data: existing, error: findErr } = await supabase
                    .from('basket_items')
                    .select('id')
                    .eq('user_id', userId)
                    .ilike('name', nameTrimmed)
                    .maybeSingle();
                if (findErr) {
                    if (import.meta.env.DEV) pushDebug('SUPABASE_ERROR: ' + findErr.message);
                    throw findErr;
                }

                let itemId: string;
                if (existing) {
                    itemId = existing.id;
                } else {
                    const { data: created, error: insertErr } = await supabase
                        .from('basket_items')
                        .insert([{ user_id: userId, name: nameTrimmed, category: formData.category }])
                        .select('id')
                        .single();
                    if (insertErr) {
                        if (import.meta.env.DEV) pushDebug('SUPABASE_ERROR: ' + insertErr.message);
                        throw insertErr;
                    }
                    if (!created?.id) throw new Error('No id returned from basket_items insert');
                    itemId = created.id;
                }

                if (import.meta.env.DEV) pushDebug('STEP 3: insert basket_price_entries');
                const { error: priceErr } = await supabase.from('basket_price_entries').insert([{
                    user_id: userId,
                    basket_item_id: itemId,
                    price: priceNumber,
                    currency: 'TRY',
                    price_date: priceDateISO
                }]);
                if (priceErr) {
                    if (import.meta.env.DEV) console.log('[save-entry] basket_items ok, basket_price_entries failed', priceErr.message);
                    setSubmitError('Item saved, but price could not be recorded. Please retry.');
                    if (typeof alert !== 'undefined') alert('Item saved, but price could not be recorded. Please retry.');
                    return;
                }

                if (import.meta.env.DEV) pushDebug('DONE');
                console.log('[save-entry] success');
                await refetchBasket();
                navigate(-1);
            } catch (e) {
                const msg = (e as Error)?.message ?? String(e);
                console.error('[save-entry] failed', msg);
                if (import.meta.env.DEV) {
                    pushDebug('ERROR: ' + msg);
                    pushDebug('ERROR_RAW: ' + JSON.stringify(e, Object.getOwnPropertyNames(e)));
                }
                setSubmitError(msg);
            } finally {
                if (import.meta.env.DEV) console.log('handleSubmit (basket_item) finished');
            }
            return;
        }

        // --- ADD MODE (non-basket) ---
        if (mode === 'investment') {
            addInvestment({
                symbol: formData.symbol.toUpperCase(),
                name: formData.name || formData.symbol.toUpperCase(),
                type: formData.type as any,
                quantity: parseFloat(formData.quantity),
                currentPrice: parseFloat(formData.price)
            });
        } else if (mode === 'price_entry' && relatedId) {
            const dateISO = toISODate(formData.date);
            if (entityType === 'investment') {
                addInvestmentPriceEntry(relatedId, parseFloat(formData.price), dateISO);
            } else {
                addBasketPriceEntry(relatedId, parseFloat(formData.price), dateISO);
            }
        }
        navigate(-1);
    };

    const getTitle = () => {
        if (editId) return mode === 'investment' ? 'Edit Investment' : 'Edit Item';
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
                        onClick={() => setFormData({ name: '', symbol: '', category: 'Groceries', type: 'stock', quantity: '', price: '', date: new Date().toISOString().split('T')[0] })}
                        className="text-primary text-base font-semibold p-2 hover:opacity-80">
                        Clear
                    </button>
                </div>
            </div>

            <main className="flex-1 overflow-y-auto w-full pb-32 pt-6 px-5 gap-6 flex flex-col">
                {submitError && (
                    <div className="rounded-xl bg-red-900/20 border border-red-500/30 p-3 text-red-400 text-sm">
                        {submitError}
                    </div>
                )}
                {/* --- Asset Class / Category Selector --- */}
                {mode === 'investment' && (
                    <div className="flex flex-col">
                        <h3 className="text-xl font-bold leading-tight pb-3">Asset Type</h3>
                        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
                            {['stock', 'crypto', 'etf', 'commodity', 'fx'].map(t => (
                                <button key={t} onClick={() => setFormData(p => ({...p, type: t}))}
                                    className={`flex h-10 shrink-0 items-center justify-center rounded-xl px-5 border transition-all uppercase text-sm ${formData.type === t ? 'bg-primary text-black border-primary font-bold' : 'bg-surface-dark text-gray-300 border-white/5 font-medium'}`}>
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
                            <p className="text-xl font-bold text-white">{relatedItem?.name || (relatedItem as Investment)?.symbol || 'Unknown Item'}</p>
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

                     {/* Price & Date Row - Hidden in Edit Mode to protect history */}
                     {!editId && (
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
                                        min="0"
                                    />
                                </div>
                            </div>
                             <div className="relative flex-1">
                                <label className="block text-sm font-medium text-gray-400 mb-2 ml-1">Date</label>
                                <input 
                                    type="date"
                                    value={formData.date}
                                    max={new Date().toISOString().split('T')[0]}
                                    onChange={e => setFormData(p => ({...p, date: e.target.value}))}
                                    className="w-full h-14 pl-4 pr-4 rounded-xl bg-surface-dark border border-white/5 text-lg text-white focus:ring-2 focus:ring-primary focus:outline-none"
                                />
                            </div>
                         </div>
                     )}
                </div>
            </main>

            <div className="fixed bottom-0 left-0 right-0 p-5 bg-gradient-to-t from-background-dark via-background-dark to-transparent pt-10 pb-8 pointer-events-none">
                <div className="max-w-md mx-auto pointer-events-auto">
                    <button 
                        onClick={() => { if (import.meta.env.DEV) pushDebug('SAVE BUTTON CLICKED'); handleSubmit(); }} 
                        disabled={!isValid()}
                        className={`w-full h-14 rounded-xl flex items-center justify-center gap-2 transition-all ${isValid() ? 'bg-primary shadow-[0_8px_20px_-4px_rgba(19,236,236,0.3)] hover:shadow-primary/40 active:scale-[0.98]' : 'bg-gray-800 text-gray-500 cursor-not-allowed'}`}>
                        <span className={`text-lg font-bold tracking-wide ${isValid() ? 'text-black' : 'text-gray-500'}`}>{editId ? 'Save Changes' : 'Save Entry'}</span>
                        <span className={`material-symbols-outlined ${isValid() ? 'text-black' : 'text-gray-500'}`}>check</span>
                    </button>
                </div>
            </div>

            {import.meta.env.DEV && (
                <pre
                    style={{
                        position: 'fixed',
                        bottom: 90,
                        left: 12,
                        right: 12,
                        maxHeight: 160,
                        overflow: 'auto',
                        background: 'rgba(0,0,0,0.7)',
                        border: '1px solid rgba(255,255,255,0.15)',
                        padding: 10,
                        fontSize: 11,
                        zIndex: 99999,
                        margin: 0,
                        color: '#e5e5e5',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-all',
                    }}
                >
                    {debugText || 'No debug yet'}
                </pre>
            )}
        </ScreenWrapper>
    );
};