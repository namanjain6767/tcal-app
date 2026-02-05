/**
 * Service Worker Debug Utilities
 * Use these in browser console to test the smart service worker
 */

import * as offlineSync from './offlineSync';

// Test saving activities to IndexedDB
export const testSaveActivity = async () => {
    const testActivity = {
        type: 'test',
        action: 'test_action',
        page: 'test_page',
        details: { test: true, timestamp: Date.now() }
    };
    await offlineSync.saveActivity(testActivity);
    console.log('✅ Test activity saved to IndexedDB');
    return testActivity;
};

// Test saving a report offline
export const testSaveReport = async () => {
    const testReport = {
        reportData: { test: 'data', items: [1, 2, 3] },
        fileName: `test_report_${Date.now()}.xlsx`
    };
    await offlineSync.saveOfflineReport(testReport);
    console.log('✅ Test report saved to IndexedDB');
    return testReport;
};

// Test saving a log offline
export const testSaveLog = async () => {
    const testLog = {
        logName: `test_log_${Date.now()}.txt`,
        logContent: 'Test log content\nLine 2\nLine 3'
    };
    await offlineSync.saveOfflineLog(testLog);
    console.log('✅ Test log saved to IndexedDB');
    return testLog;
};

// Get all pending counts
export const getPendingCounts = async () => {
    const counts = await offlineSync.getPendingCounts();
    console.table(counts);
    return counts;
};

// Force trigger a background sync
export const forceSync = async () => {
    console.log('🔄 Triggering background sync...');
    await offlineSync.requestBackgroundSync();
    console.log('✅ Background sync requested');
};

// Check service worker status
export const checkSWStatus = async () => {
    if (!('serviceWorker' in navigator)) {
        console.error('❌ Service Worker not supported');
        return null;
    }
    
    const registration = await navigator.serviceWorker.ready;
    console.log('✅ Service Worker is ready');
    console.log('Scope:', registration.scope);
    console.log('Active:', registration.active?.state);
    
    // Check Background Sync support
    if ('sync' in registration) {
        console.log('✅ Background Sync supported');
    } else {
        console.log('❌ Background Sync NOT supported');
    }
    
    // Check Periodic Background Sync support
    if ('periodicSync' in registration) {
        console.log('✅ Periodic Background Sync supported');
        try {
            const tags = await registration.periodicSync.getTags();
            console.log('Periodic Sync Tags:', tags);
        } catch (e) {
            console.log('⚠️ Periodic sync permission not granted');
        }
    } else {
        console.log('❌ Periodic Background Sync NOT supported');
    }
    
    return registration;
};

// Simulate offline mode (UI only - doesn't actually disconnect)
export const simulateOffline = () => {
    console.log('🔴 Simulating offline mode in UI...');
    console.log('To actually test offline:');
    console.log('1. Open DevTools → Network tab');
    console.log('2. Check "Offline" checkbox');
    console.log('3. Try saving a report');
    console.log('4. Uncheck "Offline" to reconnect');
};

// View IndexedDB contents
export const viewDatabase = async () => {
    const stores = ['activities', 'config', 'timber_data', 'offline_reports', 'offline_logs'];
    const results = {};
    
    for (const store of stores) {
        try {
            const data = await offlineSync.getFromStore(store);
            results[store] = data;
        } catch (e) {
            results[store] = `Error: ${e.message}`;
        }
    }
    
    console.log('📦 IndexedDB Contents:');
    console.table(Object.keys(results).map(store => ({
        Store: store,
        Items: Array.isArray(results[store]) ? results[store].length : 'N/A'
    })));
    
    return results;
};

// Clear all test data
export const clearAllStores = async () => {
    const stores = ['activities', 'timber_data', 'offline_reports', 'offline_logs'];
    for (const store of stores) {
        await offlineSync.clearStore(store);
    }
    console.log('🧹 All stores cleared');
};

// Run full test suite
export const runTests = async () => {
    console.log('🧪 Running Service Worker Tests...\n');
    
    console.log('1️⃣ Checking SW Status...');
    await checkSWStatus();
    
    console.log('\n2️⃣ Saving test data...');
    await testSaveActivity();
    await testSaveReport();
    await testSaveLog();
    
    console.log('\n3️⃣ Checking pending counts...');
    await getPendingCounts();
    
    console.log('\n4️⃣ Viewing database...');
    await viewDatabase();
    
    console.log('\n✅ Tests complete! Now:');
    console.log('- Go offline (DevTools → Network → Offline)');
    console.log('- Add more test data');
    console.log('- Go back online');
    console.log('- Check if data synced (counts should be 0)');
};

// Export to window for console access
if (typeof window !== 'undefined') {
    window.swDebug = {
        testSaveActivity,
        testSaveReport,
        testSaveLog,
        getPendingCounts,
        forceSync,
        checkSWStatus,
        simulateOffline,
        viewDatabase,
        clearAllStores,
        runTests
    };
    console.log('🔧 SW Debug tools loaded! Use window.swDebug.runTests() to test');
}

export default {
    testSaveActivity,
    testSaveReport,
    testSaveLog,
    getPendingCounts,
    forceSync,
    checkSWStatus,
    simulateOffline,
    viewDatabase,
    clearAllStores,
    runTests
};
