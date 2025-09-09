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
    const lengthData = [1.5, 1.75, 2, 2.25, 2.5, 2.75, 3, 3.25, 3.5, 3.75, 4, 4.25, 4.5, 4.75, 5, 5.25, 5.5, 5.75, 6, 6.25, 6.5, 6.75, 7, 7.25, 7.5, 7.75, 8, 8.25, 8.5, 8.75, 9, 9.25, 9.5, 9.75, 10, 10.25, 10.5, 10.75, 11, 11.25, 11.5, 11.75, 12, 12.25, 12.5, 12.75, 13, 13.25, 13.5, 13.75];
    const widthData = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

    // --- State Management ---
    const [selectedThickness, setSelectedThickness] = useState(thicknessData[0]);
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

        ws.current.onopen = () => console.log('Counter WebSocket Connected');
        ws.current.onclose = () => console.log('Counter WebSocket disconnected');

        return () => {
            if (ws.current) ws.current.close();
        };
    }, [user.role]);

    // --- Generate Filename ---
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
            
            // Send filename update via WebSocket
            if (ws.current && ws.current.readyState === WebSocket.OPEN) {
                ws.current.send(JSON.stringify({ type: 'FILENAME_UPDATE', fileName: fileName }));
            }
        }
    }, [sessionInfo]);

    // --- Load data from active draft or local storage ---
    useEffect(() => {
        if (activeDraft) {
            setRecordedData(activeDraft.draft_data.accepted || {});
        } else {
            const savedData = localStorage.getItem('multiLengthLocalData');
            if (savedData) setRecordedData(JSON.parse(savedData));
        }
    }, [activeDraft]);

    // --- Live CFT Calculation & WebSocket Update ---
    const totalCFT = useMemo(() => {
        let total = 0;
        for (const key in recordedData) {
            const [t, l, w] = key.split('-').map(Number);
            const count = recordedData[key];
            total += (t * l * w * count) / 144;
        }
        return total;
    }, [recordedData]);

    useEffect(() => {
        if (ws.current && ws.current.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify({ type: 'CFT_UPDATE', cft: totalCFT }));
        }
    }, [totalCFT]);

    // --- Event Handlers ---
    const handleIncrement = (length, width) => {
        const key = `${selectedThickness}-${length}-${width}`;
        const newData = { ...recordedData, [key]: (recordedData[key] || 0) + 1 };
        setRecordedData(newData);
        setIncrementHistory(prevHistory => [...prevHistory, key]);
        localStorage.setItem('multiLengthLocalData', JSON.stringify(newData));
    };
    
    const handleUndo = () => {
        if (incrementHistory.length > 0) {
            const lastKey = incrementHistory[incrementHistory.length - 1];
            const currentCount = recordedData[lastKey];
            if (currentCount > 0) {
                const newData = { ...recordedData, [lastKey]: currentCount - 1 };
                if (newData[lastKey] === 0) delete newData[lastKey];
                setRecordedData(newData);
                setIncrementHistory(prevHistory => prevHistory.slice(0, -1));
                localStorage.setItem('multiLengthLocalData', JSON.stringify(newData));
            }
        } else {
            alert("No more actions to undo.");
        }
    };

    const handleReset = () => {
        if (window.confirm("Are you sure you want to clear all current entries?")) {
            setRecordedData({});
            if (setActiveDraft) setActiveDraft(null);
            setIncrementHistory([]);
            localStorage.removeItem('multiLengthLocalData');
            alert("Current session has been cleared.");
        }
    };

    const handleFinish = async () => {
         if (Object.keys(recordedData).length === 0) {
            alert("No data recorded to generate a report.");
            return;
        }
        const date = new Date();
        const todayStr = date.toLocaleDateString();
        const counter = parseInt(localStorage.getItem('dailyMultiLengthReportCounter') || '0', 10) + 1;
        localStorage.setItem('lastMultiLengthReportDate', todayStr);
        localStorage.setItem('dailyMultiLengthReportCounter', counter);
        
        generateAndDownloadXLSX(recordedData, reportFileName);

        const logFileName = `${reportFileName.replace('.xlsx', '')}.txt`;
        let logContent = `SESSION LOG: ${logFileName}\n`;
        logContent += `Vehicle Number: ${sessionInfo.vehicleNumber}\n`;
        logContent += `Note: ${sessionInfo.note}\n`;
        logContent += "=============================\n\n";
        logContent += "ENTRIES:\n";
        incrementHistory.forEach((key, index) => {
            const [t, l, w] = key.split('-');
            logContent += `Entry ${index + 1}: T:${t}, L:${l}, W:${w} - Accepted\n`;
        });
        
        try {
            await api.post('/reports', {
                reportData: { accepted: recordedData, sessionInfo: sessionInfo }, 
                fileName: reportFileName
            });
             await api.post('/logs', {
                logContent: logContent,
                logName: logFileName
            });
            alert("Report and log saved successfully!");
        } catch (error) {
            console.error("Failed to save report or log:", error);
            alert("Failed to save the report or log.");
        }
        handleReset();
    };

    const generateAndDownloadXLSX = (data, fileName) => {
        const wb = XLSX.utils.book_new();
        const groupedByThickness = {};
        for (const key in data) {
            const [t, l, w] = key.split('-');
            const count = data[key];
            if (!groupedByThickness[t]) groupedByThickness[t] = {};
            if (!groupedByThickness[t][l]) groupedByThickness[t][l] = {};
            groupedByThickness[t][l][w] = count;
        }

        for (const thickness in groupedByThickness) {
            const sheetData = groupedByThickness[thickness];
            const allLengths = Object.keys(sheetData).sort((a, b) => parseFloat(a) - parseFloat(b));
            const allWidths = new Set(widthData); // Use the full widthData for columns
            const sortedWidths = Array.from(allWidths).sort((a, b) => parseFloat(a) - parseFloat(b));
            
            let matrix = [];
            if(sessionInfo) {
                matrix.push([`Vehicle Number:`, sessionInfo.vehicleNumber]);
                matrix.push([`Note:`, sessionInfo.note]);
                matrix.push([]);
            }
            matrix.push(['L / W', ...sortedWidths, 'CFT']);

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
            XLSX.utils.book_append_sheet(wb, ws, `Thickness ${thickness}`);
        }
        
        XLSX.writeFile(wb, fileName);
    };

    return (
        <div className="bg-gray-100 min-h-screen p-2 sm:p-4 font-sans">
            <div className="max-w-full mx-auto">
                {/* Header */}
                <header className="flex flex-wrap justify-between items-center mb-4 p-4 bg-white rounded-lg shadow">
                    <div className="flex items-center space-x-2 sm:space-x-4">
                        <label className="font-semibold text-sm sm:text-base">Thickness:</label>
                        <select
                            value={selectedThickness}
                            onChange={(e) => setSelectedThickness(parseFloat(e.target.value))}
                            className="p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm sm:text-base"
                        >
                            {thicknessData.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                        <button onClick={handleUndo} className="p-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 font-semibold text-sm sm:text-base">
                            Undo
                        </button>
                    </div>
                    <div className="text-center my-2 w-full sm:w-auto">
                        <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Multi-Length Counting</h1>
                        <div className="mt-2 p-2 bg-blue-100 text-blue-800 rounded-lg font-mono text-base sm:text-lg">
                            Live Total CFT: <span className="font-bold">{totalCFT.toFixed(4)}</span>
                        </div>
                    </div>
                     <div className="flex items-center space-x-2 sm:space-x-4">
                        <p className="text-xs sm:text-sm text-gray-500 font-mono hidden md:block">{reportFileName}</p>
                        <button onClick={handleBack} className="p-2 bg-gray-500 text-white rounded hover:bg-gray-600 text-sm sm:text-base">
                            Back
                        </button>
                    </div>
                </header>
                {/* Counter Grid */}
                <main className="overflow-auto bg-white p-4 rounded-lg shadow" style={{maxHeight: 'calc(100vh - 250px)'}}>
                    <div className="inline-block min-w-full">
                         <div className="grid grid-cols-[80px_repeat(10,minmax(70px,1fr))] sticky top-0 bg-white z-10 border-b-2 pb-2">
                            <div className="font-bold p-2 text-center text-gray-600 sticky left-0 bg-white z-20">L / W</div>
                            {widthData.map(w => (
                                <div key={w} className="font-bold p-2 text-center text-gray-700 bg-gray-50 rounded">{w}</div>
                            ))}
                        </div>
                        <div className="divide-y divide-gray-200">
                            {lengthData.map(l => (
                                <div key={l} className="grid grid-cols-[80px_repeat(10,minmax(70px,1fr))] items-center">
                                    <div className="font-bold p-2 text-center text-gray-700 bg-gray-50 h-full flex items-center justify-center sticky left-0 z-10">{l}</div>
                                    {widthData.map(w => {
                                        const key = `${selectedThickness}-${l}-${w}`;
                                        const count = recordedData[key] || 0;
                                        return (
                                            <div key={w} className="p-1 sm:p-2 text-center border-l h-full flex flex-col justify-center items-center">
                                                <button 
                                                    onClick={() => handleIncrement(l, w)}
                                                    className="w-8 h-8 bg-blue-500 text-white rounded-full text-lg font-bold hover:bg-blue-600 transition-colors flex items-center justify-center mx-auto"
                                                >
                                                    +
                                                </button>
                                                <span className="text-xs sm:text-sm text-gray-600 mt-1 block">{count}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            ))}
                        </div>
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

