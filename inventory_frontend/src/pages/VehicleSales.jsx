import { useEffect, useState } from "react";
import Layout from "../layouts/Layout";
import { getVehicleSales } from "../services/vehicleSaleApi";
import Pagination from "../components/common/Pagination";
import { formatDate, formatTime, formatInr, tonToBrass } from "../utils/formatUtils";
import { getSettings } from "../services/settingsApi";

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
    const [tonsPerBrass, setTonsPerBrass] = useState(4.2);

    // --- Pagination States ---
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    useEffect(() => {
        getSettings()
            .then(res => {
                if (res.data && res.data.tons_per_brass) {
                    setTonsPerBrass(parseFloat(res.data.tons_per_brass) || 4.2);
                }
            })
            .catch(() => {});
    }, []);

    // Reset pagination when data or search or filters change
    const handlePageSizeChange = (newSize) => {
        setPageSize(newSize);
        setCurrentPage(1);
    };

    useEffect(() => {
        fetchSales();
    }, []);

    useEffect(() => {
        setCurrentPage(1);
    }, [search, filterVehicle]);

    const fetchSales = async () => {
        setLoading(true);
        try {
            const res = await getVehicleSales();
            setData(res.data || []);
        } catch (err) {
            console.error("Failed to load vehicle sales:", err);
        } finally {
            setLoading(false);
        }
    };

    // Filter by search query (vehicle number or party name)
    const filtered = data.filter((row) => {
        const matchesSearch =
            !search.trim() ||
            (row.vehicle_number &&
                row.vehicle_number.toLowerCase().includes(search.toLowerCase())) ||
            (row.party_name &&
                row.party_name.toLowerCase().includes(search.toLowerCase()));

        const matchesVehicle =
            !filterVehicle || row.vehicle_number === filterVehicle;

        return matchesSearch && matchesVehicle;
    });

    // Unique vehicle list for filter dropdown
    const uniqueVehicles = Array.from(
        new Set(data.map((r) => r.vehicle_number).filter(Boolean))
    );

    // Totals
    const totalTons = filtered.reduce(
        (acc, r) => acc + (parseFloat(r.quantity_tons) || 0),
        0
    );

    return (
        <Layout>
            <div className="page-header" style={{ marginBottom: "1.5rem" }}>
                <h2>Vehicle Sales Report</h2>
                <p style={{ color: "var(--text-muted, #888)", marginTop: "0.25rem" }}>
                    View all sales entries mapped by vehicle
                </p>
            </div>

            {/* Filter controls */}
            <div
                style={{
                    display: "flex",
                    gap: "1rem",
                    marginBottom: "1.5rem",
                    flexWrap: "wrap",
                    alignItems: "center",
                }}
            >
                <input
                    type="text"
                    placeholder="Search vehicle or party..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    style={{
                        padding: "0.6rem 1rem",
                        borderRadius: "8px",
                        border: "1px solid var(--border-color, #ccc)",
                        fontSize: "0.9rem",
                        minWidth: "240px",
                        outline: "none",
                    }}
                />

                <select
                    value={filterVehicle}
                    onChange={(e) => setFilterVehicle(e.target.value)}
                    style={{
                        padding: "0.6rem 1rem",
                        borderRadius: "8px",
                        border: "1px solid var(--border-color, #ccc)",
                        fontSize: "0.9rem",
                        outline: "none",
                    }}
                >
                    <option value="">All Vehicles</option>
                    {uniqueVehicles.map((v) => (
                        <option key={v} value={v}>
                            {v}
                        </option>
                    ))}
                </select>

                {(search || filterVehicle) && (
                    <button
                        onClick={() => {
                            setSearch("");
                            setFilterVehicle("");
                        }}
                        style={{
                            padding: "0.6rem 1rem",
                            borderRadius: "8px",
                            border: "1px solid var(--border-color, #ccc)",
                            background: "var(--surface-color, #fff)",
                            fontSize: "0.9rem",
                            cursor: "pointer",
                        }}
                    >
                        Clear Filters
                    </button>
                )}
            </div>

            {/* Main Sales Table */}
            <div className="table-container">
                {loading ? (
                    <p style={{ padding: "2rem", textAlign: "center" }}>Loading...</p>
                ) : filtered.length === 0 ? (
                    <p style={{ padding: "2rem", textAlign: "center", color: "#888" }}>
                        No vehicle sales entries found.
                    </p>
                ) : (
                    <>
                        <table style={{ width: "100%", borderCollapse: "collapse" }}>
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th style={{ whiteSpace: "nowrap" }}>Date</th>
                                    <th>Vehicle No</th>
                                    <th>Vehicle Owner</th>
                                    <th>Party</th>
                                    <th>Product</th>
                                    <th>Quantity</th>
                                    <th>Site</th>
                                    <th>Loading Time</th>
                                    <th>Unloading Time</th>
                                    <th style={{ textAlign: "right", whiteSpace: "nowrap" }}>Price (₹)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered
                                    .slice((currentPage - 1) * pageSize, currentPage * pageSize)
                                    .map((row, i) => (
                                        <tr key={row.sales_id}>
                                            <td>{(currentPage - 1) * pageSize + i + 1}</td>
                                            <td style={{ whiteSpace: "nowrap" }}>{formatDate(row.sales_date)}</td>
                                            <td>
                                                <strong style={{ fontFamily: "monospace" }}>
                                                    {row.vehicle_number || "—"}
                                                </strong>
                                            </td>
                                            <td>{row.vehicle_owner || "—"}</td>
                                            <td>{row.party_name}</td>
                                            <td>{row.product_name}</td>
                                            <td>
                                                <QtyCell
                                                    displayQty={row.display_quantity}
                                                    displayUnit={row.display_unit}
                                                    convertedQty={row.converted_quantity}
                                                    convertedUnit={row.converted_unit}
                                                />
                                            </td>
                                            <td>{row.site || "—"}</td>
                                            <td>{formatTime(row.loading_time)}</td>
                                            <td>{formatTime(row.unloading_time)}</td>
                                            <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>{row.price ? `₹${formatInr(row.price)}` : "—"}</td>
                                        </tr>
                                    ))}
                            </tbody>
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
                                                ≈ {tonToBrass(totalTons, tonsPerBrass).toFixed(2)} brass
                                            </span>
                                        </div>
                                    </td>
                                    <td colSpan="5" />
                                </tr>
                            </tfoot>
                        </table>

                        {/* Shared Reusable Pagination Component */}
                        <Pagination
                            currentPage={currentPage}
                            totalItems={filtered.length}
                            pageSize={pageSize}
                            onPageChange={setCurrentPage}
                            onPageSizeChange={handlePageSizeChange}
                        />
                    </>
                )}
            </div>
        </Layout>
    );
}

export default VehicleSales;
