import React, { useState, useMemo, useEffect, useRef } from 'react';
import api from '../../api';

// --- Job Sheet Counter Component ---
export default function JobSheetCounter({ product, task, onBack }) {
    const [currentPartIndex, setCurrentPartIndex] = useState(0);
    
    // --- MODIFIED: Load data from local storage on init ---
    const [recordedData, setRecordedData] = useState(() => {
        const savedData = localStorage.getItem(`jobSheetData_${task.id}`);
        return savedData ? JSON.parse(savedData) : {};
    }); 
    
    const [incrementHistory, setIncrementHistory] = useState([]);
    const [lastClickedKey, setLastClickedKey] = useState(null);

    const widthData = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    const currentPart = product.parts[currentPartIndex];
    
    // --- Calculations for the current part ---
    const { liveCFT, livePcs, targetCFT, targetPcs } = useMemo(() => {
        const partQty = parseFloat(currentPart.qty) || 0;
        const targetPcs = partQty * task.quantity;
        
        let calculatedTargetCFT = 0;
        if (currentPart.cft !== undefined && currentPart.cft !== null) {
            calculatedTargetCFT = (parseFloat(currentPart.cft) || 0);
        } else {
            const { cft_l, cft_w, cft_t } = currentPart;
            calculatedTargetCFT = ( (parseFloat(cft_l) || 0) * (parseFloat(cft_w) || 0) * (parseFloat(cft_t) || 0) ) / 144;
        }
        
        const targetCFT = calculatedTargetCFT * partQty * task.quantity;
        
        let livePcs = 0;
        let liveCFT = 0;
        const partKeyPrefix = `part_${currentPartIndex}_`;

        for (const key in recordedData) {
            if (key.startsWith(partKeyPrefix)) {
                const [_, _idx, t, l, w] = key.split('_').map(Number);
                const count = recordedData[key];
                livePcs += count;
                liveCFT += (t * l * w * count) / 144;
            }
        }
        return { liveCFT, livePcs, targetCFT, targetPcs };
    }, [recordedData, currentPart, currentPartIndex, task.quantity]);

    // --- Flash Effect Logic ---
    useEffect(() => {
        if (lastClickedKey) {
            const timer = setTimeout(() => setLastClickedKey(null), 100);
            return () => clearTimeout(timer);
        }
    }, [lastClickedKey]);

    // --- Event Handlers ---
    const handleIncrement = (width) => {
        const partLength = parseFloat(currentPart.cft_l) || 0;
        const partThickness = parseFloat(currentPart.cft_t) || 0;
        const key = `part_${currentPartIndex}_${partThickness}_${partLength}_${width}`;
        
        setLastClickedKey(key);
        
        const newData = { ...recordedData, [key]: (recordedData[key] || 0) + 1 };
        setRecordedData(newData);
        setIncrementHistory(prev => [...prev, key]);
        
        // --- MODIFIED: Save to local storage ---
        localStorage.setItem(`jobSheetData_${task.id}`, JSON.stringify(newData));
    };

    const handleUndo = () => {
        if (incrementHistory.length === 0) return alert("No action to undo.");
        const lastKey = incrementHistory.pop();
        const currentCount = recordedData[lastKey];
        if (currentCount > 0) {
            const newData = { ...recordedData, [lastKey]: currentCount - 1 };
            if (newData[lastKey] === 0) delete newData[lastKey];
            setRecordedData(newData);
            
            // --- MODIFIED: Save to local storage ---
            localStorage.setItem(`jobSheetData_${task.id}`, JSON.stringify(newData));
        }
        setIncrementHistory([...incrementHistory]);
    };
    
    const handleNextPart = () => {
        if (currentPartIndex < product.parts.length - 1) {
            setCurrentPartIndex(currentPartIndex + 1);
        }
    };
    
    const handlePrevPart = () => {
        if (currentPartIndex > 0) {
            setCurrentPartIndex(currentPartIndex - 1);
        }
    };
    
    const handleFinishJob = async () => {
        if (window.confirm("Are you sure you want to mark this job as complete?")) {
            try {
                // Send the final recordedData to the backend
                await api.put(`/tasks/${task.id}/complete`, recordedData);
                alert("Job marked as complete!");
                
                // --- MODIFIED: Clear local storage on success ---
                localStorage.removeItem(`jobSheetData_${task.id}`);
                
                onBack(); // Go back to the task list
            } catch (error) {
                console.error("Failed to complete task:", error);
                alert("Failed to complete task.");
            }
        }
    };
    
    const cftColor = liveCFT > targetCFT ? 'text-red-600' : 'text-blue-600';
    const targetCFTDisplay = targetCFT.toFixed(2);
    
    return (
        <div className="p-4 bg-white rounded-lg shadow-xl">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Working on: {product.product_name} (Qty: {task.quantity})</h2>
            <div className="mb-4 p-4 bg-gray-50 rounded-lg border">
                <h3 className="text-xl font-semibold text-indigo-700">Part {currentPartIndex + 1} of {product.parts.length}: {currentPart.part_name}</h3>
                <div className="grid grid-cols-2 gap-4 mt-2 font-mono">
                    <div>
                        <p>Target Pcs: <span className="font-bold">{targetPcs}</span></p>
                        <p>Target CFT: <span className="font-bold">{targetCFTDisplay}</span></p>
                    </div>
                    <div className={`${cftColor}`}>
                        <p>Live Pcs: <span className="font-bold">{livePcs}</span></p>
                        <p>Live CFT: <span className="font-bold">{liveCFT.toFixed(2)} / {targetCFTDisplay}</span></p>
                    </div>
                </div>
            </div>
            
            <div className="overflow-x-auto bg-white p-4 rounded-lg shadow-inner">
                 <div className="flex items-center space-x-4 mb-4">
                    <span className="font-semibold">Thickness:</span>
                    <span className="px-3 py-1 rounded-md bg-indigo-600 text-white font-semibold">{currentPart.cft_t}</span>
                    <span className="font-semibold">Length:</span>
                    <span className="px-3 py-1 rounded-md bg-indigo-600 text-white font-semibold">{currentPart.cft_l}</span>
                </div>
                
                <h4 className="font-semibold mb-2">Select Width to Add:</h4>
                <div className="grid grid-cols-12 gap-2">
                    {widthData.map(w => {
                        const key = `part_${currentPartIndex}_${currentPart.cft_t}_${currentPart.cft_l}_${w}`;
                        const count = recordedData[key] || 0;
                        const isFlashing = lastClickedKey === key;
                        
                        let cellBgClass = 'bg-gray-50'; // Default
                        if (isFlashing) {
                            cellBgClass = liveCFT > targetCFT ? 'bg-red-300' : 'bg-blue-300';
                        } else if (count > 0) {
                            cellBgClass = 'bg-blue-100';
                        }

                        return (
                            <div key={w} className={`p-2 text-center rounded-lg border ${cellBgClass}`}>
                                <div className="font-bold mb-2">{w}</div>
                                <button 
                                    onClick={() => handleIncrement(w)} 
                                    className="w-10 h-10 bg-blue-500 text-white rounded-full text-xl font-bold hover:bg-blue-600 transition-colors flex items-center justify-center mx-auto"
                                >+</button>
                                <span className="text-sm text-gray-600 mt-1 block">{count}</span>
                            </div>
                        )
                    })}
                </div>
            </div>
            
            <div className="flex justify-between items-center mt-8">
                <div>
                    <button onClick={onBack} className="py-2 px-6 bg-gray-500 text-white rounded-lg hover:bg-gray-600">Back to List</button>
                </div>
                <div className="flex gap-4">
                     <button onClick={handleUndo} className="py-2 px-6 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600">Undo</button>
                    <button onClick={handlePrevPart} disabled={currentPartIndex === 0} className="py-2 px-6 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50">Previous Part</button>
                    {currentPartIndex === product.parts.length - 1 ? (
                        <button onClick={handleFinishJob} className="py-2 px-6 bg-green-600 text-white rounded-lg hover:bg-green-700">Finish Job</button>
                    ) : (
                        <button onClick={handleNextPart} className="py-2 px-6 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Next Part</button>
                    )}
                </div>
            </div>
        </div>
    );
};