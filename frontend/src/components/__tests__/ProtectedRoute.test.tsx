import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import { ProtectedRoute } from '../ProtectedRoute';
import { AuthProvider } from '../../contexts/AuthContext';

// Mock the API
vi.mock('../../utils/api', () => ({
  apiRequest: vi.fn(),
}));

// Mock fetch for AuthContext
global.fetch = vi.fn();

describe('ProtectedRoute', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should redirect to login when not authenticated', () => {
    const TestComponent = () => <div>Protected Content</div>;
    
    render(
      <MemoryRouter initialEntries={['/protected']}>
        <AuthProvider>
          <ProtectedRoute>
            <TestComponent />
          </ProtectedRoute>
        </AuthProvider>
      </MemoryRouter>
    );
    
    // When not authenticated, ProtectedRoute should redirect to /login
    // The Navigate component will change the location
    // We can't easily test the redirect without more setup, but we can verify
    // that the protected content is not shown
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('should render children when authenticated', () => {
    const TestComponent = () => <div>Protected Content</div>;
    
    // Set up authenticated state in localStorage
    const mockUser = {
      id: '1',
      email: 'test@example.com',
      name: 'Test User',
      role: 'VIEWER' as const,
    };
    localStorage.setItem('token', 'mock-token');
    localStorage.setItem('user', JSON.stringify(mockUser));
    
    render(
      <MemoryRouter initialEntries={['/protected']}>
        <AuthProvider>
          <ProtectedRoute>
            <TestComponent />
          </ProtectedRoute>
        </AuthProvider>
      </MemoryRouter>
    );
    
    // When authenticated, the protected content should be visible
    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  it('should allow access when user has required role', () => {
    const TestComponent = () => <div>Admin Content</div>;
    
    const mockUser = {
      id: '1',
      email: 'admin@example.com',
      name: 'Admin User',
      role: 'ADMIN' as const,
    };
    localStorage.setItem('token', 'mock-token');
    localStorage.setItem('user', JSON.stringify(mockUser));
    
    render(
      <MemoryRouter initialEntries={['/admin']}>
        <AuthProvider>
          <ProtectedRoute requiredRole="ADMIN">
            <TestComponent />
          </ProtectedRoute>
        </AuthProvider>
      </MemoryRouter>
    );
    
    expect(screen.getByText('Admin Content')).toBeInTheDocument();
  });

  it('should redirect when user does not have required role', () => {
    const TestComponent = () => <div>Admin Content</div>;
    
    const mockUser = {
      id: '1',
      email: 'viewer@example.com',
      name: 'Viewer User',
      role: 'VIEWER' as const,
    };
    localStorage.setItem('token', 'mock-token');
    localStorage.setItem('user', JSON.stringify(mockUser));
    
    render(
      <MemoryRouter initialEntries={['/admin']}>
        <AuthProvider>
          <ProtectedRoute requiredRole="ADMIN">
            <TestComponent />
          </ProtectedRoute>
        </AuthProvider>
      </MemoryRouter>
    );
    
    // Should redirect to /turbines when role doesn't match
    expect(screen.queryByText('Admin Content')).not.toBeInTheDocument();
  });
});

