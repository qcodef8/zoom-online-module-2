import httpRequest from "../utils/httpRequest.js";

// Health check API functions
class HealthCheckAPI {
    // Check server health endpoint
    async checkHealth() {
        try {
            const response = await httpRequest.get("/health");
            return { success: true, data: response };
        } catch (error) {
            return { success: false, error: error.response || error };
        }
    }

    // Test alternative endpoint
    async testEndpoint(endpoint = "/api") {
        try {
            const response = await httpRequest.get(endpoint);
            return { success: true, data: { endpoint: endpoint } };
        } catch (error) {
            return { success: false, error: error.response || error };
        }
    }

    // Check server health with fallback
    async checkHealthWithFallback() {
        // Try health endpoint first
        const healthResult = await this.checkHealth();
        if (healthResult.success) {
            return healthResult;
        }

        // Fallback to API endpoint
        const apiResult = await this.testEndpoint("/api");
        if (apiResult.success) {
            // Create mock health data for API endpoint
            const mockHealthData = {
                status: "OK",
                timestamp: new Date().toISOString(),
                uptime: 0,
                source: "api-fallback",
            };
            return { success: true, data: mockHealthData };
        }

        return { success: false, error: "All endpoints failed" };
    }
}

export default new HealthCheckAPI();
