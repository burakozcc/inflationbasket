import { BasketItem, Investment } from '../types';

/**
 * Generates a stable cache key based on the current data state.
 * If the data hasn't changed effectively (same items, same prices, same range), 
 * the key remains the same to avoid re-fetching.
 */
export const generateAICacheKey = (
    range: string, 
    basketItems: BasketItem[], 
    investments: Investment[]
): string => {
    // We only care about specific fields that change the outcome
    const basketHash = basketItems.map(i => `${i.id}:${i.price}:${i.history.length}`).join('|');
    const investHash = investments.map(i => `${i.id}:${i.currentPrice}:${i.quantity}`).join('|');
    
    // Simple string hash
    const rawString = `${range}__${basketHash}__${investHash}`;
    
    let hash = 0;
    for (let i = 0; i < rawString.length; i++) {
        const char = rawString.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    
    return `ai_v1_${hash}`;
};