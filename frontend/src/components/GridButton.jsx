import React from 'react';

const GridButton = ({ value, group, onClick, isHighlighted, isSpecial, isDisabled }) => {
    const baseClasses = "w-full h-full flex items-center justify-center p-2 rounded-lg shadow-sm transition-all duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2";
    let typeClasses = '';
    let specialStyle = '';
    if (isSpecial) {
        if (value === 'Next') specialStyle = 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500';
        else if (value === 'Reject') specialStyle = 'bg-red-600 hover:bg-red-700 focus:ring-red-500';
        else if (value === 'Finish') specialStyle = 'bg-green-600 hover:bg-green-700 focus:ring-green-500';
        else if (value === 'Undo') specialStyle = 'bg-yellow-500 hover:bg-yellow-600 focus:ring-yellow-400';
        typeClasses = `border-transparent text-white font-semibold ${specialStyle}`;
    } else {
        typeClasses = "border border-gray-300 text-gray-700 bg-white hover:bg-gray-100 focus:ring-indigo-500";
    }
    const highlightedClass = isHighlighted ? "bg-indigo-100 border-indigo-400 ring-2 ring-indigo-400 shadow-md" : "";
    const disabledClass = isDisabled ? "opacity-50 cursor-not-allowed" : "";
    return (
        <button
            className={`${baseClasses} ${typeClasses} ${highlightedClass} ${disabledClass}`}
            onClick={() => onClick(value, group)}
            disabled={isDisabled}
        >
            {value}
        </button>
    );
};

export default GridButton;
