/**
 * API Client for Multi-Agent System
 * Handles all REST API calls with error handling and loading states
 */

class ApiClient {
    constructor(baseUrl = 'http://localhost:3000') {
        this.baseUrl = baseUrl;
        this.apiPrefix = '/api/v1';
    }

    /**
     * Generic HTTP request method with error handling
     */
    async request(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            ...options
        };

        try {
            const response = await fetch(url, defaultOptions);
            const data = await response.json();

            if (!response.ok) {
                throw new ApiError(data.error || 'Request failed', response.status, data.details);
            }

            return data;
        } catch (error) {
            if (error instanceof ApiError) {
                throw error;
            }

            // Network or other errors
            throw new ApiError(
                'Network error or server unavailable',
                0,
                null,
                error
            );
        }
    }

    /**
     * Health Check
     */
    async checkHealth() {
        return await this.request('/health');
    }

    /**
     * Get all users with optional filters
     */
    async getUsers(filters = {}) {
        const params = new URLSearchParams();
        
        if (filters.role) {
            params.append('role', filters.role);
        }
        if (filters.limit) {
            params.append('limit', filters.limit);
        }

        const endpoint = `${this.apiPrefix}/users${params.toString() ? '?' + params.toString() : ''}`;
        return await this.request(endpoint);
    }

    /**
     * Get a specific user by ID
     */
    async getUser(id) {
        if (!id || isNaN(parseInt(id))) {
            throw new ApiError('Invalid user ID', 400);
        }

        return await this.request(`${this.apiPrefix}/users/${id}`);
    }

    /**
     * Create a new user
     */
    async createUser(userData) {
        const validationError = this.validateUserData(userData);
        if (validationError) {
            throw new ApiError('Validation error', 400, [validationError]);
        }

        return await this.request(`${this.apiPrefix}/users`, {
            method: 'POST',
            body: JSON.stringify(userData)
        });
    }

    /**
     * Update an existing user
     */
    async updateUser(id, userData) {
        if (!id || isNaN(parseInt(id))) {
            throw new ApiError('Invalid user ID', 400);
        }

        // Only validate provided fields for updates
        const validationError = this.validateUserData(userData, true);
        if (validationError) {
            throw new ApiError('Validation error', 400, [validationError]);
        }

        return await this.request(`${this.apiPrefix}/users/${id}`, {
            method: 'PUT',
            body: JSON.stringify(userData)
        });
    }

    /**
     * Delete a user
     */
    async deleteUser(id) {
        if (!id || isNaN(parseInt(id))) {
            throw new ApiError('Invalid user ID', 400);
        }

        return await this.request(`${this.apiPrefix}/users/${id}`, {
            method: 'DELETE'
        });
    }

    /**
     * Client-side validation for user data
     */
    validateUserData(userData, isPartial = false) {
        const { name, email, role } = userData;

        if (!isPartial && !name) {
            return { field: 'name', message: 'Name is required' };
        }

        if (name !== undefined) {
            if (typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 50) {
                return { field: 'name', message: 'Name must be between 2 and 50 characters' };
            }
        }

        if (!isPartial && !email) {
            return { field: 'email', message: 'Email is required' };
        }

        if (email !== undefined) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                return { field: 'email', message: 'Please enter a valid email address' };
            }
        }

        if (role !== undefined && !['user', 'admin'].includes(role)) {
            return { field: 'role', message: 'Role must be either "user" or "admin"' };
        }

        return null;
    }

    /**
     * Test connection to the API
     */
    async testConnection() {
        try {
            await this.checkHealth();
            return { success: true, message: 'API is accessible' };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }
}

/**
 * Custom error class for API errors
 */
class ApiError extends Error {
    constructor(message, status, details = null, originalError = null) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.details = details;
        this.originalError = originalError;
    }

    /**
     * Check if this is a network error
     */
    isNetworkError() {
        return this.status === 0;
    }

    /**
     * Check if this is a validation error
     */
    isValidationError() {
        return this.status === 400 && this.details;
    }

    /**
     * Check if this is a server error
     */
    isServerError() {
        return this.status >= 500;
    }

    /**
     * Get user-friendly error message
     */
    getUserMessage() {
        switch (this.status) {
            case 0:
                return 'Impossible de se connecter au serveur. Vérifiez que l\'API est démarrée.';
            case 400:
                if (this.details && this.details.length > 0) {
                    return this.details[0].msg || this.details[0].message || this.message;
                }
                return this.message;
            case 404:
                return 'Ressource non trouvée.';
            case 409:
                return 'Cette adresse email est déjà utilisée.';
            case 429:
                return 'Trop de requêtes. Veuillez patienter avant de réessayer.';
            case 500:
                return 'Erreur du serveur. Veuillez réessayer plus tard.';
            default:
                return this.message;
        }
    }
}

/**
 * Utility class for API response caching
 */
class ApiCache {
    constructor(ttl = 30000) { // 30 seconds default TTL
        this.cache = new Map();
        this.ttl = ttl;
    }

    set(key, value) {
        this.cache.set(key, {
            value,
            timestamp: Date.now()
        });
    }

    get(key) {
        const item = this.cache.get(key);
        if (!item) return null;

        if (Date.now() - item.timestamp > this.ttl) {
            this.cache.delete(key);
            return null;
        }

        return item.value;
    }

    clear() {
        this.cache.clear();
    }

    delete(key) {
        this.cache.delete(key);
    }
}

/**
 * Enhanced API client with caching and request debouncing
 */
class CachedApiClient extends ApiClient {
    constructor(baseUrl) {
        super(baseUrl);
        this.cache = new ApiCache();
        this.pendingRequests = new Map();
    }

    /**
     * Get users with caching
     */
    async getUsers(filters = {}) {
        const cacheKey = `users-${JSON.stringify(filters)}`;
        const cached = this.cache.get(cacheKey);
        
        if (cached) {
            return cached;
        }

        const result = await super.getUsers(filters);
        this.cache.set(cacheKey, result);
        return result;
    }

    /**
     * Create user and invalidate cache
     */
    async createUser(userData) {
        const result = await super.createUser(userData);
        this.cache.clear(); // Invalidate all user caches
        return result;
    }

    /**
     * Update user and invalidate cache
     */
    async updateUser(id, userData) {
        const result = await super.updateUser(id, userData);
        this.cache.clear(); // Invalidate all user caches
        return result;
    }

    /**
     * Delete user and invalidate cache
     */
    async deleteUser(id) {
        const result = await super.deleteUser(id);
        this.cache.clear(); // Invalidate all user caches
        return result;
    }

    /**
     * Debounced request to prevent duplicate calls
     */
    async debouncedRequest(key, requestFn, delay = 300) {
        // Cancel existing pending request
        if (this.pendingRequests.has(key)) {
            clearTimeout(this.pendingRequests.get(key).timeoutId);
        }

        return new Promise((resolve, reject) => {
            const timeoutId = setTimeout(async () => {
                try {
                    const result = await requestFn();
                    this.pendingRequests.delete(key);
                    resolve(result);
                } catch (error) {
                    this.pendingRequests.delete(key);
                    reject(error);
                }
            }, delay);

            this.pendingRequests.set(key, { timeoutId, resolve, reject });
        });
    }
}

// Global API client instance
const apiClient = new CachedApiClient();

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ApiClient, ApiError, CachedApiClient, apiClient };
}