// TCAL Service Worker - Smart Background Sync
// Syncs data when online, even with browser closed

const CACHE_NAME = 'tcal-cache-v2';
const SYNC_TAG = 'tcal-activity-sync';
const PERIODIC_SYNC_TAG = 'tcal-periodic-sync';

// Files to cache for offline use
const urlsToCache = [
  '/',
  '/index.html'
];

// Install event - cache essential files
self.addEventListener('install', (event) => {
  console.log('[SW] Installing Service Worker v2...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching app shell');
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches and register periodic sync
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating Service Worker v2...');
  event.waitUntil(
    Promise.all([
      // Clean old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('[SW] Removing old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Register periodic background sync (if supported)
      registerPeriodicSync(),
      // Claim clients
      self.clients.claim()
    ])
  );
});

// Register periodic background sync - runs even when browser is closed
async function registerPeriodicSync() {
  try {
    const status = await navigator.permissions.query({ name: 'periodic-background-sync' });
    if (status.state === 'granted') {
      await self.registration.periodicSync.register(PERIODIC_SYNC_TAG, {
        minInterval: 60 * 1000 // Minimum 1 minute (browser may extend this)
      });
      console.log('[SW] Periodic background sync registered');
    } else {
      console.log('[SW] Periodic background sync not permitted');
    }
  } catch (error) {
    console.log('[SW] Periodic background sync not supported:', error.message);
  }
}

// Background Sync event - triggered when internet becomes available
self.addEventListener('sync', (event) => {
  console.log('[SW] Sync event triggered:', event.tag);
  
  if (event.tag === SYNC_TAG) {
    event.waitUntil(syncAllOfflineData());
  }
});

// Periodic Background Sync - runs periodically even with browser closed
self.addEventListener('periodicsync', (event) => {
  console.log('[SW] Periodic sync event triggered:', event.tag);
  
  if (event.tag === PERIODIC_SYNC_TAG) {
    event.waitUntil(syncAllOfflineData());
  }
});

// Main sync function - syncs ALL offline data
async function syncAllOfflineData() {
  console.log('[SW] Starting comprehensive background sync...');
  
  try {
    const db = await openDatabase();
    const token = await getConfig(db, 'token');
    const apiUrl = await getConfig(db, 'apiUrl');
    
    if (!token || !apiUrl) {
      console.log('[SW] No credentials found, skipping sync');
      return;
    }

    // Sync in order of priority
    const results = {
      activities: await syncActivities(db, token, apiUrl),
      timberData: await syncTimberData(db, token, apiUrl),
      reports: await syncReports(db, token, apiUrl),
      logs: await syncLogs(db, token, apiUrl)
    };

    console.log('[SW] Sync results:', results);
    
    // Notify clients about sync completion
    await notifyClients({
      type: 'SYNC_COMPLETE',
      results,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('[SW] Background sync failed:', error);
    throw error; // Will retry on next sync opportunity
  }
}

// Sync activities (heartbeats, page visits, user actions)
async function syncActivities(db, token, apiUrl) {
  const activities = await getAllFromStore(db, 'activities');
  if (activities.length === 0) return { synced: 0, total: 0 };
  
  console.log(`[SW] Syncing ${activities.length} activities...`);
  let synced = 0;
  
  for (const activity of activities) {
    try {
      const endpoint = activity.type === 'heartbeat' 
        ? `${apiUrl}/activity/heartbeat`
        : `${apiUrl}/activity/log`;
      
      const body = activity.type === 'heartbeat'
        ? { page: activity.page }
        : { 
            action: activity.action, 
            page: activity.page, 
            details: { 
              ...activity.details,
              offline_recorded_at: activity.timestamp,
              synced_by: 'background_sync'
            }
          };
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });
      
      if (response.ok) {
        await deleteFromStore(db, 'activities', activity.id);
        synced++;
      }
    } catch (error) {
      console.error('[SW] Failed to sync activity:', error);
    }
  }
  
  return { synced, total: activities.length };
}

// Sync timber counting data (logs that need to be saved)
async function syncTimberData(db, token, apiUrl) {
  const timberData = await getAllFromStore(db, 'timber_data');
  if (timberData.length === 0) return { synced: 0, total: 0 };
  
  console.log(`[SW] Syncing ${timberData.length} timber records...`);
  let synced = 0;
  
  for (const record of timberData) {
    try {
      const response = await fetch(`${apiUrl}/logs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...record.data,
          synced_from_offline: true,
          offline_created_at: record.timestamp
        })
      });
      
      if (response.ok) {
        await deleteFromStore(db, 'timber_data', record.id);
        synced++;
      }
    } catch (error) {
      console.error('[SW] Failed to sync timber data:', error);
    }
  }
  
  return { synced, total: timberData.length };
}

// Sync reports that were generated offline (batch sync)
async function syncReports(db, token, apiUrl) {
  const reports = await getAllFromStore(db, 'offline_reports');
  if (reports.length === 0) return { synced: 0, total: 0 };
  
  console.log(`[SW] Syncing ${reports.length} reports (batch)...`);
  
  try {
    // Batch sync all reports at once
    const response = await fetch(`${apiUrl}/reports/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        reports: reports.map(r => ({
          id: r.id,
          fileName: r.data.fileName,
          reportData: r.data.reportData,
          timestamp: r.timestamp
        })),
        logs: [] // Logs synced separately
      })
    });
    
    if (response.ok) {
      const result = await response.json();
      // Clear successfully synced reports
      for (const report of reports) {
        await deleteFromStore(db, 'offline_reports', report.id);
      }
      return { synced: result.results.reports.synced, total: reports.length };
    }
    
    return { synced: 0, total: reports.length, error: 'Sync failed' };
  } catch (error) {
    console.error('[SW] Failed to batch sync reports:', error);
    return { synced: 0, total: reports.length, error: error.message };
  }
}

// Sync counting logs (batch sync)
async function syncLogs(db, token, apiUrl) {
  const logs = await getAllFromStore(db, 'offline_logs');
  if (logs.length === 0) return { synced: 0, total: 0 };
  
  console.log(`[SW] Syncing ${logs.length} counting logs (batch)...`);
  
  try {
    // Batch sync logs through the same sync endpoint
    const response = await fetch(`${apiUrl}/reports/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        reports: [],
        logs: logs.map(l => ({
          id: l.id,
          logName: l.data.logName,
          logContent: l.data.logContent,
          timestamp: l.timestamp
        }))
      })
    });
    
    if (response.ok) {
      const result = await response.json();
      // Clear successfully synced logs
      for (const log of logs) {
        await deleteFromStore(db, 'offline_logs', log.id);
      }
      return { synced: result.results.logs.synced, total: logs.length };
    }
    
    return { synced: 0, total: logs.length, error: 'Sync failed' };
  } catch (error) {
    console.error('[SW] Failed to batch sync logs:', error);
    return { synced: 0, total: logs.length, error: error.message };
  }
}

// IndexedDB Helper Functions
const DB_NAME = 'tcal-offline-db';
const DB_VERSION = 2; // Bumped version for new stores
const STORES = ['activities', 'config', 'timber_data', 'offline_reports', 'offline_logs'];

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      STORES.forEach(storeName => {
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
}

function getAllFromStore(db, storeName) {
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
}

function deleteFromStore(db, storeName, id) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.delete(id);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

function getConfig(db, key) {
  return new Promise((resolve, reject) => {
    if (!db.objectStoreNames.contains('config')) {
      resolve(null);
      return;
    }
    const transaction = db.transaction('config', 'readonly');
    const store = transaction.objectStore('config');
    const request = store.get(key);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result?.value);
  });
}

// Notify all clients
async function notifyClients(message) {
  const clients = await self.clients.matchAll({ includeUncontrolled: true });
  clients.forEach(client => {
    client.postMessage(message);
  });
}

// Listen for messages from the main app
self.addEventListener('message', async (event) => {
  console.log('[SW] Message received:', event.data);
  
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data.type === 'FORCE_SYNC') {
    // Manually trigger sync when requested
    try {
      await syncAllOfflineData();
    } catch (error) {
      console.error('[SW] Force sync failed:', error);
    }
  }
  
  if (event.data.type === 'GET_PENDING_COUNT') {
    // Return count of pending items
    try {
      const db = await openDatabase();
      const counts = {
        activities: (await getAllFromStore(db, 'activities')).length,
        timberData: (await getAllFromStore(db, 'timber_data')).length,
        reports: (await getAllFromStore(db, 'offline_reports')).length,
        logs: (await getAllFromStore(db, 'offline_logs')).length
      };
      event.ports[0]?.postMessage(counts);
    } catch (error) {
      console.error('[SW] Failed to get pending count:', error);
    }
  }
});

// Push notification for sync status (optional - for future use)
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    if (data.type === 'SYNC_REMINDER') {
      event.waitUntil(
        self.registration.showNotification('T-CAL Sync', {
          body: 'You have pending data to sync. Connect to internet to sync.',
          icon: '/icon-192.svg',
          badge: '/icon-192.svg',
          tag: 'sync-reminder'
        })
      );
    }
  }
});

console.log('[SW] Smart Service Worker v2 loaded');
