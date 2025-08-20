export interface FileInfo {
  id: string;
  name: string;
  size: number;
  folderName: string;
  savedPath: string;
  timestamp: string;
}

/**
 * Creates a timestamp-based folder name
 */
export function createTimestampFolder(): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  return timestamp;
}

/**
 * Actually saves files and extracts content using backend
 */
export async function saveFilesToFolder(files: File[]): Promise<FileInfo[]> {
  const folderName = createTimestampFolder();
  
  const fileInfos: FileInfo[] = [];
  
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    console.log('Processing file:', file.name);
    
    try {
      // Use the backend /extract-pdf endpoint to both validate and extract content
      const formData = new FormData();
      formData.append('file', file);
      
      const apiBase = (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:8080').replace(/\/$/, '');
      const response = await fetch(`${apiBase}/extract-pdf`, {
        method: 'POST',
        body: formData,
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('File processed successfully:', file.name);
        
        // Store the file content and metadata
        const fileInfo: FileInfo = {
          id: `file_${Date.now()}_${i}_${Math.random().toString(36).substring(7)}`, // Use consistent frontend ID
          name: file.name,
          size: file.size,
          folderName,
          savedPath: `uploaded/${file.name}`, // Mark as uploaded rather than file path
          timestamp: new Date().toISOString(),
        };
        
        // Store the extracted content in a separate storage
        const fileWithContent = {
          ...fileInfo,
          content: result.text,
          pages: result.page_count
        };
        
        // Save to localStorage for persistence
        const contentKey = `file_content_${fileInfo.id}`;
        localStorage.setItem(contentKey, JSON.stringify(fileWithContent));
        
        fileInfos.push(fileInfo);
      } else {
        throw new Error(`Upload failed: ${response.status}`);
      }
    } catch (error) {
      console.error('Error processing file:', file.name, error);
      
      // Create file info even if extraction failed
      const fileInfo: FileInfo = {
        id: `file_${Date.now()}_${i}_${Math.random().toString(36).substring(7)}`,
        name: file.name,
        size: file.size,
        folderName,
        savedPath: `failed/${file.name}`,
        timestamp: new Date().toISOString(),
      };
      
      fileInfos.push(fileInfo);
    }
  }
  
  return fileInfos;
}

/**
 * Save files to browser storage (simulating server-side saving)
 */
export function saveFilesToBrowserStorage(files: FileInfo[]): void {
  try {
    const existingFiles = JSON.parse(localStorage.getItem('savedFiles') || '[]');
    const updatedFiles = [...existingFiles, ...files];
    localStorage.setItem('savedFiles', JSON.stringify(updatedFiles));
    console.log('Files saved to browser storage:', files.map(f => f.name));
  } catch (error) {
    console.error('Error saving files to browser storage:', error);
  }
}

/**
 * Upload a single file and extract content immediately
 */
export async function uploadAndExtractFile(file: File): Promise<FileInfo & { content?: string; pages?: number }> {
  const folderName = createTimestampFolder();
  
  try {
    console.log('Uploading and extracting file:', file.name);
    
    const formData = new FormData();
    formData.append('file', file);
    
    const apiBase = (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:8080').replace(/\/$/, '');
    const response = await fetch(`${apiBase}/extract-pdf`, {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      throw new Error(`Upload failed: ${response.status}`);
    }
    
    const result = await response.json();
    console.log('File uploaded and extracted successfully:', file.name);
    
    const fileInfo: FileInfo & { content?: string; pages?: number } = {
      id: `file_${Date.now()}_${Math.random().toString(36).substring(7)}`, // Use consistent frontend ID
      name: file.name,
      size: file.size,
      folderName,
      savedPath: `uploaded/${file.name}`,
      timestamp: new Date().toISOString(),
      content: result.text,
      pages: result.page_count
    };
    
    return fileInfo;
  } catch (error) {
    console.error('Error uploading file:', file.name, error);
    
    // Return file info with error
    return {
      id: `file_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      name: file.name,
      size: file.size,
      folderName,
      savedPath: `failed/${file.name}`,
      timestamp: new Date().toISOString(),
      content: `Error uploading ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}


