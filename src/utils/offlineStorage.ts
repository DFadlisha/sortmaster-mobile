
// Utility to handle offline storage using localStorage
// In a production app, we might use IndexedDB (via idb-keyval) for better performance with images,
// but for MVP, localStorage is sufficient if images aren't too massive.

export const OFFLINE_STORAGE_KEY = "offline_sorting_logs";

export interface OfflineLog {
    id: string; // Temporary ID
    timestamp: string;
    part_no: string;
    quantity_all_sorting: number;
    quantity_ng: number;
    operator_name: string | null;
    factory_id: string | null;
    // We store the base64 image here. 
    // Warning: localStorage has 5MB limit. Storing many high-res images will fail.
    // We recommend using low-res base64 or just not storing images offline in this MVP.
    // For now, we will try to store it.
    reject_image_base64: string | null;
}

export const saveOfflineLog = (log: Omit<OfflineLog, 'id' | 'timestamp'>): boolean => {
    try {
        const existingLogsJson = localStorage.getItem(OFFLINE_STORAGE_KEY);
        const existingLogs: OfflineLog[] = existingLogsJson ? JSON.parse(existingLogsJson) : [];

        const newLog: OfflineLog = {
            ...log,
            id: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
        };

        existingLogs.push(newLog);

        localStorage.setItem(OFFLINE_STORAGE_KEY, JSON.stringify(existingLogs));
        return true;
    } catch (error) {
        console.error("Failed to save offline log (likely quota exceeded):", error);
        return false;
    }
};

export const getOfflineLogs = (): OfflineLog[] => {
    try {
        const json = localStorage.getItem(OFFLINE_STORAGE_KEY);
        return json ? JSON.parse(json) : [];
    } catch (error) {
        console.error("Error reading offline logs:", error);
        return [];
    }
};

export const clearOfflineLogs = () => {
    localStorage.removeItem(OFFLINE_STORAGE_KEY);
};

export const removeOfflineLog = (id: string) => {
    const logs = getOfflineLogs();
    const filtered = logs.filter(l => l.id !== id);
    localStorage.setItem(OFFLINE_STORAGE_KEY, JSON.stringify(filtered));
}
