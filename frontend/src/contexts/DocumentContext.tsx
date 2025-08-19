import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { extractPDFContentFromPath } from '@/utils/pdfExtractor';


export interface DocumentFile {
  id: string;
  name: string;
  size: number;
  type: string;
  folderName: string;
  savedPath: string;
  timestamp: string;
  pages?: number;
  lastRead?: string;
  content?: string;
}

interface DocumentContextType {
  previousFiles: DocumentFile[];
  currentFiles: DocumentFile[];
  selectedFile: DocumentFile | null;
  isInitialSetupComplete: boolean;
  isLoadingContent: boolean;
  addCurrentFile: (file: DocumentFile) => void;
  addPreviousFiles: (files: DocumentFile[]) => void;
  selectFile: (file: DocumentFile) => void;
  forceRefreshFile: (file: DocumentFile) => void;
  removeCurrentFile: (fileId: string) => Promise<void>;
  removePreviousFile: (fileId: string) => Promise<void>;

  resetAll: () => void;
  completeInitialSetup: (files?: DocumentFile[]) => void;
}

const DocumentContext = createContext<DocumentContextType | undefined>(undefined);

interface DocumentProviderProps {
  children: ReactNode;
}

export function DocumentProvider({ children }: DocumentProviderProps) {
  const [previousFiles, setPreviousFiles] = useState<DocumentFile[]>([]);
  const [currentFiles, setCurrentFiles] = useState<DocumentFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<DocumentFile | null>(null);
  const [isInitialSetupComplete, setIsInitialSetupComplete] = useState(false);
  const [isLoadingContent, setIsLoadingContent] = useState(false);

  // Load initial state from localStorage on mount
  useEffect(() => {
    const savedSetupState = localStorage.getItem('isInitialSetupComplete');
    const savedPreviousFiles = localStorage.getItem('previousFiles');
    const savedCurrentFiles = localStorage.getItem('currentFiles');
    
    if (savedSetupState === 'true') {
      setIsInitialSetupComplete(true);
    }
    
    // Helper function to filter out invalid files
    const filterValidFiles = (files: DocumentFile[]) => {
      return files.filter(file => {
        // Keep files that were uploaded (not file paths) OR have valid content
        const isValidFile = file.savedPath.startsWith('uploaded/') || 
                           file.savedPath.startsWith('failed/') ||
                           (file.content && !file.content.includes('File not found') && !file.content.includes('data/'));
        
        if (!isValidFile) {
          console.log('Filtering out invalid file:', file.name, 'with path:', file.savedPath);
        } else {
          console.log('Keeping valid file:', file.name, 'with path:', file.savedPath, 'has content:', !!file.content);
        }
        
        return isValidFile;
      });
    };
    
    if (savedPreviousFiles) {
      try {
        const files = JSON.parse(savedPreviousFiles);
        const validFiles = filterValidFiles(files);
        setPreviousFiles(validFiles);
        
        // Update localStorage with cleaned files
        if (validFiles.length !== files.length) {
          localStorage.setItem('previousFiles', JSON.stringify(validFiles));
          console.log('Cleaned previous files:', files.length, '->', validFiles.length);
        }
      } catch (error) {
        console.error('Error loading previous files from localStorage:', error);
      }
    }
    
    if (savedCurrentFiles) {
      try {
        const files = JSON.parse(savedCurrentFiles);
        const validFiles = filterValidFiles(files);
        setCurrentFiles(validFiles);
        
        // Update localStorage with cleaned files
        if (validFiles.length !== files.length) {
          localStorage.setItem('currentFiles', JSON.stringify(validFiles));
          console.log('Cleaned current files:', files.length, '->', validFiles.length);
        }
      } catch (error) {
        console.error('Error loading current files from localStorage:', error);
      }
    }
  }, []);

  // Save to localStorage whenever state changes
  useEffect(() => {
    localStorage.setItem('isInitialSetupComplete', isInitialSetupComplete.toString());
  }, [isInitialSetupComplete]);

  useEffect(() => {
    localStorage.setItem('previousFiles', JSON.stringify(previousFiles));
  }, [previousFiles]);

  useEffect(() => {
    localStorage.setItem('currentFiles', JSON.stringify(currentFiles));
  }, [currentFiles]);

  const addCurrentFile = useCallback((file: DocumentFile) => {
    setCurrentFiles(prev => [...prev, file]);
  }, []);

  const addPreviousFiles = useCallback((files: DocumentFile[]) => {
    setPreviousFiles(prev => [...prev, ...files]);
  }, []);

  const selectFile = useCallback(async (file: DocumentFile) => {
    console.log('=== PDF EXTRACTION START ===');
    console.log('File:', file.name);
    console.log('File path:', file.savedPath);
    console.log('Current loading state:', isLoadingContent);
    console.log('File has content:', !!file.content);
    console.log('Content length:', file.content?.length || 0);
    console.log('Content preview:', file.content ? file.content.substring(0, 100) + '...' : 'No content');
    console.log('File pages:', file.pages);
    console.log('File lastRead:', file.lastRead);
    
    // Prevent multiple simultaneous extractions
    if (isLoadingContent) {
      console.log('Already loading content, ignoring duplicate request');
      return;
    }
    
    setSelectedFile(file);
    
    // Check if file content is an error message (indicating previous failed extraction)
    const isErrorContent = file.content && (
      file.content.includes('Cannot extract content') ||
      file.content.includes('Error:') ||
      file.content.includes('backend not running') ||
      file.content.includes('Error Loading Content') ||
      file.content.includes('timeout') ||
      file.content.includes('HTTP 404') ||
      file.content.includes('File not found')
    );
    
    // Check if file has valid content (not error content)
    const hasValidContent = file.content && !isErrorContent;
    
    // Check if file was uploaded via uploadAndExtractFile (has content already)
    const isUploadedFile = file.savedPath.startsWith('uploaded/') || file.savedPath.startsWith('failed/');
    
    // If file was uploaded and has content, no need to extract
    if (isUploadedFile && hasValidContent) {
      console.log('File was uploaded with content, no extraction needed');
      return;
    }
    
    // If file was uploaded but has no content, show error
    if (isUploadedFile && !hasValidContent) {
      console.log('File was uploaded but missing content, showing error');
      const errorFile = {
        ...file,
        content: "⚠️ Content Missing\n\nThis file was uploaded but the content is missing.\nTry refreshing the page or re-uploading the file."
      };
      setSelectedFile(errorFile);
      return;
    }
    
    // If the file doesn't have content OR has error content, extract it
    if (!file.content || isErrorContent) {
      if (isErrorContent) {
        console.log('File has error content, attempting re-extraction...');
      } else {
        console.log('File has no content, starting extraction...');
      }
      setIsLoadingContent(true);
      
      try {
        // Check if this is an old file with invalid path format
        if (file.savedPath.startsWith('data/') && file.savedPath.includes('/')) {
          console.log('File has old invalid path format, cannot extract:', file.savedPath);
          throw new Error('This file was cached with an invalid path. Please re-upload the file.');
        }
        
        // This should not happen anymore due to early return above
        if (file.savedPath.startsWith('uploaded/') || file.savedPath.startsWith('failed/')) {
          console.log('File was uploaded via backend, cannot use extract-pdf-path:', file.savedPath);
          throw new Error('This file was uploaded but content is missing. Please try refreshing the page or re-upload the file.');
        }
        
        console.log('Calling extractPDFContentFromPath...');
        const extractedContent = await extractPDFContentFromPath(file.savedPath, file.name);
        console.log('Extraction result:', extractedContent);
        
        const updatedFile = {
          ...file,
          content: extractedContent.text,
          pages: extractedContent.pages,
          lastRead: new Date().toLocaleString()
        };
        
        console.log('Updated file with correct page count:', extractedContent.pages);
        
        console.log('Extraction completed, updating file lists...');
        
        // Update the file in the appropriate list
        setPreviousFiles(prev => 
          prev.map(f => f.id === file.id ? updatedFile : f)
        );
        setCurrentFiles(prev => 
          prev.map(f => f.id === file.id ? updatedFile : f)
        );
        
        // Update the selected file with content
        setSelectedFile(updatedFile);
        console.log('File content updated successfully');
        console.log('=== PDF EXTRACTION SUCCESS ===');
      } catch (error) {
        console.error('=== PDF EXTRACTION ERROR ===');
        console.error('Error extracting PDF content:', error);
        const errorFile = {
          ...file,
          content: "❌ Error Loading Content\n\nFailed to extract content from this PDF file.\nPlease try selecting the file again."
        };
        setSelectedFile(errorFile);
      } finally {
        setIsLoadingContent(false);
        console.log('Loading state reset');
        console.log('=== PDF EXTRACTION END ===');
      }
    } else if (hasValidContent) {
      console.log('File already has valid content, no extraction needed');
    } else {
      console.log('File content status unclear, setting selected file anyway');
    }
  }, [isLoadingContent]);

  // Auto-select file when only one current file is uploaded (after selectFile is defined)
  useEffect(() => {
    // Auto-select if:
    // 1. Only one file in current files
    // 2. No previous files  
    // 3. No file currently selected
    if (currentFiles.length === 1 && previousFiles.length === 0 && !selectedFile) {
      const fileToSelect = currentFiles[0];
      console.log('🎯 Auto-selecting single uploaded file:', fileToSelect.name);
      selectFile(fileToSelect);
    }
  }, [currentFiles, previousFiles, selectedFile, selectFile]);

  const resetAll = useCallback(() => {
    setPreviousFiles([]);
    setCurrentFiles([]);
    setSelectedFile(null);
    setIsInitialSetupComplete(false);
    setIsLoadingContent(false);
    
    // Clear localStorage as well
    localStorage.removeItem('isInitialSetupComplete');
    localStorage.removeItem('previousFiles');
    localStorage.removeItem('currentFiles');
    
    // Clear all AI-generated content localStorage
    localStorage.removeItem('aiPodcastRecommendations');
    localStorage.removeItem('aiPodcastRecommendations_state');
    localStorage.removeItem('documentSimilarities');
    localStorage.removeItem('documentSimilarities_state');
    localStorage.removeItem('aiInsights');
    localStorage.removeItem('aiInsights_state');
    
    console.log('All documents, state, and AI-generated content cleared');
  }, []);

  const forceRefreshFile = useCallback(async (file: DocumentFile) => {
    console.log('=== FORCE REFRESH FILE ===');
    console.log('Clearing content for file:', file.name);
    console.log('File path:', file.savedPath);
    
    // Check if this is an old file with invalid path
    if (file.savedPath.startsWith('data/') && file.savedPath.includes('/')) {
      console.log('File has invalid path, removing from lists');
      
      // Remove from both lists since it's invalid
      setPreviousFiles(prev => prev.filter(f => f.id !== file.id));
      setCurrentFiles(prev => prev.filter(f => f.id !== file.id));
      
      // Clear selected file if it's this one
      setSelectedFile(prevSelected => prevSelected?.id === file.id ? null : prevSelected);
      
      // Show message to user
      const errorFile = {
        ...file,
        content: "🗑️ File Removed\n\nThis file was cached with an invalid path and has been removed.\nPlease re-upload your PDF file to access its content."
      };
      setSelectedFile(errorFile);
      
      return;
    }
    
    // For valid files, clear content and retry extraction
    const clearedFile = { ...file, content: undefined };
    
    // Update the file in the appropriate list to clear content
    setPreviousFiles(prev => 
      prev.map(f => f.id === file.id ? clearedFile : f)
    );
    setCurrentFiles(prev => 
      prev.map(f => f.id === file.id ? clearedFile : f)
    );
    
    // Now trigger extraction
    await selectFile(clearedFile);
  }, [selectFile]);

  const removeCurrentFile = useCallback(async (fileId: string) => {
    console.log('=== REMOVE CURRENT FILE ===');
    console.log('Removing file with ID:', fileId);
    
    // Find the file to remove
    const fileToRemove = currentFiles.find(f => f.id === fileId);
    if (!fileToRemove) {
      console.log('File not found in current files');
      return;
    }
    
    console.log('Removing file:', fileToRemove.name);
    
    try {
      // Use the working name/path based endpoint that's already proven to work
      console.log('Using name/path based delete endpoint for:', fileToRemove.name);
      const response = await fetch('http://localhost:8000/api/remove-document', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          document_name: fileToRemove.name,
          document_path: fileToRemove.savedPath
        }),
      });
      
      if (!response.ok) {
        console.warn('backend removal failed, continuing with frontend removal');
      } else {
        console.log('Document removed from vector database successfully');
      }
    } catch (error) {
      console.warn('Failed to remove from backend:', error);
      // Continue with frontend removal even if backend fails
    }
    
    // Remove from current files
    setCurrentFiles(prev => prev.filter(f => f.id !== fileId));
    
    // Clear selected file if it's the one being removed
    setSelectedFile(prev => prev?.id === fileId ? null : prev);
    
    console.log('File removed from frontend successfully');
  }, [currentFiles]);

  const removePreviousFile = useCallback(async (fileId: string) => {
    console.log('=== REMOVE PREVIOUS FILE ===');
    console.log('Removing file with ID:', fileId);
    
    // Find the file to remove
    const fileToRemove = previousFiles.find(f => f.id === fileId);
    if (!fileToRemove) {
      console.log('File not found in previous files');
      return;
    }
    
    console.log('Removing file:', fileToRemove.name);
    
    try {
      // Use the working name/path based endpoint that's already proven to work
      console.log('Using name/path based delete endpoint for:', fileToRemove.name);
      const response = await fetch('http://localhost:8000/api/remove-document', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          document_name: fileToRemove.name,
          document_path: fileToRemove.savedPath
        }),
      });
      
      if (!response.ok) {
        console.warn('backend removal failed, continuing with frontend removal');
      } else {
        console.log('Document removed from vector database successfully');
      }
    } catch (error) {
      console.warn('Failed to remove from backend:', error);
      // Continue with frontend removal even if backend fails
    }
    
    // Remove from previous files
    setPreviousFiles(prev => prev.filter(f => f.id !== fileId));
    
    // Clear selected file if it's the one being removed
    setSelectedFile(prev => prev?.id === fileId ? null : prev);
    
    console.log('File removed from frontend successfully');
  }, [previousFiles]);

  const completeInitialSetup = useCallback((files?: DocumentFile[]) => {
    console.log('=== COMPLETE INITIAL SETUP ===');
    console.log('Files received in DocumentContext:', files);
    
    if (files && files.length > 0) {
      files.forEach(file => {
        console.log('File:', file.name);
        console.log('- Has content:', !!file.content);
        console.log('- Content length:', file.content?.length || 0);
        console.log('- Pages:', file.pages);
        console.log('- SavedPath:', file.savedPath);
      });
      
      setPreviousFiles(files);
    }
    setIsInitialSetupComplete(true);
  }, []);

  const value: DocumentContextType = {
    previousFiles,
    currentFiles,
    selectedFile,
    isInitialSetupComplete,
    isLoadingContent,
    addCurrentFile,
    addPreviousFiles,
    selectFile,
    forceRefreshFile,
    removeCurrentFile,
    removePreviousFile,

    resetAll,
    completeInitialSetup,
  };

  return (
    <DocumentContext.Provider value={value}>
      {children}
    </DocumentContext.Provider>
  );
}

export function useDocuments() {
  const context = useContext(DocumentContext);
  if (context === undefined) {
    throw new Error('useDocuments must be used within a DocumentProvider');
  }
  return context;
}
