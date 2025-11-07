import React from 'react';

// --- Reusable Input Component ---
export default function FormInput({ label, id, value, onChange, placeholder = "", type = "text" }) {
    return (
        <div>
            <label htmlFor={id} className="block text-sm font-medium text-gray-700">{label}</label>
            <input
                type={type}
                id={id}
                name={id}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
            />
        </div>
    );
}