export async function safeCall<T>(fn: () => Promise<T>): Promise<{ data?: T; error?: unknown }> {
    try {
        const data = await fn();
        return { data };
    } catch (error) {
        console.error('Supabase error:', error);
        return { error };
    }
}
