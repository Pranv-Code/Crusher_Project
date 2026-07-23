/**
 * Global Utility for Date, Time, and Currency Formatting
 */

/**
 * Formats a date string (e.g., "2026-07-23" or ISO string) to "dd-mm-yyyy"
 * @param {string|Date} dateVal 
 * @returns {string} Formatted date string as "DD-MM-YYYY" or original string if non-standard
 */
export const formatDate = (dateVal) => {
    if (!dateVal) return "—";
    let str = typeof dateVal === "string" ? dateVal.trim() : "";
    if (dateVal instanceof Date && !isNaN(dateVal)) {
        const d = String(dateVal.getDate()).padStart(2, "0");
        const m = String(dateVal.getMonth() + 1).padStart(2, "0");
        const y = dateVal.getFullYear();
        return `${d}-${m}-${y}`;
    }
    // Handle ISO or space separated date-time
    str = str.split("T")[0].split(" ")[0];
    const parts = str.split("-");
    if (parts.length === 3 && parts[0].length === 4) {
        // YYYY-MM-DD -> DD-MM-YYYY
        const [y, m, d] = parts;
        return `${d.padStart(2, "0")}-${m.padStart(2, "0")}-${y}`;
    }
    // If already in DD-MM-YYYY format or slashes
    if (parts.length === 3 && parts[2].length === 4) {
        const [d, m, y] = parts;
        return `${d.padStart(2, "0")}-${m.padStart(2, "0")}-${y}`;
    }
    return str || "—";
};

/**
 * Formats a time string (e.g. "14:30", "14:30:00") or Date to 12-hour format with AM/PM (e.g. "02:30 PM")
 * @param {string|Date} timeVal 
 * @returns {string} Formatted 12-hour time string
 */
export const formatTime = (timeVal) => {
    if (!timeVal) return "—";
    if (timeVal instanceof Date && !isNaN(timeVal)) {
        let h = timeVal.getHours();
        const m = String(timeVal.getMinutes()).padStart(2, "0");
        const ampm = h >= 12 ? "PM" : "AM";
        h = h % 12 || 12;
        return `${String(h).padStart(2, "0")}:${m} ${ampm}`;
    }
    let str = String(timeVal).trim();
    if (str.includes("T") || str.includes(" ")) {
        const d = new Date(str);
        if (!isNaN(d)) return formatTime(d);
    }
    const parts = str.split(":");
    if (parts.length >= 2) {
        let h = parseInt(parts[0], 10);
        const m = parts[1].padStart(2, "0");
        if (isNaN(h)) return str;
        const ampm = h >= 12 ? "PM" : "AM";
        h = h % 12 || 12;
        return `${String(h).padStart(2, "0")}:${m} ${ampm}`;
    }
    return str || "—";
};

/**
 * Formats date and time together (e.g., "23-07-2026 09:22 AM")
 * @param {string|Date} dtVal 
 * @returns {string} Formatted date & time string
 */
export const formatDateTime = (dtVal) => {
    if (!dtVal) return "—";
    const d = dtVal instanceof Date ? dtVal : new Date(dtVal);
    if (!isNaN(d)) {
        return `${formatDate(d)} ${formatTime(d)}`;
    }
    return `${formatDate(dtVal)} ${formatTime(dtVal)}`;
};

/**
 * Formats number using Indian Numbering System with commas (e.g. 100000 -> "1,00,000")
 * @param {number|string} v 
 * @returns {string}
 */
export const formatInr = (v) => {
    if (v === null || v === undefined || v === "" || isNaN(v)) return "";
    const n = Number(v);
    return n.toLocaleString("en-IN", { maximumFractionDigits: 2 });
};
