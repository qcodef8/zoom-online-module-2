// Toast notification utility
class Toast {
    constructor() {
        this.createToastContainer();
    }

    // Create toast container if not exists
    createToastContainer() {
        if (!document.getElementById("toast-container")) {
            const container = document.createElement("div");
            container.id = "toast-container";
            container.className = "toast-container";
            document.body.appendChild(container);
        }
    }

    // Show toast message
    // @param {string} message - Message content
    // @param {string} type - Toast type: 'success', 'error', 'info'
    // @param {number} duration - Display duration (ms), default 3000ms
    show(message, type = "info", duration = 3000) {
        const container = document.getElementById("toast-container");

        const toast = document.createElement("div");
        toast.className = `toast toast-${type}`;

        // Icons for different toast types
        const iconMap = {
            success: "fas fa-check-circle",
            error: "fas fa-exclamation-circle",
            warning: "fas fa-exclamation-triangle",
            info: "fas fa-info-circle",
        };

        toast.innerHTML = `
            <i class="${iconMap[type] || iconMap.info}"></i>
            <span class="toast-message">${message}</span>
            <button class="toast-close">
                <i class="fas fa-times"></i>
            </button>
        `;

        container.appendChild(toast);

        // Show toast with animation
        setTimeout(() => {
            toast.classList.add("show");
        }, 100);

        // Auto hide after duration
        const autoHide = setTimeout(() => {
            this.hide(toast);
        }, duration);

        // Handle close button
        const closeBtn = toast.querySelector(".toast-close");
        closeBtn.addEventListener("click", () => {
            clearTimeout(autoHide);
            this.hide(toast);
        });

        // Handle click on toast to close
        toast.addEventListener("click", (e) => {
            if (e.target !== closeBtn && !closeBtn.contains(e.target)) {
                clearTimeout(autoHide);
                this.hide(toast);
            }
        });
    }

    // Hide toast
    // @param {HTMLElement} toast - Toast element to hide
    hide(toast) {
        toast.classList.remove("show");
        toast.classList.add("hiding");

        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }

    // Show success toast
    // @param {string} message - Message content
    success(message) {
        this.show(message, "success");
    }

    // Show error toast
    // @param {string} message - Message content
    error(message) {
        this.show(message, "error");
    }

    // Show info toast
    // @param {string} message - Message content
    info(message) {
        this.show(message, "info");
    }

    // Show warning toast
    // @param {string} message - Message content
    warning(message) {
        this.show(message, "warning");
    }
}

const toast = new Toast();

// Export individual functions for easier use
export const showToast = (message, type = "info", duration = 3000) => {
    toast.show(message, type, duration);
};

export const showSuccessToast = (message, duration = 3000) => {
    toast.success(message, duration);
};

export const showErrorToast = (message, duration = 3000) => {
    toast.error(message, duration);
};

export const showInfoToast = (message, duration = 3000) => {
    toast.info(message, duration);
};

export default toast;
