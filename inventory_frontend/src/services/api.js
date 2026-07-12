import axios from "axios";

// Dynamically use the current page's hostname if the API URL points to localhost or 127.0.0.1.
// This allows other computers on the same local network to access the backend API.
const getBaseURL = () => {
    const envUrl = import.meta.env.VITE_API_URL;
    if (!envUrl) {
        return `http://${window.location.hostname}:5000/api`;
    }

    try {
        const url = new URL(envUrl);
        if (url.hostname === "localhost" || url.hostname === "127.0.0.1") {
            url.hostname = window.location.hostname;
            return url.toString().replace(/\/$/, "");
        }
    } catch (e) {
        // If not a full URL, return it as-is
    }
    return envUrl;
};

const api = axios.create({
    baseURL: getBaseURL(),
    headers: {
        "Content-Type": "application/json",
    },
});

// Global response interceptor for error handling
api.interceptors.response.use(
    (response) => response,
    (error) => {
        // Network/server down error
        if (!error.response) {
            error.response = {
                data: {
                    message: "Network Error: Server is unreachable. Please ensure the backend is running."
                }
            };
        } else if (error.response.data) {
            // Map the "error" field to "message" if "message" is missing
            if (!error.response.data.message) {
                error.response.data.message = error.response.data.error || "An unexpected error occurred.";
            }
        }
        return Promise.reject(error);
    }
);

export default api;