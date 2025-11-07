import React, { useState } from 'react';
import api from '../api';

export default function LoginPage({ setPage, onLoginSuccess, redirectInfo }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Determine the login title based on redirectInfo
    const loginTitle = redirectInfo ? `Login to ${redirectInfo.appName}` : 'Login to T-CAL';

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            const response = await api.post('/login', { email, password });
            onLoginSuccess(response.data.token);
        } catch (err) {
            setError(err.response?.data?.error || 'Login failed. Please check your credentials.');
            setIsLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen">
            <div className="p-8 bg-white rounded-lg shadow-md w-96">
                <h1 className="text-2xl font-bold mb-6 text-center">{loginTitle}</h1>
                <form onSubmit={handleLogin}>
                    <div className="mb-4">
                        <input 
                            type="email" 
                            value={email} 
                            onChange={(e) => setEmail(e.target.value)} 
                            placeholder="Email" 
                            className="w-full p-2 border rounded" 
                            required 
                        />
                    </div>
                    <div className="mb-6">
                        <input 
                            type="password" 
                            value={password} 
                            onChange={(e) => setPassword(e.target.value)} 
                            placeholder="Password" 
                            className="w-full p-2 border rounded" 
                            required 
                        />
                    </div>
                    <button 
                        type="submit" 
                        className="w-full p-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-blue-300"
                        disabled={isLoading}
                    >
                        {isLoading ? 'Logging in...' : 'Login'}
                    </button>
                    {error && <p className="text-red-500 mt-4 text-center">{error}</p>}
                </form>
                 <div className="mt-4 text-center">
                    <button 
                        onClick={() => setPage('appsList')} 
                        className="text-sm text-gray-600 hover:text-gray-800"
                    >
                        Back to Apps
                    </button>
                </div>
            </div>
        </div>
    );
}
