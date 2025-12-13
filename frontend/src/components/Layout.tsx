import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      <nav style={{
        background: 'white',
        padding: '1rem 2rem',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
          <Link to="/turbines" style={{ textDecoration: 'none', color: '#007bff', fontWeight: 'bold' }}>
            TurbineOps
          </Link>
          <Link to="/turbines" style={{ textDecoration: 'none', color: '#333' }}>Turbines</Link>
          <Link to="/repair-plans" style={{ textDecoration: 'none', color: '#333' }}>Repair Plans</Link>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <span style={{ color: '#666' }}>{user?.email} ({user?.role})</span>
          <button
            onClick={handleLogout}
            style={{
              padding: '0.5rem 1rem',
              background: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Logout
          </button>
        </div>
      </nav>
      <main style={{ padding: '2rem' }}>
        {children}
      </main>
    </div>
  );
};

