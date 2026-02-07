export function getInitialOnlineStatus(): boolean {
    return navigator.onLine;
}

export function subscribeToNetworkChanges(onChange: (online: boolean) => void): () => void {
    const onlineHandler = () => onChange(true);
    const offlineHandler = () => onChange(false);

    window.addEventListener('online', onlineHandler);
    window.addEventListener('offline', offlineHandler);

    return () => {
        window.removeEventListener('online', onlineHandler);
        window.removeEventListener('offline', offlineHandler);
    };
}
