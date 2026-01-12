import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store';
import { ScreenWrapper, Header, BottomNav } from '../components/Shared';

export const CategoriesPage = () => {
    const { basketItems, formatPrice } = useAppStore();
    const navigate = useNavigate();

    // Group items by category
    const groupedItems = basketItems.reduce((acc, item) => {
        if (!acc[item.category]) {
            acc[item.category] = { total: 0, items: [] };
        }
        acc[item.category].total += item.price;
        acc[item.category].items.push(item);
        return acc;
    }, {} as Record<string, { total: number, items: typeof basketItems }>);

    const categories = Object.entries(groupedItems).map(([name, data]) => {
        const d = data as { total: number, items: typeof basketItems };
        return {
            name,
            total: d.total,
            items: d.items,
            icon: getCategoryIcon(name)
        };
    }).sort((a, b) => b.total - a.total);

    const grandTotal = basketItems.reduce((sum, item) => sum + item.price, 0);

    return (
        <ScreenWrapper className="pb-24">
            <Header title="All Categories" showBack={true} />
            <main className="flex flex-col gap-6 px-4 pt-4">
                
                {/* Summary Card */}
                <div className="bg-surface-dark rounded-2xl p-6 border border-white/5 shadow-lg flex flex-col items-center">
                    <p className="text-gray-400 text-sm font-medium uppercase tracking-wider mb-1">Total Monthly Spend</p>
                    <h2 className="text-4xl font-bold text-white">{formatPrice(grandTotal)}</h2>
                </div>

                <div className="flex flex-col gap-4">
                    {categories.map((cat) => (
                        <div key={cat.name} className="flex flex-col gap-2">
                            <div className="flex items-center justify-between px-1">
                                <div className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-primary">{cat.icon}</span>
                                    <h3 className="text-lg font-bold text-white">{cat.name}</h3>
                                </div>
                                <span className="text-sm font-semibold text-gray-400">{formatPrice(cat.total)}</span>
                            </div>
                            
                            <div className="flex flex-col gap-2">
                                {cat.items.map(item => (
                                    <div 
                                        key={item.id} 
                                        onClick={() => navigate(`/item/${item.id}`)}
                                        className="flex items-center justify-between p-3 rounded-xl bg-surface-dark border border-white/5 active:bg-white/5 transition-colors cursor-pointer"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="size-10 rounded-lg bg-surface-variant overflow-hidden">
                                                {item.image && <img src={item.image} alt={item.name} className="size-full object-cover" />}
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-sm font-medium text-white">{item.name}</span>
                                                <span className="text-xs text-gray-500">Updated {item.lastUpdated}</span>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end">
                                            <span className="text-sm font-bold text-white">{formatPrice(item.price)}</span>
                                            <span className={`text-[10px] font-bold ${item.inflationRate > 0 ? 'text-loss' : 'text-trend'}`}>
                                                {item.inflationRate > 0 ? '+' : ''}{item.inflationRate}%
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                    
                    {categories.length === 0 && (
                        <div className="text-center py-10 text-gray-500">
                            No categories found. Add items to your basket to see them here.
                        </div>
                    )}
                </div>
            </main>
            <BottomNav />
        </ScreenWrapper>
    );
};

const getCategoryIcon = (category: string) => {
    switch(category.toLowerCase()) {
        case 'groceries': return 'shopping_basket';
        case 'transport': return 'directions_car';
        case 'utilities': return 'bolt';
        case 'entertainment': return 'local_pizza'; // Using pizza as a fun icon for entertainment/food
        case 'housing': return 'home';
        default: return 'sell';
    }
};