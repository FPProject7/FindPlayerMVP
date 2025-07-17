// SubscribeButton.jsx
// Usage: <SubscribeButton userId={userId} userType="athlete" returnUrl={window.location.href} />
// Calls backend endpoint /stripe-create-checkout-session (POST) with { userType, billingPeriod, userId, returnUrl }
// Expects backend to return { url } for Stripe Checkout redirect
// userId is optional but recommended for tracking

import React, { useState } from 'react';
import { useAuthStore } from '../../stores/useAuthStore';

const periods = [
  { label: 'Monthly', value: 'monthly' },
  { label: 'Yearly', value: 'yearly' },
];

export default function SubscribeButton({ userId, userType = 'athlete', returnUrl, isPremium }) {
  if (isPremium) {
    return null;
  }
  const [billingPeriod, setBillingPeriod] = useState('monthly');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const API_BASE_URL = 'https://y219q4oqh5.execute-api.us-east-1.amazonaws.com/default';

  // Get the token from the auth store
  const token = useAuthStore(state => state.token);

  // Always append ?stripe=success to the returnUrl for Stripe redirect
  let effectiveReturnUrl = returnUrl || (typeof window !== 'undefined' ? window.location.href : 'https://findplayer.app/profile');
  if (effectiveReturnUrl.indexOf('?') === -1) {
    effectiveReturnUrl += '?stripe=success';
  } else if (!effectiveReturnUrl.includes('stripe=success')) {
    effectiveReturnUrl += '&stripe=success';
  }

  const handleSubscribe = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE_URL}/stripe-create-checkout-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ userType, billingPeriod, userId, returnUrl: effectiveReturnUrl }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error || 'Failed to create checkout session');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: '0 auto', padding: 16, border: '1px solid #eee', borderRadius: 8 }}>
      <h3 style={{ textAlign: 'center', fontWeight: 600, fontSize: 22, marginBottom: 16 }}>Subscribe to Premium</h3>
      <div style={{ marginBottom: 16, textAlign: 'center' }}>
        <label style={{ marginRight: 8, fontWeight: 500 }}>Billing Period: </label>
        <select
          value={billingPeriod}
          onChange={e => setBillingPeriod(e.target.value)}
          style={{
            padding: '8px 16px',
            borderRadius: 9999,
            border: '1px solid #ccc',
            fontSize: 16,
            outline: 'none',
            marginRight: 8,
            background: '#fff',
            color: '#333',
            fontWeight: 500
          }}
        >
          {periods.map(period => (
            <option key={period.value} value={period.value}>{period.label}</option>
          ))}
        </select>
      </div>
      <button
        onClick={handleSubscribe}
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
          marginBottom: 8
        }}
        onMouseOver={e => { if (!loading) e.currentTarget.style.background = '#CC0000'; }}
        onMouseOut={e => { if (!loading) e.currentTarget.style.background = '#FF0505'; }}
      >
        {loading ? 'Redirecting...' : 'Subscribe'}
      </button>
      {error && <div style={{ color: 'red', marginTop: 8, textAlign: 'center' }}>{error}</div>}
    </div>
  );
} 