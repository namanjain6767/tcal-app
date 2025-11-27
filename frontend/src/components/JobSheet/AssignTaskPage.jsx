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
    
    // --- State for Contractor, Buyer, and Job Sheet Ref ---
    const [contractorName, setContractorName] = useState('');
    const [buyerName, setBuyerName] = useState('');
    const [jobSheetRef, setJobSheetRef] = useState(''); // NEW
    
    const [contractorSuggestions, setContractorSuggestions] = useState([]);
    const [buyerSuggestions, setBuyerSuggestions] = useState([]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // 1. Fetch Counters for dropdown
                const countersRes = await api.get('/users/counters');
                setCounters(countersRes.data);
                if (countersRes.data.length > 0) {
                    setSelectedCounterId(countersRes.data[0].id);
                }

                // 2. Fetch Contractor Suggestions
                const contractorsRes = await api.get('/tasks/contractors');
                setContractorSuggestions(contractorsRes.data);

                // 3. Fetch Buyer Suggestions
                const buyersRes = await api.get('/tasks/buyers');
                setBuyerSuggestions(buyersRes.data);

            } catch (error) {
                console.error("Failed to fetch initial data:", error);
            }
        };
        fetchData();
    }, []);

    const handleAssign = async () => {
        // Basic validation
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
                expiryDate: expiryDate,
                contractorName: contractorName, 
                buyerName: buyerName,
                jobSheetRef: jobSheetRef // NEW
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
                {/* Hidden Datalists for Autocomplete */}
                <datalist id="contractor-list">
                    {contractorSuggestions.map((name, idx) => <option key={idx} value={name} />)}
                </datalist>
                <datalist id="buyer-list">
                    {buyerSuggestions.map((name, idx) => <option key={idx} value={name} />)}
                </datalist>

                <h2 className="text-2xl font-bold text-gray-800 mb-4">Assign Task</h2>
                <div className="p-4 bg-gray-100 rounded-lg mb-4">
                    <h3 className="text-lg font-semibold">{selectedProduct.product_name}</h3>
                    <p className="text-sm text-gray-600">Code: {selectedProduct.product_code || 'N/A'}</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Standard Fields */}
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

                    {/* Contractor & Buyer Inputs with Autocomplete */}
                    <div>
                        <label htmlFor="contractorName" className="block text-sm font-medium text-gray-700">Contractor Name</label>
                        <input
                            type="text"
                            id="contractorName"
                            value={contractorName}
                            onChange={(e) => setContractorName(e.target.value)}
                            list="contractor-list"
                            placeholder="Select or type name"
                            className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm"
                        />
                    </div>

                    <div>
                        <label htmlFor="buyerName" className="block text-sm font-medium text-gray-700">Buyer Name</label>
                        <input
                            type="text"
                            id="buyerName"
                            value={buyerName}
                            onChange={(e) => setBuyerName(e.target.value)}
                            list="buyer-list"
                            placeholder="Select or type name"
                            className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm"
                        />
                    </div>

                    {/* NEW: Job Sheet Ref Number */}
                    <div className="md:col-span-2">
                        <FormInput 
                            label="Job Sheet Ref Number" 
                            id="jobSheetRef" 
                            value={jobSheetRef} 
                            onChange={(e) => setJobSheetRef(e.target.value)} 
                            placeholder="e.g., JS-2023-001"
                        />
                    </div>

                    {/* Date Fields */}
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

    // Initial view: Select Product list
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