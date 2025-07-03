/**
 * Authentication service for user login, logout, and token management
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";

/**
 * Authentication interfaces
 */
export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: 'admin' | 'normal';
  display_name: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: User;
}

export interface AuthResponse {
  success: boolean;
  data?: LoginResponse;
  error?: string;
}

export interface UserResponse {
  success: boolean;
  data?: User;
  error?: string;
}

export interface ChangePasswordRequest {
  current_password: string;
  new_password: string;
}

export interface CreateUserRequest {
  username: string;
  email: string;
  password: string;
  password_repeat: string;
  first_name?: string;
  last_name?: string;
  role: 'admin' | 'normal';
}

export interface UpdateUserRequest {
  username?: string;
  email?: string;
  password?: string;
  first_name?: string;
  last_name?: string;
  role?: 'admin' | 'normal';
}

export interface UsersListResponse {
  success: boolean;
  data?: User[];
  error?: string;
}

/**
 * Token management
 */
class TokenManager {
  static getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('auth_token');
  }

  static setToken(token: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem('auth_token', token);
  }

  static removeToken(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('auth_token');
  }

  static getUser(): User | null {
    if (typeof window === 'undefined') return null;
    try {
      const userJson = localStorage.getItem('auth_user');
      if (!userJson) return null;
      
      const user = JSON.parse(userJson);
      return user.user;
    } catch (error) {
      console.error('Failed to parse user data from localStorage:', error);
      // Clear corrupted data
      localStorage.removeItem('auth_user');
      return null;
    }
  }

  static setUser(user: User): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem('auth_user', JSON.stringify(user));
  }

  static removeUser(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('auth_user');
  }

  static clearAll(): void {
    TokenManager.removeToken();
    TokenManager.removeUser();
  }

  static isLoggedIn(): boolean {
    return this.getToken() !== null;
  }
}

/**
 * Base API request function with error handling
 */
async function fetchApi<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_URL}/${endpoint}`;
  
  console.log(`API Request: ${url}`);
  
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    console.log(`API Response status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const responseText = await response.text();
    
    if (responseText.length === 0) {
      throw new Error('Empty response received from API');
    }
    
    const data = JSON.parse(responseText) as T;
    console.log('API response parsed successfully');
    return data;
  } catch (error: any) {
    console.error('API request failed:', error.message);
    throw new Error(`API request failed: ${error.message}`);
  }
}

/**
 * Enhanced fetchApi with authentication support
 */
async function fetchApiWithAuth<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = TokenManager.getToken();
  
  const authHeaders: Record<string, string> = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  };

  // Add existing headers
  if (options.headers) {
    Object.assign(authHeaders, options.headers);
  }

  if (token) {
    authHeaders['Authorization'] = `Bearer ${token}`;
  }

  return fetchApi<T>(endpoint, {
    ...options,
    headers: authHeaders,
  });
}

/**
 * Authentication API functions
 */

export async function login(credentials: LoginRequest): Promise<LoginResponse> {
  const response = await fetchApi<{ success: boolean; data?: LoginResponse; error?: string; message?: string }>('auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  });
  
  if (response.success && response.data) {
    TokenManager.setToken(response.data.access_token);
    TokenManager.setUser(response.data.user);
    return response.data;
  }
  
  throw new Error(response.error || response.message || 'Login failed');
}

export async function logout(): Promise<void> {
  try {
    await fetchApiWithAuth('auth/logout', {
      method: 'POST',
    });
  } catch (error) {
    console.warn('Logout request failed, but clearing local tokens anyway:', error);
  } finally {
    TokenManager.clearAll();
  }
}

export async function getCurrentUser(): Promise<User> {
  const response = await fetchApiWithAuth<{ success: boolean; data?: User; error?: string }>('auth/me');
  
  if (response.success && response.data) {
    TokenManager.setUser(response.data);
    return response.data;
  }
  
  throw new Error(response.error || 'Failed to get current user');
}

export async function changePassword(passwordData: ChangePasswordRequest): Promise<void> {
  const response = await fetchApiWithAuth<{ success: boolean; error?: string; message?: string }>('auth/change-password', {
    method: 'POST',
    body: JSON.stringify(passwordData),
  });
  
  if (!response.success) {
    throw new Error(response.error || response.message || 'Failed to change password');
  }
}

export async function refreshToken(): Promise<LoginResponse> {
  const response = await fetchApiWithAuth<{ success: boolean; data?: LoginResponse; error?: string }>('auth/refresh', {
    method: 'POST',
  });
  
  if (response.success && response.data) {
    TokenManager.setToken(response.data.access_token);
    TokenManager.setUser(response.data.user);
    return response.data;
  }
  
  throw new Error(response.error || 'Failed to refresh token');
}

/**
 * User management API functions (admin only)
 */

export async function getUsers(): Promise<User[]> {
  const response = await fetchApiWithAuth<{ success: boolean; data?: User[]; error?: string }>('users');
  
  if (response.success && response.data) {
    return response.data;
  }
  
  throw new Error(response.error || 'Failed to get users');
}

export async function getUser(id: number): Promise<User> {
  const response = await fetchApiWithAuth<{ success: boolean; data?: User; error?: string }>(`users/${id}`);
  
  if (response.success && response.data) {
    return response.data;
  }
  
  throw new Error(response.error || 'Failed to get user');
}

export async function createUser(userData: CreateUserRequest): Promise<User> {
  const response = await fetchApiWithAuth<{ success: boolean; data?: User; error?: string }>('users/create', {
    method: 'POST',
    body: JSON.stringify(userData),
  });
  
  if (response.success && response.data) {
    return response.data;
  }
  
  throw new Error(response.error || 'Failed to create user');
}

export async function updateUser(id: number, userData: UpdateUserRequest): Promise<User> {
  const response = await fetchApiWithAuth<{ success: boolean; data?: User; error?: string }>(`users/${id}/update`, {
    method: 'POST',
    body: JSON.stringify(userData),
  });
  
  if (response.success && response.data) {
    return response.data;
  }
  
  throw new Error(response.error || 'Failed to update user');
}

export async function deleteUser(id: number): Promise<void> {
  const response = await fetchApiWithAuth<{ success: boolean; error?: string }>(`users/${id}/delete`, {
    method: 'POST',
  });
  
  if (!response.success) {
    throw new Error(response.error || 'Failed to delete user');
  }
}

export async function activateUser(id: number): Promise<void> {
  const response = await fetchApiWithAuth<{ success: boolean; error?: string }>(`users/${id}/activate`, {
    method: 'POST',
  });
  
  if (!response.success) {
    throw new Error(response.error || 'Failed to activate user');
  }
}

export async function deactivateUser(id: number): Promise<void> {
  const response = await fetchApiWithAuth<{ success: boolean; error?: string }>(`users/${id}/deactivate`, {
    method: 'POST',
  });
  
  if (!response.success) {
    throw new Error(response.error || 'Failed to deactivate user');
  }
}

export async function getUserOptions(): Promise<any> {
  const response = await fetchApiWithAuth<{ success: boolean; data?: any; error?: string }>('users/options');
  
  if (response.success && response.data) {
    return response.data;
  }
  
  throw new Error(response.error || 'Failed to get user options');
}

/**
 * Authentication utilities
 */
export const auth = {
  login,
  logout,
  getCurrentUser,
  changePassword,
  refreshToken,
  isLoggedIn: TokenManager.isLoggedIn,
  getToken: TokenManager.getToken,
  getUser: TokenManager.getUser,
  clearAll: TokenManager.clearAll,
};

export const userManagement = {
  getUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  activateUser,
  deactivateUser,
  getUserOptions,
};

export default auth;
