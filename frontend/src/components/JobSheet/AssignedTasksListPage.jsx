import React, { useState, useEffect } from 'react';
import api from '../../api';

// --- Assigned Tasks List Page (for Counters & Owners) ---
export default function AssignedTasksListPage({ onBack, onSelectTask, onViewTaskDetails, user }) {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [taskViewMode, setTaskViewMode] = useState('menu'); // 'menu', 'pending', 'completed'

    const fetchTasks = async () => {
        setLoading(true);
        try {
            const response = await api.get('/tasks');
            setTasks(response.data);
        } catch (error) {
            console.error("Failed to fetch tasks:", error);
            alert("Failed to fetch tasks.");
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchTasks();
    }, []);
    
    const handleDeleteTask = async (taskId) => {
        if (window.confirm("Are you sure you want to delete this task?")) {
            try {
                await api.delete(`/tasks/${taskId}`);
                alert("Task deleted.");
                fetchTasks(); // Refresh list
            } catch (error) {
                console.error("Failed to delete task:", error);
                alert("Failed to delete task.");
            }
        }
    };

    if (loading) {
        return <div className="text-center p-8">Loading tasks...</div>;
    }

    const pendingTasks = tasks.filter(t => t.status === 'pending');
    const completedTasks = tasks.filter(t => t.status === 'completed');

    // --- Main Menu for this page ---
    if (taskViewMode === 'menu') {
        return (
            <div className="p-4 bg-white rounded-lg shadow-xl">
                <h2 className="text-2xl font-bold text-gray-800 mb-6 border-b pb-4">Assigned Tasks</h2>
                <div className="flex flex-col md:flex-row justify-center gap-6">
                    <button 
                        onClick={() => setTaskViewMode('pending')}
                        className="py-3 px-8 bg-yellow-500 text-white text-lg rounded-lg hover:bg-yellow-600 shadow-lg"
                    >
                        Pending Tasks ({pendingTasks.length})
                    </button>
                    <button 
                        onClick={() => setTaskViewMode('completed')}
                        className="py-3 px-8 bg-green-600 text-white text-lg rounded-lg hover:bg-green-700 shadow-lg"
                    >
                        Completed Tasks ({completedTasks.length})
                    </button>
                </div>
                <div className="flex justify-end mt-8">
                     <button onClick={onBack} className="py-2 px-6 bg-gray-500 text-white rounded-lg hover:bg-gray-600">Back</button>
                </div>
            </div>
        );
    }

    // --- Pending Tasks View ---
    if (taskViewMode === 'pending') {
        return (
            <div className="p-4 bg-white rounded-lg shadow-xl">
                <h3 className="text-xl font-semibold text-gray-700 mb-4">Pending Tasks</h3>
                <div className="space-y-4 mb-8">
                    {pendingTasks.length > 0 ? (
                        pendingTasks.map(task => (
                            <div key={task.id} className="w-full p-4 bg-gray-100 rounded-lg flex justify-between items-center">
                                <button
                                    onClick={() => onSelectTask(task)}
                                    className="text-left hover:opacity-75"
                                    disabled={user.role === 'owner'}
                                >
                                    <h3 className="text-lg font-semibold text-indigo-700">{task.product_name}</h3>
                                    <p className="text-sm text-gray-600">Quantity: <span className="font-bold">{task.quantity}</span></p>
                                    {user.role === 'owner' && <p className="text-sm text-gray-600">Assigned To: <span className="font-bold">{task.assigned_to_name}</span></p>}
                                    <p className="text-sm text-gray-600">Expires: {new Date(task.expiry_date).toLocaleDateString()}</p>
                                </button>
                                {user.role === 'owner' && (
                                    <button
                                        onClick={() => handleDeleteTask(task.id)}
                                        className="py-1 px-3 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
                                    >
                                        Delete
                                    </button>
                                )}
                            </div>
                        ))
                    ) : (
                        <p className="text-center text-gray-500">No pending tasks found.</p>
                    )}
                </div>
                <div className="flex justify-end mt-8">
                     <button onClick={() => setTaskViewMode('menu')} className="py-2 px-6 bg-gray-500 text-white rounded-lg hover:bg-gray-600">Back</button>
                </div>
            </div>
        );
    }

    // --- Completed Tasks View ---
    if (taskViewMode === 'completed') {
        return (
            <div className="p-4 bg-white rounded-lg shadow-xl">
                <h3 className="text-xl font-semibold text-gray-700 mb-4">Completed Tasks</h3>
                 <div className="space-y-4">
                    {completedTasks.length > 0 ? (
                        completedTasks.map(task => (
                            <button
                                key={task.id}
                                onClick={() => user.role === 'owner' ? onViewTaskDetails(task) : null}
                                className={`w-full p-4 bg-green-50 rounded-lg text-left ${user.role === 'owner' ? 'hover:bg-green-100 cursor-pointer' : 'opacity-70 cursor-default'}`}
                            >
                                <h3 className="text-lg font-semibold text-green-700">{task.product_name}</h3>
                                <p className="text-sm text-gray-600">Quantity: <span className="font-bold">{task.quantity}</span></p>
                                {user.role === 'owner' && <p className="text-sm text-gray-600">Assigned To: <span className="font-bold">{task.assigned_to_name}</span></p>}
                                <p className="text-sm text-gray-600">Completed: {task.completed_at ? new Date(task.completed_at).toLocaleDateString() : 'N/A'}</p>
                            </button>
                        ))
                    ) : (
                        <p className="text-center text-gray-500">No completed tasks yet.</p>
                    )}
                </div>
                <div className="flex justify-end mt-8">
                     <button onClick={() => setTaskViewMode('menu')} className="py-2 px-6 bg-gray-500 text-white rounded-lg hover:bg-gray-600">Back</button>
                </div>
            </div>
        );
    }
};