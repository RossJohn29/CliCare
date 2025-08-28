// src/services/adminApi.js - Frontend API Service for Admin Operations

// API Configuration
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Helper function to get auth token from sessionStorage
const getAuthToken = () => {
  return localStorage.getItem('adminToken'); // Changed from sessionStorage
};

// Helper function to create authenticated headers
const getAuthHeaders = () => {
  const token = getAuthToken();
  return {
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : '',
  };
};

// Generic API call function with error handling
const apiCall = async (endpoint, options = {}) => {
  try {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const config = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    const response = await fetch(url, config);
    
    // Handle different response types
    let data;
    const contentType = response.headers.get('Content-Type');
    
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    if (!response.ok) {
      // Handle specific HTTP status codes
      switch (response.status) {
        case 401:
          localStorage.clear();
          window.location.href = '/admin-login';
          throw new Error(data.error || 'Unauthorized access');
        
        case 403:
          throw new Error(data.error || 'Access forbidden');
        
        case 404:
          throw new Error(data.error || 'Resource not found');
        
        case 429:
          throw new Error(data.error || 'Too many requests. Please try again later.');
        
        case 500:
          throw new Error(data.error || 'Server error. Please try again.');
        
        default:
          throw new Error(data.error || `HTTP ${response.status}: ${response.statusText}`);
      }
    }

    return data;

  } catch (error) {
    // Network errors or other issues
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error('Unable to connect to server. Please check your connection.');
    }
    
    throw error;
  }
};

// Admin API Functions
export const adminApi = {
  // Health check
  healthCheck: async () => {
    return apiCall('/health');
  },

  // In the login function, replace sessionStorage with localStorage:
  login: async (credentials) => {
    const response = await apiCall('/admin/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });

    // Store token and admin info on successful login
    if (response.success && response.token) {
      localStorage.setItem('adminToken', response.token);
      localStorage.setItem('adminId', response.admin.healthadmin_id);
      localStorage.setItem('adminInfo', JSON.stringify(response.admin));
    }

    return response;
  },

  // In the logout function:
  logout: async () => {
    try {
      await apiCall('/admin/logout', {
        method: 'POST',
        headers: getAuthHeaders(),
      });
    } catch (error) {
      console.warn('Logout API call failed:', error);
    } finally {
      // Clear local storage
      localStorage.removeItem('adminToken');
      localStorage.removeItem('adminId');
      localStorage.removeItem('adminInfo');
    }
  },

  // Get admin profile
  getProfile: async () => {
    return apiCall('/admin/profile', {
      headers: getAuthHeaders(),
    });
  },

  // Validate token
  validateToken: async () => {
    return apiCall('/admin/validate-token', {
      method: 'POST',
      headers: getAuthHeaders(),
    });
  },

  // Dashboard data
  getDashboardStats: async () => {
    return apiCall('/admin/dashboard-stats', {
      headers: getAuthHeaders(),
    });
  },

  // Get all admins
  getAllAdmins: async () => {
    return apiCall('/admin/all', {
      headers: getAuthHeaders(),
    });
  },
};

// Utility functions for frontend
export const adminUtils = {
  // Check if user is authenticated
  isAuthenticated: () => {
    const token = getAuthToken();
    return !!token;
  },

  isTokenExpired: () => {
    const token = getAuthToken();
    if (!token) return true;
    
    try {
      const tokenParts = token.split('.');
      if (tokenParts.length !== 3) return true;
      
      const payload = JSON.parse(atob(tokenParts[1]));
      const now = Date.now() / 1000;
      
      // Add 30 second buffer to prevent edge cases
      return payload.exp && payload.exp < (now + 30);
    } catch (error) {
      console.warn('Token parsing error:', error);
      return true;
    }
  },

  // In adminUtils, update getAdminInfo:
  getAdminInfo: () => {
    const adminInfoString = localStorage.getItem('adminInfo'); // Changed from sessionStorage
    return adminInfoString ? JSON.parse(adminInfoString) : null;
  },

  // Auto-refresh token before expiration (call this periodically)
  refreshTokenIfNeeded: async () => {
    try {
      await adminApi.validateToken();
      return true;
    } catch (error) {
      console.warn('Token validation failed:', error);
      return false;
    }
  },

  // Format admin display name
  formatAdminName: (admin) => {
    if (!admin) return 'Unknown Admin';
    return admin.name || 'Admin User';
  },

  // Format admin position
  formatAdminPosition: (admin) => {
    if (!admin) return 'Unknown Position';
    return admin.position || 'Administrator';
  },

  // Error message formatter
  formatErrorMessage: (error) => {
    if (typeof error === 'string') return error;
    if (error && error.message) return error.message;
    return 'An unexpected error occurred. Please try again.';
  },
};

// Export default
export default adminApi;