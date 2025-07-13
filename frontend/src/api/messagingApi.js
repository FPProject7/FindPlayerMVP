import { useAuthStore } from '../stores/useAuthStore';

const BASE_URL = 'https://20mot13f4g.execute-api.us-east-1.amazonaws.com';

async function getAuthHeader() {
  const token = await useAuthStore.getState().getValidToken();
  return { 'Authorization': `Bearer ${token}` };
}

export async function sendMessage(receiverId, content, conversationId = null) {
  const authHeader = await getAuthHeader();
  const payload = {
    receiverId,
    content,
    ...(conversationId && { conversationId })
  };
  
  const res = await fetch(`${BASE_URL}/send-message`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json', 
      ...authHeader 
    },
    body: JSON.stringify(payload)
  });
  
  if (!res.ok) throw new Error('Failed to send message');
  return res.json();
}

export async function createConversation(otherUserId) {
  const authHeader = await getAuthHeader();
  const res = await fetch(`${BASE_URL}/create-conversation`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json', 
      ...authHeader 
    },
    body: JSON.stringify({ otherUserId })
  });
  
  if (!res.ok) throw new Error('Failed to create conversation');
  return res.json();
}

export async function listConversations() {
  const authHeader = await getAuthHeader();
  const res = await fetch(`${BASE_URL}/list-conversations`, {
    headers: { ...authHeader }
  });
  
  if (!res.ok) throw new Error('Failed to fetch conversations');
  return res.json();
}

export async function getConversationMessages(conversationId) {
  const authHeader = await getAuthHeader();
  const res = await fetch(`${BASE_URL}/get-conversation-messages?conversationId=${conversationId}`, {
    headers: { ...authHeader }
  });
  
  if (!res.ok) throw new Error('Failed to fetch messages');
  return res.json();
} 