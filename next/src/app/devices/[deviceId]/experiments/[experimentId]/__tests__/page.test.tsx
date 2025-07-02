import React from 'react';
import { render, screen } from '@testing-library/react';
import ExperimentDetailPage from '../page';

describe('ExperimentDetailPage', () => {
  const mockParams = {
    deviceId: 'device-123',
    experimentId: 'experiment-456'
  };

  it('should render the experiment detail page with device and experiment IDs', () => {
    render(<ExperimentDetailPage params={mockParams} />);
    
    expect(screen.getByTestId('experiment-detail-page')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /experiment details/i })).toBeInTheDocument();
    expect(screen.getByText(/device id: device-123/i)).toBeInTheDocument();
    expect(screen.getByText(/experiment id: experiment-456/i)).toBeInTheDocument();
    expect(screen.getByText(/experiment management functionality coming soon/i)).toBeInTheDocument();
  });

  it('should have correct accessibility structure', () => {
    render(<ExperimentDetailPage params={mockParams} />);
    
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toHaveTextContent('Experiment Details');
  });

  it('should display different device and experiment IDs when provided', () => {
    const differentParams = {
      deviceId: 'test-device',
      experimentId: 'test-experiment'
    };
    
    render(<ExperimentDetailPage params={differentParams} />);
    
    expect(screen.getByText(/device id: test-device/i)).toBeInTheDocument();
    expect(screen.getByText(/experiment id: test-experiment/i)).toBeInTheDocument();
  });
});
