class HttpRequest {
    constructor() {
        this.baseUrl = "https://spotify.f8team.dev/api";
        this.healthChecker = null;
        this.initHealthCheck();
    }

    // Initialize health checker instance
    async initHealthCheck() {
        try {
            const { default: HealthCheck } = await import("./healthCheck.js");
            this.healthChecker = new HealthCheck();
        } catch (error) {
            console.warn("[HttpRequest] HealthCheck not available:", error);
        }
    }

    // Check if server is healthy before making API calls
    async checkServerHealth() {
        if (!this.healthChecker) {
            // Fallback: direct health check if no health checker
            try {
                const response = await fetch(
                    "https://spotify.f8team.dev/health"
                );
                return response.ok;
            } catch (error) {
                return false;
            }
        }

        return this.healthChecker.isServerHealthy();
    }

    // Show error toast when server is down
    async showServerErrorToast() {
        try {
            const { default: toast } = await import("./toast.js");
            toast.error("Server is unavailable. Please try again later.");
        } catch (error) {
            console.error("[HttpRequest] Toast not available:", error);
            // Fallback to alert if toast fails
            alert("Server is unavailable. Please try again later.");
        }
    }

    async _send(path, method, data, options = {}) {
        try {
            // Check server health before API call
            const isServerHealthy = await this.checkServerHealth();
            if (!isServerHealthy) {
                await this.showServerErrorToast();
                throw new Error("SERVER_UNHEALTHY: Server is unavailable");
            }

            // Get access token from localStorage for authenticated requests
            const accessToken = localStorage.getItem("access_token");

            const _options = {
                method,
                headers: {
                    ...options.headers,
                    "Content-Type": "application/json",
                },
                ...options,
            };

            // Add Authorization header if access token exists and not explicitly disabled
            if (accessToken && !options.skipAuth) {
                _options.headers["Authorization"] = `Bearer ${accessToken}`;
            }

            if (data) {
                _options.body = JSON.stringify(data);
            }

            // Use custom baseURL if provided, otherwise use default
            const baseUrl = options.baseURL || this.baseUrl;
            const res = await fetch(`${baseUrl}${path}`, _options);
            const response = await res.json();

            if (!res.ok) {
                // Handle 401 Unauthorized - try to refresh token
                if (
                    res.status === 401 &&
                    accessToken &&
                    !options.skipAuth &&
                    !options.isRefreshRequest
                ) {
                    const refreshResult = await this.handleTokenRefresh();
                    if (refreshResult) {
                        // Retry the original request with new token
                        return await this._send(path, method, data, {
                            ...options,
                            isRefreshRequest: true,
                        });
                    }
                }

                const error = new Error(`HTTP ERROR: ${res.status}`);
                error.response = response;
                error.statusCode = res.status;
                throw error;
            }

            return response;
        } catch (error) {
            throw error;
        }
    }

    async get(path, options = {}) {
        return await this._send(path, "GET", null, options);
    }

    async post(path, data, options = {}) {
        return await this._send(path, "POST", data, options);
    }

    async put(path, data, options = {}) {
        return await this._send(path, "PUT", data, options);
    }

    async patch(path, data, options = {}) {
        return await this._send(path, "PATCH", data, options);
    }

    async delete(path, options = {}) {
        return await this._send(path, "DELETE", null, options);
    }

    // Force refresh health check
    async refreshHealthCheck() {
        if (this.healthChecker) {
            await this.healthChecker.manualCheck();
        }
    }

    // Get current server status
    getServerStatus() {
        if (this.healthChecker) {
            return this.healthChecker.getStatus();
        }
        return { isHealthy: false, lastCheck: null, retryCount: 0 };
    }

    // Check if user is authenticated
    isAuthenticated() {
        const accessToken = localStorage.getItem("access_token");
        return !!accessToken;
    }

    // Get current access token
    getAccessToken() {
        return localStorage.getItem("accessToken");
    }

    // Clear authentication data
    clearAuth() {
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        localStorage.removeItem("user");
    }

    // Handle token refresh when access token expires
    async handleTokenRefresh() {
        try {
            const refreshToken = localStorage.getItem("refresh_token");
            if (!refreshToken) {
                console.log("No refresh token available");
                this.clearAuth();
                return false;
            }

            console.log("Attempting to refresh access token...");

            // Call refresh token endpoint
            const response = await fetch(`${this.baseUrl}/auth/refresh`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    refresh_token: refreshToken,
                }),
            });

            if (response.ok) {
                const data = await response.json();

                // Update tokens
                if (data.access_token) {
                    localStorage.setItem("access_token", data.access_token);
                }
                if (data.refresh_token) {
                    localStorage.setItem("refresh_token", data.refresh_token);
                }

                console.log("Token refreshed successfully");
                return true;
            } else {
                console.log("Token refresh failed");
                this.clearAuth();
                return false;
            }
        } catch (error) {
            console.error("Error refreshing token:", error);
            this.clearAuth();
            return false;
        }
    }
}

const httpRequest = new HttpRequest();
export default httpRequest;
