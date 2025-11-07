import React from 'react';
import ProductList from './ProductList';

// --- Edit Product Page ---
export default function EditProductPage({ onBack, onSelectProduct }) {
    return (
        <div className="p-4 bg-white rounded-lg shadow-xl">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 border-b pb-4">Select Product to Edit</h2>
            <ProductList onSelectProduct={onSelectProduct} />
            <div className="flex justify-end mt-8">
                <button onClick={onBack} className="py-2 px-6 bg-gray-500 text-white rounded-lg hover:bg-gray-600">Back</button>
            </div>
        </div>
    );
}