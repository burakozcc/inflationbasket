export function migrateBasketItems(data: any[]): any[] {
    return (data || []).map(item => ({
        quantity: 1,
        ...item,
    }));
}

export function migrateInvestments(data: any[]): any[] {
    return data || [];
}
