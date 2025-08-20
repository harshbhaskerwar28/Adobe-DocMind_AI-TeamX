import { FileText, Network, BookOpen, Upload, RotateCcw, Eye, RefreshCw, X, Trash2, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { GlowingEffect } from "@/components/ui/glowing-effect";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { useDocuments } from "@/contexts/DocumentContext";
import { useNotifications } from "@/hooks/use-notifications";
import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { uploadAndExtractFile } from "@/utils/fileStorage";
import type { DocumentFile } from "@/contexts/DocumentContext";
import { aiApi } from "@/utils/aiApi";

export function DocumentSidebar() {
  const { previousFiles, currentFiles, addCurrentFile, addPreviousFiles, resetAll, selectFile, forceRefreshFile, removeCurrentFile, removePreviousFile } = useDocuments();
  const { showConfirm, showSuccess, showError } = useNotifications();
  const totalDocs = previousFiles.length + currentFiles.length;
  
  // Popup state for Previous Documents preview
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewDocument, setPreviewDocument] = useState<DocumentFile | null>(null);
  
  // Coming Soon popup state
  const [comingSoonOpen, setComingSoonOpen] = useState(false);
  
  // Loading states for file uploads
  const [uploadingFiles, setUploadingFiles] = useState<string[]>([]);
  const [uploadingPreviousFiles, setUploadingPreviousFiles] = useState<string[]>([]);

  // Calculate bulk extraction stats for new files
  const extractionStats = {
    total: uploadingFiles.length,
    isExtracting: uploadingFiles.length > 0,
    hasMultiple: uploadingFiles.length > 1
  };

  // Calculate bulk extraction stats for previous files
  const previousExtractionStats = {
    total: uploadingPreviousFiles.length,
    isExtracting: uploadingPreviousFiles.length > 0,
    hasMultiple: uploadingPreviousFiles.length > 1
  };

  // Handler for opening preview popup
  const handlePreviewDocument = useCallback(async (doc: DocumentFile) => {
    setPreviewDocument(doc);
    setPreviewOpen(true);
    
    // If document doesn't have content or has error content, trigger refresh
    const hasErrorContent = doc.content && (
      doc.content.includes('Cannot extract content') ||
      doc.content.includes('Error:') ||
      doc.content.includes('Content Missing') ||
      doc.content.includes('timeout') ||
      doc.content.includes('File Removed')
    );
    
    if (!doc.content || hasErrorContent) {
      console.log('Document missing content, triggering refresh for correct page count...');
      // Don't await this - let it run in background while popup is open
      forceRefreshFile(doc);
    }
  }, [forceRefreshFile]);

  // Handler for closing preview popup
  const handleClosePreview = useCallback(() => {
    setPreviewOpen(false);
    setPreviewDocument(null);
  }, []);

  // Handler for removing current files
  const handleRemoveCurrentFile = useCallback(async (doc: DocumentFile) => {
    const confirmRemove = await showConfirm({
      title: 'Remove Document?',
      description: `This will remove "${doc.name}" from your current documents and from the AI vector database. This action cannot be undone.`,
      confirmText: 'Remove',
      cancelText: 'Cancel',
      variant: 'destructive'
    });
    
    if (confirmRemove) {
      try {
        await removeCurrentFile(doc.id);
        showSuccess(
          "Document Removed", 
          `"${doc.name}" has been removed successfully.`
        );
      } catch (error) {
        console.error('Error removing document:', error);
        showError(
          "Remove Error",
          `Failed to remove "${doc.name}". Please try again.`
        );
      }
    }
  }, [removeCurrentFile, showConfirm, showSuccess, showError]);

  // Handler for removing previous files
  const handleRemovePreviousFile = useCallback(async (doc: DocumentFile) => {
    const confirmRemove = await showConfirm({
      title: 'Remove Document?',
      description: `This will remove "${doc.name}" from your previous documents and from the AI vector database. This action cannot be undone.`,
      confirmText: 'Remove',
      cancelText: 'Cancel',
      variant: 'destructive'
    });
    
    if (confirmRemove) {
      try {
        await removePreviousFile(doc.id);
        showSuccess(
          "Document Removed", 
          `"${doc.name}" has been removed successfully.`
        );
      } catch (error) {
        console.error('Error removing document:', error);
        showError(
          "Remove Error",
          `Failed to remove "${doc.name}". Please try again.`
        );
      }
    }
  }, [removePreviousFile, showConfirm, showSuccess, showError]);

  // For New Documents section
  const onDropNew = useCallback(async (acceptedFiles: File[]) => {
    console.log('New Documents: Files dropped:', acceptedFiles.length, acceptedFiles);
    
    for (const file of acceptedFiles) {
      try {
        // Add file to uploading state
        setUploadingFiles(prev => [...prev, file.name]);
        
        console.log('New Documents: Uploading file:', file.name);
        const uploadedFile = await uploadAndExtractFile(file);
        
        const fileWithPath = {
          id: uploadedFile.id,
          name: uploadedFile.name,
          size: uploadedFile.size,
          type: file.type,
          folderName: uploadedFile.folderName,
          savedPath: uploadedFile.savedPath,
          timestamp: uploadedFile.timestamp,
          content: uploadedFile.content,
          pages: uploadedFile.pages,
        };
        
        console.log('New Documents: Adding uploaded file:', fileWithPath);
        addCurrentFile(fileWithPath);
        
        // Remove from uploading state
        setUploadingFiles(prev => prev.filter(name => name !== file.name));
      } catch (error) {
        console.error('Error uploading file:', file.name, error);
        // Remove from uploading state on error
        setUploadingFiles(prev => prev.filter(name => name !== file.name));
        showError(`Failed to upload ${file.name}`);
      }
    }
  }, [addCurrentFile, showError]);

  // For Previous Documents section
  const onDropPrevious = useCallback(async (acceptedFiles: File[]) => {
    console.log('Previous Documents: Files dropped:', acceptedFiles.length, acceptedFiles);
    
    const uploadedFiles = [];
    
    for (const file of acceptedFiles) {
      try {
        // Add file to uploading state
        setUploadingPreviousFiles(prev => [...prev, file.name]);
        
        console.log('Previous Documents: Uploading file:', file.name);
        const uploadedFile = await uploadAndExtractFile(file);
        
        const fileWithPath = {
          id: uploadedFile.id,
          name: uploadedFile.name,
          size: uploadedFile.size,
          type: file.type,
          folderName: uploadedFile.folderName,
          savedPath: uploadedFile.savedPath,
          timestamp: uploadedFile.timestamp,
          content: uploadedFile.content,
          pages: uploadedFile.pages,
        };
        
        uploadedFiles.push(fileWithPath);
        console.log('Previous Documents: File uploaded successfully:', fileWithPath);
        
        // Remove from uploading state
        setUploadingPreviousFiles(prev => prev.filter(name => name !== file.name));
      } catch (error) {
        console.error('Error uploading file:', file.name, error);
        // Remove from uploading state on error
        setUploadingPreviousFiles(prev => prev.filter(name => name !== file.name));
        showError(`Failed to upload ${file.name}`);
      }
    }
    
    if (uploadedFiles.length > 0) {
      addPreviousFiles(uploadedFiles);
    }
  }, [addPreviousFiles, showError]);

  const { getRootProps: getNewFileProps, getInputProps: getNewFileInputs, isDragActive: isNewFileDragActive } = useDropzone({
    onDrop: onDropNew,
    accept: {
      'application/pdf': ['.pdf'],
    },
    multiple: true,
    noClick: false,
    preventDropOnDocument: false,
    onDragEnter: () => console.log('New Documents: Drag enter'),
    onDragLeave: () => console.log('New Documents: Drag leave'),
    onDropAccepted: (files) => console.log('New Documents: Drop accepted:', files.length),
    onDropRejected: (files) => console.log('New Documents: Drop rejected:', files),
  });

  const { getRootProps: getPreviousFileProps, getInputProps: getPreviousFileInputs, isDragActive: isPreviousFileDragActive } = useDropzone({
    onDrop: onDropPrevious,
    accept: {
      'application/pdf': ['.pdf'],
    },
    multiple: true,
    noClick: false,
    preventDropOnDocument: false,
    onDragEnter: () => console.log('Previous Documents: Drag enter'),
    onDragLeave: () => console.log('Previous Documents: Drag leave'),
    onDropAccepted: (files) => console.log('Previous Documents: Drop accepted:', files.length),
    onDropRejected: (files) => console.log('Previous Documents: Drop rejected:', files),
  });



  const handleResetAll = async () => {
    const confirmReset = await showConfirm({
      title: 'Reset Everything?',
      description: 'This will clear all your documents, remove all previous documents from the AI vector database, and take you back to the upload page. This action cannot be undone.',
      confirmText: 'Reset All',
      cancelText: 'Cancel',
      variant: 'destructive'
    });
    
    if (confirmReset) {
      try {
        console.log("🗑️ Starting complete reset process...");
        
        // Step 0: Test backend connectivity first
        console.log("🗑️ Step 0: Testing backend connectivity...");
        try {
          await aiApi.testbackendHealth();
          console.log("✅ backend connectivity test passed");
        } catch (healthError) {
          console.error("❌ backend health check failed:", healthError);
          throw new Error(`Cannot connect to backend server: ${healthError.message || 'Server not responding'}`);
        }
        
        // Step 1: Clear the vector database via API
        console.log("🗑️ Step 1: Clearing vector database...");
        await aiApi.clearVectorDatabase();
        console.log("✅ Vector database cleared successfully");
        
        // Step 2: Clear all file content cache
        console.log("🗑️ Step 2: Clearing local cache...");
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith('file_content_')) {
            localStorage.removeItem(key);
          }
        });
        console.log("✅ Local cache cleared successfully");
        
        // Step 3: Reset document context
        console.log("🗑️ Step 3: Resetting document context...");
        resetAll();
        console.log("✅ Document context reset successfully");
        
        console.log("🎉 Complete reset process finished!");
        
        // Show success message
        showSuccess(
          "Reset Completed!", 
          "All documents and AI data have been cleared successfully."
        );
        
      } catch (error) {
        console.error("❌ Error during reset:", error);
        console.error("❌ Error details:", {
          message: error?.message || 'Unknown error',
          stack: error?.stack || 'No stack trace',
          type: error?.constructor?.name || 'Unknown type'
        });
        
        // Check if it's a network error and offer fallback
        if (error?.message?.includes('fetch') || error?.message?.includes('network') || error?.message?.includes('Failed to fetch') || error?.message?.includes('Cannot connect to backend')) {
          const tryFrontendOnly = await showConfirm({
            title: 'backend Connection Failed',
            description: "Cannot connect to the backend server. This means the AI vector database won't be cleared, but we can still reset the frontend documents. Would you like to reset just the frontend documents? (You'll need to start the backend server later to fully clear the AI database)",
            confirmText: 'Reset Frontend Only',
            cancelText: 'Cancel',
            variant: 'default'
          });
          
          if (tryFrontendOnly) {
            try {
              console.log("🗑️ Performing frontend-only reset...");
              
              // Clear local cache
              console.log("🗑️ Clearing local cache...");
              Object.keys(localStorage).forEach(key => {
                if (key.startsWith('file_content_')) {
                  localStorage.removeItem(key);
                }
              });
              console.log("✅ Local cache cleared successfully");
              
              // Reset document context
              console.log("🗑️ Resetting document context...");
              resetAll();
              console.log("✅ Document context reset successfully");
              
              showSuccess(
                "Frontend Reset Completed!",
                "AI vector database was not cleared due to backend connectivity issues. Please start the FastAPI server and use reset again to fully clear the AI database.",
                8000
              );
            } catch (fallbackError) {
              console.error("❌ Error during frontend-only reset:", fallbackError);
              showError(
                "Frontend Reset Failed",
                "Error during frontend reset. Please refresh the page manually."
              );
            }
          }
        } else if (error?.message?.includes('timeout')) {
          showError(
            "Timeout Error",
            "The reset operation took too long. Please try again or refresh the page."
          );
        } else {
          showError(
            "Reset Error",
            `Error during reset: ${error?.message || 'Unknown error'}. Some data may not have been cleared. Please try again or refresh the page.`,
            8000
          );
        }
      }
    }
  };



  // Desktop layout - original order
  return (
    <div className="hidden lg:flex w-full h-full flex-col gap-4 p-4 overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground flex items-center">
          <BookOpen className="h-5 w-5 mr-2 text-primary" />
          Document Library
        </h2>
        <Badge variant="secondary" className="text-xs px-2 py-1">
          {totalDocs} docs
        </Badge>
      </div>

      {/* Fixed Height - New Upload Section */}
      <div className="h-[345px] bg-card/30 backdrop-blur-sm border border-border/50 rounded-xl overflow-hidden flex flex-col">
        <div className="p-3 border-b border-border/30 bg-gradient-to-r from-primary/5 to-transparent">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">New Documents</h3>
            <Badge variant="outline" className="text-xs bg-background/50">
              {currentFiles.length}
            </Badge>
          </div>
        </div>
        
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Upload Area */}
          <div className="flex-shrink-0 p-3 pb-2">
            <div
              {...getNewFileProps()}
              className={`border-2 border-dashed rounded-lg p-2.5 text-center cursor-pointer transition-all duration-300 ${
                isNewFileDragActive 
                  ? 'border-primary bg-primary/10 shadow-lg' 
                  : 'border-border/50 hover:border-primary/50 hover:bg-primary/5'
              }`}
            >
              <input {...getNewFileInputs()} />
              <Upload className={`h-5 w-5 mx-auto mb-2 ${
                isNewFileDragActive ? 'text-primary' : 'text-muted-foreground'
              }`} />
              <p className="text-xs font-medium">
                {isNewFileDragActive ? 'Drop files here' : 'Upload PDF'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                <span className="hidden sm:inline">Drag & drop or </span>click
              </p>
            </div>
          </div>

          {/* Bulk Extraction Indicator for New Files */}
          {extractionStats.isExtracting && extractionStats.hasMultiple && (
            <div className="px-3 pb-2">
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="relative">
                      <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
                      <div className="absolute inset-0 bg-blue-600/20 rounded-full animate-ping"></div>
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-blue-700 dark:text-blue-300">
                        Extracting Content
                      </div>
                      <div className="text-xs text-blue-600 dark:text-blue-400">
                        Processing {extractionStats.total} files...
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-1 text-xs text-blue-600 dark:text-blue-400 text-center">
                  Please wait while we extract content for better analysis
                </div>
              </div>
            </div>
          )}

          {/* Current Files List */}
          {currentFiles.length > 0 && (
            <div className="flex-1 min-h-0 px-3 pb-3">
              <ScrollArea className="h-full">
                <div className="space-y-1 pr-2">
                  {currentFiles.map((doc) => (
                    <div key={doc.id} className="relative group">
                      <div className="relative rounded-lg border border-transparent hover:border-primary/20 transition-all duration-200">
                        <GlowingEffect
                          blur={1}
                          borderWidth={1}
                          spread={60}
                          glow={true}
                          proximity={40}
                          inactiveZone={0.02}
                        />
                        <div className="relative p-2.5 rounded-lg bg-background/40 hover:bg-background/70 transition-all cursor-pointer border border-border/30 overflow-hidden">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-start space-x-2.5 min-w-0 flex-1">
                              <FileText className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                              <div className="flex-1 min-w-0 max-w-32">
                                <p className="text-sm font-semibold text-foreground truncate mb-1.5" title={doc.name || 'Unknown PDF'}>
                                  {doc.name || 'Unknown PDF'}
                                </p>
                                <div className="flex items-center">
                                  <Badge variant="secondary" className="text-xs px-1.5 py-0.5">
                                    {doc.pages || 'New'} pages
                                  </Badge>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center space-x-0.5 flex-shrink-0">
                              {doc.content && (doc.content.includes('Cannot extract content') || doc.content.includes('Error:') || doc.content.includes('timeout')) && (
                                <Button
                                  variant="ghost"
                                  size="sm" 
                                  className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-orange-500 hover:text-orange-600"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    forceRefreshFile(doc);
                                  }}
                                  title="Retry PDF extraction"
                                >
                                  <RefreshCw className="h-2.5 w-2.5" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm" 
                                className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  selectFile(doc);
                                }}
                                title="View document content"
                              >
                                <Eye className="h-2.5 w-2.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm" 
                                className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-600"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemoveCurrentFile(doc);
                                }}
                                title="Remove document"
                              >
                                <Trash2 className="h-2.5 w-2.5" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {/* Loading indicators for uploading files */}
                  {uploadingFiles.map((fileName) => (
                    <div key={`uploading-${fileName}`} className="relative group">
                      <div className="relative rounded-lg border border-primary/20">
                        <div className="relative p-2.5 rounded-lg bg-primary/10 border border-border/30 overflow-hidden">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-start space-x-2.5 min-w-0 flex-1">
                              <Loader2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0 animate-spin" />
                              <div className="flex-1 min-w-0 max-w-32">
                                <p className="text-sm font-semibold text-primary truncate mb-1.5" title={fileName}>
                                  {fileName}
                                </p>
                                <div className="flex items-center">
                                  <Badge variant="secondary" className="text-xs px-1.5 py-0.5">
                                    Extracting...
                                  </Badge>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
          
          {/* Empty state when no current files */}
          {currentFiles.length === 0 && uploadingFiles.length === 0 && (
            <div className="flex-1 flex items-center justify-center p-3 text-muted-foreground">
              <p className="text-xs text-center">Upload files to see them here</p>
            </div>
          )}
        </div>

        {/* Knowledge Graph Button - Fixed at bottom */}
        <div className="flex-shrink-0 p-3 border-t border-border/30 bg-gradient-to-r from-primary/5 to-transparent">
          <Button 
            variant="outline" 
            className="w-full justify-start" 
            size="sm"
            onClick={() => setComingSoonOpen(true)}
          >
            <Network className="h-4 w-4 mr-2 text-primary" />
            Knowledge Graph
          </Button>
        </div>
      </div>

      {/* Fixed Height - Previous Documents */}
      <div className="h-[600px] bg-card/30 backdrop-blur-sm border border-border/50 rounded-xl overflow-hidden flex flex-col">
        <div className="flex-shrink-0 p-3 border-b border-border/30 bg-gradient-to-r from-primary/5 to-transparent">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <h3 className="text-sm font-semibold text-foreground">Previous Documents</h3>
              <Badge variant="outline" className="text-xs bg-background/50">
                {previousFiles.length}
              </Badge>
            </div>
            <Button
              onClick={handleResetAll}
              variant="ghost"
              size="sm"
              className="h-8 px-3 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all duration-200"
              title="Reset all documents and start over"
            >
              <RotateCcw className="h-4 w-4 mr-1" />
              <span className="text-xs">Reset</span>
            </Button>
          </div>
        </div>
        
        <div className="flex-1 min-h-0 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-2 space-y-1">
              {/* Bulk Extraction Indicator for Previous Files */}
              {previousExtractionStats.isExtracting && previousExtractionStats.hasMultiple && (
                <div className="mb-3">
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="relative">
                          <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
                          <div className="absolute inset-0 bg-blue-600/20 rounded-full animate-ping"></div>
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                            Extracting Content
                          </div>
                          <div className="text-sm text-blue-600 dark:text-blue-400">
                            Processing {previousExtractionStats.total} files...
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-blue-600 dark:text-blue-400 text-center">
                      Please wait while we extract content for better analysis
                    </div>
                  </div>
                </div>
              )}

                          {previousFiles.length === 0 ? (
                <div className="text-center py-4 sm:py-6 text-muted-foreground">
                  <FileText className="h-6 w-6 sm:h-8 sm:w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-xs sm:text-sm">No previous documents</p>
                  <p className="text-xs">Upload files to build your library</p>
                </div>
              ) : (
              previousFiles.map((doc, index) => (
                <div key={doc.id} className="relative group">
                  <div className="relative rounded-lg border border-transparent hover:border-primary/20 transition-all duration-200">
                    <GlowingEffect
                      blur={1}
                      borderWidth={1}
                      spread={60}
                      glow={true}
                      proximity={40}
                      inactiveZone={0.02}
                    />
                    <div className="relative p-2.5 rounded-lg bg-background/40 hover:bg-background/70 transition-all cursor-pointer border border-border/30 overflow-hidden">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start space-x-2.5 min-w-0 flex-1">
                          <FileText className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0 max-w-32">
                            <p className="text-sm font-semibold text-foreground truncate mb-1.5" title={doc.name || 'Unknown PDF'}>
                              {doc.name || 'Unknown PDF'}
                            </p>
                            <div className="flex items-center">
                              <Badge variant="secondary" className="text-xs px-1.5 py-0.5">
                                {doc.pages || 'Unknown'} pages
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-0.5 flex-shrink-0">
                          {doc.content && (doc.content.includes('Cannot extract content') || doc.content.includes('Error:') || doc.content.includes('timeout')) && (
                            <Button
                              variant="ghost"
                              size="sm" 
                              className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-orange-500 hover:text-orange-600"
                              onClick={(e) => {
                                e.stopPropagation();
                                forceRefreshFile(doc);
                              }}
                              title="Retry PDF extraction"
                            >
                              <RefreshCw className="h-2.5 w-2.5" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm" 
                            className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePreviewDocument(doc);
                            }}
                            title="Preview document content"
                          >
                            <Eye className="h-2.5 w-2.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm" 
                            className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-600"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemovePreviousFile(doc);
                            }}
                            title="Remove document"
                          >
                            <Trash2 className="h-2.5 w-2.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
            
            {/* Loading indicators for uploading previous files */}
            {uploadingPreviousFiles.map((fileName) => (
              <div key={`uploading-previous-${fileName}`} className="relative group">
                <div className="relative rounded-lg border border-primary/20">
                  <div className="relative p-2.5 rounded-lg bg-primary/10 border border-border/30 overflow-hidden">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start space-x-2.5 min-w-0 flex-1">
                        <Loader2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0 animate-spin" />
                        <div className="flex-1 min-w-0 max-w-32">
                          <p className="text-sm font-semibold text-primary truncate mb-1.5" title={fileName}>
                            {fileName}
                          </p>
                          <div className="flex items-center">
                            <Badge variant="secondary" className="text-xs px-1.5 py-0.5">
                              Extracting...
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            </div>
          </ScrollArea>
        </div>
        
        {/* Upload Button for Previous Documents */}
        <div className="flex-shrink-0 p-3 border-t border-border/30 bg-gradient-to-r from-primary/5 to-transparent">
          <div
            {...getPreviousFileProps()}
            className={`border border-dashed rounded-lg p-1.5 text-center cursor-pointer transition-all duration-300 ${
              isPreviousFileDragActive 
                ? 'border-primary bg-primary/10 shadow-lg' 
                : 'border-border/50 hover:border-primary/50 hover:bg-primary/5'
            }`}
          >
            <input {...getPreviousFileInputs()} />
            <div className="flex items-center justify-center space-x-2">
              <Upload className={`h-3 w-3 ${
                isPreviousFileDragActive ? 'text-primary' : 'text-muted-foreground'
              }`} />
              <span className="text-xs font-medium">
                {isPreviousFileDragActive ? 'Drop files here' : 'Add more documents'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Document Preview Popup */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0 bg-gradient-to-br from-background via-background/95 to-primary/5">
          {/* Fixed Header */}
          <DialogHeader className="flex-shrink-0 p-6 pb-4 border-b border-border/20 bg-gradient-to-r from-primary/5 to-transparent">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <DialogTitle className="text-xl font-bold text-foreground mb-2 flex items-center">
                  <FileText className="h-5 w-5 text-primary mr-2 flex-shrink-0" />
                  <span className="truncate">{previewDocument?.name || 'Document Preview'}</span>
                </DialogTitle>
                {previewDocument?.pages && (
                  <div className="flex items-center text-sm text-muted-foreground">
                    <span className="flex items-center">
                      📖 {previewDocument.pages} pages
                    </span>
                  </div>
                )}
              </div>
            </div>
          </DialogHeader>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-hidden">
            <ScrollArea className="h-[65vh] px-6 pb-6">
              <div className="pt-4">
                {previewDocument?.content ? (
                  <div className="bg-background/80 backdrop-blur-sm rounded-lg p-6 border border-border/30 shadow-sm">
                    <div className="prose prose-sm max-w-none text-foreground leading-relaxed">
                      <div className="whitespace-pre-wrap text-sm lg:text-base">
                        {previewDocument.content}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4 mx-auto">
                      <FileText className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      No Content Available
                    </h3>
                    <p className="text-muted-foreground mb-4 max-w-md mx-auto">
                      This document doesn't have extracted content yet. Try refreshing or re-uploading the file.
                    </p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>


        </DialogContent>
      </Dialog>

      {/* Coming Soon Popup */}
      <Dialog open={comingSoonOpen} onOpenChange={setComingSoonOpen}>
        <DialogContent className="max-w-md p-0 bg-gradient-to-br from-background via-background/95 to-primary/5">
          <div className="p-6 text-center">
            {/* Animated Icon */}
            <div className="w-20 h-20 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <div className="relative">
                <Network className="h-10 w-10 text-primary" />
                <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping"></div>
              </div>
            </div>

            {/* Title */}
            <DialogTitle className="text-2xl font-bold text-foreground mb-3">
              Knowledge Graph
            </DialogTitle>

            {/* Description */}
            <p className="text-muted-foreground mb-6 leading-relaxed">
              Visualize connections between your documents with an interactive knowledge graph. 
              Discover hidden relationships and insights across your entire document library.
            </p>

            {/* Features List */}
            <div className="space-y-3 mb-6 text-left">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-primary rounded-full"></div>
                <span className="text-sm text-foreground">Interactive node-based visualization</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-primary rounded-full"></div>
                <span className="text-sm text-foreground">Automatic relationship detection</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-primary rounded-full"></div>
                <span className="text-sm text-foreground">Semantic clustering and grouping</span>
              </div>
            </div>

            {/* Coming Soon Badge */}
            <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20 rounded-full px-4 py-2 mb-6">
              <Sparkles className="h-4 w-4 text-primary animate-pulse" />
              <span className="text-sm font-semibold text-primary">Coming Soon</span>
            </div>

            {/* Close Button */}
            <Button 
              onClick={() => setComingSoonOpen(false)}
              className="w-full bg-primary hover:bg-primary/90"
            >
              Got it!
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}