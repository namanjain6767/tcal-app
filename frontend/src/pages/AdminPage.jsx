import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL;

const getAuthToken = () => localStorage.getItem('token');

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

api.interceptors.request.use(config => {
    const token = getAuthToken();
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export default function AdminPage({ setPage }) {
    const [users, setUsers] = useState([]);

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const response = await api.get('/users');
                setUsers(response.data);
            } catch (error) {
                console.error("Failed to fetch users:", error);
            }
        };
        fetchUsers();
    }, []);

    const handleDeleteUser = async (id) => {
        if (window.confirm("Are you sure you want to permanently delete this user?")) {
            try {
                await api.delete(`/users/${id}`);
                setUsers(users.filter(user => user.id !== id));
            } catch (error) {
                alert("Could not delete user.");
            }
        }
    };

    const UserRow = ({ user }) => {
        const [ipAddress, setIpAddress] = useState(user.allowed_ip || '');

        const handleSaveIp = async () => {
            try {
                await api.post(`/users/${user.id}/lock-ip`, { ipAddress });
                alert('IP address updated!');
            } catch (error) {
                alert("Failed to save IP address.");
            }
        };

        return (
            <tr className="border-b">
                <td className="p-2">{user.name} {user.surname}</td>
                <td className="p-2">{user.email}</td>
                <td className="p-2 font-mono">{user.last_login_ip || 'N/A'}</td>
                <td className="p-2 flex items-center gap-2">
                    <input 
                        type="text" 
                        value={ipAddress} 
                        onChange={(e) => setIpAddress(e.target.value)}
                        placeholder="Allow any IP"
                        className="p-1 border rounded w-40"
                    />
                    <button onClick={handleSaveIp} className="p-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm">Save IP</button>
                </td>
                <td className="p-2">
                    <button onClick={() => handleDeleteUser(user.id)} className="p-2 bg-red-600 text-white rounded hover:bg-red-700">Delete</button>
                </td>
            </tr>
        );
    };

    return (
        <div className="p-8 max-w-6xl mx-auto">
            <button onClick={() => setPage('dashboard')} className="mb-6 p-2 bg-gray-500 text-white rounded hover:bg-gray-600">Back to Dashboard</button>
            <h1 className="text-3xl font-bold mb-6">Admin Panel</h1>
            <div className="bg-white p-6 rounded-lg shadow-md overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                        <tr className="border-b">
                            <th className="p-2">Name</th>
                            <th className="p-2">Email</th>
                            <th className="p-2">Last Login IP</th>
                            <th className="p-2">Lock to IP Address</th>
                            <th className="p-2">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map(user => <UserRow key={user.id} user={user} />)}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
