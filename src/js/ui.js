// UI Controller for managing interface interactions and animations
class UIController {
    constructor() {
        this.toastTimeout = null;
        this.init();
    }

    init() {
        console.log('Initializing UI Controller...');
        this.setupModalHandlers();
        this.setupToastHandler();
    }

    setupModalHandlers() {
        // Settings modal
        const settingsModal = document.getElementById('settings-modal');
        if (settingsModal) {
            settingsModal.addEventListener('click', (e) => {
                if (e.target === settingsModal) {
                    this.hideModal('settings-modal');
                }
            });
        }

        // About modal
        const aboutModal = document.getElementById('about-modal');
        if (aboutModal) {
            aboutModal.addEventListener('click', (e) => {
                if (e.target === aboutModal) {
                    this.hideModal('about-modal');
                }
            });
        }

        // Close modals with Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hideAllModals();
            }
        });
    }

    setupToastHandler() {
        const toastClose = document.getElementById('toast-close');
        if (toastClose) {
            toastClose.addEventListener('click', () => {
                this.hideToast();
            });
        }
    }

    showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('hidden');
            modal.classList.add('animate-fade-in');
            
            // Focus trap
            const focusableElements = modal.querySelectorAll('button, input, select, textarea, [tabindex]:not([tabindex=\"-1\"])');
            if (focusableElements.length > 0) {
                focusableElements[0].focus();
            }
        }
    }

    hideModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('hidden');
            modal.classList.remove('animate-fade-in');
        }
    }

    hideAllModals() {
        const modals = document.querySelectorAll('[id$=\"-modal\"]');
        modals.forEach(modal => {
            modal.classList.add('hidden');
            modal.classList.remove('animate-fade-in');
        });
    }

    showToast(title, message, type = 'info', duration = 4000) {
        const toast = document.getElementById('notification-toast');
        const toastIcon = document.getElementById('toast-icon');
        const toastTitle = document.getElementById('toast-title');
        const toastMessage = document.getElementById('toast-message');

        if (!toast || !toastIcon || !toastTitle || !toastMessage) return;

        // Clear existing timeout
        if (this.toastTimeout) {
            clearTimeout(this.toastTimeout);
        }

        // Set content
        toastTitle.textContent = title;
        toastMessage.textContent = message;

        // Set icon and colors based on type
        let iconClass, bgClass;
        switch (type) {
            case 'success':
                iconClass = 'fas fa-check-circle text-white';
                bgClass = 'bg-success-500';
                break;
            case 'warning':
                iconClass = 'fas fa-exclamation-triangle text-white';
                bgClass = 'bg-warning-500';
                break;
            case 'error':
                iconClass = 'fas fa-times-circle text-white';
                bgClass = 'bg-danger-500';
                break;
            default:
                iconClass = 'fas fa-info-circle text-white';
                bgClass = 'bg-primary-500';
        }

        toastIcon.className = `w-8 h-8 rounded-full flex items-center justify-center ${bgClass}`;
        toastIcon.innerHTML = `<i class="${iconClass}"></i>`;

        // Show toast
        toast.classList.remove('translate-x-full');
        toast.classList.add('translate-x-0');

        // Auto hide
        this.toastTimeout = setTimeout(() => {
            this.hideToast();
        }, duration);
    }

    hideToast() {
        const toast = document.getElementById('notification-toast');
        if (toast) {
            toast.classList.remove('translate-x-0');
            toast.classList.add('translate-x-full');
        }
        
        if (this.toastTimeout) {
            clearTimeout(this.toastTimeout);
            this.toastTimeout = null;
        }
    }

    showAbout() {
        const aboutModal = document.getElementById('about-modal');
        if (aboutModal) {
            aboutModal.innerHTML = `
                <div class="p-8">
                    <div class="text-center mb-6">
                        <div class="w-16 h-16 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                            <i class="fas fa-brain text-white text-2xl"></i>
                        </div>
                        <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">Focus Soundboard</h2>
                        <p class="text-gray-600 dark:text-gray-400">Version 1.0.0</p>
                    </div>
                    
                    <div class="space-y-4 text-center">
                        <p class="text-gray-700 dark:text-gray-300">
                            A modern Pomodoro timer with ambient soundboard designed for ADHD-friendly focus sessions.
                        </p>
                        
                        <div class="grid grid-cols-2 gap-4 text-sm">
                            <div class="p-3 bg-gray-50 dark:bg-gray-700 rounded-xl">
                                <i class="fas fa-clock text-primary-500 mb-2"></i>
                                <p class="font-medium text-gray-900 dark:text-white">Smart Timer</p>
                                <p class="text-gray-600 dark:text-gray-400">Customizable Pomodoro cycles</p>
                            </div>
                            <div class="p-3 bg-gray-50 dark:bg-gray-700 rounded-xl">
                                <i class="fas fa-music text-secondary-500 mb-2"></i>
                                <p class="font-medium text-gray-900 dark:text-white">Soundboard</p>
                                <p class="text-gray-600 dark:text-gray-400">Ambient sounds for focus</p>
                            </div>
                            <div class="p-3 bg-gray-50 dark:bg-gray-700 rounded-xl">
                                <i class="fas fa-bolt text-amber-500 mb-2"></i>
                                <p class="font-medium text-gray-900 dark:text-white">ADHD Mode</p>
                                <p class="text-gray-600 dark:text-gray-400">Shorter, flexible sessions</p>
                            </div>
                            <div class="p-3 bg-gray-50 dark:bg-gray-700 rounded-xl">
                                <i class="fas fa-save text-success-500 mb-2"></i>
                                <p class="font-medium text-gray-900 dark:text-white">Presets</p>
                                <p class="text-gray-600 dark:text-gray-400">Save sound combinations</p>
                            </div>
                        </div>
                        
                        <div class="pt-4 border-t border-gray-200 dark:border-gray-700">
                            <p class="text-xs text-gray-500 dark:text-gray-400">
                                Built with Electron.js, Tailwind CSS, and Howler.js
                            </p>
                        </div>
                    </div>
                    
                    <div class="flex justify-center mt-8">
                        <button onclick="window.focusApp.ui.hideModal('about-modal')" class="btn-primary">
                            <i class="fas fa-check mr-2"></i>Got it
                        </button>
                    </div>
                </div>
            `;
            this.showModal('about-modal');
        }
    }

    updateProgressCircle(percentage) {
        const circle = document.getElementById('progress-circle');
        if (circle) {
            const circumference = 703.7; // 2 * PI * 112 (radius)
            const offset = circumference - (percentage / 100) * circumference;
            circle.style.strokeDashoffset = offset;
        }
    }

    setProgressActive(isActive) {
        const circle = document.getElementById('progress-circle');
        if (circle) {
            if (isActive) {
                circle.classList.add('progress-circle-active');
            } else {
                circle.classList.remove('progress-circle-active');
            }
        }
    }

    animateElement(element, animation) {
        if (!element) return;
        
        element.classList.add(animation);
        
        // Remove animation class after animation completes
        setTimeout(() => {
            element.classList.remove(animation);
        }, 1000);
    }

    createLoadingSpinner(size = 'w-6 h-6') {
        const spinner = document.createElement('div');
        spinner.className = `loading-spinner ${size}`;
        return spinner;
    }

    showConfirmDialog(title, message, onConfirm, onCancel) {
        // Create and show confirmation dialog
        const dialog = document.createElement('div');
        dialog.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        dialog.innerHTML = `
            <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6">
                <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">${title}</h3>
                <p class="text-gray-600 dark:text-gray-400 mb-6">${message}</p>
                <div class="flex justify-end space-x-3">
                    <button id="cancel-btn" class="btn-ghost">Cancel</button>
                    <button id="confirm-btn" class="btn-danger">Confirm</button>
                </div>
            </div>
        `;

        document.body.appendChild(dialog);

        const cancelBtn = dialog.querySelector('#cancel-btn');
        const confirmBtn = dialog.querySelector('#confirm-btn');

        cancelBtn.addEventListener('click', () => {
            document.body.removeChild(dialog);
            if (onCancel) onCancel();
        });

        confirmBtn.addEventListener('click', () => {
            document.body.removeChild(dialog);
            if (onConfirm) onConfirm();
        });

        // Close on backdrop click
        dialog.addEventListener('click', (e) => {
            if (e.target === dialog) {
                document.body.removeChild(dialog);
                if (onCancel) onCancel();
            }
        });
    }

    // Utility methods for UI state management
    showElement(elementId) {
        const element = document.getElementById(elementId);
        if (element) {
            element.classList.remove('hidden');
        }
    }

    hideElement(elementId) {
        const element = document.getElementById(elementId);
        if (element) {
            element.classList.add('hidden');
        }
    }

    toggleElement(elementId) {
        const element = document.getElementById(elementId);
        if (element) {
            element.classList.toggle('hidden');
        }
    }

    setElementText(elementId, text) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = text;
        }
    }

    setElementHtml(elementId, html) {
        const element = document.getElementById(elementId);
        if (element) {
            element.innerHTML = html;
        }
    }

    addElementClass(elementId, className) {
        const element = document.getElementById(elementId);
        if (element) {
            element.classList.add(className);
        }
    }

    removeElementClass(elementId, className) {
        const element = document.getElementById(elementId);
        if (element) {
            element.classList.remove(className);
        }
    }

    toggleElementClass(elementId, className) {
        const element = document.getElementById(elementId);
        if (element) {
            element.classList.toggle(className);
        }
    }
}