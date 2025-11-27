import React, { useState, useMemo, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx'; // Import XLSX for file parsing
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
    
    const fileInputRef = useRef(null); // Reference for the hidden file input
    const [allPartNames, setAllPartNames] = useState([]);
    const isEditing = !!productToEdit;
    const woodTypes = ['MANGO', 'SHESHAM', 'OAK'];

    // --- Fetch all part names on load ---
    useEffect(() => {
        const fetchPartNames = async () => {
            try {
                const response = await api.get('/products/part-names');
                setAllPartNames(response.data);
            } catch (error) {
                console.error("Failed to fetch part names:", error);
            }
        };
        fetchPartNames();
    }, []);

    // --- NEW: Handle File Import ---
    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const bstr = evt.target.result;
                const wb = XLSX.read(bstr, { type: 'binary' });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const data = XLSX.utils.sheet_to_json(ws, { header: 1 });

                // --- 1. Extract Product Info (Metadata) from Row 3 (Index 2) ---
                // Based on your CSV: Row 3, Index 5 is Code, Index 6 is Name, Index 12 is Size
                const metaRow = data[2]; 
                if (metaRow) {
                    if (metaRow[5]) setProductCode(String(metaRow[5]));
                    if (metaRow[6]) setProductName(String(metaRow[6]));
                    if (metaRow[12]) setItemSize(String(metaRow[12]));
                }

                // --- 2. Extract Parts from Row 7 onwards (Index 6+) ---
                const newParts = [];
                // Start looping from index 6 (Row 7 in Excel)
                for (let i = 6; i < data.length; i++) {
                    const row = data[i];
                    // Check if row has data (e.g., Part Name at col 0 is not empty)
                    if (row && row[0]) {
                        newParts.push({
                            id: crypto.randomUUID(),
                            part_name: String(row[0] || ''),
                            cutting_l: parseFloat(row[1]) || 0, // Col 1: Cutting L
                            cutting_w: parseFloat(row[3]) || 0, // Col 3: Cutting W (Col 2 is 'X')
                            wood: String(row[5] || 'MANGO').toUpperCase(), // Col 5: Wood
                            qty: parseFloat(row[6]) || 0,       // Col 6: Qty
                            cft_l: parseFloat(row[7]) || 0,     // Col 7: Size in Ft (L)
                            cft_w: parseFloat(row[9]) || 0,     // Col 9: Width (in)
                            cft_t: parseFloat(row[11]) || 0,    // Col 11: Thickness (in)
                            cft: parseFloat(row[13]) || 0       // Col 13: CFT
                        });
                    }
                }

                if (newParts.length > 0) {
                    setParts(newParts);
                    alert(`Successfully imported ${newParts.length} parts!`);
                } else {
                    alert("No valid parts data found in the file.");
                }

            } catch (error) {
                console.error("Error parsing file:", error);
                alert("Error parsing file. Please ensure it matches the Job Card format.");
            } finally {
                // Reset file input so same file can be selected again if needed
                if (fileInputRef.current) fileInputRef.current.value = '';
            }
        };
        reader.readAsBinaryString(file);
    };

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
                onSaveSuccess(); 
            } catch (error) {
                 console.error("Failed to delete product:", error);
                 alert("Failed to delete product.");
            }
        }
    };

    return (
        <div className="p-4 bg-white rounded-lg shadow-xl">
            <datalist id="part-names-list">
                {allPartNames.map(name => (
                    <option key={name} value={name} />
                ))}
            </datalist>

            <div className="flex justify-between items-center mb-6 border-b pb-4">
                <h2 className="text-2xl font-bold text-gray-800">
                    {isEditing ? 'Edit Product' : 'Create New Product'}
                </h2>
                
                {/* --- NEW: Import Button --- */}
                <div>
                    <input 
                        type="file" 
                        accept=".xlsx, .xls, .csv" 
                        onChange={handleFileUpload} 
                        ref={fileInputRef} 
                        className="hidden" 
                    />
                    <button 
                        onClick={() => fileInputRef.current.click()} 
                        className="py-2 px-4 bg-indigo-100 text-indigo-700 border border-indigo-300 rounded-lg hover:bg-indigo-200 flex items-center gap-2 font-semibold"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                        Import Job Card
                    </button>
                </div>
                {/* --- End Import Button --- */}
            </div>

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