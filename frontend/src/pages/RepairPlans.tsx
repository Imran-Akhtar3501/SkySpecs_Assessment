import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { apiRequest } from '../utils/api';
import { connectWebSocket, connectSSE, disconnect } from '../services/realtime';

interface RepairPlan {
  id: string;
  inspectionId: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  totalEstimatedCost: number;
  createdAt: string;
  inspection?: {
    id: string;
    date: string;
    turbine?: {
      id: string;
      name: string;
    };
  };
}

export const RepairPlans: React.FC = () => {
  const { user } = useAuth();
  const [plans, setPlans] = useState<RepairPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState<string | null>(null);

  useEffect(() => {
    loadPlans();

    // Connect to real-time updates
    const handlePlanCreated = (data: any) => {
      setNotification(`New repair plan created for inspection ${data.inspectionId}`);
      setTimeout(() => setNotification(null), 5000);
      loadPlans(); // Refresh list
    };

    // Try WebSocket first, fallback to SSE
    try {
      connectWebSocket(handlePlanCreated);
    } catch {
      connectSSE(handlePlanCreated);
    }

    return () => {
      disconnect();
    };
  }, []);

  const loadPlans = async () => {
    try {
      const data = await apiRequest<{ data: RepairPlan[] }>('/api/repair-plans');
      setPlans(data.data);
    } catch (error) {
      console.error('Failed to load repair plans:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'HIGH': return '#dc3545';
      case 'MEDIUM': return '#ffc107';
      case 'LOW': return '#28a745';
      default: return '#666';
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <Link to="/turbines" style={{ color: '#007bff', textDecoration: 'none' }}>← Back to Turbines</Link>
      </div>

      <h1>Repair Plans</h1>

      {notification && (
        <div style={{
          background: '#d4edda',
          color: '#155724',
          padding: '1rem',
          borderRadius: '8px',
          marginBottom: '2rem',
          border: '1px solid #c3e6cb',
        }}>
          {notification}
        </div>
      )}

      <div style={{
        background: 'white',
        padding: '1rem',
        borderRadius: '8px',
        marginBottom: '2rem',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      }}>
        <p style={{ margin: 0, color: '#666' }}>
          Real-time updates enabled. New repair plans will appear automatically.
        </p>
      </div>

      <div style={{ display: 'grid', gap: '1rem' }}>
        {plans.map((plan) => (
          <div key={plan.id} style={{
            background: 'white',
            padding: '1.5rem',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            borderLeft: `4px solid ${getPriorityColor(plan.priority)}`,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
              <div>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <h3 style={{ margin: 0 }}>Repair Plan</h3>
                  <span style={{
                    padding: '0.25rem 0.75rem',
                    background: getPriorityColor(plan.priority),
                    color: 'white',
                    borderRadius: '4px',
                    fontSize: '0.875rem',
                    fontWeight: 'bold',
                  }}>
                    {plan.priority}
                  </span>
                </div>
                <div style={{ color: '#666', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                  {plan.inspection?.turbine && (
                    <div>Turbine: {plan.inspection.turbine.name}</div>
                  )}
                  {plan.inspection?.date && (
                    <div>Inspection Date: {new Date(plan.inspection.date).toLocaleDateString()}</div>
                  )}
                  <div>Total Estimated Cost: ${plan.totalEstimatedCost.toFixed(2)}</div>
                  <div>Created: {new Date(plan.createdAt).toLocaleString()}</div>
                </div>
              </div>
            </div>
          </div>
        ))}
        {plans.length === 0 && (
          <div style={{ textAlign: 'center', color: '#666', padding: '2rem' }}>
            No repair plans found. Generate one from an inspection's findings page.
          </div>
        )}
      </div>
    </div>
  );
};

