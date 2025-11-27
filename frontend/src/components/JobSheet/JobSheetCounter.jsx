import React, { useState, useMemo, useEffect } from 'react';
import api from '../../api';
import html2pdf from 'html2pdf.js';

// --- Job Sheet Counter Component ---
export default function JobSheetCounter({ product, task, onBack }) {
    const [currentPartIndex, setCurrentPartIndex] = useState(0);
    
    // --- Load data from local storage on init ---
    const [recordedData, setRecordedData] = useState(() => {
        const savedData = localStorage.getItem(`jobSheetData_${task.id}`);
        return savedData ? JSON.parse(savedData) : {};
    }); 
    
    const [incrementHistory, setIncrementHistory] = useState([]);
    const [lastClickedKey, setLastClickedKey] = useState(null);

    const widthData = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    const currentPart = product.parts[currentPartIndex];
    
    // --- Live Calculations for the UI ---
    const { liveCFT, livePcs, targetCFT, targetPcs } = useMemo(() => {
        const partQty = parseFloat(currentPart.qty) || 0;
        const targetPcs = partQty * task.quantity;
        
        let calculatedTargetCFT = 0;
        if (currentPart.cft !== undefined && currentPart.cft !== null && parseFloat(currentPart.cft) > 0) {
            calculatedTargetCFT = parseFloat(currentPart.cft);
        } else {
            const { cft_l, cft_w, cft_t } = currentPart;
            calculatedTargetCFT = ( (parseFloat(cft_l) || 0) * (parseFloat(cft_w) || 0) * (parseFloat(cft_t) || 0) ) / 144;
        }
        
        const totalTargetCFT = calculatedTargetCFT * task.quantity;
        
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
        return { liveCFT, livePcs, targetCFT: totalTargetCFT, targetPcs };
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
    
    // --- UPDATED: Finish Job Handler (Generates Detailed PDF for Email) ---
    const handleFinishJob = async () => {
        if (window.confirm("Are you sure you want to mark this job as complete and email the report?")) {
            try {
                // 1. Calculate ALL Summary Data
                let grandTotalTargetPcs = 0;
                let grandTotalTargetCFT = 0;
                let grandTotalLivePcs = 0;
                let grandTotalLiveCFT = 0;
                
                // Prepare data for rows
                const partsData = product.parts.map((part, idx) => {
                    const partQty = parseFloat(part.qty) || 0;
                    const tPcs = partQty * task.quantity;
                    
                    let tCFT = 0;
                    if (part.cft && parseFloat(part.cft) > 0) {
                         tCFT = parseFloat(part.cft) * task.quantity;
                    } else {
                         tCFT = ((partQty * (parseFloat(part.cft_l)||0) * (parseFloat(part.cft_w)||0) * (parseFloat(part.cft_t)||0)) / 144) * task.quantity;
                    }

                    let lPcs = 0, lCFT = 0;
                    const rawMaterials = [];
                    const prefix = `part_${idx}_`;
                    
                    for(const k in recordedData) {
                         if(k.startsWith(prefix)) {
                             const [_, __, t, l, w] = k.split('_').map(Number);
                             const c = recordedData[k];
                             lPcs += c;
                             lCFT += (t * l * w * c) / 144;
                             rawMaterials.push({ t, l, w, qty: c });
                         }
                    }

                    grandTotalTargetPcs += tPcs;
                    grandTotalTargetCFT += tCFT;
                    grandTotalLivePcs += lPcs;
                    grandTotalLiveCFT += lCFT;

                    return {
                        name: part.part_name,
                        tPcs, lPcs, varPcs: lPcs - tPcs,
                        tCFT, lCFT, varCFT: lCFT - tCFT,
                        rawMaterials
                    };
                });

                const grandVarCFT = grandTotalLiveCFT - grandTotalTargetCFT;
                const getVarColor = (val) => val > 0 ? '#dc2626' : (val < 0 ? '#d97706' : '#374151'); // red, yellow, gray

                // 2. Construct Detailed HTML (Matching CompletedTaskReport.jsx)
                let tableRowsHtml = partsData.map(p => {
                    const rawRows = p.rawMaterials.map(r => `
                        <tr style="background-color: #f9fafb; font-size: 11px; color: #666;">
                            <td style="padding: 4px 8px; border: 1px solid #eee; text-align: center;">${r.t}</td>
                            <td style="padding: 4px 8px; border: 1px solid #eee; text-align: center;">${r.l}</td>
                            <td style="padding: 4px 8px; border: 1px solid #eee; text-align: center;">${r.w}</td>
                            <td style="padding: 4px 8px; border: 1px solid #eee; text-align: center;">${r.qty}</td>
                        </tr>
                    `).join('');

                    const rawTable = p.rawMaterials.length > 0 ? `
                        <tr style="background-color: #f9fafb;">
                            <td colspan="7" style="padding: 5px 10px; border: 1px solid #e5e7eb;">
                                <div style="margin-left: 15px;">
                                    <div style="font-size: 11px; font-weight: bold; margin-bottom: 2px;">Raw Materials Used:</div>
                                    <table style="width: 50%; border-collapse: collapse;">
                                        <thead>
                                            <tr style="background-color: #eee;">
                                                <th style="padding: 2px; font-size: 10px; text-align: center;">Thickness</th>
                                                <th style="padding: 2px; font-size: 10px; text-align: center;">Length</th>
                                                <th style="padding: 2px; font-size: 10px; text-align: center;">Width</th>
                                                <th style="padding: 2px; font-size: 10px; text-align: center;">Qty</th>
                                            </tr>
                                        </thead>
                                        <tbody>${rawRows}</tbody>
                                    </table>
                                </div>
                            </td>
                        </tr>
                    ` : '';

                    return `
                        <tr style="background-color: #fff; border-bottom: 1px solid #e5e7eb;">
                            <td style="padding: 8px; font-weight: bold; border: 1px solid #e5e7eb;">${p.name}</td>
                            <td style="padding: 8px; text-align: right; border: 1px solid #e5e7eb;">${p.tPcs}</td>
                            <td style="padding: 8px; text-align: right; border: 1px solid #e5e7eb;">${p.lPcs}</td>
                            <td style="padding: 8px; text-align: right; border: 1px solid #e5e7eb; color: ${getVarColor(p.varPcs)}; font-weight: bold;">${p.varPcs > 0 ? '+' : ''}${p.varPcs}</td>
                            <td style="padding: 8px; text-align: right; border: 1px solid #e5e7eb;">${p.tCFT.toFixed(2)}</td>
                            <td style="padding: 8px; text-align: right; border: 1px solid #e5e7eb;">${p.lCFT.toFixed(2)}</td>
                            <td style="padding: 8px; text-align: right; border: 1px solid #e5e7eb; color: ${getVarColor(p.varCFT)}; font-weight: bold;">${p.varCFT > 0 ? '+' : ''}${p.varCFT.toFixed(2)}</td>
                        </tr>
                        ${rawTable}
                    `;
                }).join('');

                // --- UPDATED REPORT HTML TO MATCH DOWNLOADED VERSION ---
                const reportHtml = `
                    <div style="padding: 20px; font-family: sans-serif; color: #333; max-width: 1000px; margin: 0 auto;">
                        <h2 style="text-align: center; color: #1f2937; margin-bottom: 5px;">Completed Task Summary</h2>
                        <h3 style="text-align: center; color: #6b7280; font-weight: normal; margin-top: 0; margin-bottom: 20px;">
                            ${product.product_name} <span style="font-size: 0.8em;">(Qty: ${task.quantity})</span>
                        </h3>
                        
                        <!-- Info Grid (Matching CompletedTaskReport) -->
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px;">
                            <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px;">
                                <div style="font-size: 11px; text-transform: uppercase; color: #6b7280; margin-bottom: 5px;">Job Details</div>
                                <div style="margin-bottom: 3px;"><strong>Ref #:</strong> ${task.job_sheet_ref || 'N/A'}</div>
                                <div style="margin-bottom: 3px;"><strong>Contractor:</strong> ${task.contractor_name || 'N/A'}</div>
                                <div><strong>Buyer:</strong> ${task.buyer_name || 'N/A'}</div>
                            </div>
                            <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; text-align: right;">
                                <div style="font-size: 11px; text-transform: uppercase; color: #6b7280; margin-bottom: 5px;">Completion</div>
                                <div style="margin-bottom: 3px;"><strong>Assigned To:</strong> ${task.assigned_to_name || 'Counter'}</div>
                                <div><strong>Date:</strong> ${new Date().toLocaleString()}</div>
                            </div>
                        </div>

                        <!-- Stats Grid (Matching CompletedTaskReport) -->
                        <div style="display: flex; justify-content: space-between; margin-bottom: 25px; text-align: center; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
                            <div style="flex: 1; padding: 15px; background-color: #f9fafb; border-right: 1px solid #e5e7eb;">
                                <div style="font-size: 11px; text-transform: uppercase; color: #6b7280;">Total Target CFT</div>
                                <div style="font-size: 20px; font-weight: bold; color: #111827;">${grandTotalTargetCFT.toFixed(2)}</div>
                            </div>
                            <div style="flex: 1; padding: 15px; background-color: #f9fafb; border-right: 1px solid #e5e7eb;">
                                <div style="font-size: 11px; text-transform: uppercase; color: #6b7280;">Total Used CFT</div>
                                <div style="font-size: 20px; font-weight: bold; color: #111827;">${grandTotalLiveCFT.toFixed(2)}</div>
                            </div>
                            <div style="flex: 1; padding: 15px; background-color: #f9fafb;">
                                <div style="font-size: 11px; text-transform: uppercase; color: #6b7280;">Total Variance</div>
                                <div style="font-size: 20px; font-weight: bold; color: ${getVarColor(grandVarCFT)};">
                                    ${grandVarCFT > 0 ? '+' : ''}${grandVarCFT.toFixed(2)}
                                </div>
                            </div>
                        </div>

                        <!-- Main Table -->
                        <table style="width: 100%; border-collapse: collapse; font-size: 12px; border: 1px solid #e5e7eb;">
                            <thead style="background-color: #e5e7eb;">
                                <tr>
                                    <th style="padding: 10px; text-align: left; border: 1px solid #d1d5db;">Part Name</th>
                                    <th style="padding: 10px; text-align: right; border: 1px solid #d1d5db;">Target Pcs</th>
                                    <th style="padding: 10px; text-align: right; border: 1px solid #d1d5db;">Live Pcs</th>
                                    <th style="padding: 10px; text-align: right; border: 1px solid #d1d5db;">Var Pcs</th>
                                    <th style="padding: 10px; text-align: right; border: 1px solid #d1d5db;">Target CFT</th>
                                    <th style="padding: 10px; text-align: right; border: 1px solid #d1d5db;">Live CFT</th>
                                    <th style="padding: 10px; text-align: right; border: 1px solid #d1d5db;">Var CFT</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${tableRowsHtml}
                            </tbody>
                        </table>
                        
                        <div style="margin-top: 30px; text-align: center; font-size: 11px; color: #9ca3af;">
                            Generated by T-CAL System
                        </div>
                    </div>
                `;
                
                const element = document.createElement('div');
                element.innerHTML = reportHtml;
                document.body.appendChild(element); // Temporarily add to DOM for better rendering
                element.style.width = '1000px'; // Enforce width for desktop-like PDF

                // 3. Generate PDF Blob
                const opt = {
                    margin: 10,
                    filename: `JobSheet_Report_${task.product_name}.pdf`,
                    image: { type: 'jpeg', quality: 0.98 },
                    html2canvas: { scale: 2, useCORS: true },
                    jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
                };

                const blob = await html2pdf().set(opt).from(element).output('blob');
                document.body.removeChild(element); // Clean up

                // 4. Create FormData
                const formData = new FormData();
                formData.append('recordedData', JSON.stringify(recordedData));
                formData.append('pdf', blob, `JobSheet_Report_${task.product_name}.pdf`);

                // 5. Send to Backend
                await api.put(`/tasks/${task.id}/complete`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });

                alert("Job marked as complete and detailed report emailed!");
                
                // Clear local storage
                localStorage.removeItem(`jobSheetData_${task.id}`);
                
                onBack(); 
            } catch (error) {
                console.error("Failed to complete task:", error);
                alert("Failed to complete task (Email might have failed, check server logs).");
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