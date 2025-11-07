import React, { useMemo } from 'react';

// --- Completed Task Report Component ---
export default function CompletedTaskReport({ task, onBack }) {
    
    // This is the core logic to calculate the summary
    const summaryData = useMemo(() => {
        const completedData = task.completed_data || {};
        const productParts = task.parts || [];

        let grandTotalTargetPcs = 0;
        let grandTotalTargetCFT = 0;
        let grandTotalLivePcs = 0;
        let grandTotalLiveCFT = 0;

        const partsSummary = productParts.map((part, index) => {
            const partQty = parseFloat(part.qty) || 0;
            const targetPcs = partQty * task.quantity;
            
            let partTargetCFT = 0;
            if (part.cft !== undefined && part.cft !== null) {
                partTargetCFT = (parseFloat(part.cft) || 0);
            } else {
                partTargetCFT = ( (parseFloat(part.cft_l) || 0) * (parseFloat(part.cft_w) || 0) * (parseFloat(part.cft_t) || 0) ) / 144;
            }
            const targetCFT = partTargetCFT * partQty * task.quantity;

            let livePcs = 0;
            let liveCFT = 0;
            const partKeyPrefix = `part_${index}_`;
            const rawMaterialsUsed = []; // <-- NEW: To store the breakdown

            for (const key in completedData) {
                if (key.startsWith(partKeyPrefix)) {
                    const [_, _idx, t, l, w] = key.split('_').map(Number);
                    const count = completedData[key];
                    livePcs += count;
                    liveCFT += (t * l * w * count) / 144;

                    // --- NEW: Add to the raw materials list ---
                    rawMaterialsUsed.push({
                        key: key,
                        t: t,
                        l: l,
                        w: w,
                        qty: count
                    });
                    // --- END NEW ---
                }
            }

            grandTotalTargetPcs += targetPcs;
            grandTotalTargetCFT += targetCFT;
            grandTotalLivePcs += livePcs;
            grandTotalLiveCFT += liveCFT;

            return {
                part_name: part.part_name,
                targetPcs,
                livePcs,
                variancePcs: livePcs - targetPcs,
                targetCFT: targetCFT.toFixed(2),
                liveCFT: liveCFT.toFixed(2),
                varianceCFT: (liveCFT - targetCFT).toFixed(2),
                rawMaterialsUsed: rawMaterialsUsed // <-- NEW
            };
        });

        const grandTotalVariancePcs = grandTotalLivePcs - grandTotalTargetPcs;
        const grandTotalVarianceCFT = grandTotalLiveCFT - grandTotalTargetCFT;

        return {
            partsSummary,
            grandTotalTargetPcs,
            grandTotalLivePcs,
            grandTotalVariancePcs,
            grandTotalTargetCFT: grandTotalTargetCFT.toFixed(2),
            grandTotalLiveCFT: grandTotalLiveCFT.toFixed(2),
            grandTotalVarianceCFT: grandTotalVarianceCFT.toFixed(2),
        };

    }, [task]);

    const getVarianceColor = (variance) => {
        if (variance > 0) return 'text-red-600 font-bold';
        if (variance < 0) return 'text-yellow-600 font-bold';
        return 'text-gray-700';
    };

    return (
        <div className="p-4 bg-white rounded-lg shadow-xl">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Completed Task Summary</h2>
            <p className="text-lg text-gray-600 mb-4 border-b pb-4">{task.product_name} (Qty: {task.quantity})</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="p-4 bg-gray-50 rounded-lg">
                    <h3 className="text-sm font-medium text-gray-500 uppercase">Assigned To</h3>
                    <p className="text-xl font-semibold text-gray-900">{task.assigned_to_name}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                    <h3 className="text-sm font-medium text-gray-500 uppercase">Completed On</h3>
                    <p className="text-xl font-semibold text-gray-900">{new Date(task.completed_at).toLocaleString()}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 text-center">
                <div className="p-4 bg-gray-50 rounded-lg">
                    <h3 className="text-sm font-medium text-gray-500 uppercase">Total Target CFT</h3>
                    <p className="text-2xl font-bold text-gray-900">{summaryData.grandTotalTargetCFT}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                    <h3 className="text-sm font-medium text-gray-500 uppercase">Total Used CFT</h3>
                    <p className="text-2xl font-bold text-gray-900">{summaryData.grandTotalLiveCFT}</p>

                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                    <h3 className="text-sm font-medium text-gray-500 uppercase">Total Variance</h3>
                    <p className={`text-2xl font-bold ${getVarianceColor(summaryData.grandTotalVarianceCFT)}`}>
                        {summaryData.grandTotalVarianceCFT > 0 ? '+' : ''}{summaryData.grandTotalVarianceCFT}
                    </p>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Part Name</th>
                            <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase">Target Pcs</th>
                            <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase">Live Pcs</th>
                            <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase">Variance</th>
                            <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase">Target CFT</th>
                            <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase">Live CFT</th>
                            <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase">Variance</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {summaryData.partsSummary.map((part, index) => (
                            <React.Fragment key={index}>
                                {/* Main Part Row */}
                                <tr className="bg-white">
                                    <td className="px-3 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{part.part_name}</td>
                                    <td className="px-3 py-3 text-right text-sm text-gray-700">{part.targetPcs}</td>
                                    <td className="px-3 py-3 text-right text-sm text-gray-700">{part.livePcs}</td>
                                    <td className={`px-3 py-3 text-right text-sm ${getVarianceColor(part.variancePcs)}`}>
                                        {part.variancePcs > 0 ? '+' : ''}{part.variancePcs}
                                    </td>
                                    <td className="px-3 py-3 text-right text-sm text-gray-700">{part.targetCFT}</td>
                                    <td className="px-3 py-3 text-right text-sm text-gray-700">{part.liveCFT}</td>
                                    <td className={`px-3 py-3 text-right text-sm ${getVarianceColor(part.varianceCFT)}`}>
                                        {part.varianceCFT > 0 ? '+' : ''}{part.varianceCFT}
                                    </td>
                                </tr>

                                {/* NEW: Raw Materials Breakdown Row */}
                                {part.rawMaterialsUsed.length > 0 && (
                                    <tr className="bg-gray-50">
                                        <td colSpan="7" className="px-3 py-2">
                                            <div className="pl-8">
                                                <h4 className="text-xs font-semibold text-gray-600">Raw Materials Used:</h4>
                                                <table className="min-w-full divide-y divide-gray-200 mt-1">
                                                    <thead className="bg-gray-100">
                                                        <tr>
                                                            <th className="px-2 py-1 text-left text-xs font-medium text-gray-500">Thickness</th>
                                                            <th className="px-2 py-1 text-left text-xs font-medium text-gray-500">Length</th>
                                                            <th className="px-2 py-1 text-left text-xs font-medium text-gray-500">Width</th>
                                                            <th className="px-2 py-1 text-right text-xs font-medium text-gray-500">Qty</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="bg-white divide-y divide-gray-200">
                                                        {part.rawMaterialsUsed.map(raw => (
                                                            <tr key={raw.key}>
                                                                <td className="px-2 py-1 text-sm">{raw.t}</td>
                                                                <td className="px-2 py-1 text-sm">{raw.l}</td>
                                                                <td className="px-2 py-1 text-sm">{raw.w}</td>
                                                                <td className="px-2 py-1 text-right text-sm">{raw.qty}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>
            </div>
            <div className="flex justify-end mt-8">
                <button onClick={onBack} className="py-2 px-6 bg-gray-500 text-white rounded-lg hover:bg-gray-600">Back</button>
            </div>
        </div>
    );
};