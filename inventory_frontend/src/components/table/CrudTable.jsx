import React, { useState, useEffect } from "react";
import "./CrudTable.css";
import EmptyState from "../common/EmptyState";
import Pagination from "../common/Pagination";

function CrudTable({
    columns = [],
    data = [],
    renderActions,
    keyField = "id",
}) {
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    // Reset page to 1 whenever the filtered dataset changes
    useEffect(() => {
        setCurrentPage(1);
    }, [data.length]);

    if (!data.length) {
        return <EmptyState />;
    }

    const paginatedData = data.slice(
        (currentPage - 1) * pageSize,
        currentPage * pageSize
    );

    const isNumericCol = (column) => {
        if (column.align === "right") return true;
        if (column.align === "left" || column.align === "center") return false;
        const lower = (column.label || column.key || "").toLowerCase();
        return (
            lower.includes("quantity") ||
            lower.includes("weight") ||
            lower.includes("cost") ||
            lower.includes("price") ||
            lower.includes("amount") ||
            lower.includes("tons") ||
            lower.includes("brass") ||
            lower.includes("rate") ||
            lower.includes("count") ||
            lower.includes("gross") ||
            lower.includes("net") ||
            lower.includes("total") ||
            lower.includes("₹")
        );
    };

    return (
        <div className="crud-table-wrapper" style={{
            background: "#ffffff",
            borderRadius: "12px",
            boxShadow: "0 2px 10px rgba(0,0,0,.08)",
            overflow: "hidden"
        }}>
            <div className="crud-table-container" style={{ boxShadow: "none", borderRadius: "12px 12px 0 0" }}>
                <table className="crud-table">
                    <thead>
                        <tr>
                            {columns.map((column) => {
                                const align = column.align || (isNumericCol(column) ? "right" : "left");
                                return (
                                    <th key={column.key} style={{ textAlign: align }}>
                                        {column.label}
                                    </th>
                                );
                            })}

                            {renderActions && (
                                <th className="actions-column">
                                    Actions
                                </th>
                            )}
                        </tr>
                    </thead>

                    <tbody>
                        {paginatedData.map((row) => (
                            <tr key={row[keyField]}>
                                {columns.map((column) => {
                                    const isNum = isNumericCol(column);
                                    const align = column.align || (isNum ? "right" : "left");
                                    const val = row[column.key];
                                    return (
                                        <td key={column.key} style={{ textAlign: align }}>
                                            {column.render
                                                ? column.render(row)
                                                : column.key === "status"
                                                    ? (
                                                        <span className={`badge badge-${row[column.key]?.toLowerCase()}`}>
                                                            {val}
                                                        </span>
                                                    )
                                                    : (isNum && val !== null && val !== undefined && val !== "" && !isNaN(val))
                                                        ? Number(val).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                                                        : val}
                                        </td>
                                    );
                                })}

                                {renderActions && (
                                    <td className="actions-cell">
                                        {renderActions(row)}
                                    </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            
            <Pagination
                currentPage={currentPage}
                totalItems={data.length}
                pageSize={pageSize}
                onPageChange={setCurrentPage}
                onPageSizeChange={setPageSize}
            />
        </div>
    );
}

export default CrudTable;