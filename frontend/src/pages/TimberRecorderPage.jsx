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
    // --- Static Data (Updated as per your request) ---
    const thicknessData = [0.75, 1, 1.5, 2, 2.5, 3];
    const lengthData = [1.5, 1.75, 2, 2.25, 2.5, 2.75, 3, 3.25, 3.5, 3.75, 4, 4.25, 4.5, 4.75, 5, 5.25, 5.5, 5.75, 6, 6.25, 6.5, 6.75, 7, 7.25, 7.5, 7.75, 8, 8.25, 8.5, 8.75, 9, 9.25, 9.5, 9.75, 10, 10.25, 10.5, 10.75, 11, 11.25, 11.5, 11.75, 12, 12.25, 12.5, 12.75, 13, 13.25, 13.5, 13.75];
    const widthData = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

    // --- State Management ---
    const [selectedThickness, setSelectedThickness] = useState(1);
    const [recordedData, setRecordedData] = useState({});
    const [rejectedData, setRejectedData] = useState({});
    const [isRejectMode, setIsRejectMode] = useState(false);
    const [incrementHistory, setIncrementHistory] = useState([]);
    const [reportFileName, setReportFileName] = useState('');
    const ws = useRef(null);

    // --- WebSocket Connection ---
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token || user.role !== 'counter') return;
        const wsUrl = `${getWebSocketURL()}?token=${token}`;
        ws.current = new WebSocket(wsUrl);
        ws.current.onopen = () => console.log('Counter WebSocket Connected');
        ws.current.onclose = () => console.log('Counter WebSocket disconnected');
        return () => { if (ws.current) ws.current.close(); };
    }, [user.role]);
    
    // --- Load Data from Draft or Local Storage ---
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
            const fileName = `${sessionInfo.vehicleNumber}_${dateStr}_${timeStr}_${String(counter).padStart(3, '0')}.xlsx`;
            setReportFileName(fileName);
            
            if (ws.current && ws.current.readyState === WebSocket.OPEN) {
                ws.current.send(JSON.stringify({ type: 'FILENAME_UPDATE', fileName: fileName }));
            }
        }
    }, [sessionInfo]);

    useEffect(() => {
        if (activeDraft) {
            setRecordedData(activeDraft.draft_data.accepted || {});
        } else {
            const savedData = localStorage.getItem('multiLengthLocalData');
            if (savedData) setRecordedData(JSON.parse(savedData));
        }
    }, [activeDraft]);

    // --- Live CFT Calculation & Update ---
    const totalCFT = useMemo(() => {
        let total = 0;
        for (const key in recordedData) {
            const [t, l, w] = key.split('-').map(Number);
            total += (t * l * w * recordedData[key]) / 144;
        }
        return total;
    }, [recordedData]);

    const rejectedCFT = useMemo(() => {
        let total = 0;
        for (const key in rejectedData) {
            const [t, l, w] = key.split('-').map(Number);
            total += (t * l * w * rejectedData[key]) / 144;
        }
        return total;
    }, [rejectedData]);

    useEffect(() => {
        if (ws.current && ws.current.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify({ type: 'CFT_UPDATE', cft: totalCFT }));
        }
    }, [totalCFT]);

    // --- Event Handlers ---
    const handleIncrement = (length, width) => {
        const key = `${selectedThickness}-${length}-${width}`;
        if (isRejectMode) {
            const newRejectedData = { ...rejectedData, [key]: (rejectedData[key] || 0) + 1 };
            setRejectedData(newRejectedData);
            localStorage.setItem('multiLengthLocalRejectedData', JSON.stringify(newRejectedData));
        } else {
            const newData = { ...recordedData, [key]: (recordedData[key] || 0) + 1 };
            setRecordedData(newData);
            localStorage.setItem('multiLengthLocalData', JSON.stringify(newData));
        }
        setIncrementHistory(prev => [...prev, { key, rejected: isRejectMode }]);
    };
    
    const handleUndo = () => {
        if (incrementHistory.length === 0) return alert("No action to undo.");
        const lastAction = incrementHistory.pop();
        const { key, rejected } = lastAction;

        if (rejected) {
            const currentCount = rejectedData[key];
            if (currentCount > 0) {
                const newData = { ...rejectedData, [key]: currentCount - 1 };
                if (newData[key] === 0) delete newData[key];
                setRejectedData(newData);
                localStorage.setItem('multiLengthLocalRejectedData', JSON.stringify(newData));
            }
        } else {
            const currentCount = recordedData[key];
            if (currentCount > 0) {
                const newData = { ...recordedData, [key]: currentCount - 1 };
                if (newData[key] === 0) delete newData[key];
                setRecordedData(newData);
                localStorage.setItem('multiLengthLocalData', JSON.stringify(newData));
            }
        }
        setIncrementHistory([...incrementHistory]);
    };

    const handleReset = () => {
        if (window.confirm("Are you sure you want to clear all current entries?")) {
            setRecordedData({});
            setRejectedData({});
            setIncrementHistory([]);
            localStorage.removeItem('multiLengthLocalData');
            localStorage.removeItem('multiLengthLocalRejectedData');
            if (setActiveDraft) setActiveDraft(null);
            alert("Current session has been cleared.");
        }
    };

    const handleFinish = async () => {
        // ... (Finish logic remains the same)
        if (Object.keys(recordedData).length === 0 && Object.keys(rejectedData).length === 0) {
            return alert("No data recorded to generate a report.");
        }

        const date = new Date();
        const todayStr = date.toLocaleDateString();
        const counter = parseInt(localStorage.getItem('dailyMultiLengthReportCounter') || '0', 10) + 1;
        localStorage.setItem('lastMultiLengthReportDate', todayStr);
        localStorage.setItem('dailyMultiLengthReportCounter', counter);

        generateAndDownloadXLSX(recordedData, rejectedData, reportFileName);

        try {
            await api.post('/reports', {
                reportData: { accepted: recordedData, rejected: rejectedData, sessionInfo },
                fileName: reportFileName,
            });
            alert("Report and log saved successfully!");
        } catch (error) {
            alert("Failed to save report or log.");
        }
        handleReset();
    };
    
    const generateAndDownloadXLSX = (accepted, rejected, fileName) => {
        // ... (Report generation logic remains the same)
        const wb = XLSX.utils.book_new();

        const processSheetData = (data, thickness) => {
            const sheetData = data;
            const allLengths = Object.keys(sheetData).sort((a, b) => parseFloat(a) - parseFloat(b));
            const allWidths = new Set();
            allLengths.forEach(l => Object.keys(sheetData[l]).forEach(w => allWidths.add(w)));
            const sortedWidths = Array.from(allWidths).sort((a, b) => parseFloat(a) - parseFloat(b));
            
            let matrix = [];
            if(sessionInfo) {
                matrix.push([`Vehicle Number:`, sessionInfo.vehicleNumber], [`Note:`, sessionInfo.note], []);
            }
            matrix.push(['L / W', ...sortedWidths, 'CFT']);

            const headerRowIndex = sessionInfo ? 3 : 0;
            const colCFTs = new Array(sortedWidths.length).fill(0);
            let totalSheetCFT = 0, range1CFT = 0, range2CFT = 0, range3CFT = 0;

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

                const len = parseFloat(length);
                if (len >= 1.5 && len <= 2.75) range1CFT += rowCFT;
                else if (len >= 3 && len <= 4.75) range2CFT += rowCFT;
                else if (len >= 5) range3CFT += rowCFT;
            });

            const totalRow = ['CFT', ...colCFTs.map(c => parseFloat(c.toFixed(4))), parseFloat(totalSheetCFT.toFixed(4))];
            matrix.push(totalRow);
            const summaryMatrix = [ [], ['1.5 - 2.75', parseFloat(range1CFT.toFixed(4))], ['3 - 4.75', parseFloat(range2CFT.toFixed(4))], ['5 and Above', parseFloat(range3CFT.toFixed(4))] ];
            const finalMatrix = [...matrix, ...summaryMatrix];
            const ws = XLSX.utils.aoa_to_sheet(finalMatrix);
            
            const greenFill = { fgColor: { rgb: "C6EFCE" } };
            const yellowFill = { fgColor: { rgb: "FFEB9C" } };
            const blueFill = { fgColor: { rgb: "BDD7EE" } };

            for (let r = headerRowIndex + 1; r < matrix.length - 1; r++) {
                const len = matrix[r][0];
                let fill = null;
                if (len >= 1.5 && len <= 2.75) fill = greenFill;
                else if (len >= 3 && len <= 4.75) fill = yellowFill;
                else if (len >= 5) fill = blueFill;

                if (fill) {
                    for (let c = 0; c < matrix[r].length; c++) {
                        const cellAddress = XLSX.utils.encode_cell({ r, c });
                        if(ws[cellAddress]) ws[cellAddress].s = { fill };
                    }
                }
            }
            
            const summaryStartRow = matrix.length + 1;
            [greenFill, yellowFill, blueFill].forEach((fill, index) => {
                if (summaryMatrix[index + 1].length > 0) {
                    for (let c = 0; c < 2; c++) {
                        const cellAddress = XLSX.utils.encode_cell({ r: summaryStartRow + index, c });
                        if(ws[cellAddress]) ws[cellAddress].s = { fill };
                    }
                }
            });
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
                    </div>
                    <div className="text-center my-2 w-full sm:w-auto">
                        <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Multi-Length Counting</h1>
                        <div className="mt-2 p-2 flex items-center justify-center space-x-4 bg-blue-100 text-blue-800 rounded-lg font-mono text-base sm:text-lg">
                            Live Total CFT: <span className="font-bold">{totalCFT.toFixed(4)}</span>

                            {isRejectMode && (
                                <>
                                 <span className="text-sm text-gray-500">|</span>
                                 <span className="text-red-600">Rejected CFT: <span className="font-bold">{rejectedCFT.toFixed(4)}</span></span>
                                </>
                            )}
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
                    <div className="inline-block min-w-full align-middle">
                        <table className="min-w-full border-separate border-spacing-0">
                            <thead className="bg-gray-50 sticky top-0 z-10">
                                <tr>
                                    <th scope="col" className="sticky left-0 bg-gray-50 z-20 px-3 py-3.5 text-center text-sm font-semibold text-gray-900 border-b border-r">L / W</th>
                                    {widthData.map(w => (
                                        <th key={w} scope="col" className="px-3 py-3.5 text-center text-sm font-semibold text-gray-900 border-b">{w}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {lengthData.map(l => (
                                    <tr key={l}>
                                        <td className="sticky left-0 bg-gray-50 z-10 px-3 py-4 whitespace-nowrap text-center text-sm font-medium text-gray-900 border-r">{l}</td>
                                        {widthData.map(w => {
                                            const key = `${selectedThickness}-${l}-${w}`;
                                            const acceptedCount = recordedData[key] || 0;
                                            const rejectedCount = rejectedData[key] || 0;
                                            const count = isRejectMode ? rejectedCount : acceptedCount;
                                            return (
                                                <td key={w} className={`px-3 py-2 text-center text-sm text-gray-500 border-b ${isRejectMode && count > 0 ? 'bg-red-100' : ''}`}>
                                                    <div className="flex flex-col items-center justify-center">
                                                        <button 
                                                            onClick={() => handleIncrement(l, w)}
                                                            className={`w-10 h-10 text-white rounded-full text-xl font-bold transition-colors flex items-center justify-center ${isRejectMode ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-500 hover:bg-blue-600'}`}
                                                        >
                                                            +
                                                        </button>
                                                        <span className="text-xs text-gray-600 mt-1 font-semibold">{count}</span>
                                                    </div>
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </main>

                <footer className="mt-6 flex justify-center items-center gap-4">
                    <button onClick={handleFinish} className="py-2 px-4 sm:py-3 sm:px-6 bg-green-600 text-white text-base sm:text-lg rounded-lg hover:bg-green-700 font-semibold shadow-lg transition-all">
                        Finish & Save
                    </button>
                    <button onClick={handleReset} className="py-2 px-4 sm:py-3 sm:px-6 bg-red-600 text-white text-base sm:text-lg rounded-lg hover:bg-red-700 font-semibold shadow-lg transition-all">
                        Reset
                    </button>
                </footer>
            </div>
        </div>
    );
}



