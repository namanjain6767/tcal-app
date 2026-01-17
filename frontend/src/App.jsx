import React, { useState, useEffect, useRef, useCallback } from 'react';
import { jwtDecode } from 'jwt-decode';
import api from './api';

// Import Pages
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import OwnerDashboardPage from './pages/OwnerDashboardPage';
import TimberRecorderPage from './pages/TimberRecorderPage';
import AdminPage from './pages/AdminPage';
import ReportsPage from './pages/ReportsPage';
import LogsPage from './pages/LogsPage';
import SingleLengthPage from './pages/SingleLengthPage';
import VehicleInfoPage from './pages/VehicleInfoPage';
import HomePage from './pages/HomePage';
import AppsListPage from './pages/AppsListPage';
import JobSheetPage from './pages/JobSheetPage'; // Import the new page

// --- Helper function to get the auth token from local storage ---
const getAuthToken = () => localStorage.getItem('token');
// --- Helper function to get the last page from local storage ---
const getLastPage = () => localStorage.getItem('currentPage') || 'home';

// --- IndexedDB for Background Sync ---
const DB_NAME = 'tcal-offline-db';
const DB_VERSION = 1;
const ACTIVITY_STORE = 'activities';
const CONFIG_STORE = 'config';

const openDatabase = () => {
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
};

const saveActivityToIDB = async (activity) => {
    try {
        const db = await openDatabase();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(ACTIVITY_STORE, 'readwrite');
            const store = transaction.objectStore(ACTIVITY_STORE);
            const request = store.add(activity);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
        });
    } catch (error) {
        console.error('IDB save error:', error);
    }
};

const saveConfigToIDB = async (key, value) => {
    try {
        const db = await openDatabase();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(CONFIG_STORE, 'readwrite');
            const store = transaction.objectStore(CONFIG_STORE);
            const request = store.put({ key, value });
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve();
        });
    } catch (error) {
        console.error('IDB config save error:', error);
    }
};

const clearActivitiesFromIDB = async () => {
    try {
        const db = await openDatabase();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(ACTIVITY_STORE, 'readwrite');
            const store = transaction.objectStore(ACTIVITY_STORE);
            const request = store.clear();
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve();
        });
    } catch (error) {
        console.error('IDB clear error:', error);
    }
};

// eslint-disable-next-line no-unused-vars
const getActivitiesFromIDB = async () => {
    try {
        const db = await openDatabase();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(ACTIVITY_STORE, 'readonly');
            const store = transaction.objectStore(ACTIVITY_STORE);
            const request = store.getAll();
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
        });
    } catch (error) {
        console.error('IDB get error:', error);
        return [];
    }
};

// --- Service Worker Registration ---
const registerServiceWorker = async () => {
    if ('serviceWorker' in navigator) {
        try {
            const registration = await navigator.serviceWorker.register('/sw.js');
            console.log('Service Worker registered:', registration.scope);
            return registration;
        } catch (error) {
            console.error('Service Worker registration failed:', error);
        }
    }
    return null;
};

// Request background sync
const requestBackgroundSync = async () => {
    if ('serviceWorker' in navigator && 'SyncManager' in window) {
        try {
            const registration = await navigator.serviceWorker.ready;
            await registration.sync.register('tcal-activity-sync');
            console.log('Background sync registered');
        } catch (error) {
            console.error('Background sync registration failed:', error);
        }
    }
};


export default function App() {
    const [token, setToken] = useState(getAuthToken());
    const [user, setUser] = useState(null);
    // Initialize page state from localStorage to persist on refresh
    const [page, setPage] = useState(getLastPage());
    const [activeDraft, setActiveDraft] = useState(null);
    const [sessionInfo, setSessionInfo] = useState(null);
    const [loginRedirect, setLoginRedirect] = useState(null);
    const [isLoading, setIsLoading] = useState(true); // Prevent flash on initial load
    const heartbeatInterval = useRef(null);
    const previousPage = useRef(page);
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [backgroundSyncSupported, setBackgroundSyncSupported] = useState(false);

    // --- Register Service Worker on mount ---
    useEffect(() => {
        const initServiceWorker = async () => {
            const reg = await registerServiceWorker();
            if (reg) {
                setBackgroundSyncSupported('SyncManager' in window);
                
                // Listen for messages from Service Worker
                navigator.serviceWorker.addEventListener('message', (event) => {
                    if (event.data.type === 'SYNC_COMPLETE') {
                        console.log(`Background sync complete: ${event.data.synced}/${event.data.total}`);
                        // Clear local queues after successful background sync
                        clearOfflineQueue();
                        clearActivitiesFromIDB();
                    }
                });
            }
        };
        initServiceWorker();
    }, []);

    // --- Save token and API URL to IndexedDB for Service Worker access ---
    useEffect(() => {
        if (token) {
            saveConfigToIDB('token', token);
            saveConfigToIDB('apiUrl', api.defaults.baseURL);
        }
    }, [token]);

    // --- Offline Activity Queue Management ---
    const OFFLINE_ACTIVITY_KEY = 'offline_activity_queue';
    const OFFLINE_HEARTBEAT_KEY = 'offline_last_heartbeat';

    const getOfflineQueue = () => {
        try {
            return JSON.parse(localStorage.getItem(OFFLINE_ACTIVITY_KEY) || '[]');
        } catch {
            return [];
        }
    };

    const saveToOfflineQueue = async (activity) => {
        const activityData = {
            ...activity,
            timestamp: new Date().toISOString(),
            queued_at: Date.now()
        };
        
        // Save to localStorage (fallback)
        const queue = getOfflineQueue();
        queue.push(activityData);
        localStorage.setItem(OFFLINE_ACTIVITY_KEY, JSON.stringify(queue));
        
        // Save to IndexedDB for Service Worker access
        await saveActivityToIDB(activityData);
        
        // Request background sync if supported
        if (backgroundSyncSupported) {
            await requestBackgroundSync();
        }
        
        console.log('Activity saved offline:', activity.action || activity.type, activity.page);
    };

    const clearOfflineQueue = () => {
        localStorage.removeItem(OFFLINE_ACTIVITY_KEY);
    };

    // --- Sync offline activities when back online ---
    const syncOfflineActivities = useCallback(async () => {
        if (!token || !navigator.onLine) return;
        
        const queue = getOfflineQueue();
        if (queue.length === 0) return;

        console.log(`Syncing ${queue.length} offline activities...`);
        
        let synced = 0;
        for (const activity of queue) {
            try {
                if (activity.type === 'heartbeat') {
                    await api.post('/activity/heartbeat', { page: activity.page });
                } else {
                    await api.post('/activity/log', { 
                        action: activity.action, 
                        page: activity.page, 
                        details: { 
                            ...activity.details,
                            offline_recorded_at: activity.timestamp 
                        }
                    });
                }
                synced++;
            } catch (error) {
                console.error('Failed to sync activity:', error);
                // Keep remaining items in queue
                const remaining = queue.slice(synced);
                localStorage.setItem(OFFLINE_ACTIVITY_KEY, JSON.stringify(remaining));
                return;
            }
        }
        
        clearOfflineQueue();
        await clearActivitiesFromIDB();
        console.log(`Successfully synced ${synced} offline activities`);
    }, [token]);

    // --- Online/Offline detection ---
    useEffect(() => {
        const handleOnline = () => {
            console.log('Back online - syncing activities...');
            setIsOnline(true);
            syncOfflineActivities();
        };
        
        const handleOffline = () => {
            console.log('Gone offline - activities will be stored locally');
            setIsOnline(false);
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // Sync any pending activities on mount
        if (navigator.onLine && token) {
            syncOfflineActivities();
        }

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, [syncOfflineActivities, token]);

    // --- Activity Tracking Functions ---
    const sendHeartbeat = useCallback(async (currentPage) => {
        if (!token) return;
        
        if (!navigator.onLine) {
            // Store heartbeat locally when offline
            saveToOfflineQueue({ type: 'heartbeat', page: currentPage });
            return;
        }
        
        try {
            await api.post('/activity/heartbeat', { page: currentPage });
        } catch (error) {
            // If request fails, store offline
            saveToOfflineQueue({ type: 'heartbeat', page: currentPage });
        }
    }, [token]);

    const logActivity = useCallback(async (action, pageName, details = null) => {
        if (!token) return;
        
        if (!navigator.onLine) {
            // Store activity locally when offline
            saveToOfflineQueue({ type: 'activity', action, page: pageName, details });
            return;
        }
        
        try {
            await api.post('/activity/log', { action, page: pageName, details });
        } catch (error) {
            // If request fails, store offline
            saveToOfflineQueue({ type: 'activity', action, page: pageName, details });
        }
    }, [token]);

    const markOffline = useCallback(async () => {
        if (!token) return;
        
        // Always try to log logout, store locally if offline
        if (!navigator.onLine) {
            saveToOfflineQueue({ type: 'activity', action: 'logout', page: 'N/A' });
            return;
        }
        
        try {
            await api.post('/activity/log', { action: 'logout', page: 'N/A' });
            await api.post('/activity/offline');
        } catch (error) {
            saveToOfflineQueue({ type: 'activity', action: 'logout', page: 'N/A' });
        }
    }, [token]);

    // --- Heartbeat interval (every 30 seconds) ---
    useEffect(() => {
        if (token && user) {
            // Send initial heartbeat
            sendHeartbeat(page);
            
            // Set up interval
            heartbeatInterval.current = setInterval(() => {
                sendHeartbeat(page);
            }, 30000); // Every 30 seconds

            // Cleanup on unmount or token change
            return () => {
                if (heartbeatInterval.current) {
                    clearInterval(heartbeatInterval.current);
                }
            };
        }
    }, [token, user, page, sendHeartbeat]);

    // --- Log page changes ---
    useEffect(() => {
        if (token && user && page !== previousPage.current) {
            logActivity('page_visit', page);
            previousPage.current = page;
        }
    }, [page, token, user, logActivity]);

    // --- Handle tab close / browser close ---
    useEffect(() => {
        const handleBeforeUnload = () => {
            if (token) {
                // Use sendBeacon for reliable delivery on page close
                // Include token in the URL as query param since sendBeacon can't send headers
                navigator.sendBeacon?.(
                    `${api.defaults.baseURL}/activity/offline?token=${encodeURIComponent(token)}`,
                    JSON.stringify({})
                );
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [token]);

    // --- Save the current page to localStorage ---
    useEffect(() => {
        // Only save "app" pages, not public ones (to avoid getting stuck on 'login')
        const protectedPages = ['dashboard', 'ownerDashboard', 'app', 'admin', 'reports', 'logs', 'singleLength', 'jobSheet'];
        if (protectedPages.includes(page)) {
            localStorage.setItem('currentPage', page);
        }
    }, [page]);

    useEffect(() => {
        if (token) {
            try {
                localStorage.setItem('token', token);
                const decodedUser = jwtDecode(token);
                setUser(decodedUser);
                
                // Only redirect if we are on a public page (login, home, etc.)
                if (page === 'login' || page === 'home' || page === 'appsList') {
                    // Check for a specific page to redirect to
                    if (loginRedirect && loginRedirect.page) {
                        // If the redirect is for a generic dashboard, check role
                        if (loginRedirect.page === 'dashboard') {
                            setPage(decodedUser.role === 'owner' ? 'ownerDashboard' : 'dashboard');
                        } else {
                            // Otherwise, go to the specific page (e.g., 'jobSheet')
                            setPage(loginRedirect.page);
                        }
                        setLoginRedirect(null); // Clear the redirect
                    } else {
                        // Otherwise, go to the default dashboard
                        setPage(decodedUser.role === 'owner' ? 'ownerDashboard' : 'dashboard');
                    }
                }
                // If we are on a protected page (like jobSheet) and refresh,
                // the 'if' block above is false, so we correctly stay on the page.
            } catch (e) {
                localStorage.removeItem('token');
                setToken(null);
                setPage('home');
            }
        } else {
            localStorage.removeItem('token');
            setUser(null);
            // Public pages that don't require login
            const publicPages = ['home', 'appsList', 'login']; // 'jobSheet' is now protected
            // If on a protected page, redirect to home
            if (!publicPages.includes(page)) {
                setPage('home');
            }
        }
        setIsLoading(false); // Auth check complete
    }, [token, loginRedirect]); // Removed 'page' from dependency array to prevent loops

    const handleLoginSuccess = (newToken) => {
        setToken(newToken); // This will trigger the useEffect, which now handles redirects
    };
    
    const handleLogout = async () => {
        // Try to sync any pending offline activities before logout
        if (navigator.onLine) {
            await syncOfflineActivities();
        }
        // Mark user as offline before clearing token
        await markOffline();
        if (heartbeatInterval.current) {
            clearInterval(heartbeatInterval.current);
        }
        localStorage.removeItem('token'); // Only remove token, not all local storage
        localStorage.removeItem('currentPage'); // Clear last page on logout
        // Keep offline_activity_queue - will sync on next login
        setActiveDraft(null);
        setSessionInfo(null);
        setToken(null);
        setLoginRedirect(null); // Clear redirect on logout
    };

    const handleBackToDashboard = () => {
        if (user?.role === 'owner') {
            setPage('ownerDashboard');
        } else if (user?.role === 'counter') {
            setPage('dashboard');
        } else {
            // If no user (e.g., from jobSheet), go back to the apps list
            setPage('appsList');
        }
    };

    const renderPage = () => {
        switch (page) {
            case 'home': return <HomePage setPage={setPage} />;
            // Pass user and the redirect setter to AppsListPage
            case 'appsList': return <AppsListPage setPage={setPage} user={user} setLoginRedirect={setLoginRedirect} />;
            {/* Pass redirectInfo to LoginPage */}
            case 'login': return <LoginPage setPage={setPage} onLoginSuccess={handleLoginSuccess} redirectInfo={loginRedirect} />;
            case 'dashboard': return <DashboardPage setPage={setPage} handleLogout={handleLogout} user={user} />;
            case 'ownerDashboard': return <OwnerDashboardPage setPage={setPage} handleLogout={handleLogout} user={user} />;
            case 'vehicleInfo': return <VehicleInfoPage setPage={setPage} setSessionInfo={setSessionInfo} handleBack={handleBackToDashboard} targetPage="app" />;
            case 'singleLengthVehicleInfo': return <VehicleInfoPage setPage={setPage} setSessionInfo={setSessionInfo} handleBack={handleBackToDashboard} targetPage="singleLength" />;
            case 'app': return <TimberRecorderPage user={user} setPage={setPage} activeDraft={activeDraft} setActiveDraft={setActiveDraft} sessionInfo={sessionInfo} handleBack={handleBackToDashboard} />;
            case 'admin': return <AdminPage setPage={setPage} handleBack={handleBackToDashboard} />;
            case 'reports': return <ReportsPage setPage={setPage} setActiveDraft={setActiveDraft} handleBack={handleBackToDashboard} user={user} />;
            case 'logs': return <LogsPage setPage={setPage} handleBack={handleBackToDashboard} user={user} />;
            case 'singleLength': return <SingleLengthPage user={user} setPage={setPage} activeDraft={activeDraft} setActiveDraft={setActiveDraft} handleBack={handleBackToDashboard} sessionInfo={sessionInfo} />;
            case 'jobSheet': return <JobSheetPage setPage={setPage} handleBack={handleBackToDashboard} handleLogout={handleLogout} user={user} />;
            default: return <HomePage setPage={setPage} />;
        }
    };

    // Show minimal loading spinner until auth check completes
    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100">
                <div className="text-center">
                    <div className="w-10 h-10 border-4 border-gray-300 border-t-blue-500 rounded-full animate-spin mx-auto"></div>
                </div>
            </div>
        );
    }

    const offlineQueueCount = getOfflineQueue().length;

    return (
        <div className="min-h-screen">
            {/* Offline Indicator */}
            {(!isOnline || offlineQueueCount > 0) && token && (
                <div className={`fixed bottom-4 right-4 z-50 px-4 py-2 rounded-lg shadow-lg text-sm font-medium ${
                    isOnline ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                }`}>
                    {!isOnline ? (
                        <span>📡 Offline Mode</span>
                    ) : offlineQueueCount > 0 ? (
                        <span>🔄 Syncing {offlineQueueCount} Data...</span>
                    ) : null}
                </div>
            )}
            {renderPage()}
        </div>
    );
}