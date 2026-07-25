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
    return n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

/**
 * Formats a number with specified decimal places (e.g. 500 -> "500.00")
 * @param {number|string} v 
 * @param {number} [digits=2]
 * @returns {string}
 */
export const formatDecimal = (v, digits = 2) => {
    if (v === null || v === undefined || v === "" || isNaN(v)) return "";
    const n = Number(v);
    return n.toLocaleString("en-IN", { minimumFractionDigits: digits, maximumFractionDigits: digits });
};

/**
 * Formats a duration time string (e.g. "01:30:00", "01:30") to "X hr Y min" format
 * @param {string} timeStr 
 * @returns {string} Formatted duration string (e.g., "1 hr 30 min")
 */
export const formatDurationHM = (timeStr) => {
    if (!timeStr) return "—";
    const parts = String(timeStr).trim().split(":");
    if (parts.length >= 2) {
        const h = parseInt(parts[0], 10) || 0;
        const m = parseInt(parts[1], 10) || 0;
        return `${h} hr ${m} min`;
    }
    return timeStr || "—";
};

/**
 * Converts a numeric amount to Indian Currency Words (e.g. 262410 -> "INR Two Lakh Sixty Two Thousand Four Hundred Ten Only")
 * @param {number|string} amount 
 * @returns {string} Amount in words
 */
export const numberToWordsIndian = (amount) => {
    const numVal = Number(amount || 0);
    if (isNaN(numVal) || numVal === 0) return "INR Zero Only";

    const absoluteVal = Math.abs(numVal);
    const integerPart = Math.floor(absoluteVal);
    const paisePart = Math.round((absoluteVal - integerPart) * 100);

    const singleDigits = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"];
    const teenDigits = ["Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
    const tensDigits = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

    const convertTwoDigits = (n) => {
        if (n < 10) return singleDigits[n];
        if (n >= 10 && n < 20) return teenDigits[n - 10];
        return (tensDigits[Math.floor(n / 10)] + " " + singleDigits[n % 10]).trim();
    };

    const convertThreeDigits = (n) => {
        if (n === 0) return "";
        let str = "";
        if (Math.floor(n / 100) > 0) {
            str += singleDigits[Math.floor(n / 100)] + " Hundred ";
        }
        if (n % 100 > 0) {
            str += convertTwoDigits(n % 100);
        }
        return str.trim();
    };

    let result = "";
    const crore = Math.floor(integerPart / 10000000);
    const lakh = Math.floor((integerPart % 10000000) / 100000);
    const thousand = Math.floor((integerPart % 100000) / 1000);
    const remainder = integerPart % 1000;

    if (crore > 0) result += convertTwoDigits(crore) + " Crore ";
    if (lakh > 0) result += convertTwoDigits(lakh) + " Lakh ";
    if (thousand > 0) result += convertTwoDigits(thousand) + " Thousand ";
    if (remainder > 0) result += convertThreeDigits(remainder);

    result = result.trim();
    let finalStr = "INR " + (result || "Zero");

    if (paisePart > 0) {
        finalStr += " And " + convertTwoDigits(paisePart) + " Paise";
    }
    finalStr += " Only";
    return finalStr;
};

/**
 * Converts Tons to Brass using configurable factor (1 Brass = factor Tons)
 * @param {number|string} tons 
 * @param {number|string} [factor=4.2] 
 * @returns {number}
 */
export const tonToBrass = (tons, factor = 4.2) => {
    const t = Number(tons || 0);
    const f = Number(factor || 4.2);
    if (isNaN(t) || isNaN(f) || f <= 0) return 0;
    return t / f;
};

/**
 * Converts Brass to Tons using configurable factor (1 Brass = factor Tons)
 * @param {number|string} brass 
 * @param {number|string} [factor=4.2] 
 * @returns {number}
 */
export const brassToTon = (brass, factor = 4.2) => {
    const b = Number(brass || 0);
    const f = Number(factor || 4.2);
    if (isNaN(b) || isNaN(f) || f <= 0) return 0;
    return b * f;
};
