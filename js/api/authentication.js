import httpRequest from "../utils/httpRequest.js";

class AuthenticationAPI {
    constructor() {
        this.baseUrl = "/auth";
    }

    // Register new account
    // @param {Object} userData - Registration info
    // @param {string} userData.email - Email for registration
    // @param {string} userData.password - Password
    // @param {string} userData.username - Username (optional)
    // @returns {Promise<Object>} API response
    async register(userData) {
        try {
            const response = await httpRequest.post(
                `${this.baseUrl}/register`,
                userData
            );
            return { success: true, data: response };
        } catch (error) {
            return { success: false, error: error.response || error };
        }
    }

    // Login
    // @param {Object} credentials - Login credentials
    // @param {string} credentials.email - Login email
    // @param {string} credentials.password - Password
    // @returns {Promise<Object>} API response
    async login(credentials) {
        try {
            const response = await httpRequest.post(
                `${this.baseUrl}/login`,
                credentials
            );
            return { success: true, data: response };
        } catch (error) {
            return { success: false, error: error.response || error };
        }
    }

    // Get current user info
    // @returns {Promise<Object>} API response
    async getCurrentUser() {
        try {
            const token = this.getAccessToken();
            if (!token) {
                return {
                    success: false,
                    error: { message: "No access token found" },
                };
            }

            const response = await httpRequest.get("/api/users/me");
            return { success: true, data: response };
        } catch (error) {
            return { success: false, error: error.response || error };
        }
    }

    // Save tokens to localStorage
    // @param {Object} tokens - Token data
    // @param {string} tokens.access_token - Access token
    // @param {string} tokens.refresh_token - Refresh token (optional)
    setTokens(tokens) {
        if (tokens.access_token) {
            localStorage.setItem("access_token", tokens.access_token);
        }
        if (tokens.refresh_token) {
            localStorage.setItem("refresh_token", tokens.refresh_token);
        }
    }

    // Save access token to localStorage (backward compatibility)
    // @param {string} token - Access token
    setAccessToken(token) {
        localStorage.setItem("access_token", token);
    }

    // Get access token from localStorage
    // @returns {string|null} Access token or null
    getAccessToken() {
        return localStorage.getItem("access_token");
    }

    // Get refresh token from localStorage
    // @returns {string|null} Refresh token or null
    getRefreshToken() {
        return localStorage.getItem("refresh_token");
    }

    // Remove all tokens from localStorage
    removeTokens() {
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
    }

    // Remove access token from localStorage (backward compatibility)
    removeAccessToken() {
        localStorage.removeItem("access_token");
    }

    // Check if user is logged in
    // @returns {boolean} True if logged in
    isLoggedIn() {
        return !!this.getAccessToken();
    }

    // Logout
    logout() {
        this.removeTokens();
    }
}

export default new AuthenticationAPI();
