import React from 'react';
import { render, screen } from '@testing-library/react';
import { useParams, useRouter } from 'next/navigation';
import CreateFaultPage from '../page';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useParams: jest.fn(),
  useRouter: jest.fn(),
}));

// Mock the API services
jest.mock('@/services/api', () => ({
  faultApi: {
    createFault: jest.fn(),
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

const mockUseParams = useParams as jest.Mock;
const mockUseRouter = useRouter as jest.Mock;

describe('Create Fault Page', () => {
  beforeEach(() => {
    mockUseParams.mockReturnValue({ deviceId: 'test-device-123' });
    mockUseRouter.mockReturnValue({
      push: jest.fn(),
      replace: jest.fn(),
      refresh: jest.fn(),
    });
  });

  it('should render without crashing', () => {
    render(<CreateFaultPage />);
    
    // Should render the device protected route
    expect(screen.getByTestId('device-protected-route')).toBeInTheDocument();
  });
});
