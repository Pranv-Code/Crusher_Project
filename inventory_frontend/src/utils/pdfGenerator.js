import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

// ── Common Formatting Helpers ────────────────────────────────────────────────
const fmtNum = (v) => Number(v || 0).toFixed(2);
const fmtDate = (d) => d ? d : "All time";

// ── Draw Report Header ───────────────────────────────────────────────────────
const drawReportHeader = (doc, title, filterText) => {
    // Brand header banner
    doc.setFillColor(15, 23, 42); // slate-900 theme (#0f172a)
    doc.rect(0, 0, doc.internal.pageSize.width, 40, "F");
    
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("CRUSHER IMS", 15, 18);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(203, 213, 225);
    doc.text("Manager Dashboard Inventory Reports", 15, 24);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 15, 30);
    
    // Page Title
    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.text(title, 15, 52);
    
    // Filters line
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9.5);
    doc.setTextColor(100, 116, 139);
    doc.text(filterText, 15, 58);
};

// ── Draw Common Footer ───────────────────────────────────────────────────────
const drawReportFooters = (doc) => {
    const pageCount = doc.internal.getNumberOfPages();
    const width = doc.internal.pageSize.width;
    const height = doc.internal.pageSize.height;
    
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        
        // Horizontal footer divider line
        doc.setDrawColor(241, 245, 249);
        doc.line(15, height - 15, width - 15, height - 15);
        
        doc.text("Confidential Management Report - Crusher IMS", 15, height - 9);
        
        const pageStr = `Page ${i} of ${pageCount}`;
        doc.text(pageStr, width - 15 - doc.getTextWidth(pageStr), height - 9);
    }
};

// ── KPI Row Block Helpers ────────────────────────────────────────────────────
const drawKPIs = (doc, items) => {
    const boxX = 15;
    const boxY = 64;
    const boxWidth = doc.internal.pageSize.width - 30;
    const boxHeight = 22;
    
    // Draw Box background
    doc.setFillColor(248, 250, 252); // slate-50
    doc.rect(boxX, boxY, boxWidth, boxHeight, "F");
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.rect(boxX, boxY, boxWidth, boxHeight, "S");
    
    const count = items.length;
    const colWidth = boxWidth / count;
    
    items.forEach((item, index) => {
        const itemX = boxX + (index * colWidth) + (colWidth / 2);
        
        // KPI Title
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(100, 116, 139); // slate-500
        doc.text(item.label, itemX - (doc.getTextWidth(item.label) / 2), boxY + 7);
        
        // KPI Value
        doc.setFontSize(12);
        doc.setTextColor(item.color || "#0f172a");
        doc.text(String(item.value), itemX - (doc.getTextWidth(String(item.value)) / 2), boxY + 16);
    });
};

// ── 1. Sales Report PDF ──────────────────────────────────────────────────────
export const generateSalesReportPdf = (filteredData, filters, unit = "tons") => {
    const doc = new jsPDF({ orientation: "p", unit: "mm", format: "a4", compress: true });
    const filterText = `Filters: From ${fmtDate(filters.dateFrom)} to ${fmtDate(filters.dateTo)} | Month: ${filters.month || "Any"} | Party: ${filters.party || "All"} | Vehicle: ${filters.vehicle || "All"}`;
    
    drawReportHeader(doc, `Sales Performance Summary Report (${unit.toUpperCase()})`, filterText);
    
    const multiplier = unit === "brass" ? 4.2 : 1.0;
    const totalQty = filteredData.reduce((s, r) => s + parseFloat(r.quantity_tons || 0), 0) * multiplier;
    
    drawKPIs(doc, [
        { label: "Total Entries", value: filteredData.length, color: "#2563eb" },
        { label: unit === "brass" ? "Brass Sold" : "Tons Sold", value: fmtNum(totalQty), color: "#16a34a" }
    ]);
    
    const qtyHeader = unit === "brass" ? "Quantity (Brass)" : "Quantity (Tons)";
    const tableColumns = ["#", "Date", "Party", "Product", "Vehicle", qtyHeader, "Site", "Price", "Remarks"];
    const tableRows = filteredData.map((s, i) => [
        i + 1,
        s.sales_date,
        s.party_name,
        s.product_name,
        s.vehicle_number || "—",
        fmtNum(s.quantity_tons * multiplier),
        s.site || "—",
        s.price || "—",
        s.remarks || "—"
    ]);
    
    autoTable(doc, {
        startY: 92,
        head: [tableColumns],
        body: tableRows,
        theme: "striped",
        headStyles: { fillColor: [15, 23, 42], fontSize: 8, fontStyle: "bold" },
        bodyStyles: { fontSize: 8 },
        columnStyles: {
            0: { cellWidth: 8 },
            1: { cellWidth: 20 },
            5: { cellWidth: 22, halign: "right" },
            7: { cellWidth: 15, halign: "right" }
        },
        margin: { top: 92, bottom: 20 }
    });
    
    drawReportFooters(doc);
    doc.save(`sales_report_${new Date().toISOString().split("T")[0]}.pdf`);
};

// ── 2. Production Report PDF ─────────────────────────────────────────────────
export const generateProductionReportPdf = (filteredData, filters, unit = "tons") => {
    const doc = new jsPDF({ orientation: "p", unit: "mm", format: "a4", compress: true });
    const filterText = `Filters: From ${fmtDate(filters.dateFrom)} to ${fmtDate(filters.dateTo)} | Month: ${filters.month || "Any"} | Product: ${filters.product || "All"}`;
    
    drawReportHeader(doc, `Production output & Cost Report (${unit.toUpperCase()})`, filterText);
    
    const multiplier = unit === "brass" ? 4.2 : 1.0;
    const totalQty = filteredData.reduce((s, r) => s + parseFloat(r.quantity_tons || 0), 0) * multiplier;
    const totalCost = filteredData.reduce((s, r) => s + parseFloat(r.production_cost || 0), 0);
    const avgCost = filteredData.length ? totalCost / filteredData.length : 0;
    
    drawKPIs(doc, [
        { label: "Production Entries", value: filteredData.length, color: "#2563eb" },
        { label: unit === "brass" ? "Quantity Produced (Brass)" : "Quantity Produced (Tons)", value: fmtNum(totalQty), color: "#16a34a" },
        { label: "Total Cost ($)", value: `$${fmtNum(totalCost)}`, color: "#ea580c" },
        { label: "Avg Cost / Entry", value: `$${fmtNum(avgCost)}`, color: "#7c3aed" }
    ]);
    
    const qtyHeader = unit === "brass" ? "Quantity (Brass)" : "Quantity (Tons)";
    const tableColumns = ["#", "Date", "Product", qtyHeader, "Unit", "Production Cost ($)"];
    const tableRows = filteredData.map((p, i) => [
        i + 1,
        p.production_date,
        p.product_name,
        fmtNum(p.quantity_tons * multiplier),
        unit === "brass" ? "brass" : p.unit,
        `$${fmtNum(p.production_cost)}`
    ]);
    
    autoTable(doc, {
        startY: 92,
        head: [tableColumns],
        body: tableRows,
        theme: "striped",
        headStyles: { fillColor: [15, 23, 42], fontSize: 8.5, fontStyle: "bold" },
        bodyStyles: { fontSize: 8.5 },
        columnStyles: {
            0: { cellWidth: 10 },
            3: { halign: "right" },
            5: { halign: "right" }
        },
        margin: { top: 92, bottom: 20 }
    });
    
    drawReportFooters(doc);
    doc.save(`production_report_${new Date().toISOString().split("T")[0]}.pdf`);
};

// ── 3. Party Performance Report PDF ──────────────────────────────────────────
export const generatePartyReportPdf = (partyData, unit = "tons") => {
    const doc = new jsPDF({ orientation: "p", unit: "mm", format: "a4", compress: true });
    const name = partyData.party.party_name;
    const filterText = `Account Statement for Party: ${name} | Contact: ${partyData.party.email || "—"}`;
    
    drawReportHeader(doc, `Party Ledger & Sales Performance Statement (${unit.toUpperCase()})`, filterText);
    
    const multiplier = unit === "brass" ? 4.2 : 1.0;
    const totalQty = partyData.sales.reduce((s, r) => s + parseFloat(r.quantity_tons || 0), 0) * multiplier;
    
    // Find top product name
    const prodMap = {};
    partyData.sales.forEach(s => prodMap[s.product_name] = (prodMap[s.product_name] || 0) + parseFloat(s.quantity_tons || 0));
    const topProduct = Object.entries(prodMap).sort((a,b) => b[1] - a[1])[0]?.[0] || "—";
    
    drawKPIs(doc, [
        { label: "Total Purchases", value: partyData.sales.length, color: "#2563eb" },
        { label: unit === "brass" ? "Brass Acquired" : "Tons Acquired", value: fmtNum(totalQty), color: "#16a34a" },
        { label: "Preferred Product", value: topProduct, color: "#7c3aed" }
    ]);
    
    const qtyHeader = unit === "brass" ? "Quantity (Brass)" : "Quantity (Tons)";
    const tableColumns = ["#", "Date", "Product", "Vehicle", "Vehicle Owner", qtyHeader, "Site", "Price ($)", "Remarks"];
    const tableRows = partyData.sales.map((s, i) => [
        i + 1,
        s.sales_date,
        s.product_name,
        s.vehicle_number || "—",
        s.vehicle_owner || "—",
        fmtNum(s.quantity_tons * multiplier),
        s.site || "—",
        s.price || "—",
        s.remarks || "—"
    ]);
    
    autoTable(doc, {
        startY: 92,
        head: [tableColumns],
        body: tableRows,
        theme: "striped",
        headStyles: { fillColor: [15, 23, 42], fontSize: 8, fontStyle: "bold" },
        bodyStyles: { fontSize: 8 },
        columnStyles: {
            0: { cellWidth: 8 },
            5: { cellWidth: 22, halign: "right" },
            7: { cellWidth: 15, halign: "right" }
        },
        margin: { top: 92, bottom: 20 }
    });
    
    drawReportFooters(doc);
    doc.save(`party_report_${name.replace(/\s/g, "_")}.pdf`);
};

// ── 4. Raw Material Activity Report PDF ──────────────────────────────────────
export const generateRawMaterialReportPdf = (filteredData, filters, unit = "tons") => {
    const doc = new jsPDF({ orientation: "p", unit: "mm", format: "a4", compress: true });
    const filterText = `Filters: From ${fmtDate(filters.dateFrom)} to ${fmtDate(filters.dateTo)} | Month: ${filters.month || "Any"} | Vehicle: ${filters.vehicle || "All"}`;
    
    drawReportHeader(doc, `Raw Material Logistics activity Report (${unit.toUpperCase()})`, filterText);
    
    const multiplier = unit === "brass" ? 4.2 : 1.0;
    const totalNet = filteredData.reduce((s, r) => s + parseFloat(r.net_weight || 0), 0) * multiplier;
    const totalGross = filteredData.reduce((s, r) => s + parseFloat(r.total_weight || 0), 0) * multiplier;
    const avgNet = filteredData.length ? totalNet / filteredData.length : 0;
    
    const unitLabel = unit === "brass" ? "Brass" : "Tons";
    drawKPIs(doc, [
        { label: "Logistics Trips", value: filteredData.length, color: "#2563eb" },
        { label: `Total Net Weight (${unitLabel})`, value: fmtNum(totalNet), color: "#16a34a" },
        { label: `Total Gross Weight (${unitLabel})`, value: fmtNum(totalGross), color: "#ea580c" },
        { label: `Avg Net / Load`, value: fmtNum(avgNet), color: "#7c3aed" }
    ]);
    
    const grossHeader = unit === "brass" ? "Gross Wt (B)" : "Gross Wt (T)";
    const vehHeader = unit === "brass" ? "Vehicle Wt (B)" : "Vehicle Wt (T)";
    const netHeader = unit === "brass" ? "Net Wt (B)" : "Net Wt (T)";
    const tableColumns = ["#", "Date", "Vehicle", "Site", "Arrival", grossHeader, vehHeader, netHeader];
    const tableRows = filteredData.map((a, i) => [
        i + 1,
        a.activity_date,
        a.vehicle_number,
        a.site || "—",
        a.arrival_time || "—",
        fmtNum(a.total_weight * multiplier),
        fmtNum(a.vehicle_weight * multiplier),
        fmtNum(a.net_weight * multiplier)
    ]);
    
    autoTable(doc, {
        startY: 92,
        head: [tableColumns],
        body: tableRows,
        theme: "striped",
        headStyles: { fillColor: [15, 23, 42], fontSize: 8, fontStyle: "bold" },
        bodyStyles: { fontSize: 8 },
        columnStyles: {
            0: { cellWidth: 8 },
            3: { cellWidth: 20 },
            5: { halign: "right" },
            6: { halign: "right" },
            7: { halign: "right" }
        },
        margin: { top: 92, bottom: 20 }
    });
    
    drawReportFooters(doc);
    doc.save(`raw_material_report_${new Date().toISOString().split("T")[0]}.pdf`);
};
