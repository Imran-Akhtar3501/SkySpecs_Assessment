import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { apiRequest } from '../utils/api';

interface Inspection {
  id: string;
  date: string;
  inspectorName?: string;
  dataSource: string;
  rawPackageUrl?: string;
  findings: any[];
  repairPlan?: any;
}

export const Inspections: React.FC = () => {
  const { turbineId } = useParams<{ turbineId: string }>();
  const { user } = useAuth();
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    dataSource: '',
  });
  const [formData, setFormData] = useState({
    date: '',
    inspectorName: '',
    dataSource: 'DRONE',
    rawPackageUrl: '',
  });

  useEffect(() => {
    if (turbineId) {
      setLoading(true);
      setError(null);
      loadInspections();
    }
  }, [turbineId, filters.startDate, filters.endDate, filters.dataSource]);

  const loadInspections = async () => {
    if (!turbineId) {
      setError('Turbine ID is missing');
      setLoading(false);
      return;
    }
    
    try {
      const params = new URLSearchParams();
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.dataSource) params.append('dataSource', filters.dataSource);
      
      const data = await apiRequest<{ data: Inspection[] }>(
        `/api/turbines/${turbineId}/inspections?${params.toString()}`
      );
      setInspections(data.data || []);
      setError(null);
    } catch (error: any) {
      console.error('Failed to load inspections:', error);
      setError(error.message || 'Failed to load inspections');
      setInspections([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!turbineId) {
      alert('Turbine ID is missing');
      return;
    }
    
    try {
      await apiRequest<Inspection>(`/api/turbines/${turbineId}/inspections`, {
        method: 'POST',
        body: JSON.stringify(formData),
      });
      setFormData({ date: '', inspectorName: '', dataSource: 'DRONE', rawPackageUrl: '' });
      setShowForm(false);
      setError(null);
      await loadInspections();
    } catch (error: any) {
      alert(error.message || 'Failed to create inspection');
    }
  };

  if (!turbineId) {
    return (
      <div>
        <div style={{ marginBottom: '2rem' }}>
          <Link to="/turbines" style={{ color: '#007bff', textDecoration: 'none' }}>← Back to Turbines</Link>
        </div>
        <div style={{ padding: '2rem', textAlign: 'center', color: '#dc3545' }}>
          Invalid turbine ID
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div>
        <div style={{ marginBottom: '2rem' }}>
          <Link to="/turbines" style={{ color: '#007bff', textDecoration: 'none' }}>← Back to Turbines</Link>
        </div>
        <div style={{ padding: '2rem', textAlign: 'center' }}>Loading inspections...</div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <Link to="/turbines" style={{ color: '#007bff', textDecoration: 'none' }}>← Back to Turbines</Link>
      </div>
      
      {error && (
        <div style={{
          background: '#fee',
          color: '#c33',
          padding: '1rem',
          borderRadius: '8px',
          marginBottom: '2rem',
          border: '1px solid #fcc',
        }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1>Inspections</h1>
        {(user?.role === 'ADMIN' || user?.role === 'ENGINEER') && (
          <button
            onClick={() => setShowForm(!showForm)}
            style={{
              padding: '0.75rem 1.5rem',
              background: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            {showForm ? 'Cancel' : 'Add Inspection'}
          </button>
        )}
      </div>

      <div style={{
        background: 'white',
        padding: '1rem',
        borderRadius: '8px',
        marginBottom: '2rem',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      }}>
        <h3 style={{ marginTop: 0 }}>Filters</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem' }}>Start Date</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem' }}>End Date</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem' }}>Data Source</label>
            <select
              value={filters.dataSource}
              onChange={(e) => setFilters({ ...filters, dataSource: e.target.value })}
              style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
            >
              <option value="">All</option>
              <option value="DRONE">DRONE</option>
              <option value="MANUAL">MANUAL</option>
            </select>
          </div>
        </div>
      </div>

      {showForm && (user?.role === 'ADMIN' || user?.role === 'ENGINEER') && (
        <form onSubmit={handleSubmit} style={{
          background: 'white',
          padding: '1.5rem',
          borderRadius: '8px',
          marginBottom: '2rem',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        }}>
          <h2 style={{ marginTop: 0 }}>Create Inspection</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>Date *</label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>Data Source *</label>
              <select
                value={formData.dataSource}
                onChange={(e) => setFormData({ ...formData, dataSource: e.target.value })}
                required
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
              >
                <option value="DRONE">DRONE</option>
                <option value="MANUAL">MANUAL</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>Inspector Name</label>
              <input
                type="text"
                value={formData.inspectorName}
                onChange={(e) => setFormData({ ...formData, inspectorName: e.target.value })}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>Raw Package URL</label>
              <input
                type="url"
                value={formData.rawPackageUrl}
                onChange={(e) => setFormData({ ...formData, rawPackageUrl: e.target.value })}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
              />
            </div>
          </div>
          <button type="submit" style={{
            padding: '0.75rem 1.5rem',
            background: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}>
            Create
          </button>
        </form>
      )}

      <div style={{ display: 'grid', gap: '1rem' }}>
        {inspections.length === 0 && !error && (
          <div style={{
            background: 'white',
            padding: '2rem',
            borderRadius: '8px',
            textAlign: 'center',
            color: '#666',
          }}>
            No inspections found. Create one to get started.
          </div>
        )}
        {inspections.map((inspection) => (
          <div key={inspection.id} style={{
            background: 'white',
            padding: '1.5rem',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
              <div>
                <h3 style={{ margin: 0, marginBottom: '0.5rem' }}>
                  {new Date(inspection.date).toLocaleDateString()}
                </h3>
                <div style={{ color: '#666', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                  <div>Inspector: {inspection.inspectorName || 'N/A'}</div>
                  <div>Data Source: {inspection.dataSource}</div>
                  <div>Findings: {inspection.findings?.length || 0}</div>
                  {inspection.repairPlan && (
                    <div style={{ color: '#28a745', fontWeight: 'bold' }}>
                      Repair Plan: {inspection.repairPlan.priority} - ${inspection.repairPlan.totalEstimatedCost.toFixed(2)}
                    </div>
                  )}
                </div>
              </div>
              <Link
                to={`/inspections/${inspection.id}/findings`}
                style={{
                  padding: '0.5rem 1rem',
                  background: '#007bff',
                  color: 'white',
                  textDecoration: 'none',
                  borderRadius: '4px',
                }}
              >
                View Findings
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

