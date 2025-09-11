/**
 * Frontend Tests for User Management Interface
 * Tests API integration, UI components, and user interactions
 */

const { JSDOM } = require('jsdom');
const fetch = require('node-fetch');

// Mock fetch for testing
global.fetch = fetch;

// Setup DOM environment
const dom = new JSDOM(`
<!DOCTYPE html>
<html>
<body>
    <div id="health-indicator">
        <div class="health-dot"></div>
        <span class="health-text">Checking...</span>
    </div>
    <div id="loading-state" aria-hidden="true"></div>
    <div id="error-state" aria-hidden="true">
        <p id="error-message"></p>
    </div>
    <div id="empty-state" aria-hidden="true"></div>
    <div id="users-container">
        <div id="users-count">0 utilisateurs</div>
        <table id="users-table">
            <tbody id="users-tbody"></tbody>
        </table>
    </div>
    <div id="user-modal" aria-hidden="true">
        <h2 id="modal-title">Nouvel Utilisateur</h2>
        <form id="user-form">
            <input type="text" id="user-name" name="name" />
            <input type="email" id="user-email" name="email" />
            <select id="user-role" name="role">
                <option value="user">User</option>
                <option value="admin">Admin</option>
            </select>
        </form>
        <button id="close-modal-btn"></button>
        <button id="cancel-btn"></button>
        <button id="save-btn" type="submit" form="user-form"></button>
    </div>
    <div id="confirm-modal" aria-hidden="true">
        <p id="confirm-message"></p>
        <strong id="confirm-user-name"></strong>
        <span id="confirm-user-email"></span>
        <button id="confirm-cancel-btn"></button>
        <button id="confirm-delete-btn"></button>
    </div>
    <div id="toast-container"></div>
    <button id="add-user-btn"></button>
    <button id="refresh-btn"></button>
    <select id="role-filter">
        <option value="">All</option>
        <option value="user">User</option>
        <option value="admin">Admin</option>
    </select>
    <button id="retry-btn"></button>
    <div id="name-error" class="form-error"></div>
    <div id="email-error" class="form-error"></div>
</body>
</html>
`, { url: 'http://localhost' });

global.window = dom.window;
global.document = dom.window.document;
global.FormData = dom.window.FormData;

// Load the API client and app
const fs = require('fs');
const path = require('path');

// Load and execute API client
const apiClientCode = fs.readFileSync(path.join(__dirname, '../public/api-client.js'), 'utf8');
eval(apiClientCode);

// Load and execute app
const appCode = fs.readFileSync(path.join(__dirname, '../public/app.js'), 'utf8');
eval(appCode);

describe('API Client Tests', () => {
    let client;

    beforeEach(() => {
        client = new ApiClient('http://localhost:3000');
    });

    describe('ApiError', () => {
        test('should create error with correct properties', () => {
            const error = new ApiError('Test error', 400, [{ field: 'email' }]);
            
            expect(error.message).toBe('Test error');
            expect(error.status).toBe(400);
            expect(error.details).toEqual([{ field: 'email' }]);
        });

        test('should identify network errors', () => {
            const error = new ApiError('Network error', 0);
            expect(error.isNetworkError()).toBe(true);
        });

        test('should identify validation errors', () => {
            const error = new ApiError('Validation failed', 400, [{ field: 'name' }]);
            expect(error.isValidationError()).toBe(true);
        });

        test('should provide user-friendly messages', () => {
            const networkError = new ApiError('Network error', 0);
            expect(networkError.getUserMessage()).toContain('se connecter au serveur');

            const validationError = new ApiError('Validation failed', 400);
            expect(validationError.getUserMessage()).toBe('Validation failed');

            const conflictError = new ApiError('Email exists', 409);
            expect(conflictError.getUserMessage()).toContain('email est déjà utilisée');
        });
    });

    describe('Data Validation', () => {
        test('should validate user data correctly', () => {
            // Valid data
            expect(client.validateUserData({
                name: 'John Doe',
                email: 'john@example.com',
                role: 'user'
            })).toBeNull();

            // Invalid name
            expect(client.validateUserData({
                name: 'J',
                email: 'john@example.com',
                role: 'user'
            })).toEqual({
                field: 'name',
                message: 'Name must be between 2 and 50 characters'
            });

            // Invalid email
            expect(client.validateUserData({
                name: 'John Doe',
                email: 'invalid-email',
                role: 'user'
            })).toEqual({
                field: 'email',
                message: 'Please enter a valid email address'
            });

            // Invalid role
            expect(client.validateUserData({
                name: 'John Doe',
                email: 'john@example.com',
                role: 'superuser'
            })).toEqual({
                field: 'role',
                message: 'Role must be either "user" or "admin"'
            });
        });

        test('should handle partial validation for updates', () => {
            // Partial update - only name
            expect(client.validateUserData({
                name: 'Updated Name'
            }, true)).toBeNull();

            // Partial update with invalid data
            expect(client.validateUserData({
                email: 'invalid-email'
            }, true)).toEqual({
                field: 'email',
                message: 'Please enter a valid email address'
            });
        });
    });

    describe('Cache functionality', () => {
        let cache;

        beforeEach(() => {
            cache = new ApiCache(1000); // 1 second TTL
        });

        test('should store and retrieve cached data', () => {
            const data = { test: 'data' };
            cache.set('test-key', data);
            
            expect(cache.get('test-key')).toEqual(data);
        });

        test('should return null for expired data', async () => {
            const data = { test: 'data' };
            cache.set('test-key', data);
            
            // Wait for expiration
            await new Promise(resolve => setTimeout(resolve, 1100));
            
            expect(cache.get('test-key')).toBeNull();
        });

        test('should clear all cached data', () => {
            cache.set('key1', 'data1');
            cache.set('key2', 'data2');
            
            cache.clear();
            
            expect(cache.get('key1')).toBeNull();
            expect(cache.get('key2')).toBeNull();
        });
    });
});

describe('User Management App Tests', () => {
    let app;
    let mockApiClient;

    beforeEach(() => {
        // Reset DOM
        document.body.innerHTML = dom.window.document.body.innerHTML;
        
        // Mock API client
        mockApiClient = {
            checkHealth: jest.fn(),
            getUsers: jest.fn(),
            getUser: jest.fn(),
            createUser: jest.fn(),
            updateUser: jest.fn(),
            deleteUser: jest.fn()
        };

        // Replace global apiClient
        global.apiClient = mockApiClient;
        
        // Create app instance
        app = new UserManagementApp();
    });

    describe('Initialization', () => {
        test('should cache DOM elements', () => {
            expect(app.elements.healthIndicator).toBeTruthy();
            expect(app.elements.usersTable).toBeTruthy();
            expect(app.elements.userModal).toBeTruthy();
        });

        test('should initialize with correct default state', () => {
            expect(app.currentUsers).toEqual([]);
            expect(app.currentFilter).toBe('');
            expect(app.editingUserId).toBeNull();
            expect(app.isLoading).toBe(false);
        });
    });

    describe('Health Check', () => {
        test('should update health status on success', async () => {
            mockApiClient.checkHealth.mockResolvedValue({ success: true });
            
            await app.checkApiHealth();
            
            expect(app.elements.healthIndicator.classList.contains('healthy')).toBe(true);
            expect(app.elements.healthText.textContent).toBe('API en ligne');
        });

        test('should update health status on error', async () => {
            const error = new ApiError('Connection failed', 0);
            mockApiClient.checkHealth.mockRejectedValue(error);
            
            await app.checkApiHealth();
            
            expect(app.elements.healthIndicator.classList.contains('error')).toBe(true);
            expect(app.elements.healthText.textContent).toBe('API hors ligne');
        });
    });

    describe('User Loading', () => {
        test('should load and render users successfully', async () => {
            const mockUsers = [
                { id: 1, name: 'John Doe', email: 'john@example.com', role: 'user' },
                { id: 2, name: 'Jane Admin', email: 'jane@example.com', role: 'admin' }
            ];
            
            mockApiClient.getUsers.mockResolvedValue({
                success: true,
                data: mockUsers,
                total: 2
            });

            await app.loadUsers();

            expect(app.currentUsers).toEqual(mockUsers);
            expect(app.elements.usersTbody.children.length).toBe(2);
            expect(app.elements.usersCount.textContent).toBe('2 utilisateurs');
        });

        test('should show empty state when no users', async () => {
            mockApiClient.getUsers.mockResolvedValue({
                success: true,
                data: [],
                total: 0
            });

            await app.loadUsers();

            expect(app.elements.emptyState.getAttribute('aria-hidden')).toBe('false');
            expect(app.elements.usersContainer.style.display).toBe('none');
        });

        test('should handle loading errors', async () => {
            const error = new ApiError('Server error', 500);
            mockApiClient.getUsers.mockRejectedValue(error);

            await app.loadUsers();

            expect(app.elements.errorState.getAttribute('aria-hidden')).toBe('false');
            expect(app.elements.errorMessage.textContent).toContain('Erreur du serveur');
        });
    });

    describe('User Modal', () => {
        test('should show modal for new user', () => {
            app.showUserModal();

            expect(app.elements.userModal.getAttribute('aria-hidden')).toBe('false');
            expect(app.elements.modalTitle.textContent).toBe('Nouvel utilisateur');
            expect(app.editingUserId).toBeNull();
        });

        test('should show modal for editing user', () => {
            const user = { id: 1, name: 'John Doe', email: 'john@example.com', role: 'admin' };
            
            app.showUserModal(user);

            expect(app.elements.userModal.getAttribute('aria-hidden')).toBe('false');
            expect(app.elements.modalTitle.textContent).toBe('Modifier l\'utilisateur');
            expect(app.elements.userName.value).toBe('John Doe');
            expect(app.elements.userEmail.value).toBe('john@example.com');
            expect(app.elements.userRole.value).toBe('admin');
            expect(app.editingUserId).toBe(1);
        });

        test('should hide modal', () => {
            app.showUserModal();
            app.hideUserModal();

            expect(app.elements.userModal.getAttribute('aria-hidden')).toBe('true');
            expect(app.editingUserId).toBeNull();
        });
    });

    describe('Form Validation', () => {
        beforeEach(() => {
            app.showUserModal();
        });

        test('should validate name field', () => {
            // Empty name
            app.elements.userName.value = '';
            expect(app.validateName()).toBe(false);
            expect(app.elements.nameError.classList.contains('show')).toBe(true);

            // Too short name
            app.elements.userName.value = 'J';
            expect(app.validateName()).toBe(false);

            // Valid name
            app.elements.userName.value = 'John Doe';
            expect(app.validateName()).toBe(true);
            expect(app.elements.nameError.classList.contains('show')).toBe(false);
        });

        test('should validate email field', () => {
            // Empty email
            app.elements.userEmail.value = '';
            expect(app.validateEmail()).toBe(false);
            expect(app.elements.emailError.classList.contains('show')).toBe(true);

            // Invalid email
            app.elements.userEmail.value = 'invalid-email';
            expect(app.validateEmail()).toBe(false);

            // Valid email
            app.elements.userEmail.value = 'john@example.com';
            expect(app.validateEmail()).toBe(true);
            expect(app.elements.emailError.classList.contains('show')).toBe(false);
        });

        test('should validate entire form', () => {
            // Invalid form
            app.elements.userName.value = '';
            app.elements.userEmail.value = 'invalid';
            expect(app.validateForm()).toBe(false);

            // Valid form
            app.elements.userName.value = 'John Doe';
            app.elements.userEmail.value = 'john@example.com';
            expect(app.validateForm()).toBe(true);
        });
    });

    describe('User CRUD Operations', () => {
        test('should create new user', async () => {
            const newUser = { id: 3, name: 'New User', email: 'new@example.com', role: 'user' };
            mockApiClient.createUser.mockResolvedValue({ success: true, data: newUser });
            mockApiClient.getUsers.mockResolvedValue({ success: true, data: [newUser], total: 1 });

            app.showUserModal();
            app.elements.userName.value = 'New User';
            app.elements.userEmail.value = 'new@example.com';
            app.elements.userRole.value = 'user';

            const form = app.elements.userForm;
            const event = new dom.window.Event('submit', { bubbles: true, cancelable: true });
            
            await app.handleFormSubmit(event);

            expect(mockApiClient.createUser).toHaveBeenCalledWith({
                name: 'New User',
                email: 'new@example.com',
                role: 'user'
            });
        });

        test('should update existing user', async () => {
            const updatedUser = { id: 1, name: 'Updated User', email: 'updated@example.com', role: 'admin' };
            mockApiClient.updateUser.mockResolvedValue({ success: true, data: updatedUser });
            mockApiClient.getUsers.mockResolvedValue({ success: true, data: [updatedUser], total: 1 });

            app.editingUserId = 1;
            app.showUserModal({ id: 1, name: 'Old Name', email: 'old@example.com', role: 'user' });
            
            app.elements.userName.value = 'Updated User';
            app.elements.userEmail.value = 'updated@example.com';
            app.elements.userRole.value = 'admin';

            const event = new dom.window.Event('submit', { bubbles: true, cancelable: true });
            await app.handleFormSubmit(event);

            expect(mockApiClient.updateUser).toHaveBeenCalledWith(1, {
                name: 'Updated User',
                email: 'updated@example.com',
                role: 'admin'
            });
        });

        test('should delete user', async () => {
            const userToDelete = { id: 1, name: 'User to Delete', email: 'delete@example.com', role: 'user' };
            app.currentUsers = [userToDelete];
            
            mockApiClient.deleteUser.mockResolvedValue({ success: true });
            mockApiClient.getUsers.mockResolvedValue({ success: true, data: [], total: 0 });

            app.showDeleteConfirm(1);
            await app.confirmDelete();

            expect(mockApiClient.deleteUser).toHaveBeenCalledWith(1);
        });
    });

    describe('Toast Notifications', () => {
        test('should show success toast', () => {
            app.showToast('success', 'Success Title', 'Success message');

            const toast = app.elements.toastContainer.querySelector('.toast.success');
            expect(toast).toBeTruthy();
            expect(toast.querySelector('.toast-title').textContent).toBe('Success Title');
            expect(toast.querySelector('.toast-message').textContent).toBe('Success message');
        });

        test('should show error toast', () => {
            app.showToast('error', 'Error Title', 'Error message');

            const toast = app.elements.toastContainer.querySelector('.toast.error');
            expect(toast).toBeTruthy();
            expect(toast.querySelector('.toast-title').textContent).toBe('Error Title');
        });
    });

    describe('Filtering', () => {
        test('should filter users by role', async () => {
            mockApiClient.getUsers.mockResolvedValue({
                success: true,
                data: [{ id: 1, name: 'Admin User', email: 'admin@example.com', role: 'admin' }],
                total: 1
            });

            await app.handleFilterChange('admin');

            expect(app.currentFilter).toBe('admin');
            expect(mockApiClient.getUsers).toHaveBeenCalledWith({ role: 'admin' });
        });
    });

    describe('Utility Functions', () => {
        test('should escape HTML correctly', () => {
            expect(app.escapeHtml('<script>alert("xss")</script>')).toBe('&lt;script&gt;alert("xss")&lt;/script&gt;');
            expect(app.escapeHtml('Normal text')).toBe('Normal text');
            expect(app.escapeHtml('Text & symbols')).toBe('Text &amp; symbols');
        });
    });
});

// Integration tests with actual API calls (when API is running)
describe('Integration Tests', () => {
    const testApiClient = new ApiClient('http://localhost:3000');
    
    beforeAll(async () => {
        // Skip integration tests if API is not available
        try {
            await testApiClient.checkHealth();
        } catch (error) {
            console.log('Skipping integration tests - API not available');
            return;
        }
    });

    test('should perform full user lifecycle', async () => {
        try {
            // Test health check
            const healthResponse = await testApiClient.checkHealth();
            expect(healthResponse.success).toBe(true);

            // Test create user
            const userData = {
                name: 'Integration Test User',
                email: 'integration@test.com',
                role: 'user'
            };

            const createResponse = await testApiClient.createUser(userData);
            expect(createResponse.success).toBe(true);
            expect(createResponse.data.name).toBe(userData.name);
            
            const userId = createResponse.data.id;

            // Test get user
            const getResponse = await testApiClient.getUser(userId);
            expect(getResponse.success).toBe(true);
            expect(getResponse.data.email).toBe(userData.email);

            // Test update user
            const updateData = { name: 'Updated Test User' };
            const updateResponse = await testApiClient.updateUser(userId, updateData);
            expect(updateResponse.success).toBe(true);
            expect(updateResponse.data.name).toBe(updateData.name);

            // Test delete user
            const deleteResponse = await testApiClient.deleteUser(userId);
            expect(deleteResponse.success).toBe(true);

            // Verify deletion
            try {
                await testApiClient.getUser(userId);
                fail('Should have thrown error for deleted user');
            } catch (error) {
                expect(error.status).toBe(404);
            }

        } catch (error) {
            if (error.status === 0) {
                console.log('Integration test skipped - API not available');
                return;
            }
            throw error;
        }
    }, 10000); // Longer timeout for integration tests
});