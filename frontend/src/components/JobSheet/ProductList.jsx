import React, { useState, useEffect, useMemo } from 'react';
import api from '../../api';

// --- Product List Component (Used by Select and Assign) ---
export default function ProductList({ onSelectProduct }) {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const fetchProducts = async () => {
            try {
                const response = await api.get('/products');
                setProducts(response.data);
            } catch (error) {
                console.error("Failed to fetch products:", error);
                alert("Failed to fetch products.");
            }
            setLoading(false);
        };
        fetchProducts();
    }, []);

    // Filter products based on search term
    const filteredProducts = useMemo(() => {
        if (!searchTerm) {
            return products;
        }
        return products.filter(product =>
            (product.product_name && product.product_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (product.product_code && product.product_code.toLowerCase().includes(searchTerm.toLowerCase()))
        );
    }, [products, searchTerm]);

    if (loading) {
        return <div className="text-center p-8">Loading products...</div>;
    }

    return (
        <div>
            {/* --- NEW Search Bar --- */}
            <div className="mb-4">
                <input
                    type="text"
                    placeholder="Search by Product Name or Code..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                />
            </div>
            {/* --- End Search Bar --- */}

            <div className="space-y-4" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                {filteredProducts.length > 0 ? (
                    filteredProducts.map(product => (
                        <button
                            key={product.id}
                            onClick={() => onSelectProduct(product)}
                            className="w-full p-4 bg-gray-100 rounded-lg text-left hover:bg-indigo-100"
                        >
                            <h3 className="text-lg font-semibold text-indigo-700">{product.product_name}</h3>
                            <p className="text-sm text-gray-600">Code: {product.product_code || 'N/A'}</p>
                            <p className="text-sm text-gray-600">Size: {product.item_size || 'N/A'}</p>
                            <p className="text-sm text-gray-600">Parts: {product.parts.length}</p>
                        </button>
                    ))
                ) : (
                    <p className="text-center text-gray-500">No products found.</p>
                )}
            </div>
        </div>
    );
};