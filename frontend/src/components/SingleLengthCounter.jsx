import React from 'react';

export default function SingleLengthPage({ setPage, handleLogout, user }) {
    return (
        <div className="p-8 max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold">Single Length Counter</h1>
                <div>
                    <button onClick={() => setPage('dashboard')} className="p-2 bg-gray-500 text-white rounded hover:bg-gray-600 mr-4">Back to Dashboard</button>
                    <button onClick={handleLogout} className="p-2 bg-red-600 text-white rounded hover:bg-red-700">Logout</button>
                </div>
            </div>
            <div className="p-12 bg-white text-center rounded-lg shadow-lg">
                <p>The Single Length Counter feature will be built here.</p>
            </div>
        </div>
    );
}
