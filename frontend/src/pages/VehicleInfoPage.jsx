import React, { useState } from 'react';

export default function VehicleInfoPage({ setPage, setSessionInfo }) {
    const [vehicleNumber, setVehicleNumber] = useState('');
    const [note, setNote] = useState(''); // Changed to empty string for text input

    const handleContinue = () => {
        if (!vehicleNumber) {
            alert('Please enter a vehicle number.');
            return;
        }
        // Pass the session info up to the main App component
        setSessionInfo({ vehicleNumber, note });
        // Navigate to the main timber recorder page
        setPage('app');
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100">
            <div className="p-8 bg-white rounded-lg shadow-xl w-full max-w-md">
                <h1 className="text-2xl font-bold mb-6 text-center text-gray-800">Session Information</h1>
                
                <div className="space-y-6">
                    <div>
                        <label htmlFor="vehicleNumber" className="block text-sm font-medium text-gray-700 mb-1">
                            Vehicle Number
                        </label>
                        <input
                            type="text"
                            id="vehicleNumber"
                            value={vehicleNumber}
                            onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
                            placeholder="e.g., RJ19AB1234"
                            className="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>

                    <div>
                        <label htmlFor="note" className="block text-sm font-medium text-gray-700 mb-1">
                            Note
                        </label>
                        {/* Changed from select to input */}
                        <input
                            type="text"
                            id="note"
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder="e.g., MARCHING, PLANT, OTHER"
                            className="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                </div>

                <div className="mt-8">
                    <button 
                        onClick={handleContinue} 
                        className="w-full p-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-all shadow-md"
                    >
                        Continue
                    </button>
                </div>
                 <div className="mt-4 text-center">
                    <button 
                        onClick={() => setPage('dashboard')} 
                        className="text-sm text-gray-600 hover:text-gray-800"
                    >
                        Back to Dashboard
                    </button>
                </div>
            </div>
        </div>
    );
}

