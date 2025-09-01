import toast from "./toast.js";
import authAPI from "../api/authentication.js";

/**
 * Quản lý trạng thái authentication và UI
 */
class AuthManager {
    constructor() {
        this.currentUser = null;
        this.init();
    }

    /**
     * Initialize auth manager
     */
    async init() {
        // Check if user is already logged in
        if (authAPI.isLoggedIn()) {
            await this.loadCurrentUser();
        }

        this.updateUI();
        this.setupEventListeners();
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Handle signup form
        const signupForm = document.querySelector("#signupForm form");
        if (signupForm) {
            signupForm.addEventListener("submit", (e) => this.handleSignup(e));
            // Add event listener for Enter key on inputs
            this.setupFormEnterKey(signupForm, "signup");
        }

        // Handle login form
        const loginForm = document.querySelector("#loginForm form");
        if (loginForm) {
            loginForm.addEventListener("submit", (e) => this.handleLogin(e));
            // Add event listener for Enter key on inputs
            this.setupFormEnterKey(loginForm, "login");
        }

        // Handle logout
        const logoutBtn = document.getElementById("logoutBtn");
        if (logoutBtn) {
            logoutBtn.addEventListener("click", () => this.handleLogout());
        }

        // Handle real-time input validation
        this.setupInputValidation();

        // Handle password toggle
        this.setupPasswordToggle();
    }

    /**
     * Setup validation for input fields
     */
    setupInputValidation() {
        // Email validation for signup
        const signupEmail = document.getElementById("signupEmail");
        if (signupEmail) {
            signupEmail.addEventListener("blur", () =>
                this.validateField("signupEmail", "email")
            );
            signupEmail.addEventListener("input", () =>
                this.clearFieldError("signupEmail")
            );
        }

        // Password validation for signup
        const signupPassword = document.getElementById("signupPassword");
        if (signupPassword) {
            signupPassword.addEventListener("blur", () =>
                this.validateField("signupPassword", "password")
            );
            signupPassword.addEventListener("input", () =>
                this.clearFieldError("signupPassword")
            );
        }

        // Email validation for login
        const loginEmail = document.getElementById("loginEmail");
        if (loginEmail) {
            loginEmail.addEventListener("blur", () =>
                this.validateField("loginEmail", "email")
            );
            loginEmail.addEventListener("input", () =>
                this.clearFieldError("loginEmail")
            );
        }

        // Password validation for login
        const loginPassword = document.getElementById("loginPassword");
        if (loginPassword) {
            loginPassword.addEventListener("blur", () =>
                this.validateField("loginPassword", "password")
            );
            loginPassword.addEventListener("input", () =>
                this.clearFieldError("loginPassword")
            );
        }
    }

    /**
     * Handle signup
     */
    async handleSignup(e) {
        e.preventDefault();

        const formData = new FormData(e.target);
        const userData = {
            email:
                formData.get("email") ||
                document.getElementById("signupEmail").value,
            password:
                formData.get("password") ||
                document.getElementById("signupPassword").value,
            username:
                formData.get("username") ||
                document.getElementById("signupUsername")?.value,
        };

        // Validation
        const validation = await this.validateSignupForm(userData);
        if (!validation.isValid) {
            console.log("Validation failed:", validation.errors); // Debug log
            return;
        }

        try {
            // Call signup API
            const result = await authAPI.register(userData);

            if (result.success) {
                // Signup successful
                toast.success("Account created successfully!");

                // Auto login
                await this.handleLoginAfterSignup(userData);

                // Close modal
                this.closeAuthModal();
            } else {
                // Handle API errors
                this.handleAPIError(result.error, "signup");
            }
        } catch (error) {
            toast.error("An error occurred during registration");
            console.error("Signup error:", error);
        }
    }

    /**
     * Handle login after successful signup
     */
    async handleLoginAfterSignup(userData) {
        try {
            const result = await authAPI.login(userData);

            if (result.success) {
                authAPI.setTokens(result.data);

                // Load user information
                await this.loadCurrentUser();

                // Update UI
                this.updateUI();

                toast.success("Welcome! You are now logged in.");
            }
        } catch (error) {
            console.error("Auto-login error:", error);
        }
    }

    /**
     * Handle login
     */
    async handleLogin(e) {
        e.preventDefault();

        const formData = new FormData(e.target);
        const credentials = {
            email:
                formData.get("email") ||
                document.getElementById("loginEmail").value,
            password:
                formData.get("password") ||
                document.getElementById("loginPassword").value,
        };

        // Validation
        const validation = await this.validateLoginForm(credentials);
        if (!validation.isValid) {
            console.log("Login validation failed:", validation.errors); // Debug log
            return;
        }

        try {
            // Call login API
            const result = await authAPI.login(credentials);

            if (result.success) {
                // Save tokens (both access and refresh)
                authAPI.setTokens(result.data);

                // Load user information
                await this.loadCurrentUser();

                // Update UI
                this.updateUI();

                // Close modal
                this.closeAuthModal();

                toast.success("Login successful!");

                // Notify home page about login success
                this.notifyLoginSuccess();
            } else {
                // Handle API errors
                this.handleAPIError(result.error, "login");
            }
        } catch (error) {
            toast.error("An error occurred during login");
            console.error("Login error:", error);
        }
    }

    /**
     * Handle logout
     */
    handleLogout() {
        authAPI.logout();
        this.currentUser = null;
        this.updateUI();
        toast.info("You have been logged out");

        // Notify home page about logout
        this.notifyLogout();
    }

    /**
     * Load current user information
     */
    async loadCurrentUser() {
        try {
            const result = await authAPI.getCurrentUser();
            if (result.success) {
                this.currentUser = result.data;
            }
        } catch (error) {
            console.error("Error loading current user:", error);
        }
    }

    /**
     * Update UI based on authentication status
     */
    updateUI() {
        const authButtons = document.querySelector(".auth-buttons");
        const userMenu = document.querySelector(".user-menu");

        if (authAPI.isLoggedIn() && this.currentUser) {
            // Hide login/signup buttons
            if (authButtons) {
                authButtons.style.display = "none";
            }

            // Show user menu
            if (userMenu) {
                userMenu.style.display = "flex";

                // Update avatar and name
                const userAvatar = userMenu.querySelector(".user-avatar img");
                const userName =
                    this.currentUser.username || this.currentUser.email;

                if (userAvatar) {
                    userAvatar.alt = userName;
                    // Could set src for avatar if available
                }

                // Update tooltip or text to display name
                userAvatar?.setAttribute("title", userName);
            }
        } else {
            // Show login/signup buttons
            if (authButtons) {
                authButtons.style.display = "flex";
            }

            // Hide user menu
            if (userMenu) {
                userMenu.style.display = "none";
            }
        }
    }

    /**
     * Validate signup form
     */
    async validateSignupForm(userData) {
        // Import validation utility
        const { default: Validation } = await import("./validation.js");

        const validation = Validation.validateSignupForm(userData);

        if (!validation.isValid) {
            // Show errors for each field
            Object.keys(validation.errors).forEach((field) => {
                this.showFieldError(field, validation.errors[field]);
            });
        }

        return validation;
    }

    /**
     * Validate login form
     */
    async validateLoginForm(credentials) {
        // Import validation utility
        const { default: Validation } = await import("./validation.js");

        const validation = Validation.validateLoginForm(credentials);

        if (!validation.isValid) {
            // Show errors for each field
            Object.keys(validation.errors).forEach((field) => {
                this.showFieldError(field, validation.errors[field]);
            });
        }

        return validation;
    }

    /**
     * Validate individual field
     */
    async validateField(fieldId, fieldType) {
        const field = document.getElementById(fieldId);
        if (!field) return;

        const value = field.value;
        let isValid = true;
        let message = "";

        // Import validation utility
        const { default: Validation } = await import("./validation.js");

        if (fieldType === "email") {
            isValid = Validation.isValidEmail(value);
            message = isValid ? "" : "Please enter a valid email address";
        } else if (fieldType === "password") {
            // For login form, only check if password is not empty
            // For signup form, check password strength
            const fieldId = field.id;
            if (fieldId === "loginPassword") {
                isValid = value && value.trim().length > 0;
                message = isValid ? "" : "Password is required";
            } else {
                const passwordValidation = Validation.validatePassword(value);
                isValid = passwordValidation.isValid;
                message = passwordValidation.message;
            }
        }

        if (!isValid) {
            this.showFieldError(fieldId, message);
        } else {
            this.clearFieldError(fieldId);
        }

        return isValid;
    }

    /**
     * Show field error
     */
    showFieldError(fieldId, message) {
        const field = document.getElementById(fieldId);
        if (field) {
            const formGroup = field.closest(".form-group");
            if (formGroup) {
                formGroup.classList.add("invalid");
                const errorMessage = formGroup.querySelector(
                    ".error-message span"
                );
                if (errorMessage) {
                    errorMessage.textContent = message;
                }
            }
        }
    }

    /**
     * Map field name from API error to field ID
     */
    mapFieldNameToId(fieldName, formType) {
        const fieldMap = {
            email: `${formType}Email`,
            password: `${formType}Password`,
            username: `${formType}Username`,
        };
        return fieldMap[fieldName] || fieldName;
    }

    /**
     * Clear field error
     */
    clearFieldError(fieldId) {
        const field = document.getElementById(fieldId);
        if (field) {
            const formGroup = field.closest(".form-group");
            if (formGroup) {
                formGroup.classList.remove("invalid");
            }
        }
    }

    /**
     * Handle API errors
     */
    handleAPIError(error, formType) {
        // Extract error details from the error object
        // Server returns: { error: { code, message, details? } }
        const errorData = error.response || error;
        const errorInfo = errorData.error || errorData;

        // Try multiple ways to get error code and message
        const errorCode = errorInfo.code || errorData.code || error.code;
        const errorMessage =
            errorInfo.message ||
            errorData.message ||
            error.message ||
            "An error occurred";

        console.log("API Error Debug:", {
            originalError: error,
            errorData,
            errorInfo,
            errorCode,
            errorMessage,
        });

        if (errorCode === "EMAIL_EXISTS") {
            toast.error(errorMessage);
            const fieldId = this.mapFieldNameToId("email", formType);
            this.showFieldError(fieldId, "Email already exists");
        } else if (errorCode === "INVALID_CREDENTIALS") {
            // For login form, show warning toast and clear form errors
            if (formType === "login") {
                toast.warning("Invalid email or password");
                this.clearLoginFormErrors();
            } else {
                toast.error("Invalid email or password");
            }
        } else if (errorCode === "VALIDATION_ERROR") {
            if (errorInfo.details || errorData.details) {
                const details = errorInfo.details || errorData.details;
                details.forEach((detail) => {
                    const fieldId = this.mapFieldNameToId(
                        detail.field,
                        formType
                    );
                    this.showFieldError(fieldId, detail.message);
                });
            } else {
                toast.error(errorMessage);
            }
        } else {
            // Check if this might be an INVALID_CREDENTIALS error with different structure
            if (
                formType === "login" &&
                (errorMessage.toLowerCase().includes("invalid") ||
                    errorMessage.toLowerCase().includes("password") ||
                    errorMessage.toLowerCase().includes("email"))
            ) {
                toast.warning("Invalid email or password");
                this.clearLoginFormErrors();
            } else {
                toast.error(errorMessage);
            }
        }
    }

    /**
     * Close authentication modal
     */
    closeAuthModal() {
        const modal = document.getElementById("authModal");
        if (modal) {
            modal.classList.remove("show");
            document.body.style.overflow = "auto";

            // Clear all invalid states when closing modal
            this.clearAllFormErrors();
        }
    }

    /**
     * Clear all form errors when closing modal
     */
    clearAllFormErrors() {
        // Clear errors for signup form
        this.clearFieldError("signupEmail");
        this.clearFieldError("signupPassword");

        // Clear errors for login form
        this.clearFieldError("loginEmail");
        this.clearFieldError("loginPassword");

        // Remove all invalid classes from form groups
        const allFormGroups = document.querySelectorAll(".form-group");
        allFormGroups.forEach((group) => {
            group.classList.remove("invalid");
        });

        // Reset error messages to default
        this.resetErrorMessages();

        // Clear form data
        this.clearFormData();

        // Reset password toggle to hidden state
        this.resetPasswordToggle();
    }

    /**
     * Clear form errors and data for login form only
     */
    clearLoginFormErrors() {
        // Clear errors for login form
        this.clearFieldError("loginEmail");
        this.clearFieldError("loginPassword");

        // Remove invalid classes from login form groups
        const loginFormGroups = document.querySelectorAll(
            "#loginForm .form-group"
        );
        loginFormGroups.forEach((group) => {
            group.classList.remove("invalid");
        });

        // Reset login form error messages to default
        const loginEmailError = document.querySelector(
            "#loginForm .form-group:first-child .error-message span"
        );
        if (loginEmailError) {
            loginEmailError.textContent = "Email is required";
        }

        const loginPasswordError = document.querySelector(
            "#loginForm .form-group:nth-child(2) .error-message span"
        );
        if (loginPasswordError) {
            loginPasswordError.textContent = "Password is required";
        }

        // Clear login form data
        const loginEmail = document.getElementById("loginEmail");
        const loginPassword = document.getElementById("loginPassword");
        if (loginEmail) loginEmail.value = "";
        if (loginPassword) loginPassword.value = "";

        // Reset login password toggle
        const loginPasswordToggle = document.getElementById(
            "loginPasswordToggle"
        );
        if (loginPasswordToggle && loginPassword) {
            loginPassword.type = "password";
            loginPasswordToggle.innerHTML = '<i class="fas fa-eye"></i>';
            loginPasswordToggle.classList.remove("showing");
        }
    }

    /**
     * Reset error messages to default
     */
    resetErrorMessages() {
        // Reset signup form error messages
        const signupEmailError = document.querySelector(
            "#signupForm .form-group:first-child .error-message span"
        );
        if (signupEmailError) {
            signupEmailError.textContent = "Please enter a valid email address";
        }

        const signupPasswordError = document.querySelector(
            "#signupForm .form-group:nth-child(2) .error-message span"
        );
        if (signupPasswordError) {
            signupPasswordError.textContent =
                "Password must be at least 6 characters with uppercase, lowercase and number";
        }

        // Reset login form error messages
        const loginEmailError = document.querySelector(
            "#loginForm .form-group:first-child .error-message span"
        );
        if (loginEmailError) {
            loginEmailError.textContent = "Email is required";
        }

        const loginPasswordError = document.querySelector(
            "#loginForm .form-group:nth-child(2) .error-message span"
        );
        if (loginPasswordError) {
            loginPasswordError.textContent = "Password is required";
        }
    }

    /**
     * Clear form data when closing modal
     */
    clearFormData() {
        // Clear signup form
        const signupEmail = document.getElementById("signupEmail");
        const signupPassword = document.getElementById("signupPassword");

        if (signupEmail) signupEmail.value = "";
        if (signupPassword) signupPassword.value = "";

        // Clear login form
        const loginEmail = document.getElementById("loginEmail");
        const loginPassword = document.getElementById("loginPassword");

        if (loginEmail) loginEmail.value = "";
        if (loginPassword) loginPassword.value = "";

        // Reset password toggle to hidden state
        this.resetPasswordToggle();
    }

    /**
     * Check if user is logged in
     */
    isLoggedIn() {
        return authAPI.isLoggedIn();
    }

    /**
     * Get current user information
     */
    getCurrentUser() {
        return this.currentUser;
    }

    /**
     * Setup Enter key for form
     */
    setupFormEnterKey(form, formType) {
        const inputs = form.querySelectorAll(
            'input[type="email"], input[type="password"]'
        );

        inputs.forEach((input) => {
            input.addEventListener("keydown", (e) => {
                if (e.key === "Enter") {
                    e.preventDefault();

                    // Instead of calling API directly, just submit form
                    // Form submit event will be handled by existing event listener
                    form.requestSubmit();
                }
            });
        });
    }

    /**
     * Setup password toggle for all password fields
     */
    setupPasswordToggle() {
        // Setup for signup password
        const signupPasswordToggle = document.getElementById(
            "signupPasswordToggle"
        );
        const signupPassword = document.getElementById("signupPassword");

        if (signupPasswordToggle && signupPassword) {
            signupPasswordToggle.addEventListener("click", () => {
                this.togglePasswordVisibility(
                    signupPassword,
                    signupPasswordToggle
                );
            });
        }

        // Setup for login password
        const loginPasswordToggle = document.getElementById(
            "loginPasswordToggle"
        );
        const loginPassword = document.getElementById("loginPassword");

        if (loginPasswordToggle && loginPassword) {
            loginPasswordToggle.addEventListener("click", () => {
                this.togglePasswordVisibility(
                    loginPassword,
                    loginPasswordToggle
                );
            });
        }
    }

    /**
     * Toggle password visibility
     */
    togglePasswordVisibility(passwordInput, toggleButton) {
        const isPasswordVisible = passwordInput.type === "text";

        if (isPasswordVisible) {
            // Hide password
            passwordInput.type = "password";
            toggleButton.innerHTML = '<i class="fas fa-eye"></i>';
            toggleButton.classList.remove("showing");
        } else {
            // Show password
            passwordInput.type = "text";
            toggleButton.innerHTML = '<i class="fas fa-eye-slash"></i>';
            toggleButton.classList.add("showing");
        }

        // Focus back to input so user can continue typing
        passwordInput.focus();
    }

    /**
     * Reset password toggle to hidden state
     */
    resetPasswordToggle() {
        // Reset signup password toggle
        const signupPasswordToggle = document.getElementById(
            "signupPasswordToggle"
        );
        const signupPassword = document.getElementById("signupPassword");

        if (signupPasswordToggle && signupPassword) {
            signupPassword.type = "password";
            signupPasswordToggle.innerHTML = '<i class="fas fa-eye"></i>';
            signupPasswordToggle.classList.remove("showing");
        }

        // Reset login password toggle
        const loginPasswordToggle = document.getElementById(
            "loginPasswordToggle"
        );
        const loginPassword = document.getElementById("loginPassword");

        if (loginPasswordToggle && loginPassword) {
            loginPassword.type = "password";
            loginPasswordToggle.innerHTML = '<i class="fas fa-eye"></i>';
            loginPasswordToggle.classList.remove("showing");
        }
    }

    /**
     * Notify home page about login success
     */
    notifyLoginSuccess() {
        // Dispatch custom event
        const event = new CustomEvent("auth:loginSuccess", {
            detail: { user: this.currentUser },
        });
        document.dispatchEvent(event);

        // Also call global function if exists
        if (
            window.onLoginSuccess &&
            typeof window.onLoginSuccess === "function"
        ) {
            window.onLoginSuccess();
        }
    }

    /**
     * Notify home page about logout
     */
    notifyLogout() {
        // Dispatch custom event
        const event = new CustomEvent("auth:logout", {
            detail: { user: this.currentUser },
        });
        document.dispatchEvent(event);

        // Also call global function if exists
        if (window.onLogout && typeof window.onLogout === "function") {
            window.onLogout();
        }
    }
}

export default new AuthManager();
