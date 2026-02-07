export function mergeById<T extends { id: string; updated_at?: string }>(
    local: T[],
    remote: T[]
): T[] {
    const map = new Map<string, T>();

    local.forEach(item => map.set(item.id, item));

    remote.forEach(item => {
        const existing = map.get(item.id);
        if (!existing) {
            map.set(item.id, item);
            return;
        }

        if (!existing.updated_at || !item.updated_at) {
            map.set(item.id, item);
            return;
        }

        if (new Date(item.updated_at) > new Date(existing.updated_at)) {
            map.set(item.id, item);
        }
    });

    return Array.from(map.values());
}
