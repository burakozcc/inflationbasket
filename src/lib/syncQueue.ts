const STORAGE_KEY = 'inflation_sync_queue_v1';

export type SyncAction =
    | { type: 'ADD_BASKET_ITEM'; payload: any }
    | { type: 'UPDATE_BASKET_ITEM'; payload: any }
    | { type: 'DELETE_BASKET_ITEM'; payload: any }
    | { type: 'ADD_INVESTMENT'; payload: any }
    | { type: 'UPDATE_INVESTMENT'; payload: any }
    | { type: 'DELETE_INVESTMENT'; payload: any }
    | { type: 'ADD_BASKET_PRICE'; payload: any }
    | { type: 'ADD_INVESTMENT_PRICE'; payload: any };

function readQueue(): SyncAction[] {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

function writeQueue(queue: SyncAction[]): void {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
    } catch (e) {
        console.warn('syncQueue: write failed', e);
    }
}

export function enqueue(action: SyncAction): void {
    const queue = readQueue();
    queue.push(action);
    writeQueue(queue);
}

export function getQueue(): SyncAction[] {
    return readQueue();
}

export function removeFirst(): void {
    const queue = readQueue();
    if (queue.length === 0) return;
    queue.shift();
    writeQueue(queue);
}

export function clearQueue(): void {
    writeQueue([]);
}

export async function processQueue(executor: (action: SyncAction) => Promise<void>): Promise<void> {
    let queue = readQueue();
    while (queue.length > 0) {
        const action = queue[0];
        try {
            await executor(action);
            removeFirst();
            queue = readQueue();
        } catch {
            break;
        }
    }
}
