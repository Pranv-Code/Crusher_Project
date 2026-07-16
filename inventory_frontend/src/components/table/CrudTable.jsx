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
                            {columns.map((column) => (
                                <th key={column.key}>
                                    {column.label}
                                </th>
                            ))}

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
                                {columns.map((column) => (
                                    <td key={column.key}>
                                        {column.render
                                            ? column.render(row)
                                            : column.key === "status"
                                                ? (
                                                    <span className={`badge badge-${row[column.key]?.toLowerCase()}`}>
                                                        {row[column.key]}
                                                    </span>
                                                )
                                                : row[column.key]}
                                    </td>
                                ))}

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