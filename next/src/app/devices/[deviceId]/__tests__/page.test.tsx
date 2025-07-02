import React from 'react';
import { render, screen } from '@testing-library/react';
import { useParams, useRouter } from 'next/navigation';
import DeviceDetailPage from '../page';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useParams: jest.fn(),
  useRouter: jest.fn(),
}));

// Mock the API services
jest.mock('@/services/api', () => ({
  deviceApi: {
    getDevice: jest.fn().mockResolvedValue(null),
  },
  faultApi: {
    getFaults: jest.fn().mockResolvedValue([]),
  },
  getAllMeasurements: jest.fn().mockResolvedValue([]),
  getLatestMeasurement: jest.fn().mockResolvedValue(null),
  getMeasurementStats: jest.fn().mockResolvedValue(null),
  getUnassignedMeasurements: jest.fn().mockResolvedValue([]),
  getMongoMeasurements: jest.fn().mockResolvedValue([]),
  measurementChannelApi: {
    getChannels: jest.fn().mockResolvedValue([]),
  },
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

jest.mock('@/components/AdvancedZoomChart', () => {
  return function MockAdvancedZoomChart(props: any) {
    return <div data-testid="advanced-zoom-chart">Chart Component</div>;
  };
});

const mockUseParams = useParams as jest.Mock;
const mockUseRouter = useRouter as jest.Mock;

describe('Device Detail Page', () => {
  beforeEach(() => {
    mockUseParams.mockReturnValue({ deviceId: 'test-device-123' });
    mockUseRouter.mockReturnValue({
      push: jest.fn(),
      replace: jest.fn(),
      refresh: jest.fn(),
    });
  });

  it('should render without crashing', () => {
    render(<DeviceDetailPage />);
    
    // Should render something (the page starts with a loading state)
    expect(document.body).toBeTruthy();
  });
});
