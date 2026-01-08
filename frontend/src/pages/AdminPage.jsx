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
        role: 'counter',
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

// --- Edit User Modal Component ---
function EditUserModal({ user, onClose, onUserUpdated }) {
    const [formData, setFormData] = useState({
        name: user.name || '',
        surname: user.surname || '',
        email: user.email || '',
        phone: user.phone || '',
        role: user.role || 'counter',
        organization: user.organization || ''
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await api.put(`/users/${user.id}`, formData);
            alert("User updated successfully!");
            onUserUpdated();
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to update user.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="p-8 bg-white rounded-lg shadow-2xl w-full max-w-md">
                <h1 className="text-2xl font-bold mb-6 text-center">Edit User</h1>
                <form onSubmit={handleUpdate} className="space-y-4">
                    <input name="name" value={formData.name} onChange={handleChange} placeholder="Name" className="w-full p-2 border rounded" required />
                    <input name="surname" value={formData.surname} onChange={handleChange} placeholder="Surname" className="w-full p-2 border rounded" required />
                    <input name="email" type="email" value={formData.email} onChange={handleChange} placeholder="Email" className="w-full p-2 border rounded" required />
                    <input name="phone" type="tel" value={formData.phone} onChange={handleChange} placeholder="Phone Number" className="w-full p-2 border rounded" required />
                    <input name="organization" value={formData.organization} onChange={handleChange} placeholder="Organization Name" className="w-full p-2 border rounded" required />
                    <select name="role" value={formData.role} onChange={handleChange} className="w-full p-2 border rounded" required>
                        <option value="counter">Counter</option>
                        <option value="owner">Owner</option>
                    </select>
                    <button type="submit" disabled={loading} className="w-full p-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">
                        {loading ? 'Updating...' : 'Update User'}
                    </button>
                    {error && <p className="text-red-500 mt-2 text-center">{error}</p>}
                </form>
                <button onClick={onClose} className="w-full p-2 mt-4 bg-gray-500 text-white rounded hover:bg-gray-600">Cancel</button>
            </div>
        </div>
    );
}

// --- Timeline Modal Component ---
function TimelineModal({ user, onClose, onTimelineReset }) {
    const [timeline, setTimeline] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('timeline'); // 'timeline' or 'graph'
    const [resetting, setResetting] = useState(false);

    const fetchTimeline = async () => {
        try {
            const response = await api.get(`/activity/timeline/${user.id}?limit=500`);
            setTimeline(response.data);
        } catch (error) {
            console.error("Failed to fetch timeline:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTimeline();
    }, [user.id]);

    const handleResetTimeline = async () => {
        if (!window.confirm(`Are you sure you want to reset all activity history for ${user.name} ${user.surname}? This action cannot be undone.`)) {
            return;
        }
        setResetting(true);
        try {
            await api.delete(`/activity/timeline/${user.id}`);
            setTimeline([]);
            alert('Timeline reset successfully!');
            if (onTimelineReset) onTimelineReset();
        } catch (error) {
            console.error("Failed to reset timeline:", error);
            alert('Failed to reset timeline.');
        } finally {
            setResetting(false);
        }
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    };

    const getActionIcon = (action) => {
        switch (action) {
            case 'page_visit': return '📄';
            case 'login': return '🔑';
            case 'logout': return '🚪';
            default: return '⚡';
        }
    };

    const getActionColor = (action) => {
        switch (action) {
            case 'login': return 'bg-green-100 border-green-300';
            case 'logout': return 'bg-red-100 border-red-300';
            default: return 'bg-blue-100 border-blue-300';
        }
    };

    // Calculate daily usage stats for graph
    const calculateDailyUsage = () => {
        const dailyStats = {};
        const sortedTimeline = [...timeline].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        
        sortedTimeline.forEach((item, index) => {
            const date = new Date(item.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
            
            if (!dailyStats[date]) {
                dailyStats[date] = { sessions: 0, totalMinutes: 0, pageVisits: 0 };
            }
            
            if (item.action === 'login') {
                dailyStats[date].sessions++;
            }
            if (item.action === 'page_visit') {
                dailyStats[date].pageVisits++;
            }
            
            // Calculate time between consecutive activities
            if (index > 0) {
                const prevTime = new Date(sortedTimeline[index - 1].created_at);
                const currTime = new Date(item.created_at);
                const diffMins = (currTime - prevTime) / 60000;
                // Only count if less than 30 mins (user was active)
                if (diffMins < 30 && diffMins > 0) {
                    const prevDate = prevTime.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
                    if (dailyStats[prevDate]) {
                        dailyStats[prevDate].totalMinutes += diffMins;
                    }
                }
            }
        });
        
        // Get last 7 days
        const dates = Object.keys(dailyStats).slice(-7);
        return dates.map(date => ({
            date,
            ...dailyStats[date],
            totalMinutes: Math.round(dailyStats[date].totalMinutes)
        }));
    };

    const dailyUsage = calculateDailyUsage();
    const maxMinutes = Math.max(...dailyUsage.map(d => d.totalMinutes), 1);
    const totalTimeSpent = dailyUsage.reduce((acc, d) => acc + d.totalMinutes, 0);
    const totalSessions = dailyUsage.reduce((acc, d) => acc + d.sessions, 0);
    const totalPageVisits = dailyUsage.reduce((acc, d) => acc + d.pageVisits, 0);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="p-6 bg-white rounded-lg shadow-2xl w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">Activity - {user.name} {user.surname}</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl">&times;</button>
                </div>

                {/* Tab buttons */}
                <div className="flex gap-2 mb-4">
                    <button 
                        onClick={() => setActiveTab('timeline')}
                        className={`px-4 py-2 rounded-lg font-medium ${activeTab === 'timeline' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                    >
                        📋 Timeline
                    </button>
                    <button 
                        onClick={() => setActiveTab('graph')}
                        className={`px-4 py-2 rounded-lg font-medium ${activeTab === 'graph' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                    >
                        📊 Usage Graph
                    </button>
                    <button 
                        onClick={handleResetTimeline}
                        disabled={resetting || timeline.length === 0}
                        className="ml-auto px-4 py-2 rounded-lg font-medium bg-red-100 text-red-700 hover:bg-red-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {resetting ? '⏳ Resetting...' : '🗑️ Reset Timeline'}
                    </button>
                </div>
                
                {loading ? (
                    <div className="flex justify-center py-8">
                        <div className="w-8 h-8 border-4 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
                    </div>
                ) : timeline.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">No activity recorded yet.</p>
                ) : activeTab === 'graph' ? (
                    <div className="overflow-y-auto flex-1">
                        {/* Summary Cards */}
                        <div className="grid grid-cols-3 gap-4 mb-6">
                            <div className="bg-blue-50 p-4 rounded-lg text-center">
                                <div className="text-2xl font-bold text-blue-600">{totalTimeSpent} min</div>
                                <div className="text-sm text-gray-600">Total Time (7 days)</div>
                            </div>
                            <div className="bg-green-50 p-4 rounded-lg text-center">
                                <div className="text-2xl font-bold text-green-600">{totalSessions}</div>
                                <div className="text-sm text-gray-600">Login Sessions</div>
                            </div>
                            <div className="bg-purple-50 p-4 rounded-lg text-center">
                                <div className="text-2xl font-bold text-purple-600">{totalPageVisits}</div>
                                <div className="text-sm text-gray-600">Page Visits</div>
                            </div>
                        </div>

                        {/* Bar Chart */}
                        <div className="bg-gray-50 p-4 rounded-lg">
                            <h3 className="font-semibold mb-4 text-gray-700">Daily Activity (Last 7 Days)</h3>
                            <div className="flex items-end gap-3 h-48">
                                {dailyUsage.length === 0 ? (
                                    <p className="text-gray-500 w-full text-center">No data available</p>
                                ) : (
                                    dailyUsage.map((day, index) => (
                                        <div key={index} className="flex-1 flex flex-col items-center">
                                            <div className="w-full flex flex-col items-center justify-end h-40">
                                                <span className="text-xs font-medium text-gray-700 mb-1">{day.totalMinutes}m</span>
                                                <div 
                                                    className="w-full bg-gradient-to-t from-indigo-600 to-indigo-400 rounded-t-lg transition-all duration-500 hover:from-indigo-700 hover:to-indigo-500"
                                                    style={{ 
                                                        height: `${Math.max((day.totalMinutes / maxMinutes) * 100, 5)}%`,
                                                        minHeight: '8px'
                                                    }}
                                                    title={`${day.totalMinutes} minutes, ${day.sessions} sessions, ${day.pageVisits} page visits`}
                                                ></div>
                                            </div>
                                            <span className="text-xs text-gray-500 mt-2 font-medium">{day.date}</span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Daily Breakdown Table */}
                        <div className="mt-4 bg-white border rounded-lg overflow-hidden">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-100">
                                    <tr>
                                        <th className="p-3 text-left">Date</th>
                                        <th className="p-3 text-center">Time Spent</th>
                                        <th className="p-3 text-center">Sessions</th>
                                        <th className="p-3 text-center">Page Visits</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {dailyUsage.map((day, index) => (
                                        <tr key={index} className="border-t">
                                            <td className="p-3 font-medium">{day.date}</td>
                                            <td className="p-3 text-center">
                                                <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded">{day.totalMinutes} min</span>
                                            </td>
                                            <td className="p-3 text-center">{day.sessions}</td>
                                            <td className="p-3 text-center">{day.pageVisits}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : (
                    <div className="overflow-y-auto flex-1 pr-2">
                        <div className="relative">
                            {/* Timeline line */}
                            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200"></div>
                            
                            {timeline.map((item, index) => (
                                <div key={index} className="relative pl-10 pb-4">
                                    {/* Timeline dot */}
                                    <div className="absolute left-2 w-5 h-5 bg-white border-2 border-blue-500 rounded-full flex items-center justify-center text-xs">
                                        {getActionIcon(item.action)}
                                    </div>
                                    
                                    <div className={`p-3 rounded-lg border ${getActionColor(item.action)}`}>
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <span className="font-medium capitalize">{item.action.replace('_', ' ')}</span>
                                                {item.page && item.page !== 'N/A' && (
                                                    <span className="ml-2 text-gray-600">→ {item.page}</span>
                                                )}
                                            </div>
                                            <span className="text-xs text-gray-500">{formatDate(item.created_at)}</span>
                                        </div>
                                        {item.ip_address && (
                                            <p className="text-xs text-gray-400 mt-1">IP: {item.ip_address}</p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                
                <button onClick={onClose} className="mt-4 w-full p-2 bg-gray-500 text-white rounded hover:bg-gray-600">Close</button>
            </div>
        </div>
    );
}


// --- Main Admin Page Component ---
export default function AdminPage({ setPage }) {
    const [users, setUsers] = useState([]);
    const [showRegisterModal, setShowRegisterModal] = useState(false);
    const [selectedUserTimeline, setSelectedUserTimeline] = useState(null);
    const [editingUser, setEditingUser] = useState(null);

    const fetchUsers = async () => {
        try {
            const response = await api.get('/activity/users');
            setUsers(response.data);
        } catch (error) {
            // Fallback to regular users endpoint if activity endpoint fails
            try {
                const response = await api.get('/users');
                setUsers(response.data);
            } catch (err) {
                console.error("Failed to fetch users:", err);
            }
        }
    };

    useEffect(() => {
        fetchUsers();
        // Refresh every 30 seconds to update online status
        const interval = setInterval(fetchUsers, 30000);
        return () => clearInterval(interval);
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

    const formatLastActive = (lastActive) => {
        if (!lastActive) return 'Never';
        const date = new Date(lastActive);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
    };

    const UserRow = ({ user }) => {
        const [ipAddress, setIpAddress] = useState(user.allowed_ip || '');
        const isOnline = user.is_currently_active;

        const handleSaveIp = async () => {
            try {
                await api.post(`/users/${user.id}/lock-ip`, { ipAddress });
                alert('IP address updated!');
            } catch (error) {
                alert("Failed to save IP address.");
            }
        };

        return (
            <tr className="border-b hover:bg-gray-50">
                <td className="p-3">
                    <div className="flex items-center gap-2">
                        <div className={`w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                        <div>
                            <div className="font-medium">{user.name} {user.surname}</div>
                            <div className="text-xs text-gray-500">{user.email}</div>
                        </div>
                    </div>
                </td>
                <td className="p-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        user.role === 'owner' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                        {user.role?.toUpperCase()}
                    </span>
                </td>
                <td className="p-3 text-sm">{user.organization}</td>
                <td className="p-3">
                    <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center gap-1 text-sm ${isOnline ? 'text-green-600' : 'text-gray-500'}`}>
                            {isOnline ? '🟢 Online' : '⚫ Offline'}
                        </span>
                        {user.current_page && isOnline && (
                            <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">{user.current_page}</span>
                        )}
                    </div>
                </td>
                <td className="p-3 text-sm text-gray-600">{formatLastActive(user.last_active)}</td>
                <td className="p-3 font-mono text-xs">{user.last_login_ip || 'N/A'}</td>
                <td className="p-3">
                    <div className="flex items-center gap-2">
                        <input 
                            type="text" 
                            value={ipAddress} 
                            onChange={(e) => setIpAddress(e.target.value)}
                            placeholder="Any IP"
                            className="px-3 py-2 border rounded w-36 text-sm"
                        />
                        <button onClick={handleSaveIp} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">Lock</button>
                    </div>
                </td>
                <td className="p-3">
                    <div className="flex gap-2">
                        <button 
                            onClick={() => setEditingUser(user)} 
                            className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 text-sm font-medium"
                        >
                            Edit
                        </button>
                        <button 
                            onClick={() => setSelectedUserTimeline(user)} 
                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium"
                        >
                            Timeline
                        </button>
                        <button 
                            onClick={() => handleDeleteUser(user.id)} 
                            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium"
                        >
                            Delete
                        </button>
                    </div>
                </td>
            </tr>
        );
    };

    // Summary stats
    const onlineCount = users.filter(u => u.is_currently_active).length;
    const totalCount = users.length;

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <button onClick={() => setPage('dashboard')} className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-medium">
                    ← Back to Dashboard
                </button>
                <h1 className="text-3xl font-bold">Admin Panel</h1>
                <button onClick={() => setShowRegisterModal(true)} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium">
                    + Register User
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-white p-4 rounded-lg shadow-md border-l-4 border-blue-500">
                    <div className="text-sm text-gray-500">Total Users</div>
                    <div className="text-2xl font-bold">{totalCount}</div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-md border-l-4 border-green-500">
                    <div className="text-sm text-gray-500">Online Now</div>
                    <div className="text-2xl font-bold text-green-600">{onlineCount}</div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-md border-l-4 border-gray-500">
                    <div className="text-sm text-gray-500">Offline</div>
                    <div className="text-2xl font-bold text-gray-600">{totalCount - onlineCount}</div>
                </div>
            </div>

            {/* Users Table */}
            <div className="bg-white p-6 rounded-lg shadow-md overflow-x-auto">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-semibold">User Activity Monitor</h2>
                    <button onClick={fetchUsers} className="text-sm text-blue-600 hover:text-blue-800">
                        🔄 Refresh
                    </button>
                </div>
                <table className="w-full text-left">
                    <thead>
                        <tr className="border-b bg-gray-50">
                            <th className="p-3 text-sm font-semibold">User</th>
                            <th className="p-3 text-sm font-semibold">Role</th>
                            <th className="p-3 text-sm font-semibold">Organization</th>
                            <th className="p-3 text-sm font-semibold">Status</th>
                            <th className="p-3 text-sm font-semibold">Last Active</th>
                            <th className="p-3 text-sm font-semibold">Last IP</th>
                            <th className="p-3 text-sm font-semibold">IP Lock</th>
                            <th className="p-3 text-sm font-semibold">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map(user => <UserRow key={user.id} user={user} />)}
                    </tbody>
                </table>
                {users.length === 0 && (
                    <p className="text-center text-gray-500 py-8">No users found.</p>
                )}
            </div>

            {/* Modals */}
            {showRegisterModal && (
                <RegisterModal 
                    onClose={() => setShowRegisterModal(false)} 
                    onUserRegistered={() => { fetchUsers(); setShowRegisterModal(false); }} 
                />
            )}
            {selectedUserTimeline && (
                <TimelineModal 
                    user={selectedUserTimeline} 
                    onClose={() => setSelectedUserTimeline(null)} 
                />
            )}
            {editingUser && (
                <EditUserModal 
                    user={editingUser} 
                    onClose={() => setEditingUser(null)} 
                    onUserUpdated={() => { fetchUsers(); setEditingUser(null); }}
                />
            )}
        </div>
    );
}

