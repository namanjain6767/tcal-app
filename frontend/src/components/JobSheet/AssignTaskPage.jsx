import React, { useState, useEffect } from 'react';
import api from '../../api';
import FormInput from './FormInput';
import ProductList from './ProductList';

// --- Assign Task Page ---
export default function AssignTaskPage({ onBack, onTaskAssigned }) {
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [counters, setCounters] = useState([]);
    const [selectedCounterId, setSelectedCounterId] = useState('');
    const [quantity, setQuantity] = useState(1);
    const [assignDate, setAssignDate] = useState(new Date().toISOString().split('T')[0]);
    const [expiryDate, setExpiryDate] = useState(new Date().toISOString().split('T')[0]);

    useEffect(() => {
        const fetchCounters = async () => {
            try {
                const response = await api.get('/users/counters');
                setCounters(response.data);
                if (response.data.length > 0) {
                    setSelectedCounterId(response.data[0].id);
                }
            } catch (error) {
                console.error("Failed to fetch counters:", error);
            }
        };
        fetchCounters();
    }, []);

    const handleAssign = async () => {
        if (!selectedProduct || !selectedCounterId || !assignDate || !expiryDate) {
            alert("Please select a product, counter, and set both dates.");
            return;
        }
        if (quantity <= 0) {
            alert("Please enter a valid quantity.");
            return;
        }

        try {
            await api.post('/tasks', {
                productId: selectedProduct.id,
                productName: selectedProduct.product_name,
                quantity: quantity,
                assignedToUserId: selectedCounterId,
                assignDate: assignDate,
                expiryDate: expiryDate
            });
            alert("Task assigned successfully!");
            onTaskAssigned();
        } catch (error) {
            console.error("Failed to assign task:", error);
            alert("Failed to assign task.");
        }
    };

    if (selectedProduct) {
        return (
            <div className="p-4 bg-white rounded-lg shadow-xl">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">Assign Task</h2>
                <div className="p-4 bg-gray-100 rounded-lg mb-4">
                    <h3 className="text-lg font-semibold">{selectedProduct.product_name}</h3>
                    <p className="text-sm text-gray-600">Code: {selectedProduct.product_code || 'N/A'}</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormInput label="Quantity to Produce" id="quantity" type="number" value={quantity} onChange={(e) => setQuantity(parseInt(e.target.value, 10))} />
                    <div>
                        <label htmlFor="counter" className="block text-sm font-medium text-gray-700">Assign to Counter</label>
                        <select
                            id="counter"
                            value={selectedCounterId}
                            onChange={(e) => setSelectedCounterId(e.target.value)}
                            className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm"
                        >
                            {counters.map(c => (
                                <option key={c.id} value={c.id}>{c.name} {c.surname}</option>
                            ))}
                        </select>
                    </div>
                    <FormInput label="Assign Date" id="assignDate" type="date" value={assignDate} onChange={(e) => setAssignDate(e.target.value)} />
                    <FormInput label="Expiry Date" id="expiryDate" type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />
                </div>
                <div className="flex justify-end gap-4 mt-8">
                    <button onClick={() => setSelectedProduct(null)} className="py-2 px-6 bg-gray-500 text-white rounded-lg hover:bg-gray-600">Change Product</button>
                    <button onClick={handleAssign} className="py-2 px-6 bg-green-600 text-white rounded-lg hover:bg-green-700">Assign Task</button>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 bg-white rounded-lg shadow-xl">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 border-b pb-4">Select Product to Assign</h2>
            <ProductList onSelectProduct={setSelectedProduct} />
            <div className="flex justify-end mt-8">
                <button onClick={onBack} className="py-2 px-6 bg-gray-500 text-white rounded-lg hover:bg-gray-600">Back</button>
            </div>
        </div>
    );
};