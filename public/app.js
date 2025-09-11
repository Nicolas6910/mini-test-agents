/**
 * Main Application Controller
 * Handles UI interactions and orchestrates API calls
 */

class UserManagementApp {
    constructor() {
        this.currentUsers = [];
        this.currentFilter = '';
        this.editingUserId = null;
        this.isLoading = false;

        // DOM elements cache
        this.elements = {};

        // Initialize the app
        this.init();
    }

    /**
     * Initialize the application
     */
    async init() {
        this.cacheElements();
        this.bindEvents();
        await this.checkApiHealth();
        await this.loadUsers();
    }

    /**
     * Cache DOM elements for better performance
     */
    cacheElements() {
        this.elements = {
            // Health indicator
            healthIndicator: document.getElementById('health-indicator'),
            healthText: document.querySelector('.health-text'),

            // Action buttons
            addUserBtn: document.getElementById('add-user-btn'),
            refreshBtn: document.getElementById('refresh-btn'),
            roleFilter: document.getElementById('role-filter'),

            // States
            loadingState: document.getElementById('loading-state'),
            errorState: document.getElementById('error-state'),
            emptyState: document.getElementById('empty-state'),
            errorMessage: document.getElementById('error-message'),
            retryBtn: document.getElementById('retry-btn'),

            // Users table
            usersContainer: document.getElementById('users-container'),
            usersTable: document.getElementById('users-table'),
            usersTbody: document.getElementById('users-tbody'),
            usersCount: document.getElementById('users-count'),

            // User modal
            userModal: document.getElementById('user-modal'),
            userForm: document.getElementById('user-form'),
            modalTitle: document.getElementById('modal-title'),
            closeModalBtn: document.getElementById('close-modal-btn'),
            cancelBtn: document.getElementById('cancel-btn'),
            saveBtn: document.getElementById('save-btn'),

            // Form fields
            userName: document.getElementById('user-name'),
            userEmail: document.getElementById('user-email'),
            userRole: document.getElementById('user-role'),

            // Form errors
            nameError: document.getElementById('name-error'),
            emailError: document.getElementById('email-error'),

            // Confirm modal
            confirmModal: document.getElementById('confirm-modal'),
            confirmMessage: document.getElementById('confirm-message'),
            confirmUserName: document.getElementById('confirm-user-name'),
            confirmUserEmail: document.getElementById('confirm-user-email'),
            confirmCancelBtn: document.getElementById('confirm-cancel-btn'),
            confirmDeleteBtn: document.getElementById('confirm-delete-btn'),

            // Toast container
            toastContainer: document.getElementById('toast-container')
        };
    }

    /**
     * Bind event listeners
     */
    bindEvents() {
        // Action buttons
        this.elements.addUserBtn.addEventListener('click', () => this.showUserModal());
        this.elements.refreshBtn.addEventListener('click', () => this.loadUsers());
        this.elements.roleFilter.addEventListener('change', (e) => this.handleFilterChange(e.target.value));
        this.elements.retryBtn.addEventListener('click', () => this.loadUsers());

        // Modal events
        this.elements.closeModalBtn.addEventListener('click', () => this.hideUserModal());
        this.elements.cancelBtn.addEventListener('click', () => this.hideUserModal());
        this.elements.userModal.addEventListener('click', (e) => {
            if (e.target === this.elements.userModal || e.target.classList.contains('modal-backdrop')) {
                this.hideUserModal();
            }
        });

        // Form submission
        this.elements.userForm.addEventListener('submit', (e) => this.handleFormSubmit(e));

        // Confirm modal events
        this.elements.confirmCancelBtn.addEventListener('click', () => this.hideConfirmModal());
        this.elements.confirmDeleteBtn.addEventListener('click', () => this.confirmDelete());
        this.elements.confirmModal.addEventListener('click', (e) => {
            if (e.target === this.elements.confirmModal || e.target.classList.contains('modal-backdrop')) {
                this.hideConfirmModal();
            }
        });

        // Form validation
        this.elements.userName.addEventListener('blur', () => this.validateName());
        this.elements.userEmail.addEventListener('blur', () => this.validateEmail());

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hideUserModal();
                this.hideConfirmModal();
            }
            if (e.ctrlKey || e.metaKey) {
                if (e.key === 'n') {
                    e.preventDefault();
                    this.showUserModal();
                }
                if (e.key === 'r') {
                    e.preventDefault();
                    this.loadUsers();
                }
            }
        });
    }

    /**
     * Check API health status
     */
    async checkApiHealth() {
        try {
            await apiClient.checkHealth();
            this.updateHealthStatus(true);
        } catch (error) {
            this.updateHealthStatus(false, error.getUserMessage());
        }
    }

    /**
     * Update health indicator UI
     */
    updateHealthStatus(isHealthy, errorMessage = '') {
        this.elements.healthIndicator.classList.toggle('healthy', isHealthy);
        this.elements.healthIndicator.classList.toggle('error', !isHealthy);
        this.elements.healthText.textContent = isHealthy ? 'API en ligne' : 'API hors ligne';
        
        if (!isHealthy && errorMessage) {
            this.elements.healthIndicator.setAttribute('title', errorMessage);
        }
    }

    /**
     * Load users from API
     */
    async loadUsers() {
        if (this.isLoading) return;

        this.setLoadingState(true);
        this.hideError();

        try {
            const filters = {};
            if (this.currentFilter) {
                filters.role = this.currentFilter;
            }

            const response = await apiClient.getUsers(filters);
            this.currentUsers = response.data || [];
            this.renderUsers();
            this.updateUsersCount(response.total || this.currentUsers.length);

        } catch (error) {
            console.error('Error loading users:', error);
            this.showError(error.getUserMessage());
            await this.checkApiHealth(); // Update health status
        } finally {
            this.setLoadingState(false);
        }
    }

    /**
     * Render users table
     */
    renderUsers() {
        const tbody = this.elements.usersTbody;
        
        if (this.currentUsers.length === 0) {
            this.showEmptyState();
            this.elements.usersContainer.style.display = 'none';
            return;
        }

        this.hideEmptyState();
        this.elements.usersContainer.style.display = 'block';

        tbody.innerHTML = this.currentUsers.map(user => `
            <tr data-user-id="${user.id}">
                <td>${user.id}</td>
                <td>${this.escapeHtml(user.name)}</td>
                <td>${this.escapeHtml(user.email)}</td>
                <td>
                    <span class="user-role ${user.role}">${user.role === 'admin' ? 'Administrateur' : 'Utilisateur'}</span>
                </td>
                <td>
                    <div class="table-actions">
                        <button 
                            class="btn-icon-only edit" 
                            onclick="app.editUser(${user.id})"
                            aria-label="Modifier ${this.escapeHtml(user.name)}"
                            title="Modifier cet utilisateur"
                        >
                            ✏️
                        </button>
                        <button 
                            class="btn-icon-only delete" 
                            onclick="app.showDeleteConfirm(${user.id})"
                            aria-label="Supprimer ${this.escapeHtml(user.name)}"
                            title="Supprimer cet utilisateur"
                        >
                            🗑️
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    /**
     * Show user modal for add/edit
     */
    showUserModal(user = null) {
        this.editingUserId = user ? user.id : null;
        
        // Update modal title
        this.elements.modalTitle.textContent = user ? 'Modifier l\'utilisateur' : 'Nouvel utilisateur';
        
        // Populate form fields
        if (user) {
            this.elements.userName.value = user.name;
            this.elements.userEmail.value = user.email;
            this.elements.userRole.value = user.role;
        } else {
            this.elements.userForm.reset();
        }

        // Clear validation errors
        this.clearFormErrors();

        // Show modal
        this.elements.userModal.setAttribute('aria-hidden', 'false');
        this.elements.userName.focus();

        // Prevent body scroll
        document.body.style.overflow = 'hidden';
    }

    /**
     * Hide user modal
     */
    hideUserModal() {
        this.elements.userModal.setAttribute('aria-hidden', 'true');
        this.editingUserId = null;
        
        // Allow body scroll
        document.body.style.overflow = '';
    }

    /**
     * Handle form submission
     */
    async handleFormSubmit(e) {
        e.preventDefault();
        
        if (this.isLoading) return;

        // Validate form
        if (!this.validateForm()) {
            return;
        }

        const formData = new FormData(e.target);
        const userData = {
            name: formData.get('name').trim(),
            email: formData.get('email').trim(),
            role: formData.get('role')
        };

        this.setSubmitLoading(true);

        try {
            if (this.editingUserId) {
                await apiClient.updateUser(this.editingUserId, userData);
                this.showToast('success', 'Utilisateur modifié', 'L\'utilisateur a été modifié avec succès.');
            } else {
                await apiClient.createUser(userData);
                this.showToast('success', 'Utilisateur créé', 'Le nouvel utilisateur a été créé avec succès.');
            }

            this.hideUserModal();
            await this.loadUsers();

        } catch (error) {
            console.error('Error saving user:', error);
            
            if (error.isValidationError() && error.details) {
                this.showFormErrors(error.details);
            } else {
                this.showToast('error', 'Erreur', error.getUserMessage());
            }
        } finally {
            this.setSubmitLoading(false);
        }
    }

    /**
     * Edit user
     */
    async editUser(userId) {
        try {
            const response = await apiClient.getUser(userId);
            this.showUserModal(response.data);
        } catch (error) {
            console.error('Error loading user:', error);
            this.showToast('error', 'Erreur', 'Impossible de charger les données de l\'utilisateur.');
        }
    }

    /**
     * Show delete confirmation
     */
    showDeleteConfirm(userId) {
        const user = this.currentUsers.find(u => u.id === userId);
        if (!user) return;

        this.elements.confirmUserName.textContent = user.name;
        this.elements.confirmUserEmail.textContent = user.email;
        this.elements.confirmDeleteBtn.setAttribute('data-user-id', userId);
        this.elements.confirmModal.setAttribute('aria-hidden', 'false');

        // Prevent body scroll
        document.body.style.overflow = 'hidden';
    }

    /**
     * Hide delete confirmation
     */
    hideConfirmModal() {
        this.elements.confirmModal.setAttribute('aria-hidden', 'true');
        
        // Allow body scroll
        document.body.style.overflow = '';
    }

    /**
     * Confirm delete action
     */
    async confirmDelete() {
        const userId = parseInt(this.elements.confirmDeleteBtn.getAttribute('data-user-id'));
        if (!userId) return;

        this.setDeleteLoading(true);

        try {
            await apiClient.deleteUser(userId);
            this.showToast('success', 'Utilisateur supprimé', 'L\'utilisateur a été supprimé avec succès.');
            this.hideConfirmModal();
            await this.loadUsers();

        } catch (error) {
            console.error('Error deleting user:', error);
            this.showToast('error', 'Erreur', error.getUserMessage());
        } finally {
            this.setDeleteLoading(false);
        }
    }

    /**
     * Handle filter change
     */
    async handleFilterChange(role) {
        this.currentFilter = role;
        await this.loadUsers();
    }

    /**
     * Validate form
     */
    validateForm() {
        const nameValid = this.validateName();
        const emailValid = this.validateEmail();
        return nameValid && emailValid;
    }

    /**
     * Validate name field
     */
    validateName() {
        const name = this.elements.userName.value.trim();
        const errorElement = this.elements.nameError;

        if (!name) {
            this.showFieldError(errorElement, 'Le nom est requis');
            return false;
        }

        if (name.length < 2 || name.length > 50) {
            this.showFieldError(errorElement, 'Le nom doit contenir entre 2 et 50 caractères');
            return false;
        }

        this.hideFieldError(errorElement);
        return true;
    }

    /**
     * Validate email field
     */
    validateEmail() {
        const email = this.elements.userEmail.value.trim();
        const errorElement = this.elements.emailError;
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!email) {
            this.showFieldError(errorElement, 'L\'email est requis');
            return false;
        }

        if (!emailRegex.test(email)) {
            this.showFieldError(errorElement, 'Veuillez entrer une adresse email valide');
            return false;
        }

        this.hideFieldError(errorElement);
        return true;
    }

    /**
     * Show field error
     */
    showFieldError(errorElement, message) {
        errorElement.textContent = message;
        errorElement.classList.add('show');
        errorElement.parentElement.querySelector('.form-input').style.borderColor = 'var(--color-danger)';
    }

    /**
     * Hide field error
     */
    hideFieldError(errorElement) {
        errorElement.classList.remove('show');
        errorElement.parentElement.querySelector('.form-input').style.borderColor = '';
    }

    /**
     * Show form errors from API validation
     */
    showFormErrors(errors) {
        errors.forEach(error => {
            const field = error.field || error.param;
            const message = error.message || error.msg;

            if (field === 'name') {
                this.showFieldError(this.elements.nameError, message);
            } else if (field === 'email') {
                this.showFieldError(this.elements.emailError, message);
            }
        });
    }

    /**
     * Clear form errors
     */
    clearFormErrors() {
        this.hideFieldError(this.elements.nameError);
        this.hideFieldError(this.elements.emailError);
    }

    /**
     * Set loading state
     */
    setLoadingState(loading) {
        this.isLoading = loading;
        this.elements.loadingState.setAttribute('aria-hidden', !loading);
        this.elements.refreshBtn.disabled = loading;
    }

    /**
     * Set submit button loading state
     */
    setSubmitLoading(loading) {
        this.elements.saveBtn.disabled = loading;
        this.elements.saveBtn.classList.toggle('btn-loading', loading);
    }

    /**
     * Set delete button loading state
     */
    setDeleteLoading(loading) {
        this.elements.confirmDeleteBtn.disabled = loading;
        this.elements.confirmDeleteBtn.classList.toggle('btn-loading', loading);
    }

    /**
     * Show error state
     */
    showError(message) {
        this.elements.errorMessage.textContent = message;
        this.elements.errorState.setAttribute('aria-hidden', 'false');
        this.elements.usersContainer.style.display = 'none';
        this.hideEmptyState();
    }

    /**
     * Hide error state
     */
    hideError() {
        this.elements.errorState.setAttribute('aria-hidden', 'true');
    }

    /**
     * Show empty state
     */
    showEmptyState() {
        this.elements.emptyState.setAttribute('aria-hidden', 'false');
    }

    /**
     * Hide empty state
     */
    hideEmptyState() {
        this.elements.emptyState.setAttribute('aria-hidden', 'true');
    }

    /**
     * Update users count
     */
    updateUsersCount(count) {
        const text = count === 0 ? 'Aucun utilisateur' : 
                    count === 1 ? '1 utilisateur' : 
                    `${count} utilisateurs`;
        this.elements.usersCount.textContent = text;
    }

    /**
     * Show toast notification
     */
    showToast(type = 'success', title, message, duration = 5000) {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };

        toast.innerHTML = `
            <div class="toast-icon">${icons[type] || icons.info}</div>
            <div class="toast-content">
                <div class="toast-title">${this.escapeHtml(title)}</div>
                ${message ? `<div class="toast-message">${this.escapeHtml(message)}</div>` : ''}
            </div>
            <button class="toast-close" onclick="this.parentElement.remove()" aria-label="Fermer la notification">×</button>
        `;

        this.elements.toastContainer.appendChild(toast);

        // Auto remove after duration
        setTimeout(() => {
            if (toast.parentElement) {
                toast.remove();
            }
        }, duration);
    }

    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new UserManagementApp();
});

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UserManagementApp;
}