import { login, logout, getCurrentUser, changePassword, refreshToken, auth } from '../auth';

// Mock fetch globally
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

describe('Auth Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock localStorage with spies
    const mockLocalStorage = {
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn(),
    };

    Object.defineProperty(global, 'localStorage', {
      value: mockLocalStorage,
      writable: true,
    });

    // Ensure window is defined for TokenManager with localStorage
    if (!global.window) {
      Object.defineProperty(global, 'window', {
        value: {
          localStorage: mockLocalStorage,
        },
        writable: true,
        configurable: true,
      });
    } else {
      (global.window as any).localStorage = mockLocalStorage;
    }

    // Set up realistic localStorage behavior
    let store: { [key: string]: string } = {};

    mockLocalStorage.getItem.mockImplementation((key: string) => store[key] || null);
    mockLocalStorage.setItem.mockImplementation((key: string, value: string) => {
      store[key] = value;
    });
    mockLocalStorage.removeItem.mockImplementation((key: string) => {
      delete store[key];
    });
    mockLocalStorage.clear.mockImplementation(() => {
      store = {};
    });
  });

  describe('login', () => {
    it('should login successfully and store token and user', async () => {
      const mockLoginResponse = {
        success: true,
        data: {
          access_token: 'test-token',
          token_type: 'Bearer',
          expires_in: 3600,
          user: {
            id: 1,
            username: 'testuser',
            email: 'test@example.com',
            first_name: 'Test',
            last_name: 'User',
            role: 'normal' as const,
            display_name: 'Test User'
          }
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        text: async () => JSON.stringify(mockLoginResponse),
      } as Response);

      const credentials = { username: 'testuser', password: 'password' };
      const result = await login(credentials);

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8080/api/auth/login',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify(credentials),
        })
      );

      expect(result).toEqual(mockLoginResponse.data);
      expect(localStorage.getItem('auth_token')).toBe('test-token');
      expect(JSON.parse(localStorage.getItem('auth_user')!)).toEqual(mockLoginResponse.data.user);
    });

    it('should throw error when login fails', async () => {
      const mockErrorResponse = {
        success: false,
        error: 'Invalid credentials'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        text: async () => JSON.stringify(mockErrorResponse),
      } as Response);

      const credentials = { username: 'wronguser', password: 'wrongpass' };

      await expect(login(credentials)).rejects.toThrow('Invalid credentials');
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const credentials = { username: 'testuser', password: 'password' };

      await expect(login(credentials)).rejects.toThrow('API request failed: Network error');
    });
  });

  describe('logout', () => {
    it('should logout successfully and clear local storage', async () => {
      // Set up initial state
      localStorage.setItem('auth_token', 'test-token');
      localStorage.setItem('auth_user', JSON.stringify({ id: 1, username: 'test' }));

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        text: async () => JSON.stringify({}),
      } as Response);

      await logout();

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8080/api/auth/logout',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-token',
          }),
        })
      );

      expect(localStorage.getItem('auth_token')).toBeNull();
      expect(localStorage.getItem('auth_user')).toBeNull();
    });

    it('should clear tokens even if logout request fails', async () => {
      localStorage.setItem('auth_token', 'test-token');
      localStorage.setItem('auth_user', JSON.stringify({ id: 1, username: 'test' }));

      mockFetch.mockRejectedValueOnce(new Error('Server error'));

      await logout();

      expect(localStorage.getItem('auth_token')).toBeNull();
      expect(localStorage.getItem('auth_user')).toBeNull();
    });
  });

  describe('getCurrentUser', () => {
    it('should get current user successfully', async () => {
      const mockUser = {
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User',
        role: 'normal' as const,
        display_name: 'Test User'
      };

      const mockResponse = {
        success: true,
        data: mockUser
      };

      localStorage.setItem('auth_token', 'test-token');

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        text: async () => JSON.stringify(mockResponse),
      } as Response);

      const result = await getCurrentUser();

      expect(result).toEqual(mockUser);
      expect(JSON.parse(localStorage.getItem('auth_user')!)).toEqual(mockUser);
    });

    it('should throw error when getting current user fails', async () => {
      const mockErrorResponse = {
        success: false,
        error: 'Unauthorized'
      };

      localStorage.setItem('auth_token', 'test-token');

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        text: async () => JSON.stringify(mockErrorResponse),
      } as Response);

      await expect(getCurrentUser()).rejects.toThrow('Unauthorized');
    });
  });

  describe('changePassword', () => {
    it('should change password successfully', async () => {
      const mockResponse = {
        success: true
      };

      localStorage.setItem('auth_token', 'test-token');

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        text: async () => JSON.stringify(mockResponse),
      } as Response);

      const passwordData = {
        current_password: 'oldpass',
        new_password: 'newpass'
      };

      await changePassword(passwordData);

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8080/api/auth/change-password',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(passwordData),
        })
      );
    });

    it('should throw error when password change fails', async () => {
      const mockErrorResponse = {
        success: false,
        error: 'Current password is incorrect'
      };

      localStorage.setItem('auth_token', 'test-token');

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        text: async () => JSON.stringify(mockErrorResponse),
      } as Response);

      const passwordData = {
        current_password: 'wrongpass',
        new_password: 'newpass'
      };

      await expect(changePassword(passwordData)).rejects.toThrow('Current password is incorrect');
    });
  });

  describe('refreshToken', () => {
    it('should refresh token successfully', async () => {
      const mockRefreshResponse = {
        success: true,
        data: {
          access_token: 'new-token',
          token_type: 'Bearer',
          expires_in: 3600,
          user: {
            id: 1,
            username: 'testuser',
            email: 'test@example.com',
            first_name: 'Test',
            last_name: 'User',
            role: 'normal' as const,
            display_name: 'Test User'
          }
        }
      };

      localStorage.setItem('auth_token', 'old-token');

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        text: async () => JSON.stringify(mockRefreshResponse),
      } as Response);

      const result = await refreshToken();

      expect(result).toEqual(mockRefreshResponse.data);
      expect(localStorage.getItem('auth_token')).toBe('new-token');
    });
  });

  describe('auth utilities', () => {
    beforeEach(() => {
      // Clear localStorage before each test
      localStorage.clear();
    });

    it.skip('should check if user is logged in', () => {
      expect(auth.isLoggedIn()).toBe(false);

      localStorage.setItem('auth_token', 'test-token');
      expect(auth.isLoggedIn()).toBe(true);
    });

    it.skip('should get stored token', () => {
      expect(auth.getToken()).toBeNull();

      localStorage.setItem('auth_token', 'test-token');
      expect(auth.getToken()).toBe('test-token');
    });

    it.skip('should get stored user', () => {
      expect(auth.getUser()).toBeNull();

      const user = { id: 1, username: 'test' };
      localStorage.setItem('auth_user', JSON.stringify(user));
      expect(auth.getUser()).toEqual(user);
    });

    it('should clear all auth data', () => {
      localStorage.setItem('auth_token', 'test-token');
      localStorage.setItem('auth_user', JSON.stringify({ id: 1 }));

      auth.clearAll();

      expect(localStorage.getItem('auth_token')).toBeNull();
      expect(localStorage.getItem('auth_user')).toBeNull();
      expect(auth.isLoggedIn()).toBe(false);
    });
  });
});
