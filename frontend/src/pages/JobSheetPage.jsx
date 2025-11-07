import React, { useState } from 'react';
import CreateProductForm from '../components/JobSheet/CreateProductForm';
import SelectProductPage from '../components/JobSheet/SelectProductPage';
import EditProductPage from '../components/JobSheet/EditProductPage';
import AssignTaskPage from '../components/JobSheet/AssignTaskPage';
import AssignedTasksListPage from '../components/JobSheet/AssignedTasksListPage';
import CompletedTaskReport from '../components/JobSheet/CompletedTaskReport';
import JobSheetCounter from '../components/JobSheet/JobSheetCounter';

// --- Main Job Sheet Page Component (MODIFIED) ---
export default function JobSheetPage({ setPage, handleBack, handleLogout, user }) {
    const [mode, setMode] = useState('menu'); // 'menu', 'create', 'select', 'assign', 'tasks', 'counter', 'editProductList', 'taskReport'
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [selectedTask, setSelectedTask] = useState(null);

    const handleCreateClick = () => setMode('create');
    const handleSelectClick = () => setMode('select');
    const handleAssignClick = () => setMode('assign');
    const handleViewTasksClick = () => setMode('tasks');
    const handleEditProductClick = () => setMode('editProductList');

    const handleProductSelected = (product) => {
        setSelectedProduct(product);
        setSelectedTask({ quantity: 1, parts: product.parts }); // Mock task object for quantity 1
        setMode('counter');
    };
    
    const handleTaskSelected = (task) => {
        const productForTask = {
            product_name: task.product_name,
            parts: task.parts
        };
        setSelectedProduct(productForTask);
        setSelectedTask(task);
        setMode('counter');
    };

    const handleViewTaskDetails = (task) => {
        setSelectedTask(task);
        setMode('taskReport');
    };
    
    const handleEditProductSelected = (product) => {
        setSelectedProduct(product);
        setMode('create'); // Go to the 'create' form, but in edit mode
    };

    const renderContent = () => {
        switch (mode) {
            case 'create':
                return <CreateProductForm onBack={() => setMode('menu')} onSaveSuccess={() => setMode('menu')} productToEdit={selectedProduct} />;
            case 'select':
                return <SelectProductPage onBack={() => setMode('menu')} onSelectProduct={handleProductSelected} />;
            case 'editProductList':
                return <EditProductPage onBack={() => setMode('menu')} onSelectProduct={handleEditProductSelected} />;
            case 'assign':
                return <AssignTaskPage onBack={() => setMode('menu')} onTaskAssigned={() => setMode('menu')} />;
            case 'tasks':
                return <AssignedTasksListPage onBack={() => setMode('menu')} onSelectTask={handleTaskSelected} onViewTaskDetails={handleViewTaskDetails} user={user} />;
            case 'counter':
                return <JobSheetCounter product={selectedProduct} task={selectedTask} onBack={() => setMode(user.role === 'owner' ? 'select' : 'tasks')} />;
            case 'taskReport':
                return <CompletedTaskReport task={selectedTask} onBack={() => setMode('tasks')} />;
            case 'menu':
            default:
                return (
                    <div className="p-8 bg-white rounded-lg shadow-xl text-center">
                        <h1 className="text-3xl font-bold text-gray-800 mb-6">T-Job Sheet</h1>
                        {user && user.role === 'owner' ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                <button onClick={handleCreateClick} className="py-3 px-6 bg-indigo-600 text-white text-lg rounded-lg hover:bg-indigo-700 shadow-lg">
                                    Create New Product
                                </button>
                                <button onClick={handleEditProductClick} className="py-3 px-6 bg-yellow-600 text-white text-lg rounded-lg hover:bg-yellow-700 shadow-lg">
                                    Edit Product
                                </button>
                                <button onClick={handleAssignClick} className="py-3 px-6 bg-blue-600 text-white text-lg rounded-lg hover:bg-blue-700 shadow-lg">
                                    Assign Task
                                </button>
                                <button onClick={handleViewTasksClick} className="py-3 px-6 bg-green-600 text-white text-lg rounded-lg hover:bg-green-700 shadow-lg">
                                    View Assigned Tasks
                                </button>
                            </div>
                        ) : (
                             <div className="flex justify-center gap-6">
                                <button onClick={handleViewTasksClick} className="py-3 px-8 bg-green-600 text-white text-lg rounded-lg hover:bg-green-700 shadow-lg">
                                    View Assigned Tasks
                                </button>
                            </div>
                        )}
                    </div>
                );
        }
    };

    return (
        <div className="p-8 max-w-7xl mx-auto">
            {mode === 'menu' ? (
                <div className="flex justify-end mb-6">
                    <button 
                        onClick={handleLogout} 
                        className="p-2 bg-red-600 text-white rounded hover:bg-red-700"
                    >
                        Logout
                    </button>
                </div>
            ) : (
                 <button 
                    onClick={() => {
                        setMode('menu');
                        setSelectedProduct(null); // Clear selected product when going back
                        setSelectedTask(null);
                    }} 
                    className="mb-6 p-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                 >
                    Back to Job Sheet Menu
                </button>
            )}
            {renderContent()}
        </div>
    );
}