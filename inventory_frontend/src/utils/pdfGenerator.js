import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { formatDate, formatTime, formatDateTime, formatInr } from "./formatUtils";

// ── Common Formatting Helpers ────────────────────────────────────────────────
const fmtNum = (v) => Number(v || 0).toFixed(2);
const fmtFilterDate = (d) => (d ? formatDate(d) : "All time");

// ── Draw Clean Short Report Header ───────────────────────────────────────────
const drawReportHeader = (doc, title, filterText) => {
    // Title
    doc.setTextColor(15, 23, 42); // slate-900
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(title, 15, 14);

    // Filters line
    if (filterText) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(100, 116, 139); // slate-500
        doc.text(filterText, 15, 20);
    }
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
        doc.setDrawColor(226, 232, 240);
        doc.line(15, height - 12, width - 15, height - 12);

        doc.text(`Generated: ${formatDateTime(new Date())}`, 15, height - 6);

        const pageStr = `Page ${i} of ${pageCount}`;
        doc.text(pageStr, width - 15 - doc.getTextWidth(pageStr), height - 6);
    }
};

// ── 1. Sales Report PDF ──────────────────────────────────────────────────────
export const generateSalesReportPdf = (filteredData, filters) => {
    const doc = new jsPDF({ orientation: "p", unit: "mm", format: "a4", compress: true });
    const filterText = `Filters: From ${fmtFilterDate(filters.dateFrom)} to ${fmtFilterDate(filters.dateTo)} | Month: ${filters.month || "Any"} | Party: ${filters.party || "All"} | Vehicle: ${filters.vehicle || "All"}`;

    drawReportHeader(doc, `Sales Report`, filterText);

    const tableColumns = ["#", "Date", "Party", "Product", "Vehicle", "Qty (MT)", "Qty (Brass)", "Site", "Price (Rs.)", "Remarks"];
    const tableRows = filteredData.map((s, i) => [
        i + 1,
        formatDate(s.sales_date),
        s.party_name,
        s.product_name,
        s.vehicle_number || "—",
        fmtNum(s.quantity_tons),
        fmtNum(s.quantity_tons * 4.2),
        s.site || "—",
        s.price ? `Rs. ${formatInr(s.price)}` : "—",
        s.remarks || "—"
    ]);

    autoTable(doc, {
        startY: 25,
        head: [tableColumns],
        body: tableRows,
        theme: "striped",
        headStyles: { fillColor: [15, 23, 42], fontSize: 8, fontStyle: "bold" },
        bodyStyles: { fontSize: 8 },
        columnStyles: {
            0: { cellWidth: 8, halign: "center" },
            1: { cellWidth: 20 },
            5: { halign: "right" },
            6: { halign: "right" },
            8: { halign: "right" }
        },
        margin: { top: 25, bottom: 16 }
    });

    drawReportFooters(doc);
    doc.save(`sales_report_${new Date().toISOString().split("T")[0]}.pdf`);
};

// ── 2. Production Report PDF ─────────────────────────────────────────────────
export const generateProductionReportPdf = (filteredData, filters) => {
    const doc = new jsPDF({ orientation: "p", unit: "mm", format: "a4", compress: true });
    const filterText = `Filters: From ${fmtFilterDate(filters.dateFrom)} to ${fmtFilterDate(filters.dateTo)} | Month: ${filters.month || "Any"} | Product: ${filters.product || "All"}`;

    drawReportHeader(doc, `Production Report`, filterText);

    const tableColumns = ["#", "Date", "Product", "Qty (MT)", "Qty (Brass)", "Total Cost (Rs.)"];
    const tableRows = filteredData.map((p, i) => [
        i + 1,
        formatDate(p.production_date),
        p.product_name,
        fmtNum(p.quantity_tons),
        fmtNum(p.quantity_tons * 4.2),
        p.production_cost ? `Rs. ${formatInr(p.production_cost)}` : "—"
    ]);

    autoTable(doc, {
        startY: 25,
        head: [tableColumns],
        body: tableRows,
        theme: "striped",
        headStyles: { fillColor: [15, 23, 42], fontSize: 8.5, fontStyle: "bold" },
        bodyStyles: { fontSize: 8.5 },
        columnStyles: {
            0: { cellWidth: 10, halign: "center" },
            1: { cellWidth: 25 },
            3: { halign: "right" },
            4: { halign: "right" },
            5: { halign: "right" }
        },
        margin: { top: 25, bottom: 16 }
    });

    drawReportFooters(doc);
    doc.save(`production_report_${new Date().toISOString().split("T")[0]}.pdf`);
};

// ── 3. Party Sales Report PDF ────────────────────────────────────────────────
export const generatePartyReportPdf = (partyData) => {
    const doc = new jsPDF({ orientation: "p", unit: "mm", format: "a4", compress: true });
    const name = partyData.party.party_name;
    const filterText = `Party: ${name} | Contact: ${partyData.party.email || "—"}`;

    drawReportHeader(doc, `Party Sales Report`, filterText);

    const tableColumns = ["#", "Date", "Product", "Vehicle", "Vehicle Owner", "Qty (MT)", "Qty (Brass)", "Site", "Price (Rs.)", "Remarks"];
    const tableRows = partyData.sales.map((s, i) => [
        i + 1,
        formatDate(s.sales_date),
        s.product_name,
        s.vehicle_number || "—",
        s.vehicle_owner || "—",
        fmtNum(s.quantity_tons),
        fmtNum(s.quantity_tons * 4.2),
        s.site || "—",
        s.price ? `Rs. ${formatInr(s.price)}` : "—",
        s.remarks || "—"
    ]);

    autoTable(doc, {
        startY: 25,
        head: [tableColumns],
        body: tableRows,
        theme: "striped",
        headStyles: { fillColor: [15, 23, 42], fontSize: 8, fontStyle: "bold" },
        bodyStyles: { fontSize: 8 },
        columnStyles: {
            0: { cellWidth: 8, halign: "center" },
            1: { cellWidth: 20 },
            5: { halign: "right" },
            6: { halign: "right" },
            8: { halign: "right" }
        },
        margin: { top: 25, bottom: 16 }
    });

    drawReportFooters(doc);
    doc.save(`party_report_${name.replace(/\s/g, "_")}.pdf`);
};

// ── 4. Raw Material Activity Report PDF ──────────────────────────────────────
export const generateRawMaterialReportPdf = (filteredData, filters) => {
    const doc = new jsPDF({ orientation: "p", unit: "mm", format: "a4", compress: true });
    const filterText = `Filters: From ${fmtFilterDate(filters.dateFrom)} to ${fmtFilterDate(filters.dateTo)} | Month: ${filters.month || "Any"} | Vehicle: ${filters.vehicle || "All"}`;

    drawReportHeader(doc, `Raw Material Report`, filterText);

    const tableColumns = ["#", "Date", "Vehicle", "Site", "Arrival", "Gross Wt (MT)", "Veh Wt (MT)", "Net Wt (MT)", "Net Wt (Brass)"];
    const tableRows = filteredData.map((a, i) => [
        i + 1,
        formatDate(a.activity_date),
        a.vehicle_number,
        a.site || "—",
        formatTime(a.arrival_time),
        fmtNum(a.total_weight),
        fmtNum(a.vehicle_weight),
        fmtNum(a.net_weight),
        fmtNum(a.net_weight * 4.2)
    ]);

    autoTable(doc, {
        startY: 25,
        head: [tableColumns],
        body: tableRows,
        theme: "striped",
        headStyles: { fillColor: [15, 23, 42], fontSize: 8.5, fontStyle: "bold" },
        bodyStyles: { fontSize: 8.5 },
        columnStyles: {
            0: { cellWidth: 10, halign: "center" },
            1: { cellWidth: 25 },
            5: { halign: "right" },
            6: { halign: "right" },
            7: { halign: "right" }
        },
        margin: { top: 25, bottom: 16 }
    });

    drawReportFooters(doc);
    doc.save(`raw_material_report_${new Date().toISOString().split("T")[0]}.pdf`);
};
