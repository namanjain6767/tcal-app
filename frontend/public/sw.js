// TCAL Service Worker - Background Sync Support
const CACHE_NAME = 'tcal-cache-v1';
const SYNC_TAG = 'tcal-activity-sync';

// Files to cache for offline use
const urlsToCache = [
  '/',
  '/index.html'
];

// Install event - cache essential files
self.addEventListener('install', (event) => {
  console.log('[SW] Installing Service Worker...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching app shell');
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating Service Worker...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Removing old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Background Sync event - triggered when internet is available
self.addEventListener('sync', (event) => {
  console.log('[SW] Sync event triggered:', event.tag);
  
  if (event.tag === SYNC_TAG) {
    event.waitUntil(syncOfflineActivities());
  }
});

// Function to sync offline activities
async function syncOfflineActivities() {
  console.log('[SW] Starting background sync...');
  
  try {
    // Get data from IndexedDB
    const db = await openDatabase();
    const activities = await getAllActivities(db);
    
    if (activities.length === 0) {
      console.log('[SW] No activities to sync');
      return;
    }
    
    console.log(`[SW] Syncing ${activities.length} activities...`);
    
    // Get token from IndexedDB
    const token = await getToken(db);
    if (!token) {
      console.log('[SW] No token found, cannot sync');
      return;
    }
    
    // Get API URL from IndexedDB
    const apiUrl = await getApiUrl(db);
    if (!apiUrl) {
      console.log('[SW] No API URL found');
      return;
    }
    
    let syncedCount = 0;
    
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
          await deleteActivity(db, activity.id);
          syncedCount++;
        }
      } catch (error) {
        console.error('[SW] Failed to sync activity:', error);
      }
    }
    
    console.log(`[SW] Background sync complete: ${syncedCount}/${activities.length} synced`);
    
    // Notify all clients about sync completion
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'SYNC_COMPLETE',
        synced: syncedCount,
        total: activities.length
      });
    });
    
  } catch (error) {
    console.error('[SW] Background sync failed:', error);
    throw error; // This will cause the sync to retry
  }
}

// IndexedDB Helper Functions
const DB_NAME = 'tcal-offline-db';
const DB_VERSION = 1;
const ACTIVITY_STORE = 'activities';
const CONFIG_STORE = 'config';

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      if (!db.objectStoreNames.contains(ACTIVITY_STORE)) {
        db.createObjectStore(ACTIVITY_STORE, { keyPath: 'id', autoIncrement: true });
      }
      
      if (!db.objectStoreNames.contains(CONFIG_STORE)) {
        db.createObjectStore(CONFIG_STORE, { keyPath: 'key' });
      }
    };
  });
}

function getAllActivities(db) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(ACTIVITY_STORE, 'readonly');
    const store = transaction.objectStore(ACTIVITY_STORE);
    const request = store.getAll();
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

function deleteActivity(db, id) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(ACTIVITY_STORE, 'readwrite');
    const store = transaction.objectStore(ACTIVITY_STORE);
    const request = store.delete(id);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

function getToken(db) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(CONFIG_STORE, 'readonly');
    const store = transaction.objectStore(CONFIG_STORE);
    const request = store.get('token');
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result?.value);
  });
}

function getApiUrl(db) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(CONFIG_STORE, 'readonly');
    const store = transaction.objectStore(CONFIG_STORE);
    const request = store.get('apiUrl');
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result?.value);
  });
}

// Listen for messages from the main app
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);
  
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

console.log('[SW] Service Worker loaded');
