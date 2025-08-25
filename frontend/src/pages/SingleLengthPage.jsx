import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import api from '../api';

// Lock Icon SVG Component
const LockIcon = ({ locked }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 md:h-6 md:w-6 mr-1 md:mr-2" viewBox="0 0 20 20" fill="currentColor">
        {locked ? (
            <path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd" />
        ) : (
            <path d="M10 2a5 5 0 00-5 5v2a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-1V7a5 5 0 00-5-5zm0 2a3 3 0 013 3v2H7V7a3 3 0 013-3z" />
        )}
    </svg>
);

// Reusable CountByWidth component
const CountByWidth = ({ title, length, selections, selectedWidth, handleSelection, handleIncrement, recordedData, disabled }) => {
    const widthData = [
        [3, 4, 5, 6, 7, 8, 9],
        [10, 11, 12]
    ];
    const lastEntryKey = `${selections.thickness}-${length}-${selectedWidth}`;
    const lastEntryCount = recordedData[lastEntryKey] || 0;

    return (
        <div className={`p-4 md:p-6 bg-white rounded-xl shadow-lg ${disabled ? 'opacity-40 pointer-events-none' : ''}`}>
            <div className="flex justify-between items-center border-b-2 border-gray-200 pb-3 mb-4">
                <h2 className="text-xl md:text-2xl font-bold text-gray-700">{title}</h2>
                <div className="p-2 bg-gray-100 rounded-lg text-center text-sm md:text-base font-mono text-gray-800">
                    {selectedWidth ? `T:${selections.thickness}, L:${length}, W:${selectedWidth} (Total: ${lastEntryCount})` : "Select a width"}
                </div>
            </div>
            <div className="space-y-3 md:space-y-4">
                {widthData.map((row, rowIndex) => (
                    <div key={rowIndex} className="grid grid-cols-7 gap-2 md:gap-3">
                        {row.map(w => (
                            <button
                                key={w}
                                onClick={() => handleSelection(w)}
                                disabled={disabled}
                                className={`py-2 px-2 text-sm md:py-3 md:px-4 md:text-base rounded-lg shadow-md font-bold transition-all transform hover:scale-105 ${selectedWidth === w && !disabled ? 'bg-indigo-600 text-white ring-2 ring-indigo-300' : 'bg-white hover:bg-gray-200'}`}
                            >
                                {w}
                            </button>
                        ))}
                    </div>
                ))}
            </div>
            <div className="mt-4 md:mt-6 border-t-2 border-gray-200 pt-4">
                <div className="grid grid-cols-10 gap-2 md:gap-3">
                    {Array.from({ length: 10 }, (_, i) => i + 1).map(num => (
                        <button
                            key={num}
                            onClick={() => handleIncrement(num, length, selectedWidth)}
                            disabled={!selectedWidth || disabled}
                            className="py-2 px-2 text-sm md:py-3 md:px-4 bg-blue-500 text-white font-bold rounded-lg shadow-lg hover:bg-blue-600 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            x{num}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};


export default function SingleLengthPage({ user, setPage, handleLogout, activeDraft, setActiveDraft }) {
    const thicknessData = [0.75, 1, 1.5, 2, 2.5, 3];
    const lengthIntegerData = Array.from({ length: 15 }, (_, i) => i + 1);
    const lengthDecimalData = [0, 0.25, 0.5, 0.75];

    const [selections, setSelections] = useState({
        thickness: thicknessData[0],
        length1Int: lengthIntegerData[0],
        length1Dec: lengthDecimalData[0],
        length2Int: lengthIntegerData[3],
        length2Dec: lengthDecimalData[0],
    });
    
    const [locks, setLocks] = useState({
        thickness: false,
        length1: false,
        length2: false,
    });

    const [recordedData, setRecordedData] = useState({});
    const [selectedWidth1, setSelectedWidth1] = useState(null);
    const [selectedWidth2, setSelectedWidth2] = useState(null);
    const [entryHistory, setEntryHistory] = useState([]);
    const [reportFileName, setReportFileName] = useState('');
    const historyBoxRef = useRef(null);
    const reportCounterRef = useRef(1);

    const generateNewFileName = () => {
        const today = new Date().toLocaleDateString();
        const lastReportDate = localStorage.getItem('lastSingleLengthReportDate');
        let counter = 1;

        if (lastReportDate === today) {
            counter = parseInt(localStorage.getItem('dailySingleLengthReportCounter') || '0', 10) + 1;
        } else {
            localStorage.setItem('dailySingleLengthReportCounter', '0');
        }
        reportCounterRef.current = counter;
        
        const date = new Date();
        const dateStr = `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}-${date.getFullYear()}`;
        let hours = date.getHours();
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours ? hours : 12;
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const timeStr = `${hours}-${minutes}-${ampm}`;
        const formattedCounter = String(counter).padStart(3, '0');

        setReportFileName(`single_length_report_${dateStr}_${timeStr}_${formattedCounter}.xlsx`);
    };

    useEffect(() => {
        generateNewFileName();

        const viewport = document.querySelector("meta[name=viewport]");
        if (viewport) {
            const defaultContent = viewport.getAttribute('content');
            if (window.innerWidth < 1024) {
                 viewport.setAttribute('content', 'width=device-width, initial-scale=0.5');
            }
            return () => viewport.setAttribute('content', defaultContent);
        }
    }, []);

    useEffect(() => {
        if (activeDraft) {
            setRecordedData(activeDraft.draft_data);
        }
    }, [activeDraft]);

    useEffect(() => {
        if (historyBoxRef.current) {
            historyBoxRef.current.scrollTop = historyBoxRef.current.scrollHeight;
        }
    }, [entryHistory]);

    const length1 = selections.length1Int + selections.length1Dec;
    const length2 = selections.length2Int + selections.length2Dec;

    const handleSelection = (type, value) => {
        setSelections(prev => ({ ...prev, [type]: value }));
    };

    const handleLock = (type) => {
        setLocks(prev => ({ ...prev, [type]: !prev[type] }));
    };

    const handleIncrement = (incrementAmount, activeLength, activeWidth) => {
        if (!activeWidth) {
            alert("Please select a Width first.");
            return;
        }
        if (!locks.thickness) {
            alert("Please lock Thickness first.");
            return;
        }

        const key = `${selections.thickness}-${activeLength}-${activeWidth}`;
        const newCount = (recordedData[key] || 0) + incrementAmount;
        setRecordedData(prev => ({ ...prev, [key]: newCount }));
        
        const newEntry = { thickness: selections.thickness, length: activeLength, width: activeWidth, count: newCount };
        setEntryHistory(prevHistory => [...prevHistory, newEntry]);
        
        if (activeLength === length1) {
            setSelectedWidth1(null);
        } else {
            setSelectedWidth2(null);
        }
    };
    
    const handleReset = () => {
        if (window.confirm("Are you sure you want to clear all current entries? This action cannot be undone.")) {
            setRecordedData({});
            setEntryHistory([]);
            setActiveDraft(null);
            alert("Current session has been cleared.");
        }
    };

    const generateAndSaveReport = async () => {
        if (Object.keys(recordedData).length === 0) {
            console.warn("No data to save or export.");
            return;
        }

        const wb = XLSX.utils.book_new();
        
        const groupedByThickness = {};
        for (const key in recordedData) {
            const [t, l, w] = key.split('-');
            const count = recordedData[key];
            if (!groupedByThickness[t]) groupedByThickness[t] = {};
            if (!groupedByThickness[t][l]) groupedByThickness[t][l] = {};
            groupedByThickness[t][l][w] = count;
        }

        for (const thickness in groupedByThickness) {
            const sheetData = groupedByThickness[thickness];
            const allLengths = Object.keys(sheetData).sort((a, b) => parseFloat(a) - parseFloat(b));
            const allWidths = new Set();
            allLengths.forEach(l => Object.keys(sheetData[l]).forEach(w => allWidths.add(w)));
            const sortedWidths = Array.from(allWidths).sort((a, b) => parseFloat(a) - parseFloat(b));
            
            const matrix = [['', ...sortedWidths, 'CFT']];
            const colCFTs = new Array(sortedWidths.length).fill(0);
            let totalSheetCFT = 0;
            
            let range1CFT = 0;
            let range2CFT = 0;
            let range3CFT = 0;

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

            const summaryMatrix = [
                [], // Spacer row
                ['1.5 - 2.75', parseFloat(range1CFT.toFixed(4))],
                ['3 - 4.75', parseFloat(range2CFT.toFixed(4))],
                ['5 and Above', parseFloat(range3CFT.toFixed(4))]
            ];
            
            const finalMatrix = [...matrix, ...summaryMatrix];
            const ws = XLSX.utils.aoa_to_sheet(finalMatrix);
            
            const greenFill = { fgColor: { rgb: "C6EFCE" } };
            const yellowFill = { fgColor: { rgb: "FFEB9C" } };
            const blueFill = { fgColor: { rgb: "BDD7EE" } };

            for (let i = 1; i < matrix.length - 1; i++) {
                const len = matrix[i][0];
                let fill = null;
                if (len >= 1.5 && len <= 2.75) fill = greenFill;
                else if (len >= 3 && len <= 4.75) fill = yellowFill;
                else if (len >= 5) fill = blueFill;

                if (fill) {
                    for (let j = 0; j < matrix[i].length; j++) {
                        const cellAddress = XLSX.utils.encode_cell({ r: i, c: j });
                        if (ws[cellAddress]) {
                            ws[cellAddress].s = { fill: fill };
                        }
                    }
                }
            }
            
            const summaryStartRow = matrix.length + 1;
            const summaryFills = [greenFill, yellowFill, blueFill];
            for (let i = 0; i < summaryMatrix.length - 1; i++) {
                if (summaryMatrix[i+1].length > 0) {
                    const fill = summaryFills[i];
                    for (let j = 0; j < summaryMatrix[i+1].length; j++) {
                        const cellAddress = XLSX.utils.encode_cell({ r: summaryStartRow + i, c: j });
                        if (ws[cellAddress]) {
                            ws[cellAddress].s = { fill: fill };
                        }
                    }
                }
            }
            XLSX.utils.book_append_sheet(wb, ws, `Thickness ${thickness}`);
        }
        
        const logFileName = `${reportFileName.replace('.xlsx', '')}.txt`;

        XLSX.writeFile(wb, reportFileName);

        let logContent = "SESSION LOG\n==================\n\n";
        entryHistory.forEach((entry, index) => {
            logContent += `Count ${index + 1}: T:${entry.thickness}, L:${entry.length}, W:${entry.width} (Total: ${entry.count})\n`;
        });

        try {
            await api.post('/reports', {
                reportData: recordedData,
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
        
        localStorage.setItem('lastSingleLengthReportDate', new Date().toLocaleDateString());
        localStorage.setItem('dailySingleLengthReportCounter', reportCounterRef.current);

        setRecordedData({});
        setEntryHistory([]);
        setActiveDraft(null);
        generateNewFileName();
    };

    return (
        <div className="bg-gray-100 text-gray-800 p-4 md:p-6 min-h-screen font-sans">
            <div className="max-w-screen-2xl mx-auto">
                <div className="relative flex justify-center items-center mb-6">
                    <div className="absolute left-0">
                        <button onClick={() => { setActiveDraft(null); setPage('dashboard'); }} className="py-2 px-4 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors text-lg">Back to Dashboard</button>
                    </div>
                    <h1 className="text-2xl md:text-4xl font-bold text-gray-800">Single Length Counter</h1>
                    <div className="absolute right-0">
                        <p className="text-xs md:text-sm text-gray-500 font-mono">{reportFileName}</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Left Column: Selections */}
                    <div className="lg:col-span-3">
                        <div className={`p-4 md:p-6 bg-white rounded-xl shadow-lg transition-all ${locks.thickness && (locks.length1 || locks.length2) ? 'bg-green-50' : ''}`}>
                            <h2 className="text-xl md:text-2xl font-bold mb-4 text-center border-b-2 pb-3">Selections</h2>
                            <div className="space-y-4">
                                {/* Thickness */}
                                <div className="flex items-center space-x-2">
                                    <label className="font-semibold w-24 md:w-28 text-base md:text-lg">Thickness:</label>
                                    <select
                                        value={selections.thickness}
                                        onChange={(e) => handleSelection('thickness', parseFloat(e.target.value))}
                                        disabled={locks.thickness}
                                        className="p-2 md:p-3 border rounded-lg w-full focus:ring-2 focus:ring-indigo-500 text-base md:text-lg"
                                    >
                                        {thicknessData.map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                    <button onClick={() => handleLock('thickness')} className={`py-2 px-3 md:py-3 md:px-4 rounded-lg text-white flex items-center justify-center w-28 md:w-32 transition-colors text-sm md:text-base font-semibold ${locks.thickness ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'}`}>
                                        <LockIcon locked={locks.thickness} /> {locks.thickness ? 'Unlock' : 'Lock'}
                                    </button>
                                </div>

                                {/* Length 1 */}
                                <div className="flex items-center space-x-2">
                                    <label className="font-semibold w-24 md:w-28 text-base md:text-lg">Length:</label>
                                    <select
                                        value={selections.length1Int}
                                        onChange={(e) => handleSelection('length1Int', parseInt(e.target.value))}
                                        disabled={locks.length1}
                                        className="p-2 md:p-3 border rounded-lg w-full focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 text-base md:text-lg"
                                    >
                                        {lengthIntegerData.map(l => <option key={`l1-${l}`} value={l}>{l}</option>)}
                                    </select>
                                    <select
                                        value={selections.length1Dec}
                                        onChange={(e) => handleSelection('length1Dec', parseFloat(e.target.value))}
                                        disabled={locks.length1}
                                        className="p-2 md:p-3 border rounded-lg w-full focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 text-base md:text-lg"
                                    >
                                        {lengthDecimalData.map(d => <option key={`d1-${d}`} value={d}>{d}</option>)}
                                    </select>
                                    <button onClick={() => handleLock('length1')} className={`py-2 px-3 md:py-3 md:px-4 rounded-lg text-white flex items-center justify-center w-28 md:w-32 transition-colors text-sm md:text-base font-semibold ${locks.length1 ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'}`}>
                                        <LockIcon locked={locks.length1} /> {locks.length1 ? 'Unlock' : 'Lock'}
                                    </button>
                                </div>
                                
                                {/* Length 2 */}
                                <div className="flex items-center space-x-2">
                                    <label className="font-semibold w-24 md:w-28 text-base md:text-lg">Length:</label>
                                    <select
                                        value={selections.length2Int}
                                        onChange={(e) => handleSelection('length2Int', parseInt(e.target.value))}
                                        disabled={locks.length2}
                                        className="p-2 md:p-3 border rounded-lg w-full focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 text-base md:text-lg"
                                    >
                                        {lengthIntegerData.map(l => <option key={`l2-${l}`} value={l}>{l}</option>)}
                                    </select>
                                    <select
                                        value={selections.length2Dec}
                                        onChange={(e) => handleSelection('length2Dec', parseFloat(e.target.value))}
                                        disabled={locks.length2}
                                        className="p-2 md:p-3 border rounded-lg w-full focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 text-base md:text-lg"
                                    >
                                        {lengthDecimalData.map(d => <option key={`d2-${d}`} value={d}>{d}</option>)}
                                    </select>
                                    <button onClick={() => handleLock('length2')} className={`py-2 px-3 md:py-3 md:px-4 rounded-lg text-white flex items-center justify-center w-28 md:w-32 transition-colors text-sm md:text-base font-semibold ${locks.length2 ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'}`}>
                                        <LockIcon locked={locks.length2} /> {locks.length2 ? 'Unlock' : 'Lock'}
                                    </button>
                                </div>
                            </div>
                        </div>
                        {/* Live Preview */}
                        <div className="p-4 bg-white rounded-lg shadow-md mt-6">
                            <h2 className="text-xl font-semibold mb-2 text-center border-b pb-2">Live Preview</h2>
                            <div ref={historyBoxRef} className="bg-gray-50 rounded-md h-64 overflow-y-auto p-2">
                                {entryHistory.length > 0 ? (
                                    <ul className="space-y-1 text-sm">
                                        {entryHistory.map((entry, index) => (
                                            <li key={index} className="p-2 bg-green-100 text-green-800 rounded-md animate-fade-in">
                                                <span className="font-bold">Count {index + 1}:</span> T:{entry.thickness}, L:{entry.length}, W:{entry.width} (Total: {entry.count})
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="text-center text-gray-500 pt-8">No entries yet</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Width Grids */}
                    <div className="lg:col-span-9 space-y-6">
                        <CountByWidth 
                            title={`Length: ${length1}`}
                            length={length1}
                            selections={selections}
                            selectedWidth={selectedWidth1}
                            handleSelection={setSelectedWidth1}
                            handleIncrement={handleIncrement}
                            recordedData={recordedData}
                            disabled={!locks.length1}
                        />
                        <CountByWidth 
                            title={`Length: ${length2}`}
                            length={length2}
                            selections={selections}
                            selectedWidth={selectedWidth2}
                            handleSelection={setSelectedWidth2}
                            handleIncrement={handleIncrement}
                            recordedData={recordedData}
                            disabled={!locks.length2}
                        />
                    </div>
                </div>
                
                <div className="mt-8 flex justify-center items-center gap-4">
                    <button 
                        onClick={generateAndSaveReport} 
                        className="py-3 px-6 md:py-4 md:px-8 bg-green-600 text-white text-lg md:text-xl rounded-lg hover:bg-green-700 font-semibold shadow-lg transition-all transform hover:scale-105"
                    >
                        Finish & Save Report
                    </button>
                    <button 
                        onClick={handleReset} 
                        className="py-3 px-6 md:py-4 md:px-8 bg-red-600 text-white text-lg md:text-xl rounded-lg hover:bg-red-700 font-semibold shadow-lg transition-all transform hover:scale-105"
                    >
                        Reset
                    </button>
                </div>
            </div>
        </div>
    );
}
