import * as XLSX from 'xlsx-js-style';

/**
 * Generates and downloads a beautifully styled Excel file for an Order Assignment.
 * 
 * @param {Object} order - The full order object
 * @param {string} assigneeName - Name of the person assigned
 * @param {string} assignDate - Date of assignment (YYYY-MM-DD)
 * @param {Array} assignments - Array of assigned items: { itemName, itemCode, size, pieces, rate, cbm }
 * @param {string} deliveryDate - Delivery date (YYYY-MM-DD)
 * @param {string} note - Global note for the assignment
 */
export const generateAssignmentExcel = (order, assigneeName, assignDate, assignments, deliveryDate, note) => {
    // 1. Setup the workbook and worksheet
    const wb = XLSX.utils.book_new();
    
    // Header Style Definitions
    const titleStyle = {
        font: { bold: true, sz: 14, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: "EA580C" } }, // Orange-600
        alignment: { horizontal: "center", vertical: "center" }
    };
    
    const infoStyle = {
        font: { bold: true, sz: 10, color: { rgb: "333333" } },
        alignment: { horizontal: "left" }
    };
    
    const bigTextStyle = {
        font: { bold: true, sz: 20, color: { rgb: "000000" } },
        alignment: { horizontal: "center", vertical: "center" }
    };
    
    const addressStyle = {
        font: { sz: 11, color: { rgb: "333333" } },
        alignment: { horizontal: "center", vertical: "center" }
    };
    
    const poStyle = {
        font: { bold: true, sz: 11, color: { rgb: "000000" } },
        alignment: { horizontal: "left", vertical: "center" }
    };
    
    const headerStyle = {
        font: { bold: true, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: "4B5563" } }, // Gray-700
        alignment: { horizontal: "center", vertical: "center" },
        border: {
            top: { style: "thin", color: { rgb: "D1D5DB" } },
            bottom: { style: "thin", color: { rgb: "D1D5DB" } },
            left: { style: "thin", color: { rgb: "D1D5DB" } },
            right: { style: "thin", color: { rgb: "D1D5DB" } }
        }
    };
    
    const cellStyle = {
        font: { sz: 11 },
        alignment: { vertical: "center" },
        border: {
            top: { style: "thin", color: { rgb: "E5E7EB" } },
            bottom: { style: "thin", color: { rgb: "E5E7EB" } },
            left: { style: "thin", color: { rgb: "E5E7EB" } },
            right: { style: "thin", color: { rgb: "E5E7EB" } }
        }
    };

    const cellCenterStyle = { ...cellStyle, alignment: { horizontal: "center", vertical: "center" } };
    
    const totalRowStyle = {
        font: { bold: true, sz: 12 },
        fill: { fgColor: { rgb: "FEF3C7" } }, // Amber-100
        alignment: { horizontal: "center", vertical: "center" },
        border: {
            top: { style: "medium", color: { rgb: "9CA3AF" } },
            bottom: { style: "medium", color: { rgb: "9CA3AF" } }
        }
    };

    const footerStyle = {
        font: { bold: true, sz: 11, color: { rgb: "333333" } },
        alignment: { horizontal: "left", vertical: "center" }
    };
    
    const signatureStyle = {
        font: { bold: true, sz: 12, color: { rgb: "333333" } },
        alignment: { horizontal: "right", vertical: "bottom" }
    };

    // 2. Build Data Rows
    // Title Rows
    const wsData = [
        [{ v: "PURCHASE ORDER", s: titleStyle }, { v: "", s: titleStyle }, { v: "", s: titleStyle }, { v: "", s: titleStyle }, { v: "", s: titleStyle }, { v: "", s: titleStyle }, { v: "", s: titleStyle }],
        [{ v: "GST IN : 08AFFPJ4990J1Z1", s: infoStyle }, { v: "", s: infoStyle }, { v: "", s: infoStyle }, { v: "", s: infoStyle }, { v: "+91 9166635555", s: { ...infoStyle, alignment: { horizontal: "right" } } }, { v: "", s: infoStyle }, { v: "", s: infoStyle }],
        [{ v: "OSWAL HANDICRAFTS", s: bigTextStyle }, { v: "", s: bigTextStyle }, { v: "", s: bigTextStyle }, { v: "", s: bigTextStyle }, { v: "", s: bigTextStyle }, { v: "", s: bigTextStyle }, { v: "", s: bigTextStyle }],
        [{ v: "G-793, BORANDADA , JODHPUR", s: addressStyle }, { v: "", s: addressStyle }, { v: "", s: addressStyle }, { v: "", s: addressStyle }, { v: "", s: addressStyle }, { v: "", s: addressStyle }, { v: "", s: addressStyle }],
        [{ v: `PO.NO : ${order.order_number}`, s: poStyle }, { v: "", s: poStyle }, { v: "", s: poStyle }, { v: "", s: poStyle }, { v: `DATE : ${new Date(assignDate).toLocaleDateString('en-GB')}`, s: { ...poStyle, alignment: { horizontal: "right" } } }, { v: "", s: poStyle }, { v: "", s: poStyle }],
        [{ v: `SUPPLIER NAME : ${assigneeName}`, s: poStyle }, { v: "", s: poStyle }, { v: "", s: poStyle }, { v: "", s: poStyle }, { v: "", s: poStyle }, { v: "", s: poStyle }, { v: "", s: poStyle }],
        [], // Empty row separator
        // Table Headers
        [
            { v: "S.No", s: headerStyle },
            { v: "Item Name", s: headerStyle },
            { v: "Item Code", s: headerStyle },
            { v: "Size", s: headerStyle },
            { v: "Assigned Pcs", s: headerStyle },
            { v: "Rate", s: headerStyle },
            { v: "Amount", s: headerStyle }
        ]
    ];

    // Filter out items that have 0 pieces assigned
    const validAssignments = assignments.filter(a => parseInt(a.pieces || 0) > 0);
    
    let totalPcs = 0;
    let totalAmount = 0;

    // Table Data Rows
    validAssignments.forEach((item, index) => {
        const pcs = parseInt(item.pieces || 0);
        const rate = parseFloat(item.rate || 0);
        const amount = pcs * rate;
        
        totalPcs += pcs;
        totalAmount += amount;

        wsData.push([
            { v: index + 1, s: cellCenterStyle },
            { v: item.itemName || '-', s: cellStyle },
            { v: item.itemCode || '-', s: cellCenterStyle },
            { v: item.size || '-', s: cellCenterStyle },
            { v: pcs, t: 'n', s: cellCenterStyle },
            { v: rate, t: 'n', s: cellCenterStyle },
            { v: amount, t: 'n', s: cellCenterStyle }
        ]);
    });

    // Total Row
    wsData.push([
        { v: "TOTAL", s: totalRowStyle },
        { v: "", s: totalRowStyle },
        { v: "", s: totalRowStyle },
        { v: "", s: totalRowStyle },
        { v: totalPcs, t: 'n', s: totalRowStyle },
        { v: "", s: totalRowStyle },
        { v: totalAmount, t: 'n', s: totalRowStyle }
    ]);
    
    const totalRowIndex = wsData.length - 1;

    // Footer Rows
    wsData.push([]); // Empty row separator
    const footerRowStart = wsData.length;

    const formattedDeliveryDate = deliveryDate ? new Date(deliveryDate).toLocaleDateString('en-GB') : '-';
    
    wsData.push([
        { v: `Delivery Date : ${formattedDeliveryDate}`, s: footerStyle }, {v:""}, {v:""}, {v:""}, {v:""}, {v:""}, {v:""}
    ]);
    wsData.push([
        { v: `Note : ${note || '-'}`, s: footerStyle }, {v:""}, {v:""}, {v:""}, { v: "AUTHORIZED SIGNATURE", s: signatureStyle }, {v:""}, {v:""}
    ]);

    // 3. Create Worksheet
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // 4. Merge Cells for Layout
    ws["!merges"] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 6 } }, // Merge Title
        { s: { r: 1, c: 0 }, e: { r: 1, c: 3 } }, // Merge GST
        { s: { r: 1, c: 4 }, e: { r: 1, c: 6 } }, // Merge Phone
        { s: { r: 2, c: 0 }, e: { r: 2, c: 6 } }, // Merge OSWAL HANDICRAFTS
        { s: { r: 3, c: 0 }, e: { r: 3, c: 6 } }, // Merge Address
        { s: { r: 4, c: 0 }, e: { r: 4, c: 3 } }, // Merge PO.NO
        { s: { r: 4, c: 4 }, e: { r: 4, c: 6 } }, // Merge DATE
        { s: { r: 5, c: 0 }, e: { r: 5, c: 6 } }, // Merge SUPPLIER NAME
        { s: { r: totalRowIndex, c: 0 }, e: { r: totalRowIndex, c: 3 } }, // Merge TOTAL label
        { s: { r: footerRowStart, c: 0 }, e: { r: footerRowStart, c: 3 } }, // Merge Delivery Date
        { s: { r: footerRowStart + 1, c: 0 }, e: { r: footerRowStart + 1, c: 3 } }, // Merge Note
        { s: { r: footerRowStart + 1, c: 4 }, e: { r: footerRowStart + 1, c: 6 } }, // Merge Auth Signature
    ];

    // 5. Define Column Widths
    ws["!cols"] = [
        { wch: 6 },  // S.No
        { wch: 30 }, // Item Name
        { wch: 15 }, // Item Code
        { wch: 20 }, // Size
        { wch: 15 }, // Assigned Pcs
        { wch: 10 }, // Rate
        { wch: 15 }  // Amount
    ];

    XLSX.utils.book_append_sheet(wb, ws, "Assignment Details");

    // 6. Generate and Download
    const fileName = `Order_${order.order_number}_${assigneeName.replace(/\s+/g, '_')}.xlsx`;
    XLSX.writeFile(wb, fileName);
};
