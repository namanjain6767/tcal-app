import React, { useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';

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

// --- Helper function to get the auth token from local storage ---
const getAuthToken = () => localStorage.getItem('token');

export default function App() {
    const [token, setToken] = useState(getAuthToken());
    const [user, setUser] = useState(null);
    const [page, setPage] = useState('home');
    const [activeDraft, setActiveDraft] = useState(null);
    const [sessionInfo, setSessionInfo] = useState(null);

    useEffect(() => {
        if (token) {
            try {
                localStorage.setItem('token', token);
                const decodedUser = jwtDecode(token);
                setUser(decodedUser);
                if (decodedUser.role === 'owner') {
                    setPage('ownerDashboard');
                } else {
                    setPage('dashboard');
                }
            } catch (e) {
                localStorage.removeItem('token');
                setToken(null);
                setPage('home');
            }
        } else {
            localStorage.removeItem('token');
            setUser(null);
            setPage('home');
        }
    }, [token]);

    const handleLoginSuccess = (newToken) => {
        setToken(newToken);
    };
    
    const handleLogout = () => {
        localStorage.clear();
        setActiveDraft(null);
        setSessionInfo(null);
        setToken(null);
    };

    // This function now checks the user's role to determine the correct dashboard
    const handleBackToDashboard = () => {
        if (user?.role === 'owner') {
            setPage('ownerDashboard');
        } else {
            setPage('dashboard');
        }
    };

    const renderPage = () => {
        switch (page) {
            case 'home': return <HomePage setPage={setPage} />;
            case 'appsList': return <AppsListPage setPage={setPage} />;
            case 'login': return <LoginPage setPage={setPage} onLoginSuccess={handleLoginSuccess} />;
            case 'dashboard': return <DashboardPage setPage={setPage} handleLogout={handleLogout} user={user} />;
            case 'ownerDashboard': return <OwnerDashboardPage setPage={setPage} handleLogout={handleLogout} user={user} />;
            case 'vehicleInfo': return <VehicleInfoPage setPage={setPage} setSessionInfo={setSessionInfo} handleBack={handleBackToDashboard} />;
            case 'app': return <TimberRecorderPage user={user} setPage={setPage} activeDraft={activeDraft} setActiveDraft={setActiveDraft} sessionInfo={sessionInfo} handleBack={handleBackToDashboard} />;
            case 'admin': return <AdminPage setPage={setPage} handleBack={handleBackToDashboard} />;
            case 'reports': return <ReportsPage setPage={setPage} setActiveDraft={setActiveDraft} handleBack={handleBackToDashboard} user={user} />;
            case 'logs': return <LogsPage setPage={setPage} handleBack={handleBackToDashboard} user={user} />;
            case 'singleLength': return <SingleLengthPage user={user} setPage={setPage} activeDraft={activeDraft} setActiveDraft={setActiveDraft} handleBack={handleBackToDashboard} />;
            default: return <HomePage setPage={setPage} />;
        }
    };

    return <div className="min-h-screen">{renderPage()}</div>;
}

