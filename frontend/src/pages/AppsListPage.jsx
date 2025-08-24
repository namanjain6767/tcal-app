import React from 'react';

export default function AppsListPage({ setPage }) {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
            <div className="w-full max-w-4xl text-center p-8">
                <h1 className="text-5xl font-bold text-gray-800 mb-12">APPS</h1>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    <button 
                        onClick={() => setPage('login')}
                        className="py-12 bg-cyan-500 text-white text-4xl font-bold rounded-xl shadow-lg hover:bg-cyan-600 transition-all transform hover:scale-105"
                    >
                        T-CAL
                    </button>
                    {/* You can add more app buttons here in the future */}
                </div>
            </div>
        </div>
    );
}
