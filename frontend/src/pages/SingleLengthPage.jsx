import React, { useState, useEffect, useMemo, useRef } from 'react';
import * as XLSX from 'xlsx';
import api from '../api';

const getWebSocketURL = () => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const domain = new URL(apiUrl).host;
    return `${wsProtocol}//${domain}`;
};

// --- Lock Icon SVG Component ---
const LockIcon = ({ locked }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
        {locked ? (
            <path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd" />
        ) : (
            <path d="M10 2a5 5 0 00-5 5v2a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-1V7a5 5 0 00-5-5zm0 2a3 3 0 013 3v2H7V7a3 3 0 013-3z" />
        )}
    </svg>
);

// --- Reusable Counter Grid Component ---
const CounterGrid = ({ length, widthData, thickness, onIncrement, recordedData, cft }) => (
    <div className="overflow-x-auto bg-white p-4 rounded-lg shadow">
        <div className="flex justify-between items-center mb-2">
            <h3 className="font-bold text-lg">Length: {length}</h3>
            <div className="p-2 bg-green-100 text-green-800 rounded-lg font-mono text-base">
                CFT: <span className="font-bold">{cft.toFixed(4)}</span>
            </div>
        </div>
        <div className="grid grid-cols-12 gap-2">
            {widthData.map(w => {
                const key = `${thickness}-${length}-${w}`;
                const count = recordedData[key] || 0;
                return (
                    <div key={w} className="p-2 text-center rounded-lg bg-gray-50 border">
                        <div className="font-bold mb-2">{w}</div>
                        <button onClick={() => onIncrement(length, w)} className="w-10 h-10 bg-blue-500 text-white rounded-full text-xl font-bold hover:bg-blue-600 transition-colors flex items-center justify-center mx-auto">+</button>
                        <span className="text-sm text-gray-600 mt-1 block">{count}</span>
                    </div>
                )
            })}
        </div>
    </div>
);

export default function SingleLengthPage({ user, setPage, handleBack, activeDraft, setActiveDraft }) {
    // --- Static Data ---
    const thicknessData = [0.75, 1, 1.5, 2, 2.5, 3];
    const lengthIntegerData = Array.from({ length: 15 }, (_, i) => i + 1);
    const lengthDecimalData = [0, 0.25, 0.5, 0.75];
    const widthData = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

    // --- State Management ---
    const [selections, setSelections] = useState({
        thickness: thicknessData[0],
        length1Int: lengthIntegerData[0],
        length1Dec: lengthDecimalData[0],
        length2Int: lengthIntegerData[3],
        length2Dec: lengthDecimalData[0],
    });
    const [locks, setLocks] = useState({ thickness: false, length1: false, length2: false });
    const [recordedData, setRecordedData] = useState({});
    const [incrementHistory, setIncrementHistory] = useState([]);
    const [reportFileName, setReportFileName] = useState('');
    const ws = useRef(null);

    // --- WebSocket Connection ---
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token || user.role !== 'counter') return;
        const wsUrl = `${getWebSocketURL()}?token=${token}`;
        ws.current = new WebSocket(wsUrl);
        ws.current.onopen = () => console.log('Single Length Counter WebSocket Connected');
        ws.current.onclose = () => console.log('Single Length Counter WebSocket disconnected');
        return () => { if (ws.current) ws.current.close(); };
    }, [user.role]);
    
    // --- Generate Filename ---
    const generateNewFileName = () => {
        const today = new Date().toLocaleDateString();
        const lastReportDate = localStorage.getItem('lastSingleLengthReportDate');
        let counter = 1;
        if (lastReportDate === today) {
            counter = parseInt(localStorage.getItem('dailySingleLengthReportCounter') || '0', 10) + 1;
        } else {
            localStorage.setItem('dailySingleLengthReportCounter', '0');
        }
        
        const date = new Date();
        const dateStr = `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}-${date.getFullYear()}`;
        let hours = date.getHours();
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12 || 12;
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const timeStr = `${hours}-${minutes}-${ampm}`;
        const formattedCounter = String(counter).padStart(3, '0');
        const newFileName = `single_length_report_${dateStr}_${timeStr}_${formattedCounter}.xlsx`;
        setReportFileName(newFileName);
    };

    useEffect(() => {
        generateNewFileName();
    }, []);

    useEffect(() => {
        if (ws.current && ws.current.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify({ type: 'FILENAME_UPDATE', fileName: reportFileName }));
        }
    }, [reportFileName]);

    // --- Live CFT Calculation & Update ---
    const totalCFT = useMemo(() => {
        let total = 0;
        for (const key in recordedData) {
            const [t, l, w] = key.split('-').map(Number);
            const count = recordedData[key];
            total += (t * l * w * count) / 144;
        }
        return total;
    }, [recordedData]);

    const cftLength1 = useMemo(() => {
        let total = 0;
        const length1 = selections.length1Int + selections.length1Dec;
        for (const key in recordedData) {
            const [t, l, w] = key.split('-').map(Number);
            if (l === length1) {
                const count = recordedData[key];
                total += (t * l * w * count) / 144;
            }
        }
        return total;
    }, [recordedData, selections.thickness, selections.length1Int, selections.length1Dec]);

    const cftLength2 = useMemo(() => {
        let total = 0;
        const length2 = selections.length2Int + selections.length2Dec;
        for (const key in recordedData) {
            const [t, l, w] = key.split('-').map(Number);
            if (l === length2) {
                const count = recordedData[key];
                total += (t * l * w * count) / 144;
            }
        }
        return total;
    }, [recordedData, selections.thickness, selections.length2Int, selections.length2Dec]);

    useEffect(() => {
        if (ws.current && ws.current.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify({ type: 'CFT_UPDATE', cft: totalCFT }));
        }
    }, [totalCFT]);
    
    const length1 = selections.length1Int + selections.length1Dec;
    const length2 = selections.length2Int + selections.length2Dec;

    const handleSelectionChange = (type, value) => {
        setSelections(prev => ({ ...prev, [type]: value }));
        const lengthToReset = type.includes('1') ? length1 : length2;
        const newRecordedData = { ...recordedData };
        const newHistory = incrementHistory.filter(item => {
            const [t, l, w] = item.split('-').map(Number);
            return l !== lengthToReset;
        });
        Object.keys(newRecordedData).forEach(key => {
            if (key.startsWith(`${selections.thickness}-${lengthToReset}-`)) {
                delete newRecordedData[key];
            }
        });
        setRecordedData(newRecordedData);
        setIncrementHistory(newHistory);
    };

    const handleIncrement = (length, width) => {
        const key = `${selections.thickness}-${length}-${width}`;
        const newData = { ...recordedData, [key]: (recordedData[key] || 0) + 1 };
        setRecordedData(newData);
        setIncrementHistory(prev => [...prev, key]);
    };

    const handleUndo = () => {
        if (incrementHistory.length === 0) {
            alert("No action to undo.");
            return;
        }
        const lastKey = incrementHistory[incrementHistory.length - 1];
        const currentCount = recordedData[lastKey];
        if (currentCount > 0) {
            const newData = { ...recordedData, [lastKey]: currentCount - 1 };
            if (newData[lastKey] === 0) delete newData[lastKey];
            setRecordedData(newData);
            setIncrementHistory(prev => prev.slice(0, -1));
        }
    };

    const handleReset = () => {
        if (window.confirm("Are you sure you want to clear all current entries?")) {
            setRecordedData({});
            setIncrementHistory([]);
            alert("Current session has been cleared.");
        }
    };
    
    const handleFinish = async () => {
        if (Object.keys(recordedData).length === 0) {
            alert("No data recorded to generate a report.");
            return;
        }
        
        generateAndDownloadXLSX(recordedData, reportFileName);

        try {
            await api.post('/reports', { 
                reportData: recordedData, 
                fileName: reportFileName 
            });
            alert("Report saved successfully!");
        } catch (error) {
            console.error("Failed to save report:", error);
            alert("Failed to save the report.");
        }
        
        const today = new Date().toLocaleDateString();
        const counter = parseInt(localStorage.getItem('dailySingleLengthReportCounter') || '0', 10) + 1;
        localStorage.setItem('lastSingleLengthReportDate', today);
        localStorage.setItem('dailySingleLengthReportCounter', counter);
        
        handleReset();
        generateNewFileName();
    };
    
    const generateAndDownloadXLSX = (data, fileName) => {
        const wb = XLSX.utils.book_new();

        const processSheetData = (sheetData, thickness) => {
            const allLengths = Object.keys(sheetData).sort((a, b) => parseFloat(a) - parseFloat(b));
            const allWidths = new Set();
            allLengths.forEach(l => Object.keys(sheetData[l]).forEach(w => allWidths.add(w)));
            const sortedWidths = Array.from(allWidths).sort((a, b) => parseFloat(a) - parseFloat(b));
            
            const matrix = [['L / W', ...sortedWidths, 'CFT']];
            const colCFTs = new Array(sortedWidths.length).fill(0);
            let totalSheetCFT = 0;
            
            allLengths.forEach(length => {
                let rowCFT = 0;
                const row = [parseFloat(length)];
                
                sortedWidths.forEach((width, index) => {
                    const count = sheetData[length]?.[width] || 0;
                    row.push(count);
                    const itemCFT = (parseFloat(thickness) * parseFloat(length) * parseFloat(width) * count) / 144;
                    rowCFT += itemCFT;
                    colCFTs[index] += itemCFT;
                });

                row.push(parseFloat(rowCFT.toFixed(4)));
                totalSheetCFT += rowCFT;
                matrix.push(row);
            });

            const totalRow = ['CFT', ...colCFTs.map(c => parseFloat(c.toFixed(4))), parseFloat(totalSheetCFT.toFixed(4))];
            matrix.push(totalRow);
            
            const ws = XLSX.utils.aoa_to_sheet(matrix);
            return ws;
        };

        const groupedByThickness = {};
        for (const key in data) {
            const [t, l, w] = key.split('-');
            const count = data[key];
            if (!groupedByThickness[t]) groupedByThickness[t] = {};
            if (!groupedByThickness[t][l]) groupedByThickness[t][l] = {};
            groupedByThickness[t][l][w] = count;
        }

        for (const thickness in groupedByThickness) {
            const ws = processSheetData(groupedByThickness[thickness], thickness);
            XLSX.utils.book_append_sheet(wb, ws, `Thickness ${thickness}`);
        }
        
        XLSX.writeFile(wb, fileName);
    };

    return (
        <div className="bg-gray-100 min-h-screen p-2 sm:p-4 font-sans">
            <div className="max-w-full mx-auto">
                {/* Header */}
                <header className="flex flex-col sm:flex-row justify-between items-center mb-4 p-4 bg-white rounded-lg shadow">
                    <button onClick={handleBack} className="p-2 bg-gray-500 text-white rounded hover:bg-gray-600 self-start sm:self-center mb-2 sm:mb-0">
                        Back to Dashboard
                    </button>
                    <div className="text-center">
                        <h1 className="text-2xl font-bold text-gray-800">Single Length Counter</h1>
                        <div className="mt-2 p-2 flex items-center justify-center space-x-4 bg-blue-100 text-blue-800 rounded-lg font-mono text-base">
                            <span>Live Total CFT: <span className="font-bold">{totalCFT.toFixed(4)}</span></span>
                            <span className="text-sm text-gray-500 hidden md:inline">|</span>
                            <span className="text-xs text-gray-600 hidden md:inline">{reportFileName}</span>
                        </div>
                    </div>
                     <div className="w-48 text-right"> {/* Spacer */}
                     </div>
                </header>

                {/* Selections Panel */}
                 <div className="p-4 mb-4 bg-white rounded-xl shadow-lg">
                    <h2 className="text-xl font-bold mb-4 text-center border-b-2 pb-3">Selections</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Thickness */}
                        <div className="flex items-center space-x-2">
                            <label className="font-semibold w-24">Thickness:</label>
                            <select
                                value={selections.thickness}
                                onChange={(e) => setSelections(s => ({...s, thickness: parseFloat(e.target.value)}))}
                                disabled={locks.thickness}
                                className="p-2 border rounded-lg w-full"
                            >
                                {thicknessData.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                            <button onClick={() => setLocks(l => ({...l, thickness: !l.thickness}))} className={`py-2 px-3 rounded-lg text-white flex items-center justify-center w-28 transition-colors text-sm font-semibold ${locks.thickness ? 'bg-red-500' : 'bg-green-500'}`}>
                                <LockIcon locked={locks.thickness} /> {locks.thickness ? 'Unlock' : 'Lock'}
                            </button>
                        </div>
                        <div></div> {/* Spacer */}

                        {/* Length 1 */}
                        <div className="flex items-center space-x-2">
                            <label className="font-semibold w-24">Length 1:</label>
                            <select
                                value={selections.length1Int}
                                onChange={(e) => handleSelectionChange('length1Int', parseInt(e.target.value))}
                                disabled={!locks.thickness || locks.length1}
                                className="p-2 border rounded-lg w-full disabled:bg-gray-200"
                            >
                                {lengthIntegerData.map(l => <option key={`l1-${l}`} value={l}>{l}</option>)}
                            </select>
                            <select
                                value={selections.length1Dec}
                                onChange={(e) => handleSelectionChange('length1Dec', parseFloat(e.target.value))}
                                disabled={!locks.thickness || locks.length1}
                                className="p-2 border rounded-lg w-full disabled:bg-gray-200"
                            >
                                {lengthDecimalData.map(d => <option key={`d1-${d}`} value={d}>{d}</option>)}
                            </select>
                            <button onClick={() => setLocks(l => ({...l, length1: !l.length1}))} disabled={!locks.thickness} className={`py-2 px-3 rounded-lg text-white flex items-center justify-center w-28 transition-colors text-sm font-semibold ${locks.length1 ? 'bg-red-500' : 'bg-green-500'} disabled:bg-gray-400`}>
                                <LockIcon locked={locks.length1} /> {locks.length1 ? 'Unlock' : 'Lock'}
                            </button>
                        </div>

                         {/* Length 2 */}
                        <div className="flex items-center space-x-2">
                            <label className="font-semibold w-24">Length 2:</label>
                            <select
                                value={selections.length2Int}
                                onChange={(e) => handleSelectionChange('length2Int', parseInt(e.target.value))}
                                disabled={!locks.thickness || locks.length2}
                                className="p-2 border rounded-lg w-full disabled:bg-gray-200"
                            >
                                {lengthIntegerData.map(l => <option key={`l2-${l}`} value={l}>{l}</option>)}
                            </select>
                            <select
                                value={selections.length2Dec}
                                onChange={(e) => handleSelectionChange('length2Dec', parseFloat(e.target.value))}
                                disabled={!locks.thickness || locks.length2}
                                className="p-2 border rounded-lg w-full disabled:bg-gray-200"
                            >
                                {lengthDecimalData.map(d => <option key={`d2-${d}`} value={d}>{d}</option>)}
                            </select>
                            <button onClick={() => setLocks(l => ({...l, length2: !l.length2}))} disabled={!locks.thickness} className={`py-2 px-3 rounded-lg text-white flex items-center justify-center w-28 transition-colors text-sm font-semibold ${locks.length2 ? 'bg-red-500' : 'bg-green-500'} disabled:bg-gray-400`}>
                                <LockIcon locked={locks.length2} /> {locks.length2 ? 'Unlock' : 'Lock'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Counter Grids */}
                <div className="space-y-4">
                    {locks.length1 && (
                        <CounterGrid length={length1} widthData={widthData} thickness={selections.thickness} onIncrement={handleIncrement} recordedData={recordedData} cft={cftLength1} />
                    )}
                     {locks.length2 && (
                        <CounterGrid length={length2} widthData={widthData} thickness={selections.thickness} onIncrement={handleIncrement} recordedData={recordedData} cft={cftLength2} />
                    )}
                </div>

                {/* Action Buttons */}
                <footer className="mt-6 flex justify-center items-center gap-4">
                    <button onClick={handleFinish} className="py-3 px-6 bg-green-600 text-white text-lg rounded-lg hover:bg-green-700 font-semibold shadow-lg transition-all">
                        Finish & Save
                    </button>
                     <button onClick={handleUndo} className="py-3 px-6 bg-yellow-500 text-white text-lg rounded-lg hover:bg-yellow-600 font-semibold shadow-lg transition-all">
                        Undo
                    </button>
                    <button onClick={handleReset} className="py-3 px-6 bg-red-600 text-white text-lg rounded-lg hover:bg-red-700 font-semibold shadow-lg transition-all">
                        Reset
                    </button>
                </footer>
            </div>
        </div>
    );
}

