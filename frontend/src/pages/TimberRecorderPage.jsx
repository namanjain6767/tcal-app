import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import axios from 'axios';
import GridButton from '../components/GridButton';

const API_URL = import.meta.env.VITE_API_URL;

const getAuthToken = () => localStorage.getItem('token');

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

api.interceptors.request.use(config => {
    const token = getAuthToken();
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export default function TimberRecorderPage({ user, setPage, handleLogout, activeDraft, setActiveDraft }) {
    const thicknessData = [0.75, 1, 1.5, 2, 2.5, 3];
    const lengthData = [1, 1.25, 1.5, 1.75, 2, 2.25, 2.5, 2.75, 3, 3.25, 3.5, 3.75, 4, 4.25, 4.5, 4.75, 5, 5.25, 5.5, 5.75, 6, 6.25, 6.5, 6.75, 7, 7.25, 7.5, 7.75, 8, 8.25, 8.5, 8.75, 9, 9.25, 9.5, 9.75, 10, 10.25, 10.5, 10.75, 11, 11.25, 11.5, 11.75, 12, 12.25, 12.5, 12.75, 13, 13.25, 13.5, 13.75];
    const widthData = [
        [3, 4, 5],
        [6, 7, 8],
        [9, 10, 11],
        [12]
    ];

    const [selections, setSelections] = useState({ thickness: thicknessData[0], length: null, width: null });
    const [recordedData, setRecordedData] = useState({});
    const [rejectedData, setRejectedData] = useState({});
    const [quantity, setQuantity] = useState(1);
    const [useQuantity, setUseQuantity] = useState(false);
    const [entryHistory, setEntryHistory] = useState([]);

    useEffect(() => {
        if (activeDraft) {
            setRecordedData(activeDraft.draft_data.accepted || {});
            setRejectedData(activeDraft.draft_data.rejected || {});
            localStorage.setItem('localDraft', JSON.stringify(activeDraft.draft_data.accepted || {}));
            localStorage.setItem('localRejectedDraft', JSON.stringify(activeDraft.draft_data.rejected || {}));
        } else {
            const savedDraft = localStorage.getItem('localDraft');
            if (savedDraft) setRecordedData(JSON.parse(savedDraft));
            
            const savedRejectedDraft = localStorage.getItem('localRejectedDraft');
            if (savedRejectedDraft) setRejectedData(JSON.parse(savedRejectedDraft));
        }
    }, [activeDraft]);

    const generateAndDownloadXLSX = (acceptedData, rejectedData, fileName) => {
        const wb = XLSX.utils.book_new();

        const processSheetData = (data, thickness) => {
            const sheetData = data;
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
                    const count = sheetData[length]?.[width] || 0;
                    row.push(count);
                    rowTotal += count;
                    colTotals[index] += count;
                    weightedWidthSum += parseFloat(width) * count;
                });
                row.push(rowTotal);
                const rowCFT = (parseFloat(thickness) * parseFloat(length) * weightedWidthSum) / 144;
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
            
            return matrix;
        };

        // Process accepted data
        const groupedByThickness = {};
        for (const key in acceptedData) {
            const [t, l, w] = key.split('-');
            const count = acceptedData[key];
            if (!groupedByThickness[t]) groupedByThickness[t] = {};
            if (!groupedByThickness[t][l]) groupedByThickness[t][l] = {};
            groupedByThickness[t][l][w] = count;
        }
        for (const thickness in groupedByThickness) {
            const matrix = processSheetData(groupedByThickness[thickness], thickness);
            const ws = XLSX.utils.aoa_to_sheet(matrix);
            XLSX.utils.book_append_sheet(wb, ws, `Thickness ${thickness}`);
        }

        // Process rejected data
        if (Object.keys(rejectedData).length > 0) {
            const rejectedGrouped = {};
            for (const key in rejectedData) {
                const [t, l, w] = key.split('-');
                const count = rejectedData[key];
                if (!rejectedGrouped[t]) rejectedGrouped[t] = {};
                if (!rejectedGrouped[t][l]) rejectedGrouped[t][l] = {};
                rejectedGrouped[t][l][w] = count;
            }
            for (const thickness in rejectedGrouped) {
                 const matrix = processSheetData(rejectedGrouped[thickness], thickness);
                 const ws = XLSX.utils.aoa_to_sheet(matrix);
                 XLSX.utils.book_append_sheet(wb, ws, `Rejected ${thickness}`);
            }
        }
        
        XLSX.writeFile(wb, fileName);
    };
    
    const handleThicknessChange = (event) => {
        const newThickness = parseFloat(event.target.value);
        setSelections({ thickness: newThickness, length: null, width: null });
    };

    const handleButtonClick = async (value, group) => {
        if (value === 'Next' || value === 'Reject') {
            if (selections.thickness && selections.length && selections.width) {
                const key = `${selections.thickness}-${selections.length}-${selections.width}`;
                const incrementAmount = useQuantity ? quantity : 1;
                
                const newEntry = { ...selections, quantity: incrementAmount, status: value === 'Next' ? 'Accepted' : 'Rejected' };
                
                setEntryHistory(prevHistory => {
                    if (prevHistory.length >= 3) {
                        return [newEntry];
                    }
                    return [...prevHistory, newEntry];
                });

                if (value === 'Next') {
                    const newData = { ...recordedData, [key]: (recordedData[key] || 0) + incrementAmount };
                    setRecordedData(newData);
                    localStorage.setItem('localDraft', JSON.stringify(newData));
                } else {
                    const newRejectedData = { ...rejectedData, [key]: (rejectedData[key] || 0) + incrementAmount };
                    setRejectedData(newRejectedData);
                    localStorage.setItem('localRejectedDraft', JSON.stringify(newRejectedData));
                }

                setSelections(prev => ({ ...prev, length: null, width: null }));
                setQuantity(1);
            }
            return;
        }
        if (value === 'Finish') {
            if (Object.keys(recordedData).length === 0 && Object.keys(rejectedData).length === 0) {
                console.warn("No data to save or export.");
                return;
            }
            
            const date = new Date();
            const dateStr = `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}-${date.getFullYear()}`;
            let hours = date.getHours();
            const ampm = hours >= 12 ? 'PM' : 'AM';
            hours = hours % 12;
            hours = hours ? hours : 12;
            const minutes = String(date.getMinutes()).padStart(2, '0');
            const timeStr = `${hours}-${minutes}-${ampm}`;
            const baseName = `timber_record_${dateStr}_${timeStr}`;
            
            const reportFileName = `${baseName}.xlsx`;
            const logFileName = `${baseName}.txt`;
            
            generateAndDownloadXLSX(recordedData, rejectedData, reportFileName);

            let logContent = "SESSION LOG\n==================\n\n";
            logContent += "ACCEPTED ITEMS:\n";
            for (const key in recordedData) {
                const [t, l, w] = key.split('-');
                logContent += `T: ${t}, L: ${l}, W: ${w} - Count: ${recordedData[key]}\n`;
            }
            logContent += "\nREJECTED ITEMS:\n";
            for (const key in rejectedData) {
                const [t, l, w] = key.split('-');
                logContent += `T: ${t}, L: ${l}, W: ${w} - Count: ${rejectedData[key]}\n`;
            }

            try {
                await api.post('/reports', {
                    reportData: { accepted: recordedData, rejected: rejectedData },
                    fileName: reportFileName
                });
                await api.post('/logs', {
                    logContent: logContent,
                    logName: logFileName
                });
            } catch (error) {
                console.error("Failed to save report or log:", error);
            }

            localStorage.removeItem('localDraft');
            localStorage.removeItem('localRejectedDraft');
            setRecordedData({});
            setRejectedData({});
            setEntryHistory([]);
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
            return;
        }
        if (group in selections) {
            setSelections(prev => ({ ...prev, [group]: value }));
        }
    };

    const handleReset = () => {
        if (window.confirm("Are you sure you want to clear all current entries? This action cannot be undone.")) {
            localStorage.removeItem('localDraft');
            localStorage.removeItem('localRejectedDraft');
            setRecordedData({});
            setRejectedData({});
            setEntryHistory([]);
            alert("Current session has been cleared.");
        }
    };

    return (
         <div className="bg-gray-50 text-gray-800 p-4 md:p-6 min-h-screen font-sans">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-4">
                    <button onClick={() => { setActiveDraft(null); setPage('dashboard'); }} className="p-2 bg-gray-500 text-white rounded hover:bg-gray-600">Back to Dashboard</button>
                </div>
                <div className="mb-6 p-4 bg-white rounded-lg shadow flex justify-between items-center">
                    <h1 className="text-2xl font-bold text-gray-900">T-CAL</h1>
                    <div className="font-mono text-blue-600 text-lg">
                       T: {selections.thickness || '_'} | L: {selections.length || '_'} | W: {selections.width || '_'}
                    </div>
                    <div className="w-16"></div> 
                </div>
                <div className="grid gap-4 grid-cols-1 md:grid-cols-[1fr_4fr_3fr_2fr]">
                    <div>
                        <h2 className="text-lg font-semibold mb-2 text-center text-gray-700">Thickness</h2>
                        <select
                            value={selections.thickness}
                            onChange={(e) => setSelections({...selections, thickness: parseFloat(e.target.value)})}
                            className="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                            {thicknessData.map(value => <option key={`t-opt-${value}`} value={value}>{value}</option>)}
                        </select>
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold mb-2 text-center text-gray-700">Length(Feet)</h2>
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
                    <div>
                        <h2 className="text-lg font-semibold mb-2 text-center text-gray-700">Width(Inch)</h2>
                        <div className="space-y-3">
                            {widthData.map((row, rowIndex) => (
                                <div key={`w-row-${rowIndex}`} className="grid grid-cols-3 gap-3">
                                    {row.map(value => (
                                        <GridButton
                                            key={`w-${value}`}
                                            value={value}
                                            group="width"
                                            onClick={handleButtonClick}
                                            isHighlighted={selections.width === value}
                                            isDisabled={!selections.length}
                                        />
                                    ))}
                                </div>
                            ))}
                             <div className="mt-4">
                                <div className="flex items-center justify-center">
                                    <input
                                        id="use-quantity"
                                        type="checkbox"
                                        checked={useQuantity}
                                        onChange={(e) => setUseQuantity(e.target.checked)}
                                        className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                    />
                                    <label htmlFor="use-quantity" className="ml-2 text-sm font-medium text-gray-700">Use Quantity</label>
                                </div>
                                {useQuantity && (
                                    <div className="mt-2 space-y-2">
                                        <div className="grid grid-cols-3 gap-3">
                                            {Array.from({ length: 9 }, (_, i) => i + 2).map(num => (
                                                <button
                                                    key={`qty-${num}`}
                                                    onClick={() => setQuantity(num)}
                                                    className={`p-3 rounded-lg shadow-sm text-sm transition-all ${
                                                        quantity === num
                                                            ? 'bg-indigo-600 text-white ring-2 ring-indigo-400'
                                                            : 'bg-white text-gray-700 hover:bg-gray-100'
                                                    }`}
                                                >
                                                    {num}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-col items-center space-y-4">
                        <h2 className="text-lg font-semibold mb-2 text-center text-transparent">Actions</h2>
                        <div className="w-full">
                            <GridButton
                                value="Next"
                                group="action"
                                onClick={handleButtonClick}
                                isSpecial={true}
                                isDisabled={!selections.length || !selections.width}
                            />
                        </div>
                        <div className="w-full">
                            <GridButton
                                value="Reject"
                                group="action"
                                onClick={handleButtonClick}
                                isSpecial={true}
                                isDisabled={!selections.length || !selections.width}
                            />
                        </div>
                        <div className="w-full mt-4 p-2 border rounded-lg bg-gray-50 min-h-[15rem]">
                            <h3 className="text-md font-semibold text-center text-gray-600 mb-2">Last Entries</h3>
                            {entryHistory.length > 0 ? (
                                <ul className="space-y-2">
                                    {entryHistory.map((entry, index) => {
                                        const labels = ["One", "Two", "Three"];
                                        return (
                                            <li key={index} className={`p-2 rounded-md text-sm ${entry.status === 'Accepted' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                <span className="font-bold">Entry {labels[index]}:</span> T:{entry.thickness}, L:{entry.length}, W:{entry.width} (Qty: {entry.quantity}) - {entry.status}
                                            </li>
                                        );
                                    })}
                                </ul>
                            ) : (
                                <p className="text-center text-gray-500 text-sm mt-4">No entries yet.</p>
                            )}
                        </div>
                    </div>
                </div>
                 <div className="mt-6 flex justify-center items-center gap-4">
                    <button 
                        onClick={() => handleButtonClick('Finish', 'action')} 
                        className="p-3 w-40 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold shadow-md transition-all"
                    >
                        Finish
                    </button>
                    <button 
                        onClick={() => handleButtonClick('Undo', 'action')} 
                        className="p-3 w-40 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 font-semibold shadow-md transition-all"
                    >
                        Undo
                    </button>
                    <button 
                        onClick={handleReset} 
                        className="p-3 w-40 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold shadow-md transition-all"
                    >
                        Reset
                    </button>
                </div>
            </div>
        </div>
    );
}
