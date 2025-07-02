import React from 'react';
import { render, screen } from '@testing-library/react';
import { useParams, useRouter } from 'next/navigation';
import FaultDetailPage from '../page';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useParams: jest.fn(),
  useRouter: jest.fn(),
}));

// Mock the API services
jest.mock('@/services/api', () => ({
  deviceApi: {
    getDevice: jest.fn(),
  },
  faultApi: {
    getFault: jest.fn(),
  },
  onlineModeApi: {
    getLiveFault: jest.fn(),
  },
  conditionsApi: {
    getConditions: jest.fn(),
  },
  getAllMeasurements: jest.fn(),
  getLatestMeasurementData: jest.fn(),
  getMongoMeasurements: jest.fn(),
}));

// Mock the components
jest.mock('@/components/PageLayout', () => {
  return function MockPageLayout({ children, title }: { children: React.ReactNode; title: string }) {
    return <div data-testid="page-layout" title={title}>{children}</div>;
  };
});

jest.mock('@/components/DeviceProtectedRoute', () => {
  return function MockDeviceProtectedRoute({ children }: { children: React.ReactNode }) {
    return <div data-testid="device-protected-route">{children}</div>;
  };
});

// Mock recharts
jest.mock('recharts', () => ({
  LineChart: ({ children }: any) => <div data-testid="line-chart">{children}</div>,
  Line: () => <div data-testid="line" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
  ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
}));

const mockUseParams = useParams as jest.Mock;
const mockUseRouter = useRouter as jest.Mock;

describe('Fault Detail Page', () => {
  beforeEach(() => {
    mockUseParams.mockReturnValue({ deviceId: 'test-device-123', faultId: 'test-fault-456' });
    mockUseRouter.mockReturnValue({
      push: jest.fn(),
      replace: jest.fn(),
      refresh: jest.fn(),
    });
  });

  it('should render without crashing', () => {
    render(<FaultDetailPage />);
    
    // Should render the device protected route
    expect(screen.getByTestId('device-protected-route')).toBeInTheDocument();
  });
});
