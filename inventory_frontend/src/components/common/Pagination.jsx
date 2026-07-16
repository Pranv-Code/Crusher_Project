import React from "react";
import "./Pagination.css";

const Pagination = ({
    currentPage,
    totalItems,
    pageSize,
    onPageChange,
    onPageSizeChange,
    pageSizeOptions = [5, 10, 20, 50],
}) => {
    const totalPages = Math.ceil(totalItems / pageSize) || 1;

    // Generate page numbers
    const getPageNumbers = () => {
        const pages = [];
        const maxPagesToShow = 5;
        
        if (totalPages <= maxPagesToShow) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
            let start = Math.max(1, currentPage - 2);
            let end = Math.min(totalPages, currentPage + 2);
            
            if (currentPage <= 3) {
                end = 5;
            } else if (currentPage >= totalPages - 2) {
                start = totalPages - 4;
            }
            
            for (let i = start; i <= end; i++) pages.push(i);
        }
        return pages;
    };

    const pages = getPageNumbers();
    const startRange = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
    const endRange = Math.min(currentPage * pageSize, totalItems);

    return (
        <div className="pagination-container">
            <div className="pagination-info">
                Showing <strong>{startRange}</strong> to <strong>{endRange}</strong> of{" "}
                <strong>{totalItems}</strong> entries
            </div>
            
            <div className="pagination-controls">
                <div className="page-size-selector">
                    <span>Show</span>
                    <select
                        value={pageSize}
                        onChange={(e) => {
                            onPageSizeChange(Number(e.target.value));
                        }}
                    >
                        {pageSizeOptions.map((opt) => (
                            <option key={opt} value={opt}>
                                {opt}
                            </option>
                        ))}
                    </select>
                    <span>entries</span>
                </div>
                
                <div className="pagination-buttons">
                    <button
                        className="pagination-btn arrow"
                        disabled={currentPage === 1}
                        onClick={() => onPageChange(1)}
                        title="First Page"
                    >
                        &laquo;
                    </button>
                    <button
                        className="pagination-btn arrow"
                        disabled={currentPage === 1}
                        onClick={() => onPageChange(currentPage - 1)}
                        title="Previous Page"
                    >
                        &lsaquo;
                    </button>
                    
                    {pages.map((p) => (
                        <button
                            key={p}
                            className={`pagination-btn num ${currentPage === p ? "active" : ""}`}
                            onClick={() => onPageChange(p)}
                        >
                            {p}
                        </button>
                    ))}
                    
                    <button
                        className="pagination-btn arrow"
                        disabled={currentPage === totalPages}
                        onClick={() => onPageChange(currentPage + 1)}
                        title="Next Page"
                    >
                        &rsaquo;
                    </button>
                    <button
                        className="pagination-btn arrow"
                        disabled={currentPage === totalPages}
                        onClick={() => onPageChange(totalPages)}
                        title="Last Page"
                    >
                        &raquo;
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Pagination;
