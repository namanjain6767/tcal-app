import React, { useState, useEffect, useMemo, useRef } from 'react';
import * as XLSX from 'xlsx';
import * as XLSXStyle from 'xlsx-js-style';
import api from '../api';
import * as offlineSync from '../utils/offlineSync';

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
const CounterGrid = ({ length, widthData, thickness, onIncrement, recordedData, cft, lastClickedKey }) => (
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
                const isFlashing = lastClickedKey === key;
                
                let cellBgClass = 'bg-gray-50'; // Default
                if (isFlashing) {
                    cellBgClass = 'bg-blue-300'; // Flash color
                } else if (count > 0) {
                    cellBgClass = 'bg-blue-100'; // Resting color
                }

                return (
                    <div 
                        key={w} 
                        className={`p-2 text-center rounded-lg border ${cellBgClass}`}
                    >
                        <div className="font-bold mb-2">{w}</div>
                        <button 
                            onClick={() => onIncrement(length, w)} 
                            className="w-10 h-10 bg-blue-500 text-white rounded-full text-xl font-bold hover:bg-blue-600 transition-colors flex items-center justify-center mx-auto"
                        >
                            +
                        </button>
                        <span className="text-sm text-gray-600 mt-1 block">{count}</span>
                    </div>
                )
            })}
        </div>
    </div>
);


export default function SingleLengthPage({ user, setPage, handleBack, activeDraft, setActiveDraft, sessionInfo }) {
    // --- Static Data ---
    const thicknessData = [0.75, 1, 1.5, 2, 2.5, 3];
    const lengthIntegerData = Array.from({ length: 15 }, (_, i) => i + 1);
    const lengthDecimalData = [0, 0.25, 0.5, 0.75];
    const widthData = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    const lengthCountOptions = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

    // --- State Management ---
    const [selectedThickness, setSelectedThickness] = useState(thicknessData[0]);
    const [isThicknessLocked, setIsThicknessLocked] = useState(false);
    
    const [numberOfLengths, setNumberOfLengths] = useState(2);
    const [isLengthCountLocked, setIsLengthCountLocked] = useState(false);

    const [lengths, setLengths] = useState(
        Array.from({ length: 2 }, (_, i) => ({
            id: i,
            int: lengthIntegerData[i * 3], 
            dec: lengthDecimalData[0],
            isLocked: false,
        }))
    );
    
    const [recordedData, setRecordedData] = useState({});
    const [incrementHistory, setIncrementHistory] = useState([]);
    const [entryHistory, setEntryHistory] = useState([]); // For logging
    const [reportFileName, setReportFileName] = useState('');
    const [lastClickedKey, setLastClickedKey] = useState(null); 
    const [showFormatModal, setShowFormatModal] = useState(false); // Report format selection modal
    const [sellerName, setSellerName] = useState(''); // For seller format
    const ws = useRef(null);

    // --- WebSocket Connection ---
    useEffect(() => {
        // --- FIX: Add guard clause to wait for user object ---
        if (!user || user.role !== 'counter') return;
        
        const token = localStorage.getItem('token');
        if (!token) return;
        
        const wsUrl = `${getWebSocketURL()}?token=${token}`;
        ws.current = new WebSocket(wsUrl);
        return () => { if (ws.current) ws.current.close(); };
    }, [user]); // Depend on user object
    
    // --- Load Data on Mount ---
    useEffect(() => {
        if (activeDraft) {
            setRecordedData(activeDraft.draft_data || {});
        } else {
            const savedData = localStorage.getItem('singleLengthLocalData');
            if (savedData) {
                setRecordedData(JSON.parse(savedData));
            }
        }
    }, [activeDraft]);
    
    // --- Filename Generation ---
    useEffect(() => {
        if (sessionInfo && sessionInfo.vehicleNumber) {
            const date = new Date();
            const todayStr = date.toLocaleDateString();
            const lastReportDate = localStorage.getItem('lastSingleLengthReportDate');
            let counter = 1;
            if (lastReportDate === todayStr) {
                counter = parseInt(localStorage.getItem('dailySingleLengthReportCounter') || '0', 10) + 1;
            } else {
                localStorage.setItem('dailySingleLengthReportCounter', '0');
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
    
    // Calculate CFT for each dynamic length
    const lengthCFTs = useMemo(() => {
        return lengths.map(len => {
            let total = 0;
            const lengthValue = len.int + len.dec;
            for (const key in recordedData) {
                const [t, l, w] = key.split('-').map(Number);
                if (l === lengthValue && t === selectedThickness) {
                    const count = recordedData[key];
                    total += (t * l * w * count) / 144;
                }
            }
            return total;
        });
    }, [recordedData, selectedThickness, lengths]);

    useEffect(() => {
        if (ws.current && ws.current.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify({ type: 'CFT_UPDATE', cft: totalCFT }));
        }
    }, [totalCFT]);
    
    // --- Flash Effect Logic ---
    useEffect(() => {
        if (lastClickedKey) {
            const timer = setTimeout(() => {
                setLastClickedKey(null);
            }, 100); // Flash duration (100ms)
            return () => clearTimeout(timer);
        }
    }, [lastClickedKey]);
    
    // --- Dynamic Length Panel Logic ---
    useEffect(() => {
        setLengths(currentLengths => {
            const newLength = parseInt(numberOfLengths, 10);
            const oldLength = currentLengths.length;
            if (newLength > oldLength) {
                const newItems = Array.from({ length: newLength - oldLength }, (_, i) => ({
                    id: oldLength + i,
                    int: lengthIntegerData[0],
                    dec: lengthDecimalData[0],
                    isLocked: false,
                }));
                return [...currentLengths, ...newItems];
            } else if (newLength < oldLength) {
                const lengthsToReset = currentLengths.slice(newLength);
                const newRecordedData = { ...recordedData };
                lengthsToReset.forEach(lenObj => {
                    const lVal = lenObj.int + lenObj.dec;
                    Object.keys(newRecordedData).forEach(key => {
                        if (key.startsWith(`${selectedThickness}-${lVal}-`)) {
                            delete newRecordedData[key];
                        }
                    });
                });
                setRecordedData(newRecordedData);
                return currentLengths.slice(0, newLength);
            }
            return currentLengths;
        });
    }, [numberOfLengths, lengthIntegerData, lengthDecimalData, selectedThickness]);

    // --- Event Handlers ---
    const handleThicknessLock = () => {
        const newLockState = !isThicknessLocked;
        setIsThicknessLocked(newLockState);
        if (!newLockState) {
            // If unlocking thickness, reset everything below it
            setIsLengthCountLocked(false);
            setLengths(Array.from({ length: numberOfLengths }, (_, i) => ({
                id: i,
                int: lengthIntegerData[i * 3],
                dec: lengthDecimalData[0],
                isLocked: false,
            })));
            setRecordedData({});
            setIncrementHistory([]);
        }
    };
    
    const handleLengthCountLock = () => {
        const newLockState = !isLengthCountLocked;
        setIsLengthCountLocked(newLockState);
        if (!newLockState) {
            // If unlocking length count, reset all length data and unlock panels
            setRecordedData({});
            setIncrementHistory([]);
            setLengths(currentLengths => 
                currentLengths.map(l => ({ ...l, isLocked: false }))
            );
        }
    };

    const handleLengthChange = (id, part, value) => {
        setLengths(currentLengths =>
            currentLengths.map(len => {
                if (len.id === id) {
                    return { ...len, [part]: value };
                }
                return len;
            })
        );
    };
    
    const handleLockChange = (id) => {
        setLengths(currentLengths =>
            currentLengths.map(len =>
                len.id === id ? { ...len, isLocked: !len.isLocked } : len
            )
        );
    };

    const handleIncrement = (length, width) => {
        const key = `${selectedThickness}-${length}-${width}`;
        setLastClickedKey(key); // Trigger the flash effect
        const newData = { ...recordedData, [key]: (recordedData[key] || 0) + 1 };
        setRecordedData(newData);
        setIncrementHistory(prev => [...prev, key]);
        setEntryHistory(prev => [...prev, { key, quantity: 1 }]); // Log the entry
        localStorage.setItem('singleLengthLocalData', JSON.stringify(newData));
    };

    const handleUndo = () => {
        if (incrementHistory.length === 0) return alert("No action to undo.");
        
        const lastKey = incrementHistory.pop();
        const currentCount = recordedData[lastKey];

        if (currentCount > 0) {
            const newData = { ...recordedData, [lastKey]: currentCount - 1 };
            if (newData[lastKey] === 0) delete newData[lastKey];
            setRecordedData(newData);
            // Also remove from log history
            setEntryHistory(prev => prev.slice(0, prev.length - 1));
            localStorage.setItem('singleLengthLocalData', JSON.stringify(newData));
        }
        setIncrementHistory([...incrementHistory]);
    };

    const handleReset = () => {
        if (window.confirm("Are you sure you want to clear all current entries?")) {
            setRecordedData({});
            setIncrementHistory([]);
            setEntryHistory([]);
            localStorage.removeItem('singleLengthLocalData');
            alert("Current session has been cleared.");
        }
    };
    
    // Show format selection modal instead of directly generating
    const handleFinish = () => {
        if (Object.keys(recordedData).length === 0) {
            alert("No data recorded to generate a report.");
            return;
        }
        setShowFormatModal(true);
    };

    // Actually generate and save report with selected format
    const generateReportWithFormat = async (format) => {
        setShowFormatModal(false);
        
        if (format === 'basic') {
            generateBasicFormatXLSX(recordedData, reportFileName);
        } else if (format === 'seller') {
            generateSellerFormatXLSX(recordedData, reportFileName, sellerName);
        }

        const logFileName = `${reportFileName.replace('.xlsx', '')}.txt`;
        let logContent = `SESSION LOG: ${logFileName}\n=============================\n`;
        if (sessionInfo) {
            logContent += `Vehicle: ${sessionInfo.vehicleNumber}\n`;
            if (sessionInfo.note) logContent += `Note: ${sessionInfo.note}\n`;
        }
        logContent += `Format: ${format === 'seller' ? 'Seller Format' : 'Basic Format'}\n`;
        if (format === 'seller' && sellerName) {
            logContent += `Seller Name: ${sellerName}\n`;
        }
        logContent += `\n`;
        entryHistory.forEach((entry, index) => {
            const [t, l, w] = entry.key.split('-');
            logContent += `Entry ${index + 1}: T:${t}, L:${l}, W:${w}, Qty: ${entry.quantity}\n`;
        });

        try {
            await api.post('/reports', { 
                reportData: recordedData, 
                fileName: reportFileName,
                vehicleNumber: sessionInfo?.vehicleNumber || null,
                note: sessionInfo?.note || null
            });
             await api.post('/logs', { logContent, logName: logFileName });
            alert("Report and log saved successfully!");
        } catch (error) {
            console.error("Failed to save report or log:", error);
            
            // Save offline if network fails
            if (!navigator.onLine || error.message?.includes('Network')) {
                try {
                    await offlineSync.saveOfflineReport({
                        reportData: recordedData,
                        fileName: reportFileName,
                        vehicleNumber: sessionInfo?.vehicleNumber || null,
                        note: sessionInfo?.note || null
                    });
                    await offlineSync.saveOfflineLog({
                        logContent,
                        logName: logFileName
                    });
                    await offlineSync.requestBackgroundSync();
                    alert("You're offline. Report saved locally and will sync when connected!");
                } catch (offlineError) {
                    console.error("Failed to save offline:", offlineError);
                    alert("Failed to save the report or log.");
                }
            } else {
                alert("Failed to save the report or log.");
            }
        }
        
        const today = new Date().toLocaleDateString();
        const counter = parseInt(localStorage.getItem('dailySingleLengthReportCounter') || '0', 10) + 1;
        localStorage.setItem('lastSingleLengthReportDate', today);
        localStorage.setItem('dailySingleLengthReportCounter', counter);
        
        setRecordedData({});
        setIncrementHistory([]);
        setEntryHistory([]);
        setSellerName('');
        localStorage.removeItem('singleLengthLocalData');
        // Filename will auto-regenerate via useEffect when recordedData changes
    };
    
    // Basic Format - Original format
    const generateBasicFormatXLSX = (data, fileName) => {
        const wb = XLSX.utils.book_new();

        const processSheetData = (sheetData, thickness) => {
            const allLengths = Object.keys(sheetData).sort((a, b) => parseFloat(a) - parseFloat(b));
            const allWidths = new Set();
            allLengths.forEach(l => Object.keys(sheetData[l]).forEach(w => allWidths.add(w)));
            const sortedWidths = Array.from(allWidths).sort((a, b) => parseFloat(a) - parseFloat(b));
            
            let matrix = [];
            
            // Add session info at top of sheet
            if (sessionInfo) {
                matrix.push([`Vehicle No: ${sessionInfo.vehicleNumber}`]);
                if (sessionInfo.note) {
                    matrix.push([`Note: ${sessionInfo.note}`]);
                }
                matrix.push([]); // Empty row for spacing
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

    // Seller Format - As per the seller report format with styling
    const generateSellerFormatXLSX = (data, fileName, sellerNameValue) => {
        const wb = XLSXStyle.utils.book_new();

        // Style definitions
        const borderStyle = {
            top: { style: "thin", color: { rgb: "000000" } },
            bottom: { style: "thin", color: { rgb: "000000" } },
            left: { style: "thin", color: { rgb: "000000" } },
            right: { style: "thin", color: { rgb: "000000" } }
        };

        const processSellerSheetData = (sheetData, thickness) => {
            const allLengths = Object.keys(sheetData).sort((a, b) => parseFloat(a) - parseFloat(b));
            
            // Get only the widths that have data
            const usedWidths = new Set();
            allLengths.forEach(l => Object.keys(sheetData[l]).forEach(w => usedWidths.add(w)));
            const sortedWidths = Array.from(usedWidths).sort((a, b) => parseFloat(a) - parseFloat(b));
            
            const numDataCols = sortedWidths.length + 2; // SIZE + widths + CFT
            const totalCols = Math.max(numDataCols, 10); // Minimum 10 columns for header section
            
            let wsData = [];
            
            // Row 0: NAME header row with border
            const nameRow = [];
            for (let i = 0; i < totalCols; i++) {
                nameRow.push({ v: '', s: { border: borderStyle, alignment: { horizontal: "center", vertical: "center" } } });
            }
            // Place NAME: near the center
            const nameColStart = Math.floor(totalCols / 2) - 1;
            nameRow[nameColStart] = { v: 'NAME :', s: { border: borderStyle, alignment: { horizontal: "right", vertical: "center" } } };
            nameRow[nameColStart + 1] = { v: sellerNameValue || '', s: { font: { color: { rgb: "FF0000" }, bold: true }, border: borderStyle, alignment: { horizontal: "left", vertical: "center" } } };
            wsData.push(nameRow);
            
            // Row 1: Info headers with borders
            const infoHeaderRow = [];
            for (let i = 0; i < totalCols; i++) {
                infoHeaderRow.push({ v: '', s: { border: borderStyle, alignment: { horizontal: "center", vertical: "center" } } });
            }
            infoHeaderRow[0] = { v: 'DATE', s: { font: { color: { rgb: "FF0000" }, bold: true, underline: true }, border: borderStyle, alignment: { horizontal: "center", vertical: "center" } } };
            infoHeaderRow[2] = { v: 'ITEM CODE', s: { font: { color: { rgb: "FF0000" }, bold: true, underline: true }, border: borderStyle, alignment: { horizontal: "center", vertical: "center" } } };
            infoHeaderRow[4] = { v: 'ITEM NAME', s: { font: { color: { rgb: "FF0000" }, bold: true, underline: true }, border: borderStyle, alignment: { horizontal: "center", vertical: "center" } } };
            infoHeaderRow[6] = { v: 'ITEM SIZE', s: { font: { color: { rgb: "FF0000" }, bold: true, underline: true }, border: borderStyle, alignment: { horizontal: "center", vertical: "center" } } };
            infoHeaderRow[8] = { v: 'QTY', s: { font: { color: { rgb: "FF0000" }, bold: true, underline: true }, border: borderStyle, alignment: { horizontal: "center", vertical: "center" } } };
            wsData.push(infoHeaderRow);
            
            // Row 2: Info values with borders
            const today = new Date();
            const dateStr = `${String(today.getDate()).padStart(2, '0')}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getFullYear()).slice(-2)}`;
            const infoValueRow = [];
            for (let i = 0; i < totalCols; i++) {
                infoValueRow.push({ v: '', s: { border: borderStyle, alignment: { horizontal: "center", vertical: "center" } } });
            }
            infoValueRow[0] = { v: dateStr, s: { font: { color: { rgb: "FF0000" }, bold: true }, border: borderStyle, alignment: { horizontal: "center", vertical: "center" } } };
            infoValueRow[2] = { v: '-', s: { border: borderStyle, alignment: { horizontal: "center", vertical: "center" } } };
            infoValueRow[4] = { v: `MANGO PLANKS ${thickness}"`, s: { font: { color: { rgb: "FF0000" }, bold: true }, border: borderStyle, alignment: { horizontal: "center", vertical: "center" } } };
            infoValueRow[6] = { v: '-', s: { font: { color: { rgb: "FF0000" } }, border: borderStyle, alignment: { horizontal: "center", vertical: "center" } } };
            infoValueRow[8] = { v: '-', s: { font: { color: { rgb: "FF0000" } }, border: borderStyle, alignment: { horizontal: "center", vertical: "center" } } };
            wsData.push(infoValueRow);
            
            // Row 3: Empty row (no border)
            const emptyRow = [];
            for (let i = 0; i < totalCols; i++) emptyRow.push({ v: '', s: {} });
            wsData.push(emptyRow);
            
            // Row 4: Data table header (SIZE | widths | CFT)
            const colHeaderRow = [];
            colHeaderRow.push({ v: 'SIZE', s: { font: { bold: true }, border: borderStyle, alignment: { horizontal: "center", vertical: "center" } } });
            sortedWidths.forEach(w => {
                colHeaderRow.push({ v: parseFloat(w), s: { font: { bold: true }, border: borderStyle, alignment: { horizontal: "center", vertical: "center" } } });
            });
            colHeaderRow.push({ v: 'CFT', s: { font: { bold: true }, border: borderStyle, alignment: { horizontal: "center", vertical: "center" } } });
            // Pad remaining columns
            while (colHeaderRow.length < totalCols) colHeaderRow.push({ v: '', s: {} });
            wsData.push(colHeaderRow);
            
            let grandTotalCFT = 0;
            
            // Data rows with borders
            allLengths.forEach(length => {
                let rowCFT = 0;
                const row = [];
                row.push({ v: parseFloat(length), s: { font: { bold: true, color: { rgb: "FF0000" } }, border: borderStyle, alignment: { horizontal: "center", vertical: "center" } } });
                
                sortedWidths.forEach(width => {
                    const count = sheetData[length]?.[String(width)] || '';
                    row.push({ v: count, s: { border: borderStyle, alignment: { horizontal: "center", vertical: "center" } } });
                    if (count) {
                        const itemCFT = (parseFloat(thickness) * parseFloat(length) * parseFloat(width) * count) / 144;
                        rowCFT += itemCFT;
                    }
                });

                row.push({ v: rowCFT > 0 ? parseFloat(rowCFT.toFixed(4)) : '', s: { border: borderStyle, alignment: { horizontal: "center", vertical: "center" } } });
                grandTotalCFT += rowCFT;
                // Pad remaining columns
                while (row.length < totalCols) row.push({ v: '', s: {} });
                wsData.push(row);
            });
            
            // Add empty rows with borders for grid look
            for (let i = 0; i < 8; i++) {
                const emptyDataRow = [];
                emptyDataRow.push({ v: '', s: { border: borderStyle, alignment: { horizontal: "center", vertical: "center" } } });
                sortedWidths.forEach(() => emptyDataRow.push({ v: '', s: { border: borderStyle, alignment: { horizontal: "center", vertical: "center" } } }));
                emptyDataRow.push({ v: '', s: { border: borderStyle, alignment: { horizontal: "center", vertical: "center" } } });
                while (emptyDataRow.length < totalCols) emptyDataRow.push({ v: '', s: {} });
                wsData.push(emptyDataRow);
            }
            
            // Total row with borders
            const totalRow = [];
            totalRow.push({ v: 'TOTAL', s: { font: { bold: true }, border: borderStyle, alignment: { horizontal: "center", vertical: "center" } } });
            sortedWidths.forEach(() => totalRow.push({ v: '', s: { border: borderStyle, alignment: { horizontal: "center", vertical: "center" } } }));
            totalRow.push({ v: parseFloat(grandTotalCFT.toFixed(4)), s: { font: { bold: true, color: { rgb: "FF0000" } }, border: borderStyle, alignment: { horizontal: "center", vertical: "center" } } });
            while (totalRow.length < totalCols) totalRow.push({ v: '', s: {} });
            wsData.push(totalRow);
            
            // Create worksheet
            const ws = XLSXStyle.utils.aoa_to_sheet(wsData.map(row => row.map(cell => cell.v)));
            
            // Apply styles to all cells
            wsData.forEach((row, rowIdx) => {
                row.forEach((cell, colIdx) => {
                    const cellRef = XLSXStyle.utils.encode_cell({ r: rowIdx, c: colIdx });
                    if (ws[cellRef]) {
                        ws[cellRef].s = cell.s;
                    } else {
                        // Create cell if it doesn't exist
                        ws[cellRef] = { v: cell.v, s: cell.s };
                    }
                });
            });
            
            // Set column widths
            ws['!cols'] = [];
            for (let i = 0; i < totalCols; i++) {
                if (i === 0) ws['!cols'].push({ wch: 10 }); // SIZE/DATE column
                else if (i === numDataCols - 1) ws['!cols'].push({ wch: 12 }); // CFT column
                else ws['!cols'].push({ wch: 8 }); // Other columns
            }
            
            // Set row heights
            ws['!rows'] = wsData.map(() => ({ hpt: 22 }));
            
            return ws;
        };

        // Group data by thickness
        const groupedByThickness = {};
        for (const key in data) {
            const [t, l, w] = key.split('-');
            const count = data[key];
            if (!groupedByThickness[t]) groupedByThickness[t] = {};
            if (!groupedByThickness[t][l]) groupedByThickness[t][l] = {};
            groupedByThickness[t][l][w] = count;
        }

        for (const thickness in groupedByThickness) {
            const ws = processSellerSheetData(groupedByThickness[thickness], thickness);
            XLSXStyle.utils.book_append_sheet(wb, ws, `Thickness ${thickness}`);
        }
        
        XLSXStyle.writeFile(wb, fileName);
    };
    
    // --- FIX: Add a loading state if user is not yet loaded ---
    if (!user) {
        return <div className="p-8 max-w-full mx-auto text-center">Loading...</div>;
    }

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
                        {sessionInfo && (
                            <div className="mt-1 text-sm text-gray-600">
                                <span className="font-semibold">🚛 {sessionInfo.vehicleNumber}</span>
                                {sessionInfo.note && <span className="ml-2">| {sessionInfo.note}</span>}
                            </div>
                        )}
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
                                value={selectedThickness}
                                onChange={(e) => setSelectedThickness(parseFloat(e.target.value))}
                                disabled={isThicknessLocked}
                                className="p-2 border rounded-lg w-full"
                            >
                                {thicknessData.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                            <button onClick={handleThicknessLock} className={`py-2 px-3 rounded-lg text-white flex items-center justify-center w-28 transition-colors text-sm font-semibold ${isThicknessLocked ? 'bg-red-500' : 'bg-green-500'}`}>
                                <LockIcon locked={isThicknessLocked} /> {isThicknessLocked ? 'Unlock' : 'Lock'}
                            </button>
                        </div>
                        
                        {/* Number of Lengths */}
                        {isThicknessLocked && (
                            <div className="flex items-center space-x-2">
                                <label className="font-semibold w-24">Lengths:</label>
                                <select
                                    value={numberOfLengths}
                                    onChange={(e) => setNumberOfLengths(e.target.value)}
                                    disabled={!isThicknessLocked || isLengthCountLocked}
                                    className="p-2 border rounded-lg w-full disabled:bg-gray-200"
                                >
                                    {lengthCountOptions.map(n => <option key={n} value={n}>{n}</option>)}
                                </select>
                                <button onClick={handleLengthCountLock} disabled={!isThicknessLocked} className={`py-2 px-3 rounded-lg text-white flex items-center justify-center w-28 transition-colors text-sm font-semibold ${isLengthCountLocked ? 'bg-red-500' : 'bg-green-500'} disabled:bg-gray-400`}>
                                    <LockIcon locked={isLengthCountLocked} /> {isLengthCountLocked ? 'Unlock' : 'Lock'}
                                </button>
                            </div>
                        )}

                        {/* Dynamic Length Selectors */}
                        {isThicknessLocked && isLengthCountLocked && lengths.map((len, index) => (
                            <div key={len.id} className="flex items-center space-x-2 md:col-span-1">
                                <label className="font-semibold w-24">Length {index + 1}:</label>
                                <select
                                    value={len.int}
                                    onChange={(e) => handleLengthChange(len.id, 'int', parseInt(e.target.value))}
                                    disabled={len.isLocked}
                                    className="p-2 border rounded-lg w-full disabled:bg-gray-200"
                                >
                                    {lengthIntegerData.map(l => <option key={`l${index}-${l}`} value={l}>{l}</option>)}
                                </select>
                                <select
                                    value={len.dec}
                                    onChange={(e) => handleLengthChange(len.id, 'dec', parseFloat(e.target.value))}
                                    disabled={len.isLocked}
                                    className="p-2 border rounded-lg w-full disabled:bg-gray-200"
                                >
                                    {lengthDecimalData.map(d => <option key={`d${index}-${d}`} value={d}>{d}</option>)}
                                </select>
                                <button onClick={() => handleLockChange(len.id)} className={`py-2 px-3 rounded-lg text-white flex items-center justify-center w-28 transition-colors text-sm font-semibold ${len.isLocked ? 'bg-red-500' : 'bg-green-500'}`}>
                                    <LockIcon locked={len.isLocked} /> {len.isLocked ? 'Unlock' : 'Lock'}
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Counter Grids */}
                <div className="space-y-4">
                    {isThicknessLocked && isLengthCountLocked && lengths.map((len, index) => {
                        if (len.isLocked) {
                            return (
                                <CounterGrid 
                                    key={len.id}
                                    length={len.int + len.dec}
                                    widthData={widthData} 
                                    thickness={selectedThickness}
                                    onIncrement={handleIncrement} 
                                    recordedData={recordedData} 
                                    cft={lengthCFTs[index]}
                                    lastClickedKey={lastClickedKey}
                                />
                            );
                        }
                        return null;
                    })}
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

            {/* Report Format Selection Modal */}
            {showFormatModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md mx-4">
                        <h2 className="text-xl font-bold text-gray-800 mb-4 text-center">Select Report Format</h2>
                        
                        <div className="space-y-4">
                            {/* Basic Format Option */}
                            <button 
                                onClick={() => generateReportWithFormat('basic')}
                                className="w-full p-4 border-2 border-blue-500 rounded-lg hover:bg-blue-50 transition-colors text-left"
                            >
                                <div className="flex items-center">
                                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
                                        <span className="text-2xl">📊</span>
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-800">Basic Format</h3>
                                        <p className="text-sm text-gray-500">Standard format with L/W grid and CFT totals</p>
                                    </div>
                                </div>
                            </button>

                            {/* Seller Format Option */}
                            <div className="border-2 border-green-500 rounded-lg p-4">
                                <div className="flex items-center mb-3">
                                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mr-4">
                                        <span className="text-2xl">🏪</span>
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-800">Seller Format</h3>
                                        <p className="text-sm text-gray-500">With seller name, date, and item details</p>
                                    </div>
                                </div>
                                <div className="mt-3">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Seller/Party Name
                                    </label>
                                    <input
                                        type="text"
                                        value={sellerName}
                                        onChange={(e) => setSellerName(e.target.value.toUpperCase())}
                                        placeholder="e.g., SHREE BALAJI ART AND CRAFTS"
                                        className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                                    />
                                </div>
                                <button 
                                    onClick={() => generateReportWithFormat('seller')}
                                    className="w-full mt-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold transition-colors"
                                >
                                    Generate Seller Format
                                </button>
                            </div>
                        </div>

                        {/* Cancel Button */}
                        <button 
                            onClick={() => setShowFormatModal(false)}
                            className="w-full mt-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}