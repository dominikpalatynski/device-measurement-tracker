import { renderHook, waitFor } from '@testing-library/react';
import { useDeviceOwnership } from '../useDeviceOwnership';
import { useAuth } from '../../contexts/AuthContext';
import { getDevice } from '../../services/api';

// Mock dependencies
jest.mock('../../contexts/AuthContext');
jest.mock('../../services/api');

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockGetDevice = getDevice as jest.MockedFunction<typeof getDevice>;

describe('useDeviceOwnership', () => {
  const mockUser = {
    id: 1,
    username: 'testuser',
    email: 'test@example.com',
    first_name: 'Test',
    last_name: 'User',
    role: 'normal' as const,
    display_name: 'Test User'
  };

  const mockDevice = {
    device_id: 'device-123',
    device_name: 'Test Device',
    device_type: 'pmsm-mechanical-vibration',
    status: 'Active' as const,
    registration_date: '2023-01-01T00:00:00Z',
    last_updated: '2023-01-01T00:00:00Z',
    owner_id: 1,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return loading state initially for unauthenticated user', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: false,
      login: jest.fn(),
      logout: jest.fn(),
      isAuthenticated: false,
      isAdmin: false,
      refreshUser: jest.fn(),
    });

    const { result } = renderHook(() => useDeviceOwnership({ deviceId: '123' }));

    expect(result.current.loading).toBe(false); // Should be false for unauthenticated users
    expect(result.current.isOwner).toBe(false);
    expect(result.current.canAccess).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.device).toBeNull();
  });

  it('should show loading state for authenticated users', () => {
    mockUseAuth.mockReturnValue({
      user: { id: 1, username: 'test', email: 'test@test.com', first_name: 'Test', last_name: 'User', role: 'normal', display_name: 'Test User' },
      loading: false,
      login: jest.fn(),
      logout: jest.fn(),
      isAuthenticated: true,
      isAdmin: false,
      refreshUser: jest.fn(),
    });

    // Mock getDevice to never resolve to keep loading state
    mockGetDevice.mockImplementation(() => new Promise(() => {}));

    const { result } = renderHook(() => useDeviceOwnership({ deviceId: '123' }));

    expect(result.current.loading).toBe(true);
  });

  it('should handle unauthenticated user', async () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: false,
      login: jest.fn(),
      logout: jest.fn(),
      isAuthenticated: false,
      isAdmin: false,
      refreshUser: jest.fn(),
    });

    const { result } = renderHook(() => useDeviceOwnership({ deviceId: '123' }));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.isOwner).toBe(false);
    expect(result.current.canAccess).toBe(false);
    expect(result.current.error).toBeNull();
    expect(mockGetDevice).not.toHaveBeenCalled();
  });

  it('should handle admin user with device access', async () => {
    mockUseAuth.mockReturnValue({
      user: { ...mockUser, role: 'admin' },
      loading: false,
      login: jest.fn(),
      logout: jest.fn(),
      isAuthenticated: true,
      isAdmin: true,
      refreshUser: jest.fn(),
    });

    mockGetDevice.mockResolvedValueOnce(mockDevice);

    const { result } = renderHook(() => useDeviceOwnership({ deviceId: '123' }));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.isOwner).toBe(true);
    expect(result.current.isAdmin).toBe(true);
    expect(result.current.canAccess).toBe(true);
    expect(result.current.error).toBeNull();
    expect(result.current.device).toEqual(mockDevice);
    expect(mockGetDevice).toHaveBeenCalledWith('123');
  });

  it('should handle device owner (non-admin)', async () => {
    mockUseAuth.mockReturnValue({
      user: mockUser,
      loading: false,
      login: jest.fn(),
      logout: jest.fn(),
      isAuthenticated: true,
      isAdmin: false,
      refreshUser: jest.fn(),
    });

    mockGetDevice.mockResolvedValueOnce(mockDevice);

    const { result } = renderHook(() => useDeviceOwnership({ deviceId: '123' }));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.isOwner).toBe(true);
    expect(result.current.isAdmin).toBe(false);
    expect(result.current.canAccess).toBe(true);
    expect(result.current.error).toBeNull();
    expect(result.current.device).toEqual(mockDevice);
  });

  it('should handle non-owner user', async () => {
    mockUseAuth.mockReturnValue({
      user: { ...mockUser, id: 2 }, // Different user ID
      loading: false,
      login: jest.fn(),
      logout: jest.fn(),
      isAuthenticated: true,
      isAdmin: false,
      refreshUser: jest.fn(),
    });

    mockGetDevice.mockResolvedValueOnce(mockDevice);

    const { result } = renderHook(() => useDeviceOwnership({ deviceId: '123' }));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.isOwner).toBe(false);
    expect(result.current.isAdmin).toBe(false);
    expect(result.current.canAccess).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.device).toEqual(mockDevice);
  });

  it('should handle API error', async () => {
    mockUseAuth.mockReturnValue({
      user: mockUser,
      loading: false,
      login: jest.fn(),
      logout: jest.fn(),
      isAuthenticated: true,
      isAdmin: false,
      refreshUser: jest.fn(),
    });

    mockGetDevice.mockRejectedValueOnce(new Error('API Error'));

    const { result } = renderHook(() => useDeviceOwnership({ deviceId: '123' }));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.isOwner).toBe(false);
    expect(result.current.canAccess).toBe(false);
    expect(result.current.error).toBe('Failed to verify device ownership');
    expect(result.current.device).toBeNull();
  });

  it('should handle device not found', async () => {
    mockUseAuth.mockReturnValue({
      user: mockUser,
      loading: false,
      login: jest.fn(),
      logout: jest.fn(),
      isAuthenticated: true,
      isAdmin: false,
      refreshUser: jest.fn(),
    });

    mockGetDevice.mockResolvedValueOnce(null);

    const { result } = renderHook(() => useDeviceOwnership({ deviceId: '123' }));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.isOwner).toBe(false);
    expect(result.current.canAccess).toBe(false);
    expect(result.current.error).toBe('Device not found or access denied');
    expect(result.current.device).toBeNull();
  });

  it('should handle missing deviceId', async () => {
    mockUseAuth.mockReturnValue({
      user: mockUser,
      loading: false,
      login: jest.fn(),
      logout: jest.fn(),
      isAuthenticated: true,
      isAdmin: false,
      refreshUser: jest.fn(),
    });

    const { result } = renderHook(() => useDeviceOwnership({}));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.isOwner).toBe(false);
    expect(result.current.canAccess).toBe(false);
    expect(result.current.error).toBeNull();
    expect(mockGetDevice).not.toHaveBeenCalled();
  });
});
