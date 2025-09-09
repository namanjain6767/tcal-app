import React, { useState, useEffect } from 'react';
import api from '../api';

const getWebSocketURL = () => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const domain = new URL(apiUrl).host;
    return `${wsProtocol}//${domain}`;
};

export default function OwnerDashboardPage({ setPage, handleLogout, user }) {
    // State now holds active sessions with cft, name, and fileName
    const [activeSessions, setActiveSessions] = useState(() => {
        const saved = localStorage.getItem(`activeSessions_${user.organization}`);
        return saved ? JSON.parse(saved) : {};
    });
    const [totalLiveCFT, setTotalLiveCFT] = useState(0);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) return;

        const wsUrl = `${getWebSocketURL()}?token=${token}`;
        const ws = new WebSocket(wsUrl);

        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);

            if (data.type === 'CFT_UPDATE') {
                setActiveSessions(prev => ({
                    ...prev, 
                    [data.counterId]: { ...prev[data.counterId], cft: data.cft, name: data.counterName }
                }));
            } else if (data.type === 'FILENAME_UPDATE') {
                 setActiveSessions(prev => ({
                    ...prev, 
                    [data.counterId]: { ...prev[data.counterId], fileName: data.fileName, name: data.counterName }
                }));
            } else if (data.type === 'COUNTER_DISCONNECTED') {
                setActiveSessions(prev => {
                    const newSessions = { ...prev };
                    delete newSessions[data.counterId];
                    return newSessions;
                });
            }
        };

        ws.onclose = () => console.log('Owner WebSocket disconnected');
        ws.onerror = (error) => console.error('Owner WebSocket error:', error);

        return () => ws.close();
    }, [user.organization]);

    useEffect(() => {
        // Calculate total CFT and save to local storage whenever sessions change
        const total = Object.values(activeSessions).reduce((sum, session) => sum + (session.cft || 0), 0);
        setTotalLiveCFT(total);
        localStorage.setItem(`activeSessions_${user.organization}`, JSON.stringify(activeSessions));
    }, [activeSessions, user.organization]);

    return (
        <div className="p-8 max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                     <h1 className="text-3xl font-bold">Owner Dashboard</h1>
                     <p className="mt-1 text-gray-600">Welcome, {user?.name} {user?.surname} ({user?.organization})</p>
                </div>
                 <div className="flex items-center space-x-2">
                    <button onClick={() => setPage('reports')} className="p-2 bg-indigo-600 text-white rounded hover:bg-indigo-700">View Reports</button>
                    <button onClick={() => setPage('logs')} className="p-2 bg-gray-600 text-white rounded hover:bg-gray-700">View Logs</button>
                    <button onClick={handleLogout} className="p-2 bg-red-600 text-white rounded hover:bg-red-700">Logout</button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Total Live CFT */}
                <div className="md:col-span-1 p-6 bg-white rounded-lg shadow-lg text-center">
                    <h2 className="text-2xl font-semibold text-gray-700 mb-2">Total Live CFT</h2>
                    <p className="text-5xl font-bold text-blue-600">{totalLiveCFT.toFixed(4)}</p>
                    <p className="text-gray-500 mt-1">Sum of all active counters.</p>
                </div>
                {/* Active Sessions */}
                <div className="md:col-span-2 p-6 bg-white rounded-lg shadow-lg">
                    <h2 className="text-2xl font-semibold text-gray-700 mb-4 border-b pb-2">Active Sessions</h2>
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                        {Object.keys(activeSessions).length > 0 ? Object.entries(activeSessions).map(([id, data]) => (
                            <div key={id} className="flex justify-between items-center p-3 bg-gray-50 rounded-md">
                                <div>
                                    <p className="font-medium text-gray-800">{data.name}</p>
                                    <p className="text-sm text-gray-500 font-mono">{data.fileName || 'Initializing session...'}</p>
                                </div>
                                <span className="font-mono text-lg text-green-600">{(data.cft || 0).toFixed(4)}</span>
                            </div>
                        )) : <p className="text-center text-gray-500 py-8">No active counters.</p>}
                    </div>
                </div>
            </div>
        </div>
    );
}

