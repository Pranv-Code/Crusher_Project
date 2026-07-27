import React, { useState, useEffect, useRef } from "react";
import "./SearchableSelect.css";

function SearchableSelect({
    label,
    name,
    value = "",
    onChange,
    options = [],
    placeholder = "Select or search vehicle...",
    required = false,
    disabled = false,
    style,
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [highlightedIndex, setHighlightedIndex] = useState(0);
    const containerRef = useRef(null);
    const inputRef = useRef(null);

    // Normalize options format: array of { value, label }
    const normalizedOptions = options.map((opt) => {
        if (typeof opt === "object" && opt !== null) {
            return { value: String(opt.value), label: String(opt.label || opt.value) };
        }
        return { value: String(opt), label: String(opt) };
    });

    // Find label for current value
    const selectedOption = normalizedOptions.find((opt) => opt.value === String(value));

    // Update input display value when external `value` or `isOpen` changes
    useEffect(() => {
        if (!isOpen) {
            setSearchTerm(selectedOption ? selectedOption.label : value ? String(value) : "");
        }
    }, [value, isOpen, selectedOption]);

    // Handle click outside to close dropdown
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Filter matching options (fuzzy & substring matching for numbers like 123 / 1234)
    const filteredOptions = React.useMemo(() => {
        if (!searchTerm || !isOpen) return normalizedOptions;

        const cleanSearch = searchTerm.replace(/[\s-]/g, "").toLowerCase();

        // 1. Direct matches on full search term
        const direct = normalizedOptions.filter((opt) => {
            const cleanVal = opt.value.replace(/[\s-]/g, "").toLowerCase();
            const cleanLbl = opt.label.replace(/[\s-]/g, "").toLowerCase();
            return cleanVal.includes(cleanSearch) || cleanLbl.includes(cleanSearch);
        });

        if (direct.length > 0) return direct;

        // 2. Substring fallbacks for numeric queries (e.g. searching 1234 returns 123 matches too)
        if (cleanSearch.length > 2) {
            const sub = cleanSearch.slice(0, cleanSearch.length - 1);
            return normalizedOptions.filter((opt) => {
                const cleanVal = opt.value.replace(/[\s-]/g, "").toLowerCase();
                const cleanLbl = opt.label.replace(/[\s-]/g, "").toLowerCase();
                return cleanVal.includes(sub) || cleanLbl.includes(sub);
            });
        }

        return [];
    }, [normalizedOptions, searchTerm, isOpen]);

    const handleSelectOption = (opt) => {
        setSearchTerm(opt.label);
        setIsOpen(false);
        if (onChange) {
            onChange({
                target: {
                    name,
                    value: opt.value,
                },
            });
        }
    };

    const handleInputChange = (e) => {
        const val = e.target.value;
        setSearchTerm(val);
        setIsOpen(true);
        setHighlightedIndex(0);

        // Also trigger onChange with typed value for custom entry support
        if (onChange) {
            onChange({
                target: {
                    name,
                    value: val,
                },
            });
        }
    };

    const handleInputFocus = () => {
        setIsOpen(true);
        setSearchTerm(""); // Clear search query to show all options when clicking
    };

    const handleKeyDown = (e) => {
        if (!isOpen) {
            if (e.key === "ArrowDown" || e.key === "Enter") {
                setIsOpen(true);
            }
            return;
        }

        if (e.key === "ArrowDown") {
            e.preventDefault();
            setHighlightedIndex((prev) => (prev + 1) % Math.max(1, filteredOptions.length));
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setHighlightedIndex((prev) => (prev - 1 + filteredOptions.length) % Math.max(1, filteredOptions.length));
        } else if (e.key === "Enter") {
            e.preventDefault();
            if (filteredOptions[highlightedIndex]) {
                handleSelectOption(filteredOptions[highlightedIndex]);
            }
        } else if (e.key === "Escape") {
            setIsOpen(false);
        }
    };

    return (
        <div className="searchable-select-container" ref={containerRef} style={style}>
            {label && <label className="searchable-select-label" htmlFor={name}>{label}</label>}

            <div className="searchable-select-input-wrapper">
                <input
                    ref={inputRef}
                    id={name}
                    name={name}
                    type="text"
                    className="searchable-select-input"
                    value={searchTerm}
                    onChange={handleInputChange}
                    onFocus={handleInputFocus}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                    required={required}
                    disabled={disabled}
                    autoComplete="off"
                />
                <span className={`searchable-select-arrow ${isOpen ? "open" : ""}`}>▼</span>
            </div>

            {isOpen && !disabled && (
                <div className="searchable-select-dropdown">
                    {filteredOptions.length > 0 ? (
                        filteredOptions.map((opt, idx) => (
                            <div
                                key={opt.value}
                                className={`searchable-select-option ${idx === highlightedIndex ? "highlighted" : ""} ${opt.value === String(value) ? "selected" : ""}`}
                                onMouseDown={() => handleSelectOption(opt)}
                                onMouseEnter={() => setHighlightedIndex(idx)}
                            >
                                {opt.label}
                            </div>
                        ))
                    ) : (
                        <div className="searchable-select-no-options">No matching vehicles</div>
                    )}
                </div>
            )}
        </div>
    );
}

export default SearchableSelect;
