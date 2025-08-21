import React, { useState } from 'react';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';

const API_URL = import.meta.env.VITE_API_URL;

export default function LoginPage({ setPage, setUser }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        try {
            const response = await axios.post(`${API_URL}/login`, { email, password });
            const { token } = response.data;
            localStorage.setItem('token', token);
            const decodedUser = jwtDecode(token);
            setUser(decodedUser);
            setPage('dashboard');
        } catch (err) {
            setError(err.response?.data?.error || 'Login failed.');
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen">
            <div className="p-8 bg-white rounded-lg shadow-md w-96">
                <h1 className="text-2xl font-bold mb-6 text-center">Login</h1>
                <form onSubmit={handleLogin}>
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="w-full p-2 mb-4 border rounded" />
                    <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" className="w-full p-2 mb-4 border rounded" />
                    <button type="submit" className="w-full p-2 bg-blue-600 text-white rounded hover:bg-blue-700">Login</button>
                    {error && <p className="text-red-500 mt-4 text-center">{error}</p>}
                </form>
                <p className="mt-4 text-center">
                    Don't have an account? <button onClick={() => setPage('register')} className="text-blue-600">Register</button>
                </p>
            </div>
        </div>
    );
}
