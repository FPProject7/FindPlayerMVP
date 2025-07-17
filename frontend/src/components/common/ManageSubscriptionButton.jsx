import React, { useState } from 'react';
import { useAuthStore } from '../../stores/useAuthStore';

const API_BASE_URL = 'https://y219q4oqh5.execute-api.us-east-1.amazonaws.com/default';

export default function ManageSubscriptionButton({ customerId, isPremium }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const token = useAuthStore(state => state.token);

  if (!isPremium) return null;

  const handleManage = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE_URL}/stripe-create-customer-portal-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          customerId,
          returnUrl: typeof window !== 'undefined' ? window.location.href : 'https://findplayer.app/profile',
        }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error || 'Failed to create portal session');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleManage}
      disabled={loading}
      style={{
        width: '100%',
        padding: '12px 0',
        background: loading ? '#FF7F7F' : '#FF0505',
        color: '#fff',
        border: 'none',
        borderRadius: 9999,
        fontWeight: 700,
        fontSize: 18,
        boxShadow: '0 2px 8px rgba(255,5,5,0.08)',
        cursor: loading ? 'not-allowed' : 'pointer',
        transition: 'background 0.2s',
        marginTop: 12,
        marginBottom: 8,
      }}
      onMouseOver={e => { if (!loading) e.currentTarget.style.background = '#CC0000'; }}
      onMouseOut={e => { if (!loading) e.currentTarget.style.background = '#FF0505'; }}
    >
      {loading ? 'Redirecting...' : 'Manage Subscription'}
      {error && <div style={{ color: 'red', marginTop: 8, textAlign: 'center' }}>{error}</div>}
    </button>
  );
} 