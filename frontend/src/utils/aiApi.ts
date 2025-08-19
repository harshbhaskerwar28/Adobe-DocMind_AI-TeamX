/**
 * AI API Communication Layer
 * Handles all backend communication for AI-powered features
 */

const API_BASE_URL = window.location.origin;

export interface SimilarityResult {
  content: string;
  metadata: {
    file_id: string;
    filename: string;
    chunk_id: string;
    chunk_index: number;
    total_chunks: number;
    timestamp: string;
    content_preview: string;
  };
  similarity_score: number;
  similarity_percentage: number;
}

export interface SimilaritySearchResponse {
  query: string;
  results: SimilarityResult[];
  total_found: number;
  search_timestamp: string;
}

export interface AIInsight {
  type: 'contradiction' | 'pattern' | 'discovery' | 'opportunity';
  title: string;
  description: string;
  evidence: string;
  confidence: number;
  impact: 'High' | 'Medium' | 'Low';
  category: string;
}

export interface AIInsightsResponse {
  selected_text: string;
  insights: {
    summary: string;
    insights: AIInsight[];
    cross_document_analysis: {
      agreements: string[];
      disagreements: string[];
      gaps: string[];
      evolution: string;
    };
    actionable_recommendations: string[];
  };
  related_documents: number;
  analysis_timestamp: string;
}

export interface Connection {
  title: string;
  document: string;
  snippet: string;
  relationship: string;
  strength: 'High' | 'Medium' | 'Low';
  type: 'supporting' | 'contradictory' | 'example' | 'extension';
}

export interface SimilarityAnalysisResponse {
  selected_text: string;
  analysis: {
    summary: string;
    connections: Connection[];
    key_insights: string[];
    suggested_follow_up: string;
  };
  similar_documents: number;
  analysis_timestamp: string;
}

export interface VectorDBStats {
  status: string;
  stats: {
    total_documents: number;
    total_chunks: number;
    database_size_mb: number;
    embedding_dimension: number;
    last_updated: string;
  };
  ai_available: boolean;
}

class AIApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private async makeRequest<T>(endpoint: string, options: RequestInit = {}, timeoutMs: number = 30000): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    console.log(`🌐 API Request starting:`, {
      url,
      method: options.method || 'GET',
      headers: options.headers,
      bodyPreview: options.body ? options.body.toString().substring(0, 200) + '...' : 'No body',
      timeout: `${timeoutMs / 1000}s`
    });
    
    try {
      const startTime = Date.now();
      
      // Add timeout to prevent hanging requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
        console.log(`🌐 Request timeout after ${timeoutMs / 1000} seconds for: ${url}`);
      }, timeoutMs);
      
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        signal: controller.signal,
        ...options,
      });
      
      clearTimeout(timeoutId);

      const endTime = Date.now();
      console.log(`🌐 API Response received:`, {
        url,
        status: response.status,
        statusText: response.statusText,
        timeMs: endTime - startTime,
        ok: response.ok
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error(`🌐 API Error Response:`, {
          url,
          status: response.status,
          errorData
        });
        throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`);
      }

      const jsonData = await response.json();
      console.log(`🌐 API Success Response:`, {
        url,
        dataKeys: Object.keys(jsonData),
        dataPreview: JSON.stringify(jsonData).substring(0, 300) + '...'
      });

      return jsonData;
    } catch (error) {
      console.error(`🌐 API Error for ${endpoint}:`, error);
      
      if (error instanceof Error) {
        // Check for timeout/abort errors
        if (error.name === 'AbortError') {
          throw new Error('Request timed out. The AI analysis is taking too long. Please try again or check your backend connection.');
        }
        // Check for common network errors
        if (error.message.includes('fetch') || error.message.includes('NetworkError')) {
          throw new Error('Unable to connect to AI backend. Please ensure the backend server is running on http://localhost:8000');
        }
        if (error.message.includes('timeout')) {
          throw new Error('Request timed out. The AI analysis is taking too long. Please try again.');
        }
        throw error;
      }
      
      throw new Error('An unexpected error occurred while communicating with the AI backend.');
    }
  }

  /**
   * Search for similar content across all documents
   */
  async searchSimilar(
    queryText: string, 
    topK: number = 10, 
    minSimilarity: number = 0.3
  ): Promise<SimilaritySearchResponse> {
    console.log("🔍🔗 API: searchSimilar called with:", { 
      queryTextLength: queryText.length,
      queryTextPreview: queryText.substring(0, 100),
      topK, 
      minSimilarity 
    });
    console.log("🔍🔗 API: Full query text:", queryText);
    console.log("🔍🔗 API: Request URL:", `${this.baseUrl}/similarity-search`);
    
    const requestBody = {
      query_text: queryText,
      top_k: topK,
      min_similarity: minSimilarity,
      request_type: "similarity_search",
      source: "frontend_text_selection",
      timestamp: new Date().toISOString()
    };
    
    console.log("🔍🔗 API: Request body:", requestBody);
    
    const response = await this.makeRequest<SimilaritySearchResponse>('/similarity-search', {
      method: 'POST',
      body: JSON.stringify(requestBody),
    });
    
    console.log("🔍🔗 API: searchSimilar response:", response);
    return response;
  }

  /**
   * Generate AI-powered insights using Gemini 2.5 Pro
   */
  async generateAIInsights(
    selectedText: string, 
    context?: string
  ): Promise<AIInsightsResponse> {
    console.log("🧠🔗 API: generateAIInsights called with:", { 
      selectedTextLength: selectedText.length,
      selectedTextPreview: selectedText.substring(0, 100),
      context 
    });
    console.log("🧠🔗 API: Full selected text:", selectedText);
    console.log("🧠🔗 API: Request URL:", `${this.baseUrl}/ai-insights`);
    
    const requestBody = {
      selected_text: selectedText,
      context: context || "AI_INSIGHTS_REQUEST",
      request_type: "ai_insights",
      source: "frontend_text_selection",
      timestamp: new Date().toISOString()
    };
    
    console.log("🧠🔗 API: Request body:", requestBody);
    
    const response = await this.makeRequest<AIInsightsResponse>('/ai-insights', {
      method: 'POST',
      body: JSON.stringify(requestBody),
    });
    
    console.log("🧠🔗 API: generateAIInsights response:", response);
    return response;
  }

  /**
   * Generate detailed similarity analysis with AI explanations
   */
  async generateSimilarityAnalysis(
    selectedText: string, 
    context?: string
  ): Promise<SimilarityAnalysisResponse> {
    return this.makeRequest<SimilarityAnalysisResponse>('/similarity-analysis', {
      method: 'POST',
      body: JSON.stringify({
        selected_text: selectedText,
        context,
      }),
    });
  }

  /**
   * Get vector database statistics
   */
  async getVectorDBStats(): Promise<VectorDBStats> {
    return this.makeRequest<VectorDBStats>('/vector-db-stats');
  }

  /**
   * Add a document to the vector database
   */
  async addDocument(
    filename: string,
    content: string,
    fileId?: string,
    metadata?: Record<string, any>
  ): Promise<{ success: boolean; file_id: string; filename: string; message: string }> {
    return this.makeRequest('/add-document', {
      method: 'POST',
      body: JSON.stringify({
        filename,
        content,
        file_id: fileId,
        metadata,
      }),
    });
  }

  /**
   * Remove a document from the vector database
   */
  async removeDocument(fileId: string): Promise<{ success: boolean; file_id: string; message: string }> {
    return this.makeRequest(`/remove-document/${fileId}`, {
      method: 'DELETE',
    });
  }

  /**
   * Test backend connectivity and health
   */
  async testbackendHealth(): Promise<{ status: string; message?: string }> {
    try {
      console.log("🏥 API: Testing backend health...");
      const response = await this.makeRequest<{ status: string; message?: string }>('/health');
      console.log("🏥 API: backend health check passed:", response);
      return response;
    } catch (error) {
      console.error("🏥 API: backend health check failed:", error);
      throw error;
    }
  }

  /**
   * Debug function to test API connectivity
   * Call this from browser console: window.debugAPI()
   */
  async debugAPIConnectivity(): Promise<void> {
    console.log("🔧 === DEBUG API CONNECTIVITY ===");
    console.log("🔧 Base URL:", this.baseUrl);
    
    try {
      // Test 1: Health check
      console.log("🔧 Test 1: Health check...");
      const health = await this.testbackendHealth();
      console.log("✅ Health check passed:", health);
      
      // Test 2: Raw fetch to clear endpoint
      console.log("🔧 Test 2: Raw fetch to clear endpoint...");
      const response = await fetch(`${this.baseUrl}/clear-vector-db`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      console.log("🔧 Raw fetch response status:", response.status);
      console.log("🔧 Raw fetch response headers:", [...response.headers.entries()]);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("🔧 Raw fetch error response:", errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      const data = await response.json();
      console.log("✅ Raw fetch success:", data);
      
      // Test 3: Using makeRequest method
      console.log("🔧 Test 3: Using makeRequest method...");
      const makeRequestResult = await this.clearVectorDatabase();
      console.log("✅ makeRequest success:", makeRequestResult);
      
      console.log("🎉 All tests passed! API connectivity is working.");
      
    } catch (error) {
      console.error("❌ Debug test failed:", error);
      console.error("❌ Error details:", {
        message: error?.message,
        stack: error?.stack,
        type: error?.constructor?.name
      });
    }
  }

  /**
   * Clear entire vector database and reset to empty state
   * This removes all previously uploaded documents from the vector database
   */
  async clearVectorDatabase(): Promise<{ 
    message: string; 
    previous_documents_removed: boolean; 
    timestamp: string 
  }> {
    try {
      console.log("🗑️ API: Starting vector database clear request...");
      console.log("🗑️ API: backend URL:", this.baseUrl);
      console.log("🗑️ API: Full endpoint:", `${this.baseUrl}/clear-vector-db`);
      
      const response = await this.makeRequest<{ 
        message: string; 
        previous_documents_removed: boolean; 
        timestamp: string 
      }>('/clear-vector-db', {
        method: 'DELETE',
      });
      
      console.log("🗑️ API: Vector database cleared successfully:", response);
      return response;
      
    } catch (error) {
      console.error("🗑️ API: Error clearing vector database:", error);
      console.error("🗑️ API: Error details:", {
        message: error?.message || 'Unknown error',
        stack: error?.stack || 'No stack trace',
        type: error?.constructor?.name || 'Unknown type',
        status: error?.status || 'No status',
        url: `${this.baseUrl}/clear-vector-db`
      });
      
      // Add more specific error context
      if (error?.message?.includes('Failed to fetch') || error?.message?.includes('fetch')) {
        console.error("🗑️ API: This appears to be a network connectivity issue. Is the FastAPI server running?");
        throw new Error(`Cannot connect to FastAPI server at ${this.baseUrl}. Please ensure the backend server is running on http://localhost:8000`);
      } else if (error?.status === 404) {
        console.error("🗑️ API: Clear endpoint not found. Check if /clear-vector-db endpoint exists.");
        throw new Error("Clear database endpoint not found. Please check if the backend server has the latest code.");
      } else if (error?.status >= 500) {
        console.error("🗑️ API: Server error occurred.");
        throw new Error(`Server error (${error.status}): ${error.message || 'Internal server error'}`);
      } else {
        throw error; // Re-throw other errors as-is
      }
    }
  }

  /**
   * Generate a quick summary of text content
   */
  async generateQuickSummary(text: string): Promise<{ 
    original_length: number; 
    summary: string; 
    timestamp: string 
  }> {
    return this.makeRequest('/quick-summary', {
      method: 'POST',
      body: JSON.stringify({ text }),
    });
  }

  /**
   * Generate a 2-person podcast script based on selected text
   */
  async generatePodcast(
    selectedText: string, 
    context?: string
  ): Promise<{
    podcast_script: string;
    duration_seconds: number;
    selected_text_length: number;
    related_documents_used: number;
    timestamp: string;
    estimated_duration: string;
  }> {
    console.log("🎙️ API: Generating podcast...");
    console.log("🎙️ API: Selected text length:", selectedText.length);
    
    const requestBody = {
      selected_text: selectedText,
      context,
      request_type: "podcast_generation",
      source: "text_selection",
      timestamp: new Date().toISOString()
    };

    console.log("🎙️ API: Request body:", {
      selected_text_preview: selectedText.substring(0, 100) + "...",
      context: context ? "Provided" : "None",
      request_type: requestBody.request_type,
      source: requestBody.source
    });

    const response = await this.makeRequest<{
      podcast_script: string;
      duration_seconds: number;
      selected_text_length: number;
      related_documents_used: number;
      timestamp: string;
      estimated_duration: string;
    }>('/generate-podcast', {
      method: 'POST',
      body: JSON.stringify(requestBody),
    });
    
    console.log("🎙️ API: Podcast generated successfully:", {
      script_length: response.podcast_script.length,
      duration: response.duration_seconds,
      related_docs: response.related_documents_used
    });
    
    return response;
  }

  /**
   * Check if the backend and AI services are available
   */
  async checkHealth(): Promise<{ message: string }> {
    return this.makeRequest('/health');
  }

  /**
   * Generate AI-powered podcast recommendations based on document library
   */
  async generatePodcastRecommendations(): Promise<{
    recommendations: Array<{
      title: string;
      description: string;
      duration: string;
      category: string;
      script: string;
      key_topics: string[];
      target_audience: string;
    }>;
    based_on_documents: number;
    generation_timestamp: string;
    summary: string;
  }> {
    console.log("🎙️ API: Generating podcast recommendations...");
    
    const response = await this.makeRequest<{
      recommendations: Array<{
        title: string;
        description: string;
        duration: string;
        category: string;
        script: string;
        key_topics: string[];
        target_audience: string;
      }>;
      based_on_documents: number;
      generation_timestamp: string;
      summary: string;
    }>('/generate-podcast-recommendations', {
      method: 'POST',
    });
    
    console.log("🎙️ API: Podcast recommendations generated successfully:", {
      recommendations_count: response.recommendations.length,
      based_on_documents: response.based_on_documents
    });
    
    return response;
  }

  /**
   * Generate semantic similarities between documents
   */
  async generateSimilarities(): Promise<{
    similarities: Array<{
      concept: string;
      description: string;
      source_document: string;
      target_document: string;
      similarity_score: number;
      key_phrases: string[];
    }>;
    total_comparisons: number;
    message: string;
  }> {
    console.log("🔍 API: Generating document similarities...");
    
    const response = await this.makeRequest<{
      similarities: Array<{
        concept: string;
        description: string;
        source_document: string;
        target_document: string;
        similarity_score: number;
        key_phrases: string[];
      }>;
      total_comparisons: number;
      message: string;
    }>('/generate-similarities', {
      method: 'POST',
    });
    
    console.log("🔍 API: Similarities generated successfully:", {
      similarities_count: response.similarities.length,
      total_comparisons: response.total_comparisons
    });
    
    return response;
  }

  /**
   * Generate AI-powered insights from document analysis
   */
  async generateDocumentInsights(): Promise<{
    insights: Array<{
      title: string;
      description: string;
      category: string;
      confidence: number;
      impact: string;
      source: string;
      implications: string[];
      recommendations: string[];
    }>;
    total_documents_analyzed: number;
    generation_timestamp: string;
    summary: string;
  }> {
    console.log("🧠 API: Generating AI insights...");
    
    const response = await this.makeRequest<{
      insights: Array<{
        title: string;
        description: string;
        category: string;
        confidence: number;
        impact: string;
        source: string;
        implications: string[];
        recommendations: string[];
      }>;
      total_documents_analyzed: number;
      generation_timestamp: string;
      summary: string;
    }>('/generate-ai-insights', {
      method: 'POST',
    });
    
    console.log("🧠 API: AI insights generated successfully:", {
      insights_count: response.insights.length,
      documents_analyzed: response.total_documents_analyzed
    });
    
    return response;
  }

  /**
   * Generate TTS podcast from selected text
   */
  async generateTTSPodcast(selectedText: string): Promise<{
    audio_url: string;
    title: string;
    duration_seconds: number;
    segments_count: number;
    generation_timestamp: string;
    file_size_mb: number;
  }> {
    console.log("🎙️ API: Generating TTS podcast (5-minute timeout)...");
    
    const response = await this.makeRequest<{
      audio_url: string;
      title: string;
      duration_seconds: number;
      segments_count: number;
      generation_timestamp: string;
      file_size_mb: number;
    }>('/generate-tts-podcast', {
      method: 'POST',
      body: JSON.stringify({
        selected_text: selectedText,
        context: "TTS_PODCAST_REQUEST"
      }),
    }, 300000); // 5 minutes timeout for TTS podcast generation
    
    console.log("🎙️ API: TTS podcast generated successfully:", {
      title: response.title,
      duration: response.duration_seconds,
      segments: response.segments_count,
      file_size: response.file_size_mb
    });
    
    return response;
  }
}

// Export singleton instance
export const aiApi = new AIApiClient();

// Expose debug functions to window for browser console testing
if (typeof window !== 'undefined') {
  (window as any).debugAPI = () => aiApi.debugAPIConnectivity();
  (window as any).testHealth = () => aiApi.testbackendHealth();
  (window as any).clearDB = () => aiApi.clearVectorDatabase();
  (window as any).testPodcast = (text: string) => aiApi.generatePodcast(text);
  console.log("🔧 Debug functions available in browser console:");
  console.log("🔧 - window.debugAPI() - Full API connectivity test");
  console.log("🔧 - window.testHealth() - Test backend health");
  console.log("🔧 - window.clearDB() - Test clear database directly");
  console.log("🔧 - window.testPodcast('your text') - Test podcast generation");
}

// Export helper functions for common operations
export const aiApiHelpers = {
  /**
   * Format similarity percentage for display
   */
  formatSimilarity: (score: number): string => {
    return `${Math.round(score * 100)}%`;
  },

  /**
   * Get color class based on similarity score
   */
  getSimilarityColor: (score: number): string => {
    if (score >= 0.8) return 'text-green-600 dark:text-green-400';
    if (score >= 0.6) return 'text-blue-600 dark:text-blue-400';
    if (score >= 0.4) return 'text-orange-600 dark:text-orange-400';
    return 'text-gray-600 dark:text-gray-400';
  },

  /**
   * Get impact color class
   */
  getImpactColor: (impact: string): string => {
    switch (impact.toLowerCase()) {
      case 'critical':
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800';
      case 'medium':
        return 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/20 dark:text-orange-300 dark:border-orange-800';
      case 'low':
        return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/20 dark:text-gray-300 dark:border-gray-800';
    }
  },

  /**
   * Get insight type icon
   */
  getInsightTypeIcon: (type: string): string => {
    switch (type.toLowerCase()) {
      case 'contradiction':
        return '⚔️';
      case 'discovery':
        return '🤯';
      case 'pattern':
        return '📊';
      case 'opportunity':
        return '💎';
      default:
        return '💡';
    }
  },

  /**
   * Truncate text for display
   */
  truncateText: (text: string, maxLength: number = 100): string => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  },

  /**
   * Format timestamp for display
   */
  formatTimestamp: (timestamp: string): string => {
    try {
      return new Date(timestamp).toLocaleString();
    } catch {
      return 'Unknown time';
    }
  },
};
