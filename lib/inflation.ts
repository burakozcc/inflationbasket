import { BasketItem, HistoricalPoint } from '../types';

export type TimeRange = '1W' | '1M' | '3M' | '1Y';

/**
 * Returns the start date object based on the selected range relative to now.
 */
export const getStartDateForRange = (range: TimeRange): Date => {
    const now = new Date();
    // Set to end of day today to ensure inclusive comparison
    now.setHours(23, 59, 59, 999);
    
    const d = new Date(now);
    switch (range) {
        case '1W': d.setDate(d.getDate() - 7); break;
        case '1M': d.setDate(d.getDate() - 30); break;
        case '3M': d.setDate(d.getDate() - 90); break;
        case '1Y': d.setDate(d.getDate() - 365); break;
    }
    return d;
};

/**
 * Finds the latest price entry in history that occurred on or before the target date.
 */
export const getLatestPriceOnOrBefore = (history: HistoricalPoint[], date: Date): number | null => {
    if (!history || history.length === 0) return null;
    
    // Ensure chronological order
    const sorted = [...history].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    // Find last point <= date
    const eligiblePoints = sorted.filter(p => new Date(p.date).getTime() <= date.getTime());
    
    if (eligiblePoints.length === 0) return null;
    
    return eligiblePoints[eligiblePoints.length - 1].value;
};

/**
 * Calculates inflation rate for a single item. 
 * Returns null if calculation is impossible (missing data).
 */
export const calcItemInflationRate = (item: BasketItem, startDate: Date, endDate: Date): number | null => {
    const startPrice = getLatestPriceOnOrBefore(item.history, startDate);
    const endPrice = getLatestPriceOnOrBefore(item.history, endDate);

    // Hard requirement: Exclude if either price is missing or startPrice is invalid
    if (startPrice === null || endPrice === null || startPrice <= 0) {
        return null;
    }

    return (endPrice - startPrice) / startPrice;
};

/**
 * Calculates the weighted average inflation for the entire basket.
 * Weight = End Price (Proxy for spend magnitude).
 */
export const calcWeightedInflation = (items: BasketItem[], range: TimeRange): number => {
    if (!items || items.length === 0) return 0;

    const endDate = new Date();
    const startDate = getStartDateForRange(range);

    let totalWeight = 0;
    let weightedSum = 0;
    let includedItemsCount = 0;

    items.forEach(item => {
        const rate = calcItemInflationRate(item, startDate, endDate);
        
        if (rate !== null) {
            // Re-fetch endPrice to use as weight (it's safe as rate is not null)
            const weight = getLatestPriceOnOrBefore(item.history, endDate)!;
            
            // Weight must be positive to make sense in weighted average
            if (weight > 0) {
                weightedSum += rate * weight;
                totalWeight += weight;
                includedItemsCount++;
            }
        }
    });

    if (totalWeight === 0) return 0;
    
    // Return as percentage
    return (weightedSum / totalWeight) * 100;
};
