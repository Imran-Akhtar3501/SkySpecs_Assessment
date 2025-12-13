import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { apiRequest } from '../utils/api';

interface Finding {
  id: string;
  category: string;
  severity: number;
  estimatedCost: number;
  notes?: string;
  severityAdjusted?: boolean;
  originalSeverity?: number;
}

export const Findings: React.FC = () => {
  const { inspectionId } = useParams<{ inspectionId: string }>();
  const { user } = useAuth();
  const [findings, setFindings] = useState<Finding[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [searchNotes, setSearchNotes] = useState('');
  const [formData, setFormData] = useState({
    category: 'BLADE_DAMAGE',
    severity: '1',
    estimatedCost: '',
    notes: '',
  });

  useEffect(() => {
    loadFindings();
  }, [inspectionId, searchNotes]);

  const loadFindings = async () => {
    try {
      const params = new URLSearchParams();
      params.append('inspectionId', inspectionId!);
      if (searchNotes) params.append('searchNotes', searchNotes);
      
      const data = await apiRequest<Finding[]>(`/api/findings?${params.toString()}`);
      setFindings(data);
    } catch (error) {
      console.error('Failed to load findings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const result = await apiRequest<Finding>(`/api/findings`, {
        method: 'POST',
        body: JSON.stringify({
          inspectionId,
          category: formData.category,
          severity: parseInt(formData.severity),
          estimatedCost: parseFloat(formData.estimatedCost),
          notes: formData.notes || undefined,
        }),
      });
      
      if (result.severityAdjusted) {
        alert(`Severity was auto-upgraded from ${result.originalSeverity} to ${result.severity} due to BLADE_DAMAGE with crack rule.`);
      }
      
      setFormData({ category: 'BLADE_DAMAGE', severity: '1', estimatedCost: '', notes: '' });
      setShowForm(false);
      loadFindings();
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleGenerateRepairPlan = async () => {
    if (!confirm('Generate repair plan for this inspection?')) return;
    try {
      await apiRequest(`/api/repair-plans/${inspectionId}`, { method: 'POST' });
      alert('Repair plan generated! Check the Repair Plans page for updates.');
    } catch (error: any) {
      alert(error.message);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <Link to="/turbines" style={{ color: '#007bff', textDecoration: 'none' }}>← Back to Turbines</Link>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1>Findings</h1>
        <div style={{ display: 'flex', gap: '1rem' }}>
          {(user?.role === 'ADMIN' || user?.role === 'ENGINEER') && (
            <>
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
                {showForm ? 'Cancel' : 'Add Finding'}
              </button>
              <button
                onClick={handleGenerateRepairPlan}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                Generate Repair Plan
              </button>
            </>
          )}
        </div>
      </div>

      <div style={{
        background: 'white',
        padding: '1rem',
        borderRadius: '8px',
        marginBottom: '2rem',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      }}>
        <label style={{ display: 'block', marginBottom: '0.5rem' }}>Search Notes</label>
        <input
          type="text"
          value={searchNotes}
          onChange={(e) => setSearchNotes(e.target.value)}
          placeholder="Search findings by notes..."
          style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
        />
      </div>

      {showForm && (user?.role === 'ADMIN' || user?.role === 'ENGINEER') && (
        <form onSubmit={handleSubmit} style={{
          background: 'white',
          padding: '1.5rem',
          borderRadius: '8px',
          marginBottom: '2rem',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        }}>
          <h2 style={{ marginTop: 0 }}>Create Finding</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>Category *</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                required
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
              >
                <option value="BLADE_DAMAGE">BLADE_DAMAGE</option>
                <option value="LIGHTNING">LIGHTNING</option>
                <option value="EROSION">EROSION</option>
                <option value="UNKNOWN">UNKNOWN</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>Severity (1-5) *</label>
              <input
                type="number"
                min="1"
                max="5"
                value={formData.severity}
                onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
                required
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>Estimated Cost *</label>
              <input
                type="number"
                step="0.01"
                value={formData.estimatedCost}
                onChange={(e) => setFormData({ ...formData, estimatedCost: e.target.value })}
                required
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>Notes</label>
              <input
                type="text"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="e.g., 'crack in blade'"
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
        {findings.map((finding) => (
          <div key={finding.id} style={{
            background: 'white',
            padding: '1.5rem',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
              <div>
                <h3 style={{ margin: 0, marginBottom: '0.5rem' }}>{finding.category}</h3>
                <div style={{ color: '#666', fontSize: '0.9rem' }}>
                  <div>Severity: {finding.severity} {finding.severityAdjusted && (
                    <span style={{ color: '#ffc107' }}>(auto-upgraded from {finding.originalSeverity})</span>
                  )}</div>
                  <div>Estimated Cost: ${finding.estimatedCost.toFixed(2)}</div>
                  {finding.notes && <div>Notes: {finding.notes}</div>}
                </div>
              </div>
            </div>
          </div>
        ))}
        {findings.length === 0 && <div style={{ textAlign: 'center', color: '#666', padding: '2rem' }}>No findings found</div>}
      </div>
    </div>
  );
};

