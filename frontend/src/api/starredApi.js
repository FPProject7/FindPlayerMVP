import { useAuthStore } from '../stores/useAuthStore';

const BASE_URL = 'https://20mot13f4g.execute-api.us-east-1.amazonaws.com';

async function getAuthHeader() {
  const token = await useAuthStore.getState().getValidToken();
  return { 'Authorization': `Bearer ${token}` };
}

export async function starPlayer(scoutId, athleteId) {
  const authHeader = await getAuthHeader();
  const res = await fetch(`${BASE_URL}/star-player`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeader },
    body: JSON.stringify({ scoutId, athleteId })
  });
  if (!res.ok) throw new Error('Failed to star player');
  return res.json();
}

export async function unstarPlayer(scoutId, athleteId) {
  const authHeader = await getAuthHeader();
  const res = await fetch(`${BASE_URL}/unstar-player`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeader },
    body: JSON.stringify({ scoutId, athleteId })
  });
  if (!res.ok) throw new Error('Failed to unstar player');
  return res.json();
}

export async function getStarredPlayers(scoutId) {
  const authHeader = await getAuthHeader();
  const res = await fetch(`${BASE_URL}/get-starred-players?scoutId=${encodeURIComponent(scoutId)}`, {
    headers: { ...authHeader }
  });
  if (!res.ok) throw new Error('Failed to fetch starred players');
  return res.json();
} 