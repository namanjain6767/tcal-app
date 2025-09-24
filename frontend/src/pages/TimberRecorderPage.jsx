import React, { useState, useEffect, useMemo, useRef } from 'react';
import * as XLSX from 'xlsx';
import api from '../api';

const getWebSocketURL = () => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const domain = new URL(apiUrl).host;
    return `${wsProtocol}//${domain}`;
};

export default function TimberRecorderPage({ user, setPage, handleBack, activeDraft, setActiveDraft, sessionInfo }) {
    // --- Static Data ---
    const thicknessData = [0.75, 1, 1.5, 2, 2.5, 3];
    const lengthData = [1.5, 1.75, 2, 2.25, 2.5, 2.75, 3, 3.25, 3.5, 3.75, 4, 4.25, 4.5, 4.75, 5, 5.25, 5.5, 5.75, 6, 6.25, 6.5, 6.75, 7, 7.25, 7.5, 7.75, 8, 8.25, 8.5, 8.75, 9, 9.25, 9.5, 9.75, 10, 10.25, 10.5, 10.75, 11, 11.25, 11.5, 11.75, 12, 12.25, 12.5, 12.75, 13, 13.25, 13.5, 13.75, 14];
    const widthData = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];

    // --- State Management ---
    const [selectedThickness, setSelectedThickness] = useState(1);
    const [recordedData, setRecordedData] = useState({});
    const [rejectedData, setRejectedData] = useState({});
    const [isRejectMode, setIsRejectMode] = useState(false);
    const [isQuantityMode, setIsQuantityMode] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [incrementHistory, setIncrementHistory] = useState([]);
    const [entryHistory, setEntryHistory] = useState([]);
    const [reportFileName, setReportFileName] = useState('');
    const ws = useRef(null);

    // --- WebSocket Connection & Data Loading ---
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token || user.role !== 'counter') return;
        const wsUrl = `${getWebSocketURL()}?token=${token}`;
        ws.current = new WebSocket(wsUrl);
        return () => { if (ws.current) ws.current.close(); };
    }, [user.role]);

    useEffect(() => {
        if (activeDraft) {
            setRecordedData(activeDraft.draft_data.accepted || {});
            setRejectedData(activeDraft.draft_data.rejected || {});
        } else {
            const savedData = localStorage.getItem('multiLengthLocalData');
            if (savedData) setRecordedData(JSON.parse(savedData));
            const savedRejectedData = localStorage.getItem('multiLengthLocalRejectedData');
            if (savedRejectedData) setRejectedData(JSON.parse(savedRejectedData));
        }
    }, [activeDraft]);

    // --- Filename Generation ---
    useEffect(() => {
        if (sessionInfo && sessionInfo.vehicleNumber) {
            const date = new Date();
            const todayStr = date.toLocaleDateString();
            const lastReportDate = localStorage.getItem('lastMultiLengthReportDate');
            let counter = 1;
            if (lastReportDate === todayStr) {
                counter = parseInt(localStorage.getItem('dailyMultiLengthReportCounter') || '0', 10) + 1;
            } else {
                localStorage.setItem('dailyMultiLengthReportCounter', '0');
            }
            const dateStr = `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}-${date.getFullYear()}`;
            let hours = date.getHours();
            const ampm = hours >= 12 ? 'PM' : 'AM';
            hours = hours % 12 || 12;
            const minutes = String(date.getMinutes()).padStart(2, '0');
            const timeStr = `${hours}-${minutes}-${ampm}`;
            const finalFileName = `${sessionInfo.vehicleNumber}_${dateStr}_${timeStr}_${String(counter).padStart(3, '0')}.xlsx`;
            setReportFileName(finalFileName);
        }
    }, [sessionInfo, recordedData]);

    // --- Live Calculations & WebSocket Update ---
    const { totalCFT, totalPcs } = useMemo(() => {
        let cft = 0;
        let pcs = 0;
        const dataSet = isRejectMode ? rejectedData : recordedData;
        for (const key in dataSet) {
            const [t, l, w] = key.split('-').map(Number);
            const count = dataSet[key];
            cft += (t * l * w * count) / 144;
            pcs += count;
        }
        return { totalCFT: cft, totalPcs: pcs };
    }, [recordedData, rejectedData, isRejectMode]);

    useEffect(() => {
        if (ws.current && ws.current.readyState === WebSocket.OPEN) {
            const acceptedCFT = Object.keys(recordedData).reduce((sum, key) => {
                const [t, l, w] = key.split('-').map(Number);
                return sum + (t * l * w * recordedData[key]) / 144;
            }, 0);
            ws.current.send(JSON.stringify({ type: 'CFT_UPDATE', cft: acceptedCFT }));
        }
    }, [recordedData]);

    // --- Event Handlers ---
    const handleCountChange = (length, width, delta) => {
        let amount = delta;
        if (isQuantityMode && delta > 0) {
            const quantityInput = prompt(`Enter quantity for T:${selectedThickness}, L:${length}, W:${width}`);
            const quantity = parseInt(quantityInput, 10);
            if (!isNaN(quantity) && quantity > 0) {
                amount = quantity;
            } else {
                return;
            }
        }

        const key = `${selectedThickness}-${length}-${width}`;
        const newEntry = { thickness: selectedThickness, length, width, quantity: amount, status: isRejectMode ? 'Rejected' : 'Accepted' };
        setEntryHistory(prev => [...prev, newEntry]);

        if (isRejectMode) {
            const newRejectedData = { ...rejectedData, [key]: Math.max(0, (rejectedData[key] || 0) + amount) };
            if (newRejectedData[key] === 0) delete newRejectedData[key];
            setRejectedData(newRejectedData);
            localStorage.setItem('multiLengthLocalRejectedData', JSON.stringify(newRejectedData));
        } else {
            const newData = { ...recordedData, [key]: Math.max(0, (recordedData[key] || 0) + amount) };
            if (newData[key] === 0) delete newData[key];
            setRecordedData(newData);
            localStorage.setItem('multiLengthLocalData', JSON.stringify(newData));
        }
        setIncrementHistory(prev => [...prev, { key, rejected: isRejectMode, quantity: amount }]);
    };

    const handleUndo = () => {
        if (incrementHistory.length === 0) return alert("No action to undo.");
        const lastAction = incrementHistory.pop();
        const { key, rejected, quantity } = lastAction;

        if (rejected) {
            const currentCount = rejectedData[key] || 0;
            const newData = { ...rejectedData, [key]: Math.max(0, currentCount - quantity) };
            if (newData[key] === 0) delete newData[key];
            setRejectedData(newData);
            localStorage.setItem('multiLengthLocalRejectedData', JSON.stringify(newData));
        } else {
            const currentCount = recordedData[key] || 0;
            const newData = { ...recordedData, [key]: Math.max(0, currentCount - quantity) };
            if (newData[key] === 0) delete newData[key];
            setRecordedData(newData);
            localStorage.setItem('multiLengthLocalData', JSON.stringify(newData));
        }
        setIncrementHistory([...incrementHistory]);
    };

    const handleReset = () => {
        if (window.confirm("Are you sure you want to clear all current entries?")) {
            setRecordedData({});
            setRejectedData({});
            setIncrementHistory([]);
            setEntryHistory([]);
            localStorage.removeItem('multiLengthLocalData');
            localStorage.removeItem('multiLengthLocalRejectedData');
            if (setActiveDraft) setActiveDraft(null);
            alert("Current session has been cleared.");
        }
    };

    const handleFinish = async () => {
        if (Object.keys(recordedData).length === 0 && Object.keys(rejectedData).length === 0) {
            return alert("No data recorded to generate a report.");
        }
        
        const date = new Date();
        const todayStr = date.toLocaleDateString();
        const counter = parseInt(localStorage.getItem('dailyMultiLengthReportCounter') || '0', 10) + 1;
        localStorage.setItem('lastMultiLengthReportDate', todayStr);
        localStorage.setItem('dailyMultiLengthReportCounter', counter);
        
        generateAndDownloadXLSX(recordedData, rejectedData, reportFileName);

        const logFileName = `${reportFileName.replace('.xlsx', '')}.txt`;
        let logContent = `SESSION LOG: ${logFileName}\nVehicle Number: ${sessionInfo.vehicleNumber}\nNote: ${sessionInfo.note}\n=============================\n\n`;
        entryHistory.forEach((entry, index) => {
            logContent += `Entry ${index + 1}: T:${entry.thickness}, L:${entry.length}, W:${entry.width}, Qty: ${entry.quantity} - ${entry.status}\n`;
        });

        try {
            await api.post('/reports', {
                reportData: { accepted: recordedData, rejected: rejectedData, sessionInfo },
                fileName: reportFileName,
            });
            await api.post('/logs', { logContent, logName: logFileName });
            alert("Report and log saved successfully!");
        } catch (error) {
            alert("Failed to save report or log.");
        }
        
        handleReset();
    };

    // --- CORRECTED Report Generation Logic ---
    const generateAndDownloadXLSX = (accepted, rejected, fileName) => {
        const wb = XLSX.utils.book_new();

        const processSheetData = (data, thickness) => {
            const allLengths = Object.keys(data).sort((a, b) => parseFloat(a) - parseFloat(b));
            const allWidths = new Set();
            allLengths.forEach(l => Object.keys(data[l]).forEach(w => allWidths.add(w)));
            const sortedWidths = Array.from(allWidths).sort((a, b) => parseFloat(a) - parseFloat(b));
            
            let matrix = [];
             if(sessionInfo) {
                matrix.push([`Vehicle No: ${sessionInfo.vehicleNumber}`]);
                matrix.push([]); 
            }
            
            const headerRow1 = ['L / W'];
            const headerRow2 = [null];
            sortedWidths.forEach(w => {
                headerRow1.push(w, null);
                headerRow2.push('Pcs', 'CFT');
            });
            headerRow1.push('Total', null);
            headerRow2.push('Pcs', 'CFT');
            matrix.push(headerRow1, headerRow2);
            
            const colTotalPcs = new Array(sortedWidths.length).fill(0);
            const colTotalCFTs = new Array(sortedWidths.length).fill(0);
            let grandTotalPcs = 0;
            let grandTotalCFT = 0;
            
            let range1 = { pcs: 0, cft: 0 };
            let range2 = { pcs: 0, cft: 0 };
            let range3 = { pcs: 0, cft: 0 };

            allLengths.forEach(length => {
                let rowTotalPcs = 0;
                let rowTotalCFT = 0;
                const row = [parseFloat(length)];
                
                sortedWidths.forEach((width, index) => {
                    const count = data[length]?.[width] || 0;
                    const cft = (parseFloat(thickness) * parseFloat(length) * parseFloat(width) * count) / 144;
                    row.push(count, parseFloat(cft.toFixed(4)));
                    rowTotalPcs += count;
                    rowTotalCFT += cft;
                    colTotalPcs[index] += count;
                    colTotalCFTs[index] += cft;
                });

                row.push(rowTotalPcs, parseFloat(rowTotalCFT.toFixed(4)));
                matrix.push(row);
                
                grandTotalPcs += rowTotalPcs;
                grandTotalCFT += rowTotalCFT;

                const len = parseFloat(length);
                if (len >= 1.5 && len <= 2.75) {
                    range1.pcs += rowTotalPcs;
                    range1.cft += rowTotalCFT;
                } else if (len >= 3.0 && len <= 4.75) {
                    range2.pcs += rowTotalPcs;
                    range2.cft += rowTotalCFT;
                } else if (len >= 5) {
                    range3.pcs += rowTotalPcs;
                    range3.cft += rowTotalCFT;
                }
            });
            
            const footerPcsRow = ['Total Pcs'];
            const footerCftRow = ['Total CFT'];
            sortedWidths.forEach((w, index) => {
                footerPcsRow.push(colTotalPcs[index], null);
                footerCftRow.push(null, parseFloat(colTotalCFTs[index].toFixed(4)));
            });
            footerPcsRow.push(grandTotalPcs, null);
            footerCftRow.push(null, parseFloat(grandTotalCFT.toFixed(4)));
            matrix.push([], footerPcsRow, footerCftRow); 
            
            matrix.push([],[], 
                ['Summary', 'Total Pcs', 'Total CFT'],
                [`Vehicle No: ${sessionInfo.vehicleNumber}`],
                ['1.5 to 2.75', range1.pcs, parseFloat(range1.cft.toFixed(4))],
                ['3.0 to 4.75', range2.pcs, parseFloat(range2.cft.toFixed(4))],
                ['5 and Above', range3.pcs, parseFloat(range3.cft.toFixed(4))]
            );
            
            const ws = XLSX.utils.aoa_to_sheet(matrix);

            const merges = [];
            const mergeStartRow = sessionInfo ? 2 : 0;
            for (let i = 0; i < sortedWidths.length + 1; i++) {
                merges.push({ s: { r: mergeStartRow, c: (i * 2) + 1 }, e: { r: mergeStartRow, c: (i * 2) + 2 } });
            }
            if (!ws['!merges']) ws['!merges'] = [];
            ws['!merges'].push(...merges);
            
            return ws;
        };
        
        const acceptedGrouped = {};
        for (const key in accepted) {
            const [t, l, w] = key.split('-');
            if (!acceptedGrouped[t]) acceptedGrouped[t] = {};
            if (!acceptedGrouped[t][l]) acceptedGrouped[t][l] = {};
            acceptedGrouped[t][l][w] = accepted[key];
        }
        for (const thickness in acceptedGrouped) {
            XLSX.utils.book_append_sheet(wb, processSheetData(acceptedGrouped[thickness], thickness), `Thickness ${thickness}`);
        }
        
        // ADDED: Logic to process and add rejected data to the workbook
        if (Object.keys(rejected).length > 0) {
            const rejectedGrouped = {};
            for (const key in rejected) {
                const [t, l, w] = key.split('-');
                if (!rejectedGrouped[t]) rejectedGrouped[t] = {};
                if (!rejectedGrouped[t][l]) rejectedGrouped[t][l] = {};
                rejectedGrouped[t][l][w] = rejected[key];
            }
            for (const thickness in rejectedGrouped) {
                XLSX.utils.book_append_sheet(wb, processSheetData(rejectedGrouped[thickness], thickness), `Rejected ${thickness}`);
            }
        }
        
        XLSX.writeFile(wb, fileName);
    };

    return (
        <div className="bg-gray-100 min-h-screen p-2 sm:p-4 font-sans">
            <div className="max-w-full mx-auto">
                <header className="flex flex-wrap justify-between items-center mb-4 p-4 bg-white rounded-lg shadow">
                    <div className="flex items-center space-x-2 sm:space-x-4">
                        <span className="font-semibold text-sm sm:text-base">Thickness:</span>
                        <div className="flex items-center space-x-2">
                             {thicknessData.map(t => (
                                <button
                                    key={t}
                                    onClick={() => setSelectedThickness(t)}
                                    className={`px-3 py-1 rounded-md text-sm font-semibold transition-colors ${selectedThickness === t ? 'bg-indigo-600 text-white' : 'bg-gray-200 hover:bg-gray-300'}`}
                                >
                                    {t}
                                </button>
                            ))}
                        </div>
                        <button onClick={handleUndo} className="p-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 font-semibold text-sm sm:text-base">Undo</button>
                        <button 
                            onClick={() => setIsRejectMode(!isRejectMode)} 
                            className={`p-2 rounded-lg font-semibold text-sm sm:text-base text-white transition-colors ${isRejectMode ? 'bg-red-600' : 'bg-gray-400'}`}
                        >
                            {isRejectMode ? 'Reject: ON' : 'Reject: OFF'}
                        </button>
                        <button 
                            onClick={() => setIsQuantityMode(!isQuantityMode)} 
                            className={`p-2 rounded-lg font-semibold text-sm sm:text-base text-white transition-colors ${isQuantityMode ? 'bg-purple-600' : 'bg-gray-400'}`}
                        >
                            {isQuantityMode ? 'Qty: ON' : 'Qty: OFF'}
                        </button>
                         <button 
                            onClick={() => setIsEditMode(!isEditMode)} 
                            className={`p-2 rounded-lg font-semibold text-sm sm:text-base text-white transition-colors ${isEditMode ? 'bg-orange-500' : 'bg-gray-400'}`}
                        >
                            {isEditMode ? 'Edit: ON' : 'Edit: OFF'}
                        </button>
                    </div>
                    <div className="text-center my-2 w-full sm:w-auto">
                        <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Multi-Length Counting</h1>
                        <div className="mt-2 p-2 bg-blue-100 text-blue-800 rounded-lg font-mono text-base sm:text-lg flex justify-center items-center space-x-4">
                            <span>CFT: <span className="font-bold">{totalCFT.toFixed(4)}</span></span>
                            <span>|</span>
                            <span>Total Pcs: <span className="font-bold">{totalPcs}</span></span>
                        </div>
                    </div>
                     <div className="flex items-center space-x-2 sm:space-x-4">
                        <p className="text-xs sm:text-sm text-gray-500 font-mono">{reportFileName}</p>
                        <button onClick={handleBack} className="p-2 bg-gray-500 text-white rounded hover:bg-gray-600 text-sm sm:text-base self-start sm:self-center mt-2 sm:mt-0">
                            Back
                        </button>
                    </div>
                </header>
                
                 <main className="overflow-auto bg-white p-4 rounded-lg shadow" style={{maxHeight: 'calc(100vh - 250px)'}}>
                    <table className="min-w-full border-collapse">
                        <thead className="bg-gray-100 sticky top-0 z-10">
                            <tr>
                                <th scope="col" className="sticky left-0 bg-gray-200 z-20 px-3 py-3.5 text-center text-sm font-semibold text-gray-900 border border-gray-300">L / W</th>
                                {widthData.map(w => (
                                    <th key={w} scope="col" className="px-3 py-3.5 text-center text-sm font-semibold text-gray-900 border border-gray-300">{w}</th>
                                ))}
                                <th scope="col" className="px-3 py-3.5 text-center text-sm font-semibold text-gray-900 border border-gray-300 bg-gray-200">Total Pcs</th>
                            </tr>
                        </thead>
                        <tbody>
                            {lengthData.map(l => {
                                const dataSet = isRejectMode ? rejectedData : recordedData;
                                const totalPcsForRow = widthData.reduce((sum, w) => {
                                    const key = `${selectedThickness}-${l}-${w}`;
                                    return sum + (dataSet[key] || 0);
                                }, 0);

                                return (
                                    <tr key={l}>
                                        <td className="sticky left-0 bg-gray-50 z-10 px-3 py-2 whitespace-nowrap text-center text-sm font-medium text-gray-900 border border-gray-300">{l}</td>
                                        {widthData.map(w => {
                                            const key = `${selectedThickness}-${l}-${w}`;
                                            const count = (isRejectMode ? rejectedData[key] : recordedData[key]) || 0;
                                            return (
                                                <td key={w} className={`px-3 py-2 text-center text-sm text-gray-500 border border-gray-300 ${isRejectMode && count > 0 ? 'bg-red-100' : ''}`}>
                                                    <div className="flex flex-col items-center justify-center">
                                                        <div className="flex items-center space-x-2">
                                                            {isEditMode && (
                                                                <button 
                                                                    onClick={() => handleCountChange(l, w, -1)}
                                                                    className="w-8 h-8 bg-gray-300 text-gray-700 rounded-full text-lg font-bold hover:bg-gray-400 transition-colors flex items-center justify-center"
                                                                >
                                                                    -
                                                                </button>
                                                            )}
                                                            <button 
                                                                onClick={() => handleCountChange(l, w, 1)}
                                                                className={`w-10 h-10 text-white rounded-full text-xl font-bold transition-colors flex items-center justify-center ${isRejectMode ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-500 hover:bg-blue-600'}`}
                                                            >
                                                                +
                                                            </button>
                                                        </div>
                                                        <span className="text-xs text-gray-600 mt-1 font-semibold">{count}</span>
                                                    </div>
                                                </td>
                                            );
                                        })}
                                        <td className="px-3 py-2 text-center text-sm text-gray-800 font-bold bg-gray-100 border border-gray-300">
                                            {totalPcsForRow}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </main>

                 <footer className="mt-6 flex justify-center items-center gap-4">
                    <button onClick={handleFinish} className="py-3 px-6 bg-green-600 text-white text-lg rounded-lg hover:bg-green-700 font-semibold shadow-lg">
                        Finish & Save
                    </button>
                    <button onClick={handleReset} className="py-3 px-6 bg-red-600 text-white text-lg rounded-lg hover:bg-red-700 font-semibold shadow-lg">
                        Reset
                    </button>
                </footer>
            </div>
        </div>
    );
}

