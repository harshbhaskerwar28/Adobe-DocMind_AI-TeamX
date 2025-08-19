/**
 * API utilities for PDF chatbot functionality
 */

const API_BASE_URL = window.location.origin;

export interface ChatMessage {
  question: string;
  pdf_content: string;
  pdf_name: string;
}

export interface ChatResponse {
  answer: string;
  confidence: number;
  is_relevant: boolean;
  context_used?: string;
}

export interface HealthResponse {
  status: string;
  message: string;
}

/**
 * Test backend connectivity
 */
export async function testbackendConnection(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      console.error('backend health check failed:', response.status);
      return false;
    }
    
    const data: HealthResponse = await response.json();
    console.log('backend health check:', data);
    return data.status === 'healthy' || data.status === 'partial';
    
  } catch (error) {
    console.error('backend connection error:', error);
    return false;
  }
}

/**
 * Send a chat message to the PDF chatbot
 */
export async function sendChatMessage(message: ChatMessage): Promise<ChatResponse> {
  const response = await fetch(`${API_BASE_URL}/api/pdf-chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(message),
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
  }
  
  return await response.json();
}

/**
 * Get backend service status and statistics
 */
export async function getbackendStatus(): Promise<{
  health: HealthResponse;
  vectorDbStats: { total_documents: number; database_size: number };
}> {
  try {
    const [healthResponse, statsResponse] = await Promise.all([
      fetch(`${API_BASE_URL}/health`),
      fetch(`${API_BASE_URL}/api/vector-db-stats`)
    ]);
    
    const health = await healthResponse.json();
    const vectorDbStats = await statsResponse.json();
    
    return { health, vectorDbStats };
    
  } catch (error) {
    console.error('Error getting backend status:', error);
    throw error;
  }
}
