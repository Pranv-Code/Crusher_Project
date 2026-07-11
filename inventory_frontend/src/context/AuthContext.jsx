import React, { createContext, useContext, useState, useEffect } from "react";
import api from "../services/api";
import { login as apiLogin, getMe as apiGetMe } from "../services/authApi";

const AuthContext = createContext();

export const useAuth = () => {
    return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem("token") || null);
    const [loading, setLoading] = useState(true);

    // Function to set or clear Authorization headers
    const setAuthHeader = (tok) => {
        if (tok) {
            api.defaults.headers.common["Authorization"] = `Bearer ${tok}`;
        } else {
            delete api.defaults.headers.common["Authorization"];
        }
    };

    // Load profile using token
    const fetchProfile = async (tok) => {
        setAuthHeader(tok);
        try {
            const res = await apiGetMe();
            setUser(res.data);
            setToken(tok);
        } catch (err) {
            console.error("Failed to fetch profile:", err);
            logoutUser();
        } finally {
            setLoading(false);
        }
    };

    // Triggered on page load / token changes
    useEffect(() => {
        const storedToken = localStorage.getItem("token");
        if (storedToken) {
            fetchProfile(storedToken);
        } else {
            setAuthHeader(null);
            setLoading(false);
        }

        // Axios interceptor for automatic logout on 401 responses
        const interceptor = api.interceptors.response.use(
            (response) => response,
            (error) => {
                if (error.response && error.response.status === 401) {
                    logoutUser();
                }
                return Promise.reject(error);
            }
        );

        return () => {
            api.interceptors.response.eject(interceptor);
        };
    }, []);

    // Login action
    const loginUser = async (username, password) => {
        setLoading(true);
        try {
            const res = await apiLogin({ username, password });
            const tok = res.data.token;
            localStorage.setItem("token", tok);
            await fetchProfile(tok);
            return res.data.user;
        } catch (err) {
            setLoading(false);
            throw err;
        }
    };

    // Logout action
    const logoutUser = () => {
        localStorage.removeItem("token");
        setToken(null);
        setUser(null);
        setAuthHeader(null);
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                token,
                loading,
                loginUser,
                logoutUser,
                isAuthenticated: !!user,
                isManager: user?.role === "Manager",
                isClerk: user?.role === "Clerk"
            }}
        >
            {!loading && children}
        </AuthContext.Provider>
    );
};
