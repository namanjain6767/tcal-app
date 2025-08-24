import React, { useState } from 'react';

export default function DashboardPage({ setPage, handleLogout, user }) {
    const [showSettings, setShowSettings] = useState(false);

    return (
        <div className="p-8 max-w-4xl mx-auto">
             <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold">Dashboard</h1>
                    <p className="mt-1 text-gray-600">Welcome, {user?.name} {user?.surname}</p>
                </div>
                <div className="relative flex items-center space-x-2">
                    {user?.isAdmin && <button onClick={() => setPage('admin')} className="p-2 bg-purple-600 text-white rounded hover:bg-purple-700">Admin Panel</button>}
                    <button onClick={() => setPage('reports')} className="p-2 bg-indigo-600 text-white rounded hover:bg-indigo-700">View Reports</button>
                    <button onClick={() => setPage('logs')} className="p-2 bg-gray-600 text-white rounded hover:bg-gray-700">View Logs</button>
                    <button onClick={() => setShowSettings(!showSettings)} className="p-2 bg-gray-200 text-gray-700 rounded-full hover:bg-gray-300">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                    </button>
                    {showSettings && (
                        <div className="absolute top-12 right-0 bg-white rounded-lg shadow-lg p-2 w-48 z-10">
                            <button onClick={handleLogout} className="w-full text-left p-2 rounded hover:bg-gray-100 text-red-600 font-semibold">Logout</button>
                        </div>
                    )}
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <button onClick={() => setPage('app')} className="py-8 bg-cyan-500 text-white text-2xl font-bold rounded-lg shadow-lg hover:bg-cyan-600 transition-all">
                    Multi-Length Counting
                </button>
                <button onClick={() => setPage('singleLength')} className="py-8 bg-orange-500 text-white text-2xl font-bold rounded-lg shadow-lg hover:bg-orange-600 transition-all">
                    Single Length
                </button>
            </div>
        </div>
    );
}
