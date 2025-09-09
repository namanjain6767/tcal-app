import React, { useState } from 'react';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';

const API_URL = import.meta.env.VITE_API_URL;

export default function RegisterPage({ setPage, setUser }) {
    const [formData, setFormData] = useState({
        name: '',
        surname: '',
        email: '',
        phone: '',
        password: '',
        confirmPassword: ''
    });
    const [error, setError] = useState('');

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setError('');
        if (formData.password !== formData.confirmPassword) {
            setError("Passwords do not match.");
            return;
        }
        try {
            await axios.post(`${API_URL}/register`, { 
                email: formData.email, 
                password: formData.password,
                name: formData.name,
                surname: formData.surname,
                phone: formData.phone
            });
            const response = await axios.post(`${API_URL}/login`, { email: formData.email, password: formData.password });
            const { token } = response.data;
            localStorage.setItem('token', token);
            const decodedUser = jwtDecode(token);
            setUser(decodedUser);
            setPage('dashboard');
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to register.');
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen">
            <div className="p-8 bg-white rounded-lg shadow-md w-96">
                <h1 className="text-2xl font-bold mb-6 text-center">Registration</h1>
                <form onSubmit={handleRegister}>
                    <input name="name" value={formData.name} onChange={handleChange} placeholder="Name" className="w-full p-2 mb-4 border rounded" required />
                    <input name="surname" value={formData.surname} onChange={handleChange} placeholder="Surname" className="w-full p-2 mb-4 border rounded" required />
                    <input name="email" type="email" value={formData.email} onChange={handleChange} placeholder="Email" className="w-full p-2 mb-4 border rounded" required />
                    <input name="phone" type="tel" value={formData.phone} onChange={handleChange} placeholder="Phone Number" className="w-full p-2 mb-4 border rounded" required />
                    <input name="password" type="password" value={formData.password} onChange={handleChange} placeholder="Password" className="w-full p-2 mb-4 border rounded" required />
                    <input name="confirmPassword" type="password" value={formData.confirmPassword} onChange={handleChange} placeholder="Confirm Password" className="w-full p-2 mb-4 border rounded" required />
                    <button type="submit" className="w-full p-2 bg-green-600 text-white rounded hover:bg-green-700">Register</button>
                    {error && <p className="text-red-500 mt-4 text-center">{error}</p>}
                </form>
                <p className="mt-4 text-center">
                    Already have an account? <button onClick={() => setPage('login')} className="text-blue-600">Login</button>
                </p>
            </div>
        </div>
    );
}
