export function isValidPrice(value: number): boolean {
    return typeof value === 'number' && isFinite(value) && value > 0;
}

export function isValidQuantity(value: number): boolean {
    return typeof value === 'number' && isFinite(value) && value >= 0;
}

export function isValidDateISO(date: string): boolean {
    if (!date) return false;
    const d = new Date(date);
    return !isNaN(d.getTime());
}

export function isNotFutureDate(date: string): boolean {
    const d = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return d <= today;
}
