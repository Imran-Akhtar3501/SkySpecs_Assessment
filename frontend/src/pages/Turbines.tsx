import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { apiRequest } from '../utils/api';

interface Turbine {
  id: string;
  name: string;
  manufacturer?: string;
  mwRating?: number;
  lat?: number;
  lng?: number;
}

export const Turbines: React.FC = () => {
  const { user } = useAuth();
  const [turbines, setTurbines] = useState<Turbine[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    manufacturer: '',
    mwRating: '',
    lat: '',
    lng: '',
  });

  useEffect(() => {
    loadTurbines();
  }, []);

  const loadTurbines = async () => {
    try {
      const data = await apiRequest<{ data: Turbine[] }>('/api/turbines');
      setTurbines(data.data);
    } catch (error) {
      console.error('Failed to load turbines:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest<Turbine>('/api/turbines', {
        method: 'POST',
        body: JSON.stringify({
          name: formData.name,
          manufacturer: formData.manufacturer || undefined,
          mwRating: formData.mwRating ? parseFloat(formData.mwRating) : undefined,
          lat: formData.lat ? parseFloat(formData.lat) : undefined,
          lng: formData.lng ? parseFloat(formData.lng) : undefined,
        }),
      });
      setFormData({ name: '', manufacturer: '', mwRating: '', lat: '', lng: '' });
      setShowForm(false);
      loadTurbines();
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this turbine?')) return;
    try {
      await apiRequest(`/api/turbines/${id}`, { method: 'DELETE' });
      loadTurbines();
    } catch (error: any) {
      alert(error.message);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1>Turbines</h1>
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
            {showForm ? 'Cancel' : 'Add Turbine'}
          </button>
        )}
      </div>

      {showForm && (user?.role === 'ADMIN' || user?.role === 'ENGINEER') && (
        <form onSubmit={handleSubmit} style={{
          background: 'white',
          padding: '1.5rem',
          borderRadius: '8px',
          marginBottom: '2rem',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        }}>
          <h2 style={{ marginTop: 0 }}>Create Turbine</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>Manufacturer</label>
              <input
                type="text"
                value={formData.manufacturer}
                onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>MW Rating</label>
              <input
                type="number"
                step="0.1"
                value={formData.mwRating}
                onChange={(e) => setFormData({ ...formData, mwRating: e.target.value })}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>Latitude</label>
              <input
                type="number"
                step="0.0001"
                value={formData.lat}
                onChange={(e) => setFormData({ ...formData, lat: e.target.value })}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>Longitude</label>
              <input
                type="number"
                step="0.0001"
                value={formData.lng}
                onChange={(e) => setFormData({ ...formData, lng: e.target.value })}
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
        {turbines.map((turbine) => (
          <div key={turbine.id} style={{
            background: 'white',
            padding: '1.5rem',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <div>
              <h3 style={{ margin: 0, marginBottom: '0.5rem' }}>{turbine.name}</h3>
              <div style={{ color: '#666', fontSize: '0.9rem' }}>
                {turbine.manufacturer && <span>Manufacturer: {turbine.manufacturer} | </span>}
                {turbine.mwRating && <span>MW: {turbine.mwRating} | </span>}
                {turbine.lat && turbine.lng && (
                  <span>Location: ({turbine.lat.toFixed(4)}, {turbine.lng.toFixed(4)})</span>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <Link
                to={`/turbines/${turbine.id}/inspections`}
                style={{
                  padding: '0.5rem 1rem',
                  background: '#007bff',
                  color: 'white',
                  textDecoration: 'none',
                  borderRadius: '4px',
                }}
              >
                View Inspections
              </Link>
              {user?.role === 'ADMIN' && (
                <button
                  onClick={() => handleDelete(turbine.id)}
                  style={{
                    padding: '0.5rem 1rem',
                    background: '#dc3545',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                  }}
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

