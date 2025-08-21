import React from 'react';

export default function DashboardPage({ setPage, handleLogout, user }) {
    return (
        <div className="p-8 max-w-4xl mx-auto">
             <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold">Dashboard</h1>
                    <p className="mt-1 text-gray-600">Welcome, {user?.name} {user?.surname}</p>
                </div>
                <div>
                    {user?.isAdmin && <button onClick={() => setPage('admin')} className="p-2 bg-purple-600 text-white rounded hover:bg-purple-700 mr-2">Admin Panel</button>}
                    <button onClick={() => setPage('reports')} className="p-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 mr-2">View Reports</button>
                    <button onClick={() => setPage('logs')} className="p-2 bg-gray-600 text-white rounded hover:bg-gray-700 mr-4">View Logs</button>
                    <button onClick={handleLogout} className="p-2 bg-red-600 text-white rounded hover:bg-red-700">Logout</button>
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <button onClick={() => setPage('app')} className="p-12 bg-cyan-500 text-white text-2xl font-bold rounded-lg shadow-lg hover:bg-cyan-600 transition-all">
                    Multi-Length Counting
                </button>
                <button className="p-12 bg-gray-400 text-white text-2xl font-bold rounded-lg shadow-lg cursor-not-allowed">
                    Single Length
                </button>
            </div>
        </div>
    );
}
