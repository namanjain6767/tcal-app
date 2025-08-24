import React, { useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';

// Import Pages
import HomePage from './pages/HomePage';
import AppsListPage from './pages/AppsListPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import TimberRecorderPage from './pages/TimberRecorderPage';
import AdminPage from './pages/AdminPage';
import ReportsPage from './pages/ReportsPage';
import LogsPage from './pages/LogsPage';
import SingleLengthPage from './pages/SingleLengthPage';

// --- Helper function to get the auth token from local storage ---
const getAuthToken = () => localStorage.getItem('token');

export default function App() {
    const [user, setUser] = useState(null);
    const [page, setPage] = useState('home'); // Default to the new home page
    const [activeDraft, setActiveDraft] = useState(null);

    useEffect(() => {
        const token = getAuthToken();
        if (token) {
            try {
                const decodedUser = jwtDecode(token);
                setUser(decodedUser);
                setPage('dashboard');
            } catch (e) {
                localStorage.removeItem('token');
                setPage('home'); // If token is invalid, go to home
            }
        } else {
            setPage('home'); // If no token, start at home
        }
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('localDraft');
        localStorage.removeItem('localRejectedDraft');
        setUser(null);
        setActiveDraft(null);
        setPage('home'); // On logout, go back to the home page
    };

    const renderPage = () => {
        switch (page) {
            case 'home': return <HomePage setPage={setPage} />;
            case 'appsList': return <AppsListPage setPage={setPage} />;
            case 'register': return <RegisterPage setPage={setPage} setUser={setUser} />;
            case 'dashboard': return <DashboardPage setPage={setPage} handleLogout={handleLogout} user={user} />;
            case 'app': return <TimberRecorderPage user={user} setPage={setPage} handleLogout={handleLogout} activeDraft={activeDraft} setActiveDraft={setActiveDraft} />;
            case 'admin': return <AdminPage setPage={setPage} />;
            case 'reports': return <ReportsPage setPage={setPage} setActiveDraft={setActiveDraft} />;
            case 'logs': return <LogsPage setPage={setPage} />;
            case 'singleLength': return <SingleLengthPage user={user} setPage={setPage} handleLogout={handleLogout} activeDraft={activeDraft} setActiveDraft={setActiveDraft} />;
            case 'login': default: return <LoginPage setPage={setPage} setUser={setUser} />;
        }
    };

    return <div className="min-h-screen bg-gray-100">{renderPage()}</div>;
}
