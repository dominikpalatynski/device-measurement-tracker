import React from 'react';
import { render, screen } from '@testing-library/react';
import UserManagement from '../page';

// Mock the auth context to avoid complex authentication setup
jest.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({
    isAdmin: false,
    isAuthenticated: false,
    user: null,
  }),
}));

// Mock the PageLayout component
jest.mock('../../../components/PageLayout', () => {
  return function MockPageLayout({ children, title }: { children: React.ReactNode; title: string }) {
    return <div data-testid="page-layout" title={title}>{children}</div>;
  };
});

describe('User Management Page', () => {
  it('should render without crashing when user is not admin', () => {
    render(<UserManagement />);
    
    // Should render the page layout
    expect(screen.getByTestId('page-layout')).toBeInTheDocument();
  });
});