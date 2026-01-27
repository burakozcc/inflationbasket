import { describe, it, expect } from 'vitest';
import { calcWeightedInflation, getStartDateForRange } from './inflation';
import { BasketItem } from '../types';

const mockHistory = (startVal: number, daysAgoStart: number, endVal: number) => {
    const points = [];
    const now = new Date();
    
    // Start point
    const d1 = new Date(now);
    d1.setDate(d1.getDate() - daysAgoStart);
    points.push({ date: d1.toISOString().split('T')[0], value: startVal });

    // Current point
    points.push({ date: now.toISOString().split('T')[0], value: endVal });
    
    return points;
};

const createItem = (id: string, price: number, history: any[]): BasketItem => ({
    id,
    name: `Item ${id}`,
    category: 'Test',
    price,
    lastUpdated: 'now',
    inflationRate: 0,
    trend: 'stable',
    history
});

describe('Weighted Inflation Logic (Strict)', () => {
    
    it('calculates weighted average dominated by high spend item', () => {
        // Rent: $1000 -> $1100 (+10%). Weight 1100.
        const rent = createItem('1', 1100, mockHistory(1000, 40, 1100));
        
        // Gum: $1 -> $2 (+100%). Weight 2.
        const gum = createItem('2', 2, mockHistory(1, 40, 2));

        // Range 1M (30 days). Both have history > 30 days ago.
        // Rent contribution: 0.10 * 1100 = 110
        // Gum contribution: 1.00 * 2 = 2
        // Weighted Sum = 112
        // Total Weight = 1102
        // Result = 112 / 1102 ~= 10.16% (Much closer to 10% than 100%)
        
        const result = calcWeightedInflation([rent, gum], '1M');
        expect(result).toBeCloseTo(10.16, 2);
    });

    it('excludes item added mid-range (missing start price)', () => {
        // Item existing for long time: 100 -> 110 (+10%)
        const oldItem = createItem('1', 110, mockHistory(100, 40, 110));
        
        // Item added yesterday: 50 -> 55 (+10%). Range 1M (30 days).
        // Start date is 30 days ago. This item has NO history before yesterday.
        // Should be excluded.
        const newItem = createItem('2', 55, mockHistory(50, 1, 55));
        
        const result = calcWeightedInflation([oldItem, newItem], '1M');
        
        // Should rely ONLY on oldItem: 10%
        expect(result).toBeCloseTo(10.0);
    });

    it('excludes item with missing end price (future data scenario or empty history)', () => {
        const item1 = createItem('1', 110, mockHistory(100, 40, 110));
        const emptyItem = createItem('2', 0, []); // No history
        
        const result = calcWeightedInflation([item1, emptyItem], '1M');
        expect(result).toBeCloseTo(10.0);
    });

    it('excludes item with zero start price', () => {
        // 0 -> 100 is infinite inflation, should exclude
        const weirdItem = createItem('1', 100, mockHistory(0, 40, 100));
        const normalItem = createItem('2', 110, mockHistory(100, 40, 110)); // 10%
        
        const result = calcWeightedInflation([weirdItem, normalItem], '1M');
        expect(result).toBeCloseTo(10.0);
    });

    it('returns 0 if no valid items', () => {
        const newItem = createItem('1', 55, mockHistory(50, 1, 55)); // Not valid for 1M
        const result = calcWeightedInflation([newItem], '1M');
        expect(result).toBe(0);
    });
});
