import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { FileText, Upload, X, Check, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { GridBackground } from "@/components/ui/grid-background";
import { GlowingEffect } from "@/components/ui/glowing-effect";
import { uploadAndExtractFile, saveFilesToBrowserStorage } from "@/utils/fileStorage";
import { useNotifications } from "@/hooks/use-notifications";

interface FileWithPreview {
  id: string;
  file: File;
  preview?: string;
  // File properties for easy access
  name: string;
  size: number;
  type: string;
  lastModified: number;
  // Extracted PDF data
  pages?: number;
  content?: string;
  isProcessing?: boolean;
  isProcessed?: boolean;
}

interface InitialSetupProps {
  onSetupComplete: (files: FileWithPreview[]) => void;
}

export function InitialSetup({ onSetupComplete }: InitialSetupProps) {
  const [uploadedFiles, setUploadedFiles] = useState<FileWithPreview[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const { showConfirm, showSuccess, showError } = useNotifications();

  // Calculate processing stats for better user feedback
  const processingStats = {
    total: uploadedFiles.length,
    processing: uploadedFiles.filter(f => f.isProcessing).length,
    completed: uploadedFiles.filter(f => f.isProcessed).length,
    isAnyProcessing: uploadedFiles.some(f => f.isProcessing)
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    console.log('Files dropped:', acceptedFiles.length);
    
    const filesWithId = acceptedFiles.map((file, index) => {
      console.log('Processing file:', file.name, 'Size:', file.size, 'Type:', file.type);
      
      const fileWithId: FileWithPreview = {
        id: `file_${Date.now()}_${index}_${Math.random().toString(36).substring(7)}`,
        file: file,
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified,
        isProcessing: true,
        isProcessed: false,
      };
      
      console.log('Created file with ID:', fileWithId.id, fileWithId.name);
      return fileWithId;
    });
    
    setUploadedFiles(prev => [...prev, ...filesWithId]);
    
    // Process each file to extract real page counts
    for (const fileData of filesWithId) {
      try {
        console.log('Extracting content for:', fileData.name);
        const extractedData = await uploadAndExtractFile(fileData.file);
        
        // Update the file with real page count and content
        setUploadedFiles(prev => prev.map(f => 
          f.id === fileData.id 
            ? { 
                ...f, 
                pages: extractedData.pages, 
                content: extractedData.content,
                isProcessing: false,
                isProcessed: true 
              }
            : f
        ));
        
        console.log('Real page count for', fileData.name, ':', extractedData.pages);
      } catch (error) {
        console.error('Error extracting file:', fileData.name, error);
        
        // Mark as processed with error
        setUploadedFiles(prev => prev.map(f => 
          f.id === fileData.id 
            ? { 
                ...f, 
                pages: 1, 
                content: `Error extracting ${fileData.name}`,
                isProcessing: false,
                isProcessed: true 
              }
            : f
        ));
      }
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
    },
    multiple: true,
  });

  const removeFile = async (fileId: string) => {
    // Find the file to remove
    const fileToRemove = uploadedFiles.find(f => f.id === fileId);
    if (!fileToRemove) {
      console.log('File not found:', fileId);
      return;
    }

    console.log('Removing file:', fileToRemove.name);

    const confirmRemove = await showConfirm({
      title: 'Remove Document?',
      description: `This will remove "${fileToRemove.name}" from your documents and from the AI vector database. This action cannot be undone.`,
      confirmText: 'Remove',
      cancelText: 'Cancel',
      variant: 'destructive'
    });
    
    if (confirmRemove) {
      try {
        // Try to remove from backend vector database if file was processed
        if (fileToRemove.isProcessed) {
          try {
            // Use the working name/path based endpoint that's already proven to work
            console.log('Using name/path based delete endpoint for:', fileToRemove.name);
            const apiBase = (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:8080').replace(/\/$/, '');
            const response = await fetch(`${apiBase}/api/remove-document`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                document_name: fileToRemove.name,
                document_path: `uploaded/${fileToRemove.name}`
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
        }

        // Remove from frontend
        setUploadedFiles(prev => prev.filter(file => file.id !== fileId));
        showSuccess(
          "Document Removed", 
          `"${fileToRemove.name}" has been removed successfully.`
        );
        
      } catch (error) {
        console.error('Error removing document:', error);
        showError(
          "Remove Error",
          `Failed to remove "${fileToRemove.name}". Please try again.`
        );
      }
    }
  };

  const saveFilesToDataFolder = async (files: FileWithPreview[]) => {
    // Files have already been processed, just format them for the context
    const uploadedFiles = [];
    
    for (const file of files) {
      if (file.isProcessed && file.content && file.pages) {
        // File was successfully processed during drop
        const processedFile = {
          id: file.id,
          name: file.name,
          size: file.size,
          type: file.type,
          folderName: 'uploaded',
          savedPath: `uploaded/${file.name}`,
          timestamp: new Date().toISOString(),
          content: file.content,
          pages: file.pages,
          lastRead: new Date().toLocaleString(),
        };
        
        uploadedFiles.push(processedFile);
        console.log('InitialSetup: Using processed file:', processedFile.name, 'with', processedFile.pages, 'pages');
      } else {
        // File processing failed or is incomplete
        uploadedFiles.push({
          id: file.id,
          name: file.name,
          size: file.size,
          type: file.type,
          folderName: 'failed',
          savedPath: `failed/${file.name}`,
          timestamp: new Date().toISOString(),
          content: file.content || `Error processing ${file.name}`,
          pages: file.pages || 1,
        });
      }
    }
    
    // Save to browser storage for persistence
    const fileInfos = uploadedFiles.map(f => ({
      id: f.id,
      name: f.name,
      size: f.size,
      folderName: f.folderName,
      savedPath: f.savedPath,
      timestamp: f.timestamp,
    }));
    saveFilesToBrowserStorage(fileInfos);
    
    return uploadedFiles;
  };

  const handleSetupComplete = async () => {
    if (uploadedFiles.length === 0) return;
    
    setIsUploading(true);
    try {
      const savedFiles = await saveFilesToDataFolder(uploadedFiles);
      onSetupComplete(savedFiles);
    } catch (error) {
      console.error('Error saving files:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 Bytes';
    if (isNaN(bytes)) return 'Unknown size';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <GridBackground>
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="w-full max-w-4xl">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Welcome to Smart Document Analyzer
            </CardTitle>
            <CardDescription className="text-base sm:text-lg mt-4">
              Let's start by uploading your previous PDF documents that you've read before. 
              This will help us build your personalized document library.
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Bulk Processing Indicator */}
            {processingStats.isAnyProcessing && (
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="relative">
                      <Loader2 className="h-6 w-6 text-blue-600 animate-spin" />
                      <div className="absolute inset-0 bg-blue-600/20 rounded-full animate-ping"></div>
                    </div>
                    <div>
                      <div className="font-semibold text-blue-700 dark:text-blue-300">
                        Processing Your Documents
                      </div>
                      <div className="text-sm text-blue-600 dark:text-blue-400">
                        Extracting content from {processingStats.processing} of {processingStats.total} files...
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-blue-700 dark:text-blue-300">
                      {processingStats.completed}/{processingStats.total}
                    </div>
                    <div className="text-xs text-blue-600 dark:text-blue-400">
                      Completed
                    </div>
                  </div>
                </div>
                
                {/* Progress Bar */}
                <div className="mt-3 bg-blue-100 dark:bg-blue-900/30 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-blue-500 to-indigo-500 h-2 rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${processingStats.total > 0 ? (processingStats.completed / processingStats.total) * 100 : 0}%` }}
                  ></div>
                </div>
                
                <div className="mt-2 text-xs text-blue-600 dark:text-blue-400 text-center">
                  Please wait while we extract content from your documents. This helps us provide better analysis.
                </div>
              </div>
            )}

            {/* Drag and Drop Area */}
            <div className="relative">
              <GlowingEffect
                blur={2}
                borderWidth={2}
                spread={80}
                glow={isDragActive}
                proximity={60}
                inactiveZone={0.02}
              />
              <div
                {...getRootProps()}
                className={`relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all duration-300 ${
                  isDragActive 
                    ? 'border-primary bg-primary/5' 
                    : 'border-border hover:border-primary/50 hover:bg-muted/50'
                }`}
              >
                <input {...getInputProps()} />
                <div className="space-y-4">
                  <Upload className={`h-12 w-12 mx-auto ${
                    isDragActive ? 'text-primary' : 'text-muted-foreground'
                  }`} />
                  <div>
                    <p className="text-lg font-medium">
                      {isDragActive 
                        ? "Drop your PDF files here..." 
                        : "Drag & drop your previous PDF documents here"
                      }
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">
                      or click to browse and select multiple PDF files
                    </p>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    PDF files only • Multiple files supported
                  </Badge>
                </div>
              </div>
            </div>

            {/* Uploaded Files List */}
            {uploadedFiles.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">
                    Uploaded Files ({uploadedFiles.length})
                  </h3>
                  <Button
                    onClick={() => setUploadedFiles([])}
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                  >
                    Clear All
                  </Button>
                </div>
                
                <div className="bg-card/30 backdrop-blur-sm border border-border/50 rounded-xl overflow-hidden">
                  <div className="p-3 border-b border-border/30 bg-gradient-to-r from-primary/5 to-transparent">
                    <p className="text-sm font-medium text-foreground">Ready to Upload</p>
                  </div>
                  <ScrollArea className="h-64">
                    <div className="p-3 space-y-2">
                      {uploadedFiles.map((file) => (
                        <div key={file.id} className="relative group">
                          <div className="flex items-center justify-between p-3 bg-background/40 hover:bg-background/60 rounded-lg border border-border/30 transition-all">
                            <div className="flex items-center space-x-3 flex-1 min-w-0">
                              <FileText className="h-5 w-5 text-primary flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold truncate" title={file.name}>
                                  {file.name}
                                </p>
                                <div className="flex items-center space-x-3 mt-1">
                                  <Badge variant="secondary" className="text-xs">
                                    {formatFileSize(file.size)}
                                  </Badge>
                                  {file.isProcessing ? (
                                    <Badge variant="outline" className="text-xs text-blue-600 border-blue-200">
                                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                      Extracting...
                                    </Badge>
                                  ) : file.isProcessed && file.pages ? (
                                    <Badge variant="outline" className="text-xs">
                                      {file.pages} pages
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline" className="text-xs text-orange-600 border-orange-200">
                                      Processing...
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                            <Button
                              onClick={() => removeFile(file.id)}
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-red-500 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Remove document"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              {uploadedFiles.length > 0 && uploadedFiles.some(f => f.isProcessing) && (
                <div className="text-center text-sm text-muted-foreground mb-2">
                  <div className="flex items-center justify-center space-x-2">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span>Processing files to extract page counts...</span>
                  </div>
                </div>
              )}
              
              <Button
                onClick={handleSetupComplete}
                disabled={uploadedFiles.length === 0 || isUploading || uploadedFiles.some(f => f.isProcessing)}
                className="flex-1 bg-gradient-primary hover:bg-gradient-primary/90"
                size="lg"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Setting up your library...
                  </>
                ) : uploadedFiles.some(f => f.isProcessing) ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing files...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Complete Setup & Continue
                  </>
                )}
              </Button>
              
              <Button
                onClick={() => onSetupComplete([])}
                variant="outline"
                size="lg"
                className="sm:w-auto"
              >
                Skip for now
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </GridBackground>
  );
}
