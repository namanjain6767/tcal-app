import React from 'react';

export default function HomePage({ setPage }) {
    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-800 text-white">
            <div className="text-center">
                <button 
                    onClick={() => setPage('appsList')}
                    className="py-8 px-16 bg-indigo-600 text-white text-4xl font-bold rounded-xl shadow-lg hover:bg-indigo-700 transition-all transform hover:scale-105"
                >
                    APPS
                </button>
            </div>
        </div>
    );
}
