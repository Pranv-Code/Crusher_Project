import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { formatDate, formatTime, formatDateTime, formatInr, numberToWordsIndian, tonToBrass } from "./formatUtils";

// ── Common Formatting Helpers ────────────────────────────────────────────────
const fmtNum = (v) => Number(v || 0).toFixed(2);
const fmtFilterDate = (d) => (d ? formatDate(d) : "All time");

// ── Draw Clean Short Report Header ───────────────────────────────────────────
const drawReportHeader = (doc, title, filterText, companyName = "VISHWAJEET ENTERPRISES") => {
    // Company Header
    doc.setTextColor(15, 23, 42); // slate-900
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(companyName, 15, 12);

    // Report Subtitle
    doc.setTextColor(51, 65, 85); // slate-700
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.text(title, 15, 18);

    // Filters line
    if (filterText) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        doc.setTextColor(100, 116, 139); // slate-500
        doc.text(filterText, 15, 23);
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
export const generateSalesReportPdf = (filteredData, filters, returnsBySaleId = {}) => {
    const doc = new jsPDF({ orientation: "p", unit: "mm", format: "a4", compress: true });
    const filterText = `Filters: From ${fmtFilterDate(filters.dateFrom)} to ${fmtFilterDate(filters.dateTo)} | Month: ${filters.month || "Any"} | Party: ${filters.party || "All"} | Vehicle: ${filters.vehicle || "All"}`;

    drawReportHeader(doc, `Sales Report`, filterText);

    const tableColumns = ["#", "Date", "Party", "Product", "Vehicle", "Gross (MT)", "Returned (MT)", "Net (MT)", "Site", "Price/Unit (Rs.)", "Total Price (Rs.)", "Remarks"];
    const tableRows = filteredData.map((s, i) => {
        const saleRets = returnsBySaleId[s.sales_id] || [];
        const retTons = saleRets.reduce((sum, r) => sum + parseFloat(r.returned_quantity_tons || 0), 0);
        const netTons = Math.max(0, s.quantity_tons - retTons);
        const lineTotal = netTons * (s.price || 0);

        return [
            i + 1,
            formatDate(s.sales_date),
            s.party_name,
            s.product_name,
            s.vehicle_number || "—",
            fmtNum(s.quantity_tons),
            retTons > 0 ? `-${fmtNum(retTons)}` : "—",
            fmtNum(netTons),
            s.site || "—",
            s.price ? formatInr(s.price) : "—",
            s.price ? formatInr(lineTotal) : "—",
            s.remarks || "—"
        ];
    });

    autoTable(doc, {
        startY: 28,
        head: [tableColumns],
        body: tableRows,
        theme: "striped",
        headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontSize: 8, fontStyle: "bold", halign: "center" },
        bodyStyles: { fontSize: 8, halign: "right" },
        styles: { halign: "right" },
        margin: { top: 28, bottom: 16 }
    });

    drawReportFooters(doc);
    doc.save(`sales_report_${new Date().toISOString().split("T")[0]}.pdf`);
};

// ── 2. Production Report PDF ─────────────────────────────────────────────────
export const generateProductionReportPdf = (filteredData, filters, tonsPerBrass = 4.2) => {
    const doc = new jsPDF({ orientation: "p", unit: "mm", format: "a4", compress: true });
    const filterText = `Filters: From ${fmtFilterDate(filters.dateFrom)} to ${fmtFilterDate(filters.dateTo)} | Month: ${filters.month || "Any"} | Product: ${filters.product || "All"}`;

    drawReportHeader(doc, `Production Report`, filterText);

    const tableColumns = ["#", "Date", "Product", "Qty (MT)", "Qty (Brass)", "Total Cost (Rs.)"];
    const tableRows = filteredData.map((p, i) => [
        i + 1,
        formatDate(p.production_date),
        p.product_name,
        fmtNum(p.quantity_tons),
        fmtNum(tonToBrass(p.quantity_tons, tonsPerBrass)),
        p.production_cost ? formatInr(p.production_cost) : "—"
    ]);

    autoTable(doc, {
        startY: 28,
        head: [tableColumns],
        body: tableRows,
        theme: "striped",
        headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontSize: 8.5, fontStyle: "bold", halign: "center" },
        bodyStyles: { fontSize: 8.5, halign: "right" },
        styles: { halign: "right" },
        columnStyles: {
            0: { cellWidth: 10, halign: "right" },
            1: { cellWidth: 25, halign: "right" },
            2: { halign: "right" },
            3: { halign: "right" },
            4: { halign: "right" },
            5: { halign: "right" }
        },
        margin: { top: 28, bottom: 16 }
    });

    drawReportFooters(doc);
    doc.save(`production_report_${new Date().toISOString().split("T")[0]}.pdf`);
};

// ── 3. Party Sales Report PDF ────────────────────────────────────────────────
export const generatePartyReportPdf = (partyData, tonsPerBrass = 4.2) => {
    const doc = new jsPDF({ orientation: "p", unit: "mm", format: "a4", compress: true });
    const name = partyData.party.party_name;
    const filterText = `Party: ${name} | Contact: ${partyData.party.email || "—"}`;

    drawReportHeader(doc, `Party Sales Report`, filterText);

    const tableColumns = ["#", "Date", "Product", "Vehicle", "Vehicle Owner", "Qty (MT)", "Qty (Brass)", "Site", "Price/Unit (Rs.)", "Total Price (Rs.)", "Remarks"];
    const tableRows = partyData.sales.map((s, i) => {
        const lineTotal = (s.quantity_tons || 0) * (s.price || 0);
        return [
            i + 1,
            formatDate(s.sales_date),
            s.product_name,
            s.vehicle_number || "—",
            s.vehicle_owner || "—",
            fmtNum(s.quantity_tons),
            fmtNum(tonToBrass(s.quantity_tons, tonsPerBrass)),
            s.site || "—",
            s.price ? formatInr(s.price) : "—",
            s.price ? formatInr(lineTotal) : "—",
            s.remarks || "—"
        ];
    });

    autoTable(doc, {
        startY: 28,
        head: [tableColumns],
        body: tableRows,
        theme: "striped",
        headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontSize: 8, fontStyle: "bold", halign: "center" },
        bodyStyles: { fontSize: 8, halign: "right" },
        styles: { halign: "right" },
        margin: { top: 28, bottom: 16 }
    });

    drawReportFooters(doc);
    doc.save(`party_report_${name.replace(/\s/g, "_")}.pdf`);
};

// ── 3.1 Formal Party Invoice PDF (without GST) ──────────────────────────────
export const generatePartyInvoicePdf = (partyData, dateFrom, dateTo, companyDetails = {}) => {
    const doc = new jsPDF({ orientation: "p", unit: "mm", format: "a4", compress: true });

    // Company Details
    const compName = companyDetails.company_name || "Vishwajeet Enterprises";
    const compAddress = companyDetails.company_address || "366, Shantisadan House, Ratnagiri, Maharashtra - 415639";
    const compGstin = companyDetails.company_gstin || "27AAXFV1394B1ZR";
    const compState = companyDetails.company_state || "Maharashtra, Code 27";
    const compEmail = companyDetails.company_email || "vishwajeete54@gmail.com";

    // Party Details
    const party = partyData.party || {};
    const partyName = party.party_name || "Buyer";
    const partyAddress = party.address || "—";
    const partyGst = party.gst_no || party.pan_no || "—";

    // Filter Sales Entries by Date Range
    let filteredSales = partyData.sales || [];
    if (dateFrom) {
        filteredSales = filteredSales.filter(s => s.sales_date >= dateFrom);
    }
    if (dateTo) {
        filteredSales = filteredSales.filter(s => s.sales_date <= dateTo);
    }

    // Header Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42);
    doc.text("INVOICE SUMMARY", 105, 14, { align: "center" });

    // Outer Header Box Grid
    const startX = 12;
    const startY = 18;
    const boxW = 186;
    const boxH = 54;
    const midX = 110;
    const midY = 44;

    doc.setLineWidth(0.3);
    doc.setDrawColor(50, 50, 50);
    doc.rect(startX, startY, boxW, boxH);
    doc.line(midX, startY, midX, startY + boxH);
    doc.line(startX, midY, midX, midY);

    // --- Top-Left Box: Seller (From Company) ---
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(compName, startX + 3, startY + 5);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(70, 70, 70);

    const addrLines = doc.splitTextToSize(compAddress, 90);
    let curY = startY + 9;
    addrLines.forEach(line => {
        doc.text(line, startX + 3, curY);
        curY += 3.5;
    });

    if (compGstin) {
        doc.text(`GSTIN/UIN: ${compGstin}`, startX + 3, curY);
        curY += 3.5;
    }
    if (compState) {
        doc.text(`State Name: ${compState}`, startX + 3, curY);
        curY += 3.5;
    }
    if (compEmail) {
        doc.text(`E-Mail: ${compEmail}`, startX + 3, curY);
    }

    // --- Bottom-Left Box: Buyer (Bill to Party) ---
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);
    doc.text("Buyer (Bill to):", startX + 3, midY + 4);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.text(partyName, startX + 3, midY + 8);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(70, 70, 70);

    const partyAddrLines = doc.splitTextToSize(partyAddress, 90);
    let curYBuyer = midY + 12;
    partyAddrLines.forEach(line => {
        doc.text(line, startX + 3, curYBuyer);
        curYBuyer += 3.5;
    });

    doc.text(`GSTIN/UIN: ${partyGst}`, startX + 3, curYBuyer);
    curYBuyer += 3.5;
    doc.text(`State Name: ${compState}`, startX + 3, curYBuyer);

    // --- Right Box: Invoice Metadata Grid ---
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);

    // Helper to calculate Indian Financial Year (April - March)
    const getFinancialYear = (d = new Date()) => {
        const date = new Date(d);
        const yr = date.getFullYear();
        const start = (date.getMonth() + 1) >= 4 ? yr : yr - 1;
        const end = start + 1;
        return `${start.toString().slice(-2)}-${end.toString().slice(-2)}`;
    };

    const fyStr = getFinancialYear(dateTo || new Date());
    const partyCode = String(party.party_id || '1').padStart(3, '0');
    const tsToken = Date.now().toString().slice(-5);
    const invNo = companyDetails.invoice_number || `VE/${fyStr}/P${partyCode}-${tsToken}`;
    const invDate = dateTo ? formatDate(dateTo) : formatDate(new Date());
    const periodStr = (dateFrom || dateTo) ? `${fmtFilterDate(dateFrom)} to ${fmtFilterDate(dateTo)}` : "All Time";

    let rY = startY + 5;
    doc.setFont("helvetica", "bold");
    doc.text("Invoice No:", midX + 3, rY);
    doc.setFont("helvetica", "normal");
    doc.text(invNo, midX + 32, rY);

    rY += 4.5;
    doc.setFont("helvetica", "bold");
    doc.text("Dated:", midX + 3, rY);
    doc.setFont("helvetica", "normal");
    doc.text(invDate, midX + 32, rY);

    rY += 4.5;
    doc.setFont("helvetica", "bold");
    doc.text("Period:", midX + 3, rY);
    doc.setFont("helvetica", "normal");
    doc.text(periodStr, midX + 32, rY);

    rY += 4.5;
    doc.setFont("helvetica", "bold");
    doc.text("Mode/Terms:", midX + 3, rY);
    doc.setFont("helvetica", "normal");
    doc.text("Standard Delivery", midX + 32, rY);

    // --- Prepare Table Data ---
    const productGroupMap = {};
    filteredSales.forEach(s => {
        const prod = (s.product_name === "Common Pool" || !s.product_name) ? "Quarry Material" : s.product_name;
        const qty = parseFloat(s.quantity_tons || 0);
        const price = parseFloat(s.price || 0);
        const amount = qty * price;

        if (!productGroupMap[prod]) {
            productGroupMap[prod] = {
                product_name: prod,
                quantity_tons: 0,
                total_amount: 0,
                price: price
            };
        }
        productGroupMap[prod].quantity_tons += qty;
        productGroupMap[prod].total_amount += amount;
    });

    const groupedList = Object.values(productGroupMap);

    let grandTotalQty = 0;
    let grandTotalAmount = 0;

    const tableRows = groupedList.map((item, index) => {
        grandTotalQty += item.quantity_tons;
        grandTotalAmount += item.total_amount;
        const avgRate = item.quantity_tons > 0 ? (item.total_amount / item.quantity_tons) : item.price;

        return [
            index + 1,
            item.product_name,
            `${item.quantity_tons.toFixed(2)} MT`,
            avgRate.toFixed(2),
            "MT",
            formatInr(item.total_amount)
        ];
    });

    // Add Total Row
    tableRows.push([
        "",
        "Total",
        `${grandTotalQty.toFixed(2)} MT`,
        "",
        "",
        `Rs. ${formatInr(grandTotalAmount)}`
    ]);

    const tableColumns = ["Sl No", "Description of Goods", "Quantity", "Rate", "per", "Amount (Rs.)"];

    autoTable(doc, {
        startY: startY + boxH + 3,
        head: [tableColumns],
        body: tableRows,
        theme: "grid",
        headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontSize: 8, fontStyle: "bold", halign: "center" },
        bodyStyles: { fontSize: 8, textColor: [30, 41, 59] },
        columnStyles: {
            0: { cellWidth: 12, halign: "center" },
            1: { cellWidth: 70 },
            2: { cellWidth: 30, halign: "right" },
            3: { cellWidth: 25, halign: "right" },
            4: { cellWidth: 15, halign: "center" },
            5: { cellWidth: 34, halign: "right" }
        },
        margin: { left: 12, right: 12 },
        didParseCell: function (data) {
            if (data.row.index === tableRows.length - 1) {
                data.cell.styles.fontStyle = "bold";
                data.cell.styles.fillColor = [248, 250, 252];
            }
        }
    });

    const finalY = doc.lastAutoTable.finalY || (startY + boxH + 40);

    // --- Amount Chargeable in Words Box ---
    doc.setLineWidth(0.3);
    doc.setDrawColor(50, 50, 50);
    doc.rect(startX, finalY + 4, boxW, 12);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(70, 70, 70);
    doc.text("Amount Chargeable (in words):", startX + 3, finalY + 8);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text(numberToWordsIndian(grandTotalAmount), startX + 3, finalY + 13);


    // Bottom Footer
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text("This is a Computer Generated Invoice", 105, 287, { align: "center" });

    doc.save(`Invoice_${partyName.replace(/\s/g, "_")}_${new Date().toISOString().split("T")[0]}.pdf`);
};

// ── 4. Raw Material Activity Report PDF ──────────────────────────────────────
export const generateRawMaterialReportPdf = (filteredData, filters, tonsPerBrass = 4.2) => {
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
        fmtNum(tonToBrass(a.net_weight, tonsPerBrass))
    ]);

    autoTable(doc, {
        startY: 28,
        head: [tableColumns],
        body: tableRows,
        theme: "striped",
        headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontSize: 8.5, fontStyle: "bold", halign: "center" },
        bodyStyles: { fontSize: 8.5, halign: "right" },
        styles: { halign: "right" },
        columnStyles: {
            0: { cellWidth: 10, halign: "right" },
            1: { cellWidth: 25, halign: "right" },
            2: { halign: "right" },
            3: { halign: "right" },
            4: { halign: "right" },
            5: { halign: "right" },
            6: { halign: "right" },
            7: { halign: "right" },
            8: { halign: "right" }
        },
        margin: { top: 28, bottom: 16 }
    });

    drawReportFooters(doc);
    doc.save(`raw_material_report_${new Date().toISOString().split("T")[0]}.pdf`);
};
