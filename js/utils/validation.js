// Validation utilities for registration and login forms
class Validation {
    // Check email format
    // @param {string} email - Email to validate
    // @returns {boolean} True if email is valid
    static isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    // Check password strength
    // @param {string} password - Password to validate
    // @returns {Object} Validation result with message and isValid
    static validatePassword(password) {
        if (!password || password.length < 6) {
            return {
                isValid: false,
                message: "Password must be at least 6 characters long",
            };
        }

        if (!/[A-Z]/.test(password)) {
            return {
                isValid: false,
                message: "Password must contain at least one uppercase letter",
            };
        }

        if (!/[a-z]/.test(password)) {
            return {
                isValid: false,
                message: "Password must contain at least one lowercase letter",
            };
        }

        if (!/\d/.test(password)) {
            return {
                isValid: false,
                message: "Password must contain at least one number",
            };
        }

        return {
            isValid: true,
            message: "Password is valid",
        };
    }

    // Check username
    // @param {string} username - Username to validate
    // @returns {Object} Validation result
    static validateUsername(username) {
        if (!username || username.trim().length === 0) {
            return {
                isValid: false,
                message: "Username is required",
            };
        }

        if (username.length < 3) {
            return {
                isValid: false,
                message: "Username must be at least 3 characters long",
            };
        }

        return {
            isValid: true,
            message: "Username is valid",
        };
    }

    // Validate signup form
    // @param {Object} formData - Form data
    // @returns {Object} Combined validation result
    static validateSignupForm(formData) {
        const errors = {};

        // Validate email
        if (!formData.email || !this.isValidEmail(formData.email)) {
            errors.email = "Please enter a valid email address";
        }

        // Validate password
        const passwordValidation = this.validatePassword(formData.password);
        if (!passwordValidation.isValid) {
            errors.password = passwordValidation.message;
        }

        // Validate username (optional)
        if (formData.username) {
            const usernameValidation = this.validateUsername(formData.username);
            if (!usernameValidation.isValid) {
                errors.username = usernameValidation.message;
            }
        }

        return {
            isValid: Object.keys(errors).length === 0,
            errors,
        };
    }

    // Validate login form - Only email format and required fields
    // @param {Object} formData - Form data
    // @returns {Object} Validation result
    static validateLoginForm(formData) {
        const errors = {};

        // Validate email format only
        if (!formData.email || formData.email.trim() === "") {
            errors.email = "Email is required";
        } else if (!this.isValidEmail(formData.email)) {
            errors.email = "Please enter a valid email address";
        }

        // Validate password required only
        if (!formData.password || formData.password.trim() === "") {
            errors.password = "Password is required";
        }

        return {
            isValid: Object.keys(errors).length === 0,
            errors,
        };
    }
}

export default Validation;
