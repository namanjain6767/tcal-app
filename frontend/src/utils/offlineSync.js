// Offline Sync Manager - Stores all user actions for background sync
// Works even when browser is closed

const DB_NAME = 'tcal-offline-db';
const DB_VERSION = 2;
const STORES = {
    ACTIVITIES: 'activities',
    CONFIG: 'config',
    TIMBER_DATA: 'timber_data',
    REPORTS: 'offline_reports',
    LOGS: 'offline_logs'
};

// Open IndexedDB
const openDatabase = () => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            
            Object.values(STORES).forEach(storeName => {
                if (!db.objectStoreNames.contains(storeName)) {
                    if (storeName === 'config') {
                        db.createObjectStore(storeName, { keyPath: 'key' });
                    } else {
                        db.createObjectStore(storeName, { keyPath: 'id', autoIncrement: true });
                    }
                }
            });
        };
    });
};

// Generic save to store
const saveToStore = async (storeName, data) => {
    try {
        const db = await openDatabase();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);
            const record = {
                ...data,
                timestamp: new Date().toISOString(),
                queued_at: Date.now()
            };
            const request = store.add(record);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                console.log(`[OfflineSync] Saved to ${storeName}:`, record);
                resolve(request.result);
            };
        });
    } catch (error) {
        console.error(`[OfflineSync] Error saving to ${storeName}:`, error);
        throw error;
    }
};

// Save config (token, apiUrl)
export const saveConfig = async (key, value) => {
    try {
        const db = await openDatabase();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORES.CONFIG, 'readwrite');
            const store = transaction.objectStore(STORES.CONFIG);
            const request = store.put({ key, value });
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve();
        });
    } catch (error) {
        console.error('[OfflineSync] Error saving config:', error);
    }
};

// Save activity (heartbeat, page visit, user action)
export const saveActivity = async (activity) => {
    await saveToStore(STORES.ACTIVITIES, activity);
    await requestBackgroundSync();
};

// Save timber counting data
export const saveTimberData = async (data) => {
    await saveToStore(STORES.TIMBER_DATA, { data });
    await requestBackgroundSync();
};

// Save report for offline sync
export const saveOfflineReport = async (reportData) => {
    await saveToStore(STORES.REPORTS, { data: reportData });
    await requestBackgroundSync();
};

// Save counting log for offline sync
export const saveOfflineLog = async (logData) => {
    await saveToStore(STORES.LOGS, { data: logData });
    await requestBackgroundSync();
};

// Get all items from a store
export const getFromStore = async (storeName) => {
    try {
        const db = await openDatabase();
        return new Promise((resolve, reject) => {
            if (!db.objectStoreNames.contains(storeName)) {
                resolve([]);
                return;
            }
            const transaction = db.transaction(storeName, 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.getAll();
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
        });
    } catch (error) {
        console.error(`[OfflineSync] Error getting from ${storeName}:`, error);
        return [];
    }
};

// Clear a store
export const clearStore = async (storeName) => {
    try {
        const db = await openDatabase();
        return new Promise((resolve, reject) => {
            if (!db.objectStoreNames.contains(storeName)) {
                resolve();
                return;
            }
            const transaction = db.transaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.clear();
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve();
        });
    } catch (error) {
        console.error(`[OfflineSync] Error clearing ${storeName}:`, error);
    }
};

// Get pending sync counts
export const getPendingCounts = async () => {
    try {
        const counts = {};
        
        for (const [key, storeName] of Object.entries(STORES)) {
            if (storeName === 'config') continue;
            try {
                const items = await getFromStore(storeName);
                counts[key.toLowerCase()] = items.length;
            } catch {
                counts[key.toLowerCase()] = 0;
            }
        }
        
        return counts;
    } catch (error) {
        console.error('[OfflineSync] Error getting pending counts:', error);
        return { activities: 0, timber_data: 0, reports: 0, logs: 0 };
    }
};

// Request background sync
export const requestBackgroundSync = async () => {
    if ('serviceWorker' in navigator && 'SyncManager' in window) {
        try {
            const registration = await navigator.serviceWorker.ready;
            await registration.sync.register('tcal-activity-sync');
            console.log('[OfflineSync] Background sync registered');
        } catch (error) {
            console.error('[OfflineSync] Background sync registration failed:', error);
        }
    }
};

// Force sync via service worker message
export const forceSyncNow = async () => {
    if ('serviceWorker' in navigator) {
        try {
            const registration = await navigator.serviceWorker.ready;
            registration.active?.postMessage({ type: 'FORCE_SYNC' });
            console.log('[OfflineSync] Force sync requested');
        } catch (error) {
            console.error('[OfflineSync] Force sync request failed:', error);
        }
    }
};

// Check if periodic background sync is supported
export const isPeriodicSyncSupported = async () => {
    if (!('periodicSync' in (await navigator.serviceWorker.ready))) {
        return false;
    }
    
    try {
        const status = await navigator.permissions.query({ name: 'periodic-background-sync' });
        return status.state === 'granted';
    } catch {
        return false;
    }
};

// Listen for sync completion messages
export const onSyncComplete = (callback) => {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.addEventListener('message', (event) => {
            if (event.data.type === 'SYNC_COMPLETE') {
                callback(event.data);
            }
        });
    }
};

// Export store names for external use
export { STORES };

export default {
    saveConfig,
    saveActivity,
    saveTimberData,
    saveOfflineReport,
    saveOfflineLog,
    getFromStore,
    clearStore,
    getPendingCounts,
    requestBackgroundSync,
    forceSyncNow,
    isPeriodicSyncSupported,
    onSyncComplete,
    STORES
};
