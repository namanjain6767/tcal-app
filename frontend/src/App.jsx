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

    // --- Activity Tracking Functions ---
    const sendHeartbeat = useCallback(async (currentPage) => {
        if (!token) return;
        try {
            await api.post('/activity/heartbeat', { page: currentPage });
        } catch (error) {
            // Silently fail - don't disrupt user experience
        }
    }, [token]);

    const logActivity = useCallback(async (action, pageName, details = null) => {
        if (!token) return;
        try {
            await api.post('/activity/log', { action, page: pageName, details });
        } catch (error) {
            // Silently fail
        }
    }, [token]);

    const markOffline = useCallback(async () => {
        if (!token) return;
        try {
            // Log the logout action first
            await api.post('/activity/log', { action: 'logout', page: 'N/A' });
            await api.post('/activity/offline');
        } catch (error) {
            // Silently fail
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
        // Mark user as offline before clearing token
        await markOffline();
        if (heartbeatInterval.current) {
            clearInterval(heartbeatInterval.current);
        }
        localStorage.removeItem('token'); // Only remove token, not all local storage
        localStorage.removeItem('currentPage'); // Clear last page on logout
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
            case 'vehicleInfo': return <VehicleInfoPage setPage={setPage} setSessionInfo={setSessionInfo} handleBack={handleBackToDashboard} />;
            case 'app': return <TimberRecorderPage user={user} setPage={setPage} activeDraft={activeDraft} setActiveDraft={setActiveDraft} sessionInfo={sessionInfo} handleBack={handleBackToDashboard} />;
            case 'admin': return <AdminPage setPage={setPage} handleBack={handleBackToDashboard} />;
            case 'reports': return <ReportsPage setPage={setPage} setActiveDraft={setActiveDraft} handleBack={handleBackToDashboard} user={user} />;
            case 'logs': return <LogsPage setPage={setPage} handleBack={handleBackToDashboard} user={user} />;
            case 'singleLength': return <SingleLengthPage user={user} setPage={setPage} activeDraft={activeDraft} setActiveDraft={setActiveDraft} handleBack={handleBackToDashboard} />;
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

    return <div className="min-h-screen">{renderPage()}</div>;
}