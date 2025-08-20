import { FileText, Network, BookOpen, Upload, RotateCcw, Eye, RefreshCw, X, Trash2, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { useDocuments } from "@/contexts/DocumentContext";
import { useNotifications } from "@/hooks/use-notifications";
import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { uploadAndExtractFile } from "@/utils/fileStorage";
import type { DocumentFile } from "@/contexts/DocumentContext";

export function MobileDocumentSidebar() {
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
    console.log('Mobile New Documents: Files dropped:', acceptedFiles.length, acceptedFiles);
    
    for (const file of acceptedFiles) {
      try {
        // Add file to uploading state
        setUploadingFiles(prev => [...prev, file.name]);
        
        console.log('Mobile New Documents: Uploading file:', file.name);
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
        
        console.log('Mobile New Documents: Adding uploaded file:', fileWithPath);
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
    console.log('Mobile Previous Documents: Files dropped:', acceptedFiles.length, acceptedFiles);
    
    const uploadedFiles = [];
    
    for (const file of acceptedFiles) {
      try {
        // Add file to uploading state
        setUploadingPreviousFiles(prev => [...prev, file.name]);
        
        console.log('Mobile Previous Documents: Uploading file:', file.name);
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
        console.log('Mobile Previous Documents: File uploaded successfully:', fileWithPath);
        
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
    onDragEnter: () => console.log('Mobile New Documents: Drag enter'),
    onDragLeave: () => console.log('Mobile New Documents: Drag leave'),
    onDropAccepted: (files) => console.log('Mobile New Documents: Drop accepted:', files.length),
    onDropRejected: (files) => console.log('Mobile New Documents: Drop rejected:', files),
  });

  const { getRootProps: getPreviousFileProps, getInputProps: getPreviousFileInputs, isDragActive: isPreviousFileDragActive } = useDropzone({
    onDrop: onDropPrevious,
    accept: {
      'application/pdf': ['.pdf'],
    },
    multiple: true,
    noClick: false,
    preventDropOnDocument: false,
    onDragEnter: () => console.log('Mobile Previous Documents: Drag enter'),
    onDragLeave: () => console.log('Mobile Previous Documents: Drag leave'),
    onDropAccepted: (files) => console.log('Mobile Previous Documents: Drop accepted:', files.length),
    onDropRejected: (files) => console.log('Mobile Previous Documents: Drop rejected:', files),
  });



  const handleResetAll = async () => {
    const confirmReset = await showConfirm({
      title: 'Reset Everything?',
      description: 'This will clear all your documents and take you back to the upload page. This action cannot be undone.',
      confirmText: 'Reset All',
      cancelText: 'Cancel',
      variant: 'destructive'
    });
    
    if (confirmReset) {
      // Clear all file content cache as well
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('file_content_')) {
          localStorage.removeItem(key);
        }
      });
      
      resetAll();
      
      showSuccess(
        "Reset Completed!", 
        "All documents have been cleared successfully."
      );
    }
  };

  return (
    <div className="w-full h-full flex flex-col gap-3 p-3">
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <h2 className="text-base font-semibold text-foreground flex items-center">
          <BookOpen className="h-4 w-4 mr-2 text-primary" />
          Documents
        </h2>
        <Badge variant="secondary" className="text-xs px-2 py-1">
          {totalDocs}
        </Badge>
      </div>

      {/* Fixed Height - New Documents */}
      <div className="h-[290px] bg-card/30 backdrop-blur-sm border border-border/50 rounded-lg overflow-hidden flex flex-col">
        <div className="p-2 border-b border-border/30 bg-gradient-to-r from-primary/5 to-transparent">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-foreground">New Documents</h3>
            <Badge variant="outline" className="text-xs bg-background/50">
              {currentFiles.length}
            </Badge>
          </div>
        </div>
        
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Upload Area */}
          <div className="flex-shrink-0 p-2 pb-1">
            <div
              {...getNewFileProps()}
              className={`border border-dashed rounded p-2 text-center cursor-pointer transition-all duration-300 ${
                isNewFileDragActive 
                  ? 'border-primary bg-primary/10' 
                  : 'border-border/50 hover:border-primary/50 hover:bg-primary/5'
              }`}
            >
              <input {...getNewFileInputs()} />
              <Upload className={`h-4 w-4 mx-auto mb-1 ${
                isNewFileDragActive ? 'text-primary' : 'text-muted-foreground'
              }`} />
              <p className="text-xs font-medium">
                {isNewFileDragActive ? 'Drop here' : 'Upload PDF'}
              </p>
            </div>
          </div>

          {/* Bulk Extraction Indicator for New Files */}
          {extractionStats.isExtracting && extractionStats.hasMultiple && (
            <div className="px-2 pb-1">
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-2">
                <div className="flex items-center space-x-2">
                  <div className="relative">
                    <Loader2 className="h-3 w-3 text-blue-600 animate-spin" />
                    <div className="absolute inset-0 bg-blue-600/20 rounded-full animate-ping"></div>
                  </div>
                  <div className="flex-1">
                    <div className="text-xs font-semibold text-blue-700 dark:text-blue-300">
                      Extracting Content
                    </div>
                    <div className="text-xs text-blue-600 dark:text-blue-400">
                      Processing {extractionStats.total} files...
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Current Files List */}
          {currentFiles.length > 0 && (
            <div className="flex-1 min-h-0 px-2 pb-2">
              <ScrollArea className="h-full">
                <div className="space-y-1 pr-1">
                  {currentFiles.map((doc) => (
                    <div key={doc.id} className="relative group">
                      <div className="p-2 rounded bg-background/40 hover:bg-background/60 transition-all cursor-pointer border border-border/30">
                        <div className="flex items-start space-x-2">
                          <FileText className="h-3 w-3 text-primary mt-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0 pr-2 max-w-24">
                            <p className="text-xs font-semibold text-foreground leading-tight truncate" title={doc.name || 'Unknown PDF'}>
                              {doc.name || 'Unknown PDF'}
                            </p>
                            <div className="flex items-center mt-1">
                              <Badge variant="secondary" className="text-xs px-1.5 py-0.5">
                                {doc.pages || 'New'} pg
                              </Badge>
                            </div>
                          </div>
                          <div className="flex space-x-1">
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
                  ))}
                  
                  {/* Loading indicators for uploading files */}
                  {uploadingFiles.map((fileName) => (
                    <div key={`uploading-${fileName}`} className="relative group">
                      <div className="p-2 rounded bg-primary/10 border border-primary/20">
                        <div className="flex items-start space-x-2">
                          <Loader2 className="h-3 w-3 text-primary mt-0.5 flex-shrink-0 animate-spin" />
                          <div className="flex-1 min-w-0 pr-2 max-w-24">
                            <p className="text-xs font-semibold text-primary leading-tight truncate" title={fileName}>
                              {fileName}
                            </p>
                            <div className="flex items-center mt-1">
                              <Badge variant="secondary" className="text-xs px-1.5 py-0.5">
                                Extracting...
                              </Badge>
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
            <div className="flex-1 flex items-center justify-center p-2 text-muted-foreground">
              <p className="text-xs text-center">Upload files to see them here</p>
            </div>
          )}
        </div>

        {/* Knowledge Graph Button - Fixed at bottom */}
        <div className="flex-shrink-0 p-2 border-t border-border/30 bg-gradient-to-r from-primary/5 to-transparent">
          <Button 
            variant="outline" 
            className="w-full justify-start" 
            size="sm"
            onClick={() => setComingSoonOpen(true)}
          >
            <Network className="h-3 w-3 mr-2 text-primary" />
            Knowledge Graph
          </Button>
        </div>
      </div>

      {/* Fixed Height - Previous Documents */}
      <div className="h-[368px] bg-card/30 backdrop-blur-sm border border-border/50 rounded-lg overflow-hidden flex flex-col">
        <div className="flex-shrink-0 p-2 border-b border-border/30 bg-gradient-to-r from-primary/5 to-transparent">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <h3 className="text-xs font-semibold text-foreground">Previous Documents</h3>
              <Badge variant="outline" className="text-xs bg-background/50">
                {previousFiles.length}
              </Badge>
            </div>
            <Button
              onClick={handleResetAll}
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-muted-foreground hover:text-destructive transition-colors"
              title="Reset all documents and start over"
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              <span className="text-xs">Reset</span>
            </Button>
          </div>
        </div>
        
        <div className="flex-1 min-h-0 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-2 space-y-1">
            {/* Bulk Extraction Indicator for Previous Files */}
            {previousExtractionStats.isExtracting && previousExtractionStats.hasMultiple && (
              <div className="mb-2">
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-2">
                  <div className="flex items-center space-x-2">
                    <div className="relative">
                      <Loader2 className="h-3 w-3 text-blue-600 animate-spin" />
                      <div className="absolute inset-0 bg-blue-600/20 rounded-full animate-ping"></div>
                    </div>
                    <div className="flex-1">
                      <div className="text-xs font-semibold text-blue-700 dark:text-blue-300">
                        Extracting Content
                      </div>
                      <div className="text-xs text-blue-600 dark:text-blue-400">
                        Processing {previousExtractionStats.total} files...
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {previousFiles.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                <FileText className="h-5 w-5 mx-auto mb-2 opacity-50" />
                <p className="text-xs">No previous documents</p>
                <p className="text-xs">Upload files to build your library</p>
              </div>
            ) : (
              previousFiles.map((doc) => (
                <div key={doc.id} className="relative group">
                  <div className="p-2 rounded bg-background/40 hover:bg-background/60 transition-all cursor-pointer border border-border/30">
                    <div className="flex items-start space-x-2">
                      <FileText className="h-3 w-3 text-primary mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0 pr-2 max-w-24">
                        <p className="text-xs font-semibold text-foreground leading-tight truncate" title={doc.name || 'Unknown PDF'}>
                          {doc.name || 'Unknown PDF'}
                        </p>
                        <div className="flex items-center mt-1">
                          <Badge variant="secondary" className="text-xs px-1.5 py-0.5">
                            {doc.pages || '?'} pg
                          </Badge>
                        </div>
                      </div>
                      <div className="flex space-x-1">
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
              ))
            )}
            
            {/* Loading indicators for uploading previous files */}
            {uploadingPreviousFiles.map((fileName) => (
              <div key={`uploading-previous-mobile-${fileName}`} className="relative group">
                <div className="p-2 rounded bg-primary/10 border border-primary/20">
                  <div className="flex items-start space-x-2">
                    <Loader2 className="h-3 w-3 text-primary mt-0.5 flex-shrink-0 animate-spin" />
                    <div className="flex-1 min-w-0 pr-2 max-w-24">
                      <p className="text-xs font-semibold text-primary leading-tight truncate" title={fileName}>
                        {fileName}
                      </p>
                      <div className="flex items-center mt-1">
                        <Badge variant="secondary" className="text-xs px-1.5 py-0.5">
                          Extracting...
                        </Badge>
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
        <div className="flex-shrink-0 p-2 border-t border-border/30 bg-gradient-to-r from-primary/5 to-transparent">
          <div
            {...getPreviousFileProps()}
            className={`border border-dashed rounded p-1.5 text-center cursor-pointer transition-all duration-300 ${
              isPreviousFileDragActive 
                ? 'border-primary bg-primary/10' 
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
        <DialogContent className="max-w-[95vw] max-h-[90vh] p-0 bg-gradient-to-br from-background via-background/95 to-primary/5">
          {/* Fixed Header */}
          <DialogHeader className="flex-shrink-0 p-4 pb-3 border-b border-border/20 bg-gradient-to-r from-primary/5 to-transparent">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <DialogTitle className="text-base font-bold text-foreground mb-2 flex items-center">
                  <FileText className="h-4 w-4 text-primary mr-2 flex-shrink-0" />
                  <span className="truncate">{previewDocument?.name || 'Document Preview'}</span>
                </DialogTitle>
                {previewDocument?.pages && (
                  <div className="flex items-center text-sm text-muted-foreground">
                    <span className="flex items-center">
                      {previewDocument.pages} pages
                    </span>
                  </div>
                )}
              </div>
            </div>
          </DialogHeader>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-hidden">
            <ScrollArea className="h-[60vh] px-4 pb-4">
              <div className="pt-3">
                {previewDocument?.content ? (
                  <div className="bg-background/80 backdrop-blur-sm rounded-lg p-4 border border-border/30 shadow-sm">
                    <div className="prose prose-sm max-w-none text-foreground leading-relaxed">
                      <div className="whitespace-pre-wrap text-sm">
                        {previewDocument.content}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-3 mx-auto">
                      <FileText className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <h3 className="text-base font-semibold text-foreground mb-2">
                      No Content Available
                    </h3>
                    <p className="text-muted-foreground mb-3 text-sm max-w-sm mx-auto">
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
        <DialogContent className="max-w-[90vw] p-0 bg-gradient-to-br from-background via-background/95 to-primary/5">
          <div className="p-4 text-center">
            {/* Animated Icon */}
            <div className="w-16 h-16 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <div className="relative">
                <Network className="h-8 w-8 text-primary" />
                <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping"></div>
              </div>
            </div>

            {/* Title */}
            <DialogTitle className="text-xl font-bold text-foreground mb-3">
              Knowledge Graph
            </DialogTitle>

            {/* Description */}
            <p className="text-muted-foreground mb-4 leading-relaxed text-sm">
              Visualize connections between your documents with an interactive knowledge graph. 
              Discover hidden relationships and insights across your entire document library.
            </p>

            {/* Features List */}
            <div className="space-y-2 mb-4 text-left">
              <div className="flex items-center space-x-2">
                <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
                <span className="text-xs text-foreground">Interactive node-based visualization</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
                <span className="text-xs text-foreground">Automatic relationship detection</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
                <span className="text-xs text-foreground">Semantic clustering and grouping</span>
              </div>
            </div>

            {/* Coming Soon Badge */}
            <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20 rounded-full px-3 py-1.5 mb-4">
              <Sparkles className="h-3 w-3 text-primary animate-pulse" />
              <span className="text-xs font-semibold text-primary">Coming Soon</span>
            </div>

            {/* Close Button */}
            <Button 
              onClick={() => setComingSoonOpen(false)}
              className="w-full bg-primary hover:bg-primary/90 text-sm"
            >
              Got it!
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
