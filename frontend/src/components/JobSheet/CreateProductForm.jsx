import React, { useState, useMemo, useEffect } from 'react';
import api from '../../api';
import FormInput from './FormInput';

// --- Create/Edit Product Form Component ---
export default function CreateProductForm({ onBack, onSaveSuccess, productToEdit }) {
    const [productName, setProductName] = useState(productToEdit?.product_name || '');
    const [productCode, setProductCode] = useState(productToEdit?.product_code || '');
    const [itemSize, setItemSize] = useState(productToEdit?.item_size || '');
    const [parts, setParts] = useState(productToEdit?.parts || [
        { id: crypto.randomUUID(), part_name: '', cutting_l: '', cutting_w: '', wood: 'MANGO', qty: 0, cft_l: 0, cft_w: 0, cft_t: 1, cft: 0 }
    ]);
    
    // --- NEW: State for suggestions ---
    const [allPartNames, setAllPartNames] = useState([]);
    const isEditing = !!productToEdit;
    
    // --- NEW: Wood types list ---
    const woodTypes = ['MANGO', 'SHESHAM', 'OAK'];

    // --- NEW: Fetch all part names on load ---
    useEffect(() => {
        const fetchPartNames = async () => {
            try {
                const response = await api.get('/products/part-names');
                setAllPartNames(response.data);
            } catch (error) {
                console.error("Failed to fetch part names:", error);
                // Not critical, so we don't need to alert the user
            }
        };
        fetchPartNames();
    }, []);

    const handlePartChange = (id, field, value) => {
        setParts(currentParts =>
            currentParts.map(part =>
                part.id === id ? { ...part, [field]: value } : part
            )
        );
    };

    const addPartRow = () => {
        setParts(currentParts => [
            ...currentParts,
            // Default new rows to MANGO
            { id: crypto.randomUUID(), part_name: '', cutting_l: '', cutting_w: '', wood: 'MANGO', qty: 0, cft_l: 0, cft_w: 0, cft_t: 1, cft: 0 }
        ]);
    };

    const removePartRow = (id) => {
        setParts(currentParts => currentParts.filter(part => part.id !== id));
    };

    const totalCFT = useMemo(() => {
        return parts.reduce((total, part) => total + (parseFloat(part.cft) || 0), 0);
    }, [parts]);

    const handleReset = () => {
        if (window.confirm("Are you sure you want to reset all fields?")) {
            setProductName(productToEdit?.product_name || '');
            setProductCode(productToEdit?.product_code || '');
            setItemSize(productToEdit?.item_size || '');
            setParts(productToEdit?.parts || [{ id: crypto.randomUUID(), part_name: '', cutting_l: '', cutting_w: '', wood: 'MANGO', qty: 0, cft_l: 0, cft_w: 0, cft_t: 1, cft: 0 }]);
        }
    };

    const handleSaveOrUpdate = async () => {
        if (!productName) {
            alert("Product Name is required.");
            return;
        }
        const productData = {
            productName,
            productCode,
            itemSize,
            parts: parts.map(part => ({
                id: part.id,
                part_name: part.part_name,
                cutting_l: parseFloat(part.cutting_l) || 0,
                cutting_w: parseFloat(part.cutting_w) || 0,
                wood: part.wood,
                qty: parseFloat(part.qty) || 0,
                cft_l: parseFloat(part.cft_l) || 0,
                cft_w: parseFloat(part.cft_w) || 0,
                cft_t: parseFloat(part.cft_t) || 0,
                cft: parseFloat(part.cft) || 0 
            }))
        };

        try {
            if (isEditing) {
                await api.put(`/products/${productToEdit.id}`, productData);
                alert("Product updated successfully!");
            } else {
                await api.post('/products', productData);
                alert("Product saved successfully!");
            }
            onSaveSuccess();
        } catch (error) {
            console.error("Failed to save product:", error);
            alert("Failed to save product. Please try again.");
        }
    };
    
    const handleDelete = async () => {
        if (!isEditing) return;
        if (window.confirm(`Are you sure you want to permanently delete the product "${productName}"? This action cannot be undone.`)) {
            try {
                await api.delete(`/products/${productToEdit.id}`);
                alert("Product deleted successfully.");
                onSaveSuccess(); // Go back to menu
            } catch (error) {
                 console.error("Failed to delete product:", error);
                 alert("Failed to delete product.");
            }
        }
    };

    return (
        <div className="p-4 bg-white rounded-lg shadow-xl">
            {/* --- NEW: Datalist for suggestions --- */}
            <datalist id="part-names-list">
                {allPartNames.map(name => (
                    <option key={name} value={name} />
                ))}
            </datalist>

            <h2 className="text-2xl font-bold text-gray-800 mb-6 border-b pb-4">
                {isEditing ? 'Edit Product' : 'Create New Product'}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <FormInput label="Product Name" id="productName" value={productName} onChange={(e) => setProductName(e.target.value)} placeholder="e.g., TWO PART 3 DRW" />
                <FormInput label="Product Code" id="productCode" value={productCode} onChange={(e) => setProductCode(e.target.value)} placeholder="e.g., 1279" />
                <FormInput label="Item Size" id="itemSize" value={itemSize} onChange={(e) => setItemSize(e.target.value)} placeholder="e.g., 150X45X200" />
            </div>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase">Part Name</th>
                            <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cutting L</th>
                            <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cutting W</th>
                            <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase">Wood</th>
                            <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase">Qty</th>
                            <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase">L (ft)</th>
                            <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase">W (in)</th>
                            <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase">T (in)</th>
                            <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase">CFT</th>
                            <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {parts.map((part) => (
                            <tr key={part.id}>
                                <td className="px-2 py-2">
                                    {/* --- UPDATED: Input with datalist --- */}
                                    <input 
                                        type="text" 
                                        value={part.part_name} 
                                        onChange={(e) => handlePartChange(part.id, 'part_name', e.target.value)} 
                                        className="w-32 p-1 border rounded"
                                        list="part-names-list"
                                    />
                                </td>
                                <td className="px-2 py-2"><input type="number" value={part.cutting_l} onChange={(e) => handlePartChange(part.id, 'cutting_l', e.target.value)} className="w-20 p-1 border rounded" /></td>
                                <td className="px-2 py-2"><input type="number" value={part.cutting_w} onChange={(e) => handlePartChange(part.id, 'cutting_w', e.target.value)} className="w-20 p-1 border rounded" /></td>
                                <td className="px-2 py-2">
                                    {/* --- UPDATED: Wood dropdown --- */}
                                    <select 
                                        value={part.wood} 
                                        onChange={(e) => handlePartChange(part.id, 'wood', e.target.value)} 
                                        className="w-24 p-1 border rounded"
                                    >
                                        {woodTypes.map(wood => (
                                            <option key={wood} value={wood}>{wood}</option>
                                        ))}
                                    </select>
                                </td>
                                <td className="px-2 py-2"><input type="number" value={part.qty} onChange={(e) => handlePartChange(part.id, 'qty', e.target.value)} className="w-20 p-1 border rounded" /></td>
                                <td className="px-2 py-2"><input type="number" value={part.cft_l} onChange={(e) => handlePartChange(part.id, 'cft_l', e.target.value)} className="w-20 p-1 border rounded" /></td>
                                <td className="px-2 py-2"><input type="number" value={part.cft_w} onChange={(e) => handlePartChange(part.id, 'cft_w', e.target.value)} className="w-20 p-1 border rounded" /></td>
                                <td className="px-2 py-2"><input type="number" value={part.cft_t} onChange={(e) => handlePartChange(part.id, 'cft_t', e.target.value)} className="w-20 p-1 border rounded" /></td>
                                <td className="px-2 py-2"><input type="number" value={part.cft} onChange={(e) => handlePartChange(part.id, 'cft', e.target.value)} className="w-20 p-1 border rounded" /></td>
                                <td className="px-2 py-2"><button onClick={() => removePartRow(part.id)} className="text-red-600 hover:text-red-900">Remove</button></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div className="flex justify-between items-center mt-4">
                <button onClick={addPartRow} className="p-2 bg-blue-600 text-white rounded hover:bg-blue-700">Add Part</button>
                <div className="text-xl font-bold">
                    Total CFT: {totalCFT.toFixed(2)}
                </div>
            </div>
            <div className="flex justify-between items-center mt-8">
                <div>
                    {isEditing && (
                         <button onClick={handleDelete} className="py-2 px-6 bg-red-600 text-white rounded-lg hover:bg-red-700">Delete Product</button>
                    )}
                </div>
                <div className="flex gap-4">
                    <button onClick={onBack} className="py-2 px-6 bg-gray-500 text-white rounded-lg hover:bg-gray-600">Back</button>
                    <button onClick={handleReset} className="py-2 px-6 bg-gray-600 text-white rounded-lg hover:bg-gray-700">Reset</button>
                    <button onClick={handleSaveOrUpdate} className="py-2 px-6 bg-green-600 text-white rounded-lg hover:bg-green-700">
                        {isEditing ? 'Update Product' : 'Save Product'}
                    </button>
                </div>
            </div>
        </div>
    );
};