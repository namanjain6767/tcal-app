import React, { useState } from 'react';
import * as XLSX from 'xlsx';

// --- Data for the Buttons (Updated Labels) ---
const heightData = [1, 1.25, 1.5, 1.75, 2, 2.25, 2.5, 2.75, 3, 3.25, 3.5, 3.75, 4];
const lengthData = [
    1, 1.25, 1.5, 1.75, 2, 2.25, 2.5, 2.75, 3, 3.25, 3.5, 3.75, 4, 4.25, 4.5, 4.75,
    5, 5.25, 5.5, 5.75, 6, 6.25, 6.5, 6.75, 7, 7.25, 7.5, 7.75, 8, 8.25, 8.5, 8.75,
    9, 9.25, 9.5, 9.75, 10, 10.25, 10.5, 10.75, 11, 11.25, 11.5, 11.75, 12, 12.25, 12.5, 12.75,
    13, 13.25, 13.5, 13.75
];
const widthData = { 1: [3, 4, 5], 4: [6, 7, 8], 6: [9, 10, 11], 8: [12] };
const actionData = { 4: 'Next', 6: 'Finish', 8: 'Undo' };


// --- Reusable Button Component ---
const GridButton = ({ value, group, onClick, isHighlighted, isSpecial, isDisabled }) => {
    const baseClasses = "w-full h-full flex items-center justify-center p-2 rounded-lg shadow-sm transition-all duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2";
    let typeClasses = '';
    
    let specialStyle = '';
    if (isSpecial) {
        if (value === 'Next') specialStyle = 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500';
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

// --- Main App Component ---
export default function App() {
    const [lastClicked, setLastClicked] = useState(null);
    const [selections, setSelections] = useState({
        height: heightData[0],
        length: null,
        width: null,
    });
    const [recordedData, setRecordedData] = useState({});

    const exportToXLSX = () => {
        const groupedByHeight = {};
        for (const key in recordedData) {
            const [h, l, w] = key.split('-');
            const count = recordedData[key];
            if (!groupedByHeight[h]) groupedByHeight[h] = {};
            if (!groupedByHeight[h][l]) groupedByHeight[h][l] = {};
            groupedByHeight[h][l][w] = count;
        }
        const wb = XLSX.utils.book_new();
        for (const height in groupedByHeight) {
            const sheetData = groupedByHeight[height];
            const allLengths = Object.keys(sheetData).sort((a, b) => parseFloat(a) - parseFloat(b));
            const allWidths = new Set();
            allLengths.forEach(l => Object.keys(sheetData[l]).forEach(w => allWidths.add(w)));
            const sortedWidths = Array.from(allWidths).sort((a, b) => parseFloat(a) - parseFloat(b));
            const matrix = [['Length \\ Width', ...sortedWidths, 'Total', 'CFT']];
            const colTotals = new Array(sortedWidths.length).fill(0);
            let sheetTotalCFT = 0;
            allLengths.forEach(length => {
                let rowTotal = 0;
                const row = [parseFloat(length)];
                let weightedWidthSum = 0;
                sortedWidths.forEach((width, index) => {
                    const count = sheetData[length][width] || 0;
                    row.push(count);
                    rowTotal += count;
                    colTotals[index] += count;
                    weightedWidthSum += parseFloat(width) * count;
                });
                row.push(rowTotal);
                const rowCFT = (parseFloat(height) * parseFloat(length) * weightedWidthSum) / 144;
                row.push(parseFloat(rowCFT.toFixed(4)));
                sheetTotalCFT += rowCFT;
                matrix.push(row);
            });
            const totalRow = ['Total'];
            let grandTotal = 0;
            colTotals.forEach(total => {
                totalRow.push(total);
                grandTotal += total;
            });
            totalRow.push(grandTotal);
            totalRow.push(parseFloat(sheetTotalCFT.toFixed(4)));
            matrix.push(totalRow);
            const ws = XLSX.utils.aoa_to_sheet(matrix);
            XLSX.utils.book_append_sheet(wb, ws, `Height ${height}`);
        }

        if (Object.keys(groupedByHeight).length > 0) {
            // --- UPDATED FILENAME LOGIC ---
            const date = new Date();
            
            // Format date as MM-DD-YYYY
            const dateStr = `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}-${date.getFullYear()}`;
            
            // Format time as HH-MM-AM/PM
            let hours = date.getHours();
            const ampm = hours >= 12 ? 'PM' : 'AM';
            hours = hours % 12;
            hours = hours ? hours : 12; // the hour '0' should be '12'
            const minutes = String(date.getMinutes()).padStart(2, '0');
            const timeStr = `${hours}-${minutes}-${ampm}`;

            const fileName = `timber_record_${dateStr}_${timeStr}.xlsx`;
            XLSX.writeFile(wb, fileName);
        } else {
            console.warn("No data recorded to export.");
        }
    };

    const handleHeightChange = (event) => {
        const newHeight = parseFloat(event.target.value);
        setSelections({ height: newHeight, length: null, width: null });
        setLastClicked(`Height ${newHeight}`);
    };

    const handleButtonClick = (value, group) => {
        setLastClicked(value);

        if (value === 'Next') {
            if (selections.height && selections.length && selections.width) {
                const key = `${selections.height}-${selections.length}-${selections.width}`;
                setRecordedData(prevData => ({ ...prevData, [key]: (prevData[key] || 0) + 1 }));
                setSelections(prev => ({ ...prev, length: null, width: null }));
                console.log(`Recorded: ${key}`);
            } else {
                console.warn("Please select a Length and Width before clicking Next.");
            }
            return;
        }

        if (value === 'Finish') {
            exportToXLSX();
            return;
        }

        if (value === 'Undo') {
            if (selections.width !== null) {
                setSelections(prev => ({ ...prev, width: null }));
            } else if (selections.length !== null) {
                setSelections(prev => ({ ...prev, length: null }));
            }
            return;
        }

        if (group === 'width' && !selections.length) {
            console.warn("Please select a Length before selecting a Width.");
            return;
        }

        if (group in selections) {
            setSelections(prev => ({ ...prev, [group]: value }));
        }
    };

    return (
        <div className="bg-gray-50 text-gray-800 p-4 md:p-6 min-h-screen font-sans">
            <div className="max-w-7xl mx-auto">
                <div className="mb-6 p-4 bg-white rounded-lg shadow">
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Timber Recorder</h1>
                    <div className="mt-2 p-3 bg-gray-100 rounded-md">
                        <strong>Last Clicked:</strong>
                        <span className="font-mono text-indigo-600 ml-2">{lastClicked || 'None'}</span>
                    </div>
                    <div className="mt-2 p-3 bg-gray-100 rounded-md">
                        <strong>Current Selections:</strong>
                        <span className="font-mono text-blue-600 ml-2">
                           H: {selections.height || '_'} | L: {selections.length || '_'} | W: {selections.width || '_'}
                        </span>
                    </div>
                </div>
                <div className="grid gap-4 grid-cols-1 md:grid-cols-[1fr_4fr_3fr_2fr]">
                    {/* Column 1: Height */}
                    <div>
                        <h2 className="text-lg font-semibold mb-2 text-center text-gray-700">Height</h2>
                        <select
                            value={selections.height}
                            onChange={handleHeightChange}
                            className="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                            {heightData.map(value => <option key={`h-opt-${value}`} value={value}>{value}</option>)}
                        </select>
                    </div>

                    {/* Column 2: Length */}
                    <div>
                        <h2 className="text-lg font-semibold mb-2 text-center text-gray-700">Length</h2>
                        <div className="grid grid-rows-13 grid-cols-4 gap-3">
                            {lengthData.map(value => (
                                <GridButton
                                    key={`len-${value}`}
                                    value={value}
                                    group="length"
                                    onClick={handleButtonClick}
                                    isHighlighted={selections.length === value}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Column 3: Width */}
                    <div>
                        <h2 className="text-lg font-semibold mb-2 text-center text-gray-700">Width</h2>
                        <div className="grid grid-rows-13 gap-3">
                            {Array.from({ length: 13 }).map((_, rowIndex) => (
                                <div key={`w-row-${rowIndex}`} className="grid grid-cols-3 gap-3">
                                    {widthData[rowIndex + 1] ? widthData[rowIndex + 1].map(value => (
                                        <GridButton
                                            key={`w-${value}`}
                                            value={value}
                                            group="width"
                                            onClick={handleButtonClick}
                                            isHighlighted={selections.width === value}
                                            isDisabled={!selections.length}
                                        />
                                    )) : <div className="col-span-3"></div>}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Column 4: Actions */}
                    <div>
                        <h2 className="text-lg font-semibold mb-2 text-center text-transparent">Actions</h2>
                        <div className="grid grid-rows-13 gap-3">
                            {Array.from({ length: 13 }).map((_, rowIndex) => (
                                <div key={`act-row-${rowIndex}`}>
                                    {actionData[rowIndex + 1] && (
                                        <GridButton
                                            value={actionData[rowIndex + 1]}
                                            group="action"
                                            onClick={handleButtonClick}
                                            isSpecial={true}
                                            // UPDATED: Disable Next button if selections are incomplete
                                            isDisabled={
                                                actionData[rowIndex + 1] === 'Next' &&
                                                (!selections.length || !selections.width)
                                            }
                                        />
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
