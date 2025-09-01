// Health check utility for monitoring server status
class HealthCheck {
    constructor() {
        this.checkInterval = 30000; // 30 seconds
        this.isHealthy = true;
        this.lastCheck = null;
        this.retryCount = 0;
        this.maxRetries = 3;
        this.retryDelay = 5000; // 5 seconds
        this.statusIndicator = null;
        this.healthApi = null;
        // Initialize asynchronously
        this.init().catch((error) => {
            console.error("[HealthCheck] Initialization failed:", error);
        });
    }

    // Initialize health check system
    async init() {
        // Initialize health API
        try {
            const { default: healthApi } = await import(
                "../api/health-check.js"
            );
            this.healthApi = healthApi;
        } catch (error) {
            console.warn("[HealthCheck] HealthAPI not available:", error);
        }

        // Run in background without UI elements
        this.startPeriodicCheck();
        this.setupEventListeners();
    }

    // Create status indicator - DISABLED for background mode
    createStatusIndicator() {
        // No UI elements when running in background
        this.statusIndicator = null;
    }

    // Start periodic health checks
    startPeriodicCheck() {
        // Check immediately if healthApi is ready
        if (this.healthApi) {
            this.checkHealth();
        }

        // Set up interval
        setInterval(() => {
            if (this.healthApi) {
                this.checkHealth();
            }
        }, this.checkInterval);
    }

    // Check server health status
    async checkHealth() {
        if (!this.healthApi) {
            console.warn(
                "[HealthCheck] HealthAPI not available, skipping check"
            );
            return;
        }

        console.log(`[HealthCheck] Checking server health...`);

        try {
            const result = await this.healthApi.checkHealthWithFallback();

            if (result.success) {
                console.log(
                    `[HealthCheck] Health check successful:`,
                    result.data
                );
                this.handleHealthyStatus(result.data);
            } else {
                console.log(`[HealthCheck] Health check failed:`, result.error);
                this.handleUnhealthyStatus(result.error);
            }
        } catch (error) {
            console.error(`[HealthCheck] Health check error:`, error);
            this.handleUnhealthyStatus(error.message);
        }
    }

    // Test alternative endpoint to check if server is working
    async testEndpoint(endpoint = "/api") {
        if (!this.healthApi) {
            console.warn(
                "[HealthCheck] HealthAPI not available, cannot test endpoint"
            );
            return false;
        }

        console.log(`[HealthCheck] Testing endpoint: ${endpoint}`);

        try {
            const result = await this.healthApi.testEndpoint(endpoint);

            if (result.success) {
                console.log(`[HealthCheck] Test endpoint working: ${endpoint}`);
                return true;
            } else {
                console.log(`[HealthCheck] Test endpoint failed: ${endpoint}`);
                return false;
            }
        } catch (error) {
            console.error(
                `[HealthCheck] Test endpoint error: ${endpoint}`,
                error
            );
            return false;
        }
    }

    // Handle when server is healthy
    handleHealthyStatus(data) {
        this.isHealthy = true;
        this.retryCount = 0;
        this.lastCheck = new Date();

        console.log(`[HealthCheck] Server is healthy:`, data);

        // Display server info if available
        const uptime = data.uptime ? this.formatUptime(data.uptime) : "";
        const statusText = uptime
            ? `Server online (${uptime})`
            : "Server online";

        this.updateStatusIndicator("healthy", statusText);

        // Hide error toast if exists
        this.hideErrorToast();
    }

    // Handle when server has issues
    handleUnhealthyStatus(errorMessage) {
        this.isHealthy = false;
        this.retryCount++;

        console.log(`[HealthCheck] Server is unhealthy: ${errorMessage}`);

        this.updateStatusIndicator("unhealthy", "Server offline");

        // Show error toast
        this.showErrorToast(errorMessage);

        // Retry logic
        if (this.retryCount <= this.maxRetries) {
            setTimeout(() => {
                this.checkHealth();
            }, this.retryDelay);
        }
    }

    // Update status indicator - DISABLED for background mode
    updateStatusIndicator(status, text) {
        console.log(`[HealthCheck] ${status}: ${text}`);
        // No UI updates when running in background, just log
    }

    // Show error toast
    showErrorToast(errorMessage) {
        // Import toast utility
        import("./toast.js").then(({ default: toast }) => {
            toast.error(`Server connection failed: ${errorMessage}`);
        });
    }

    // Hide error toast
    hideErrorToast() {
        // Could implement logic to hide toast if needed
        console.log("[HealthCheck] Hiding error toast");
    }

    // Manual health check
    async manualCheck() {
        console.log("[HealthCheck] Manual check triggered");
        await this.checkHealth();
    }

    // Get current status
    getStatus() {
        return {
            isHealthy: this.isHealthy,
            lastCheck: this.lastCheck,
            retryCount: this.retryCount,
        };
    }

    // Check if server is healthy
    isServerHealthy() {
        console.log(
            `[HealthCheck] isServerHealthy called, returning:`,
            this.isHealthy
        );
        return this.isHealthy;
    }

    // Get last check time
    getLastCheckTime() {
        return this.lastCheck;
    }

    // Get current retry count
    getRetryCount() {
        return this.retryCount;
    }

    // Format uptime from seconds to human readable
    formatUptime(seconds) {
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);

        if (days > 0) {
            return `${days}d ${hours}h`;
        } else if (hours > 0) {
            return `${hours}h ${minutes}m`;
        } else {
            return `${minutes}m`;
        }
    }

    // Setup event listeners
    setupEventListeners() {
        // No click events when running in background

        // Listen for online/offline events
        window.addEventListener("online", () => {
            console.log("[HealthCheck] Network online, checking health...");
            this.checkHealth();
        });

        window.addEventListener("offline", () => {
            console.log("[HealthCheck] Network offline");
            this.handleUnhealthyStatus("Network offline");
        });
    }

    // Stop health check
    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
        }
    }
}

export default HealthCheck;
