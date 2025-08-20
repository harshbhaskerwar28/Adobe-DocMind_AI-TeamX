// PDF Text Extractor using FastAPI + PyMuPDF

const API_BASE_URL = (
  (import.meta as any)?.env?.VITE_API_BASE_URL ||
  (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:8080')
).replace(/\/$/, '');

// Add a simple connectivity test function
export async function testbackendConnection(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/`);
    return response.ok;
  } catch (error) {
    console.error('backend connection test failed:', error);
    return false;
  }
}

// Test if the backend can process PDFs
export async function testbackendPDFProcessing(): Promise<boolean> {
  try {
    // Create a minimal test file
    const testBlob = new Blob(['%PDF-1.4\nTest PDF'], { type: 'application/pdf' });
    const testFile = new File([testBlob], 'test.pdf', { type: 'application/pdf' });
    
    const formData = new FormData();
    formData.append('file', testFile);
    
    const response = await fetch(`${API_BASE_URL}/extract-pdf`, {
      method: 'POST',
      body: formData,
    });
    
    // We expect this to fail (since it's not a real PDF), but if we get a 400 or 500, the endpoint is working
    return response.status === 400 || response.status === 500 || response.ok;
  } catch (error) {
    console.error('backend PDF processing test failed:', error);
    return false;
  }
}

export interface PDFContent {
  text: string;
  pages: number;
  title?: string;
}

interface APIResponse {
  filename: string;
  page_count: number;
  text: string;
}

// Extract text from uploaded PDF file
export async function extractPDFContent(file: File): Promise<PDFContent> {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE_URL}/extract-pdf`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result: APIResponse = await response.json();
    
    return {
      text: result.text,
      pages: result.page_count,
      title: result.filename.replace('.pdf', '')
    };

  } catch (error) {
    console.error('PDF extraction error:', error);
    
    return {
      text: `Cannot extract content from ${file.name}

backend not running. Start with:
cd backend
python pdf_extractor.py

Please ensure the backend is running on ${API_BASE_URL}`,
      pages: 1,
      title: file.name.replace('.pdf', '')
    };
  }
}

// Helper function to create a timeout promise
function createTimeout(ms: number): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error(`Request timeout after ${ms}ms`)), ms);
  });
}

// Helper function to race a fetch with a timeout
async function fetchWithTimeout(url: string, options: RequestInit, timeout: number = 30000): Promise<Response> {
  return Promise.race([
    fetch(url, options),
    createTimeout(timeout)
  ]);
}

// Extract content from saved PDF file path
export async function extractPDFContentFromPath(savedPath: string, fileName: string): Promise<PDFContent> {
  try {
    console.log('Attempting to extract PDF from path:', savedPath);
    console.log('Filename:', fileName);
    
    // Extract PDF content directly (30 second timeout)
    console.log('Starting PDF extraction...');
    const response = await fetchWithTimeout(`${API_BASE_URL}/extract-pdf-path`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ file_path: savedPath }),
    }, 30000);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('backend error response:', response.status, errorText);
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const result: APIResponse = await response.json();
    console.log('Successfully extracted PDF content:', result);
    
    return {
      text: result.text || 'No text content found in PDF',
      pages: result.page_count || 1,
      title: fileName.replace('.pdf', '')
    };

  } catch (error) {
    console.error('PDF extraction error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Check if it's a network error
    if (errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError')) {
      return {
        text: `Cannot connect to backend server

The PDF extraction service is not reachable. This could be due to:
- backend server is not running
- CORS configuration issues  
- Network connectivity problems

Please ensure the backend is running on ${API_BASE_URL}

To start the backend:
cd backend  
python pdf_extractor.py`,
        pages: 1,
        title: fileName.replace('.pdf', '')
      };
    }
    
    // For other errors, show the specific error
    return {
      text: `Error processing ${fileName}

${errorMessage}

backend is running at: ${API_BASE_URL}
Please check the backend logs for more details.`,
      pages: 1,
      title: fileName.replace('.pdf', '')
    };
  }
}
