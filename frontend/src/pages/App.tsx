import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { Layout } from '../components/Layout';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { Login } from './Login';
import { Turbines } from './Turbines';
import { Inspections } from './Inspections';
import { Findings } from './Findings';
import { RepairPlans } from './RepairPlans';

const AppRoutes: React.FC = () => {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/turbines"
        element={
          <ProtectedRoute>
            <Layout>
              <Turbines />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/turbines/:turbineId/inspections"
        element={
          <ProtectedRoute>
            <Layout>
              <Inspections />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/inspections/:inspectionId/findings"
        element={
          <ProtectedRoute>
            <Layout>
              <Findings />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/repair-plans"
        element={
          <ProtectedRoute>
            <Layout>
              <RepairPlans />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route path="/" element={<Navigate to={isAuthenticated ? "/turbines" : "/login"} replace />} />
    </Routes>
  );
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
};
