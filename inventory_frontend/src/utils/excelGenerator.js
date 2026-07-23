import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

/**
 * Standardized Excel Exporter
 * 
 * @param {Object} options
 * @param {string} [options.title] - Main report title (e.g. "SALES REPORT")
 * @param {string} [options.subtitle] - Subtitle / Filters info (e.g. "Party: All | Date: Jan 2026")
 * @param {string} [options.sheetName="Report"] - Excel worksheet tab name
 * @param {Array<Object>} options.rows - Data array of row objects
 * @param {string} options.fileName - Destination .xlsx file name
 * @param {Object} [options.summaryRow] - Optional custom summary/total row object
 * @param {boolean} [options.includeTotals=true] - Auto calculate totals row for numeric columns
 */
export async function exportToFormattedExcel({
    title,
    subtitle,
    sheetName = "Report",
    rows = [],
    fileName = "report.xlsx",
    summaryRow = null,
    includeTotals = true,
}) {
    if (!rows || rows.length === 0) {
        console.warn("exportToFormattedExcel: No data rows provided");
        return;
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(sheetName);

    const headers = Object.keys(rows[0]);
    const numCols = headers.length;

    let currentRowIdx = 1;

    // 1. Title Banner
    if (title) {
        worksheet.mergeCells(currentRowIdx, 1, currentRowIdx, numCols);
        const titleCell = worksheet.getCell(currentRowIdx, 1);
        titleCell.value = title.toUpperCase();
        titleCell.font = { name: "Calibri", size: 16, bold: true, color: { argb: "FFFFFFFF" } };
        titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E3A8A" } }; // Deep Navy
        titleCell.alignment = { horizontal: "center", vertical: "middle" };
        worksheet.getRow(currentRowIdx).height = 34;
        currentRowIdx++;
    }

    // 2. Subtitle / Filters Banner
    if (subtitle) {
        worksheet.mergeCells(currentRowIdx, 1, currentRowIdx, numCols);
        const subCell = worksheet.getCell(currentRowIdx, 1);
        subCell.value = subtitle;
        subCell.font = { name: "Calibri", size: 10, italic: true, color: { argb: "FFF8FAFC" } };
        subCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2563EB" } }; // Blue accent
        subCell.alignment = { horizontal: "center", vertical: "middle" };
        worksheet.getRow(currentRowIdx).height = 22;
        currentRowIdx++;
    }

    // 3. Blank separator row if title/subtitle exists
    if (title || subtitle) {
        worksheet.getRow(currentRowIdx).height = 10;
        currentRowIdx++;
    }

    const headerRowIdx = currentRowIdx;

    // 4. Table Header Row
    const headerRow = worksheet.getRow(headerRowIdx);
    headerRow.height = 26;
    headers.forEach((h, colIdx) => {
        const cell = headerRow.getCell(colIdx + 1);
        cell.value = h;
        cell.font = { name: "Calibri", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E293B" } }; // Dark Slate
        cell.alignment = { horizontal: "center", vertical: "middle" };
        cell.border = {
            top: { style: "medium", color: { argb: "FF0F172A" } },
            left: { style: "thin", color: { argb: "FF475569" } },
            bottom: { style: "medium", color: { argb: "FF0F172A" } },
            right: { style: "thin", color: { argb: "FF475569" } },
        };
    });

    currentRowIdx++;
    const dataStartRowIdx = currentRowIdx;

    // Helper to determine alignment & numeric format based on column name
    const getColumnSpec = (colName) => {
        const lower = colName.toLowerCase();
        const isCurrency = lower.includes("price") || lower.includes("cost") || lower.includes("amount") || lower.includes("₹");
        const isQuantity = lower.includes("quantity") || lower.includes("weight") || lower.includes("mt") || lower.includes("tons") || lower.includes("(t)");
        const isNumeric = isCurrency || isQuantity;
        
        const isCenter = lower.includes("date") || lower.includes("time") || lower.includes("unit") || lower.includes("vehicle") || lower.includes("status");

        let align = "left";
        if (isNumeric) align = "right";
        else if (isCenter) align = "center";

        let numFmt = undefined;
        if (isCurrency) numFmt = '"₹"#,##0.00';
        else if (isQuantity) numFmt = '#,##0.00';

        return { align, isNumeric, numFmt };
    };

    // Track column widths
    const colMaxWidths = headers.map(h => h.length);

    // Track totals if autoTotals is enabled
    const colTotals = headers.map(() => 0);
    const colHasNumeric = headers.map(() => false);

    // 5. Data Rows
    rows.forEach((rowData, rIndex) => {
        const row = worksheet.getRow(currentRowIdx);
        row.height = 21;
        const isEven = rIndex % 2 === 0;
        const bgArgb = isEven ? "FFFFFFFF" : "FFF8FAFC"; // Subtle zebra striping

        headers.forEach((h, colIdx) => {
            const cell = row.getCell(colIdx + 1);
            let val = rowData[h];

            const spec = getColumnSpec(h);

            // Convert string numbers to real JS numbers for Excel formulas/formatting
            if (val !== null && val !== undefined && val !== "") {
                const strVal = String(val).replace(/,/g, "").replace(/₹/g, "").trim();
                const numVal = parseFloat(strVal);
                
                // If column is designated as numeric or value parses nicely as number
                if (spec.isNumeric && !isNaN(numVal)) {
                    val = numVal;
                    colTotals[colIdx] += numVal;
                    colHasNumeric[colIdx] = true;
                }
            }

            cell.value = val !== undefined && val !== null ? val : "";

            // Format & Alignment
            cell.alignment = {
                vertical: "middle",
                horizontal: spec.align,
            };

            if (typeof val === "number" && spec.numFmt) {
                cell.numFmt = spec.numFmt;
            }

            // Zebra background
            cell.fill = {
                type: "pattern",
                pattern: "solid",
                fgColor: { argb: bgArgb },
            };

            // Gridline border
            cell.border = {
                top: { style: "thin", color: { argb: "FFE2E8F0" } },
                left: { style: "thin", color: { argb: "FFE2E8F0" } },
                bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
                right: { style: "thin", color: { argb: "FFE2E8F0" } },
            };

            // Update width tracker
            const displayStr = typeof val === "number" ? val.toFixed(2) : String(val || "");
            if (displayStr.length > colMaxWidths[colIdx]) {
                colMaxWidths[colIdx] = displayStr.length;
            }
        });

        currentRowIdx++;
    });

    const dataEndRowIdx = currentRowIdx - 1;

    // 6. Summary / Total Row
    if (includeTotals && (summaryRow || colHasNumeric.some(Boolean))) {
        const totalRow = worksheet.getRow(currentRowIdx);
        totalRow.height = 24;

        headers.forEach((h, colIdx) => {
            const cell = totalRow.getCell(colIdx + 1);
            const spec = getColumnSpec(h);

            if (summaryRow && summaryRow[h] !== undefined) {
                cell.value = summaryRow[h];
            } else if (colIdx === 0) {
                cell.value = "TOTAL";
            } else if (colHasNumeric[colIdx]) {
                cell.value = colTotals[colIdx];
            } else {
                cell.value = "";
            }

            cell.font = { name: "Calibri", size: 11, bold: true, color: { argb: "FF0F172A" } };
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFDBEAFE" } }; // Accent soft blue
            cell.alignment = {
                vertical: "middle",
                horizontal: colIdx === 0 ? "left" : spec.align,
            };

            if (typeof cell.value === "number" && spec.numFmt) {
                cell.numFmt = spec.numFmt;
            }

            // Standard accounting border: Thin top border, Double bottom border
            cell.border = {
                top: { style: "thin", color: { argb: "FF64748B" } },
                left: { style: "thin", color: { argb: "FFCBD5E1" } },
                bottom: { style: "double", color: { argb: "FF0F172A" } },
                right: { style: "thin", color: { argb: "FFCBD5E1" } },
            };

            // Update width tracker for totals
            const displayStr = typeof cell.value === "number" ? cell.value.toFixed(2) : String(cell.value || "");
            if (displayStr.length > colMaxWidths[colIdx]) {
                colMaxWidths[colIdx] = displayStr.length;
            }
        });

        currentRowIdx++;
    }

    // 7. Auto Column Widths Calculation with Padding
    worksheet.columns.forEach((col, idx) => {
        const maxLen = colMaxWidths[idx] || 12;
        // Minimum width 14, extra padding +5 to ensure no cramped text
        col.width = Math.min(Math.max(maxLen + 5, 14), 50);
    });

    // 8. Auto Filter on Header Row
    const lastColLetter = String.fromCharCode(64 + numCols);
    worksheet.autoFilter = {
        from: `A${headerRowIdx}`,
        to: `${lastColLetter}${headerRowIdx}`,
    };

    // 9. Freeze View (Keep Title + Table Header pinned on scroll)
    worksheet.views = [
        {
            state: "frozen",
            xSplit: 0,
            ySplit: headerRowIdx,
            showGridLines: true,
        },
    ];

    // 10. Generate and download buffer
    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(
        new Blob([buffer], {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        }),
        fileName
    );
}
