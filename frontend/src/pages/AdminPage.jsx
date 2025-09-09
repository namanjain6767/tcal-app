import React, { useState, useEffect } from 'react';
import api from '../api';

// --- Registration Modal Component ---
function RegisterModal({ onClose, onUserRegistered }) {
    const [formData, setFormData] = useState({
        name: '',
        surname: '',
        email: '',
        phone: '',
        password: '',
        confirmPassword: '',
        role: 'counter', // Default role
        organization: ''
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
            await api.post('/register', formData);
            alert("User registered successfully!");
            onUserRegistered();
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to register.');
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="p-8 bg-white rounded-lg shadow-2xl w-full max-w-md">
                <h1 className="text-2xl font-bold mb-6 text-center">Register New User</h1>
                <form onSubmit={handleRegister} className="space-y-4">
                    <input name="name" value={formData.name} onChange={handleChange} placeholder="Name" className="w-full p-2 border rounded" required />
                    <input name="surname" value={formData.surname} onChange={handleChange} placeholder="Surname" className="w-full p-2 border rounded" required />
                    <input name="email" type="email" value={formData.email} onChange={handleChange} placeholder="Email" className="w-full p-2 border rounded" required />
                    <input name="phone" type="tel" value={formData.phone} onChange={handleChange} placeholder="Phone Number" className="w-full p-2 border rounded" required />
                    <input name="organization" value={formData.organization} onChange={handleChange} placeholder="Organization Name" className="w-full p-2 border rounded" required />
                     <select name="role" value={formData.role} onChange={handleChange} className="w-full p-2 border rounded" required>
                        <option value="counter">Counter</option>
                        <option value="owner">Owner</option>
                    </select>
                    <input name="password" type="password" value={formData.password} onChange={handleChange} placeholder="Password" className="w-full p-2 border rounded" required />
                    <input name="confirmPassword" type="password" value={formData.confirmPassword} onChange={handleChange} placeholder="Confirm Password" className="w-full p-2 border rounded" required />
                    <button type="submit" className="w-full p-2 bg-green-600 text-white rounded hover:bg-green-700">Register User</button>
                    {error && <p className="text-red-500 mt-2 text-center">{error}</p>}
                </form>
                <button onClick={onClose} className="w-full p-2 mt-4 bg-gray-500 text-white rounded hover:bg-gray-600">Cancel</button>
            </div>
        </div>
    );
}


// --- Main Admin Page Component ---
export default function AdminPage({ setPage }) {
    const [users, setUsers] = useState([]);
    const [showRegisterModal, setShowRegisterModal] = useState(false);

    const fetchUsers = async () => {
        try {
            const response = await api.get('/users');
            setUsers(response.data);
        } catch (error) {
            console.error("Failed to fetch users:", error);
        }
    };

    useEffect(() => {
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
                <td className="p-2 uppercase">{user.role}</td>
                <td className="p-2">{user.organization}</td>
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
        <div className="p-8 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                 <button onClick={() => setPage('dashboard')} className="p-2 bg-gray-500 text-white rounded hover:bg-gray-600">Back to Dashboard</button>
                 <h1 className="text-3xl font-bold">Admin Panel</h1>
                 <button onClick={() => setShowRegisterModal(true)} className="p-2 bg-green-600 text-white rounded hover:bg-green-700">Register New User</button>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                        <tr className="border-b">
                            <th className="p-2">Name</th>
                            <th className="p-2">Email</th>
                            <th className="p-2">Role</th>
                            <th className="p-2">Organization</th>
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
            {showRegisterModal && <RegisterModal onClose={() => setShowRegisterModal(false)} onUserRegistered={() => { fetchUsers(); setShowRegisterModal(false); }} />}
        </div>
    );
}

