import { useEffect, useState } from "react";
import Layout from "../layouts/Layout";
import { getVehicleSales } from "../services/vehicleSaleApi";
import Pagination from "../components/common/Pagination";

// ─── Dual-unit quantity cell ──────────────────────────────────────────────────
const QtyCell = ({ displayQty, displayUnit, convertedQty, convertedUnit }) => (
    <div style={{ lineHeight: "1.4" }}>
        <span style={{ fontWeight: 500 }}>
            {Number(displayQty).toFixed(2)} {displayUnit}
        </span>
        <br />
        <span style={{ fontSize: "0.75em", color: "var(--text-muted, #888)" }}>
            ≈ {Number(convertedQty).toFixed(2)} {convertedUnit}
        </span>
    </div>
);

function VehicleSales() {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [filterVehicle, setFilterVehicle] = useState("");

    // --- Pagination States ---
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    // Reset pagination when data or search or filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [data.length, search, filterVehicle]);

    useEffect(() => {
        getVehicleSales()
            .then((res) => setData(res.data))
            .catch((err) => console.error("Error loading vehicle sales:", err))
            .finally(() => setLoading(false));

        const interval = setInterval(() => {
            const token = localStorage.getItem("token");
            if (!token) return;
            getVehicleSales()
                .then((res) => setData(res.data))
                .catch((err) => console.error("Error refreshing vehicle sales in background:", err));
        }, 5000);

        return () => clearInterval(interval);
    }, []);

    // Unique vehicle numbers for filter dropdown
    const vehicleNumbers = [...new Set(data.map((r) => r.vehicle_number))].sort();

    // Filter by search and vehicle
    const filtered = data.filter((row) => {
        const term = search.toLowerCase();
        const matchesSearch =
            !term ||
            row.party_name?.toLowerCase().includes(term) ||
            row.product_name?.toLowerCase().includes(term) ||
            row.site?.toLowerCase().includes(term) ||
            row.remarks?.toLowerCase().includes(term) ||
            row.vehicle_owner?.toLowerCase().includes(term) ||
            row.vehicle_number?.toLowerCase().includes(term);
        const matchesVehicle =
            !filterVehicle || row.vehicle_number === filterVehicle;
        return matchesSearch && matchesVehicle;
    });

    // Totals
    const totalTons = filtered.reduce(
        (sum, r) => sum + parseFloat(r.quantity_tons || 0),
        0
    );

    return (
        <Layout>
            {/* ── Page Header ── */}
            <div className="page-header">
                <h1>Vehicle Sales</h1>
                <span style={{ fontSize: "0.9em", color: "var(--text-muted, #888)" }}>
                    {filtered.length} entr{filtered.length === 1 ? "y" : "ies"}&nbsp;|&nbsp;
                    Total: <strong>{totalTons.toFixed(2)} tons</strong>
                </span>
            </div>

            {/* ── Filters ── */}
            <div
                style={{
                    display: "flex",
                    gap: "0.75rem",
                    flexWrap: "wrap",
                    marginBottom: "1rem",
                }}
            >
                <input
                    className="search-box"
                    style={{ flex: "1", minWidth: "200px" }}
                    placeholder="Search party, product, site, owner, remarks…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
                <select
                    style={{
                        padding: "0.5rem 0.75rem",
                        borderRadius: "6px",
                        border: "1px solid var(--border-color, #ccc)",
                        background: "var(--input-bg, #fff)",
                        color: "var(--text-color, #333)",
                        minWidth: "160px",
                    }}
                    value={filterVehicle}
                    onChange={(e) => setFilterVehicle(e.target.value)}
                >
                    <option value="">All Vehicles</option>
                    {vehicleNumbers.map((vn) => (
                        <option key={vn} value={vn}>{vn}</option>
                    ))}
                </select>
            </div>

            {/* ── Table ── */}
            <div className="table-container">
                {loading ? (
                    <p style={{ textAlign: "center", padding: "2rem", color: "var(--text-muted,#888)" }}>
                        Loading…
                    </p>
                ) : (
                    <table>
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Sale Date</th>
                                <th>Vehicle</th>
                                <th>Owner</th>
                                <th>Party</th>
                                <th>Product</th>
                                <th>Quantity</th>
                                <th>Site</th>
                                <th>Price</th>
                                <th>Loading</th>
                                <th>Unloading</th>
                                <th>Remarks</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan="12"
                                        style={{
                                            textAlign: "center",
                                            padding: "2rem",
                                            color: "var(--text-muted, #888)",
                                        }}
                                    >
                                        No vehicle sale entries found.
                                    </td>
                                </tr>
                            ) : (
                                filtered
                                    .slice((currentPage - 1) * pageSize, currentPage * pageSize)
                                    .map((row, idx) => (
                                        <tr key={row.vehicle_sale_id}>
                                            <td style={{ color: "var(--text-muted,#888)", fontSize: "0.85em" }}>
                                                {(currentPage - 1) * pageSize + idx + 1}
                                            </td>
                                            <td>{row.sales_date}</td>
                                            <td><strong>{row.vehicle_number}</strong></td>
                                            <td>{row.vehicle_owner || "—"}</td>
                                            <td>{row.party_name}</td>
                                            <td>{row.product_name}</td>
                                            <td>
                                                <QtyCell
                                                    displayQty={row.display_quantity}
                                                    displayUnit={row.unit.toLowerCase()==="tons"?"MT":"Brass"}
                                                    convertedQty={row.converted_quantity}
                                                    convertedUnit={row.converted_unit.toLowerCase()==="tons"?"MT":"Brass"}
                                                />
                                            </td>
                                            <td>{row.site || "—"}</td>
                                            <td>{row.price}</td>
                                            <td>{row.loading_time || "—"}</td>
                                            <td>{row.unloading_time || "—"}</td>
                                            <td
                                                style={{
                                                    maxWidth: "180px",
                                                    overflow: "hidden",
                                                    textOverflow: "ellipsis",
                                                    whiteSpace: "nowrap",
                                                }}
                                                title={row.remarks || ""}
                                            >
                                                {row.remarks || "—"}
                                            </td>
                                        </tr>
                                    ))
                            )}
                        </tbody>

                        {/* ── Footer totals ── */}
                        {filtered.length > 0 && (
                            <tfoot>
                                <tr style={{ fontWeight: 600, borderTop: "2px solid var(--border-color,#ccc)" }}>
                                    <td colSpan="6" style={{ textAlign: "right", paddingRight: "1rem" }}>
                                        Total
                                    </td>
                                    <td>
                                        <div style={{ lineHeight: "1.4" }}>
                                            <span>{totalTons.toFixed(2)} tons</span>
                                            <br />
                                            <span style={{ fontSize: "0.75em", color: "var(--text-muted,#888)" }}>
                                                ≈ {(totalTons * 4.2).toFixed(2)} brass
                                            </span>
                                        </div>
                                    </td>
                                    <td colSpan="5" />
                                </tr>
                            </tfoot>
                        )}
                    </table>
                )}
                {!loading && (
                    <Pagination
                        currentPage={currentPage}
                        totalItems={filtered.length}
                        pageSize={pageSize}
                        onPageChange={setCurrentPage}
                        onPageSizeChange={setPageSize}
                        pageSizeOptions={[5, 10, 20, 50]}
                    />
                )}
            </div>
        </Layout>
    );
}

export default VehicleSales;
