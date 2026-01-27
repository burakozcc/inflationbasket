import { describe, it, expect } from 'vitest';
import { generateAICacheKey } from './aiCacheKey';
import { BasketItem, Investment } from '../types';

const mockItem = (id: string, price: number): BasketItem => ({
    id, name: 'Test', category: 'Cat', price, lastUpdated: '', inflationRate: 0, trend: 'stable', history: []
});

const mockInv = (id: string, price: number): Investment => ({
    id, symbol: 'T', name: 'Test', type: 'stock', quantity: 10, currentPrice: price, dayChangePct: 0, history: []
});

describe('AI Cache Key', () => {
    it('generates consistent keys for identical data', () => {
        const key1 = generateAICacheKey('3M', [mockItem('1', 100)], [mockInv('A', 500)]);
        const key2 = generateAICacheKey('3M', [mockItem('1', 100)], [mockInv('A', 500)]);
        expect(key1).toBe(key2);
    });

    it('changes key when price changes', () => {
        const key1 = generateAICacheKey('3M', [mockItem('1', 100)], []);
        const key2 = generateAICacheKey('3M', [mockItem('1', 101)], []);
        expect(key1).not.toBe(key2);
    });

    it('changes key when range changes', () => {
        const key1 = generateAICacheKey('1M', [mockItem('1', 100)], []);
        const key2 = generateAICacheKey('3M', [mockItem('1', 100)], []);
        expect(key1).not.toBe(key2);
    });

    it('changes key when investment quantity changes', () => {
         // Modify quantity in helper locally for test
         const inv1 = mockInv('A', 500);
         const inv2 = mockInv('A', 500);
         inv2.quantity = 20;

         const key1 = generateAICacheKey('3M', [], [inv1]);
         const key2 = generateAICacheKey('3M', [], [inv2]);
         expect(key1).not.toBe(key2);
    });
});