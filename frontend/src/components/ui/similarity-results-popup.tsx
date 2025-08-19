import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { 
  Sparkles, 
  FileText, 
  ExternalLink, 
  TrendingUp, 
  RefreshCw, 
  AlertCircle,
  CheckCircle,
  Clock,
  Eye,
  X,
  Copy,
  ChevronRight,
  Search
} from "lucide-react";
import { cn } from "@/lib/utils";
import { aiApi, SimilarityResult, aiApiHelpers } from "@/utils/aiApi";
import { useDocuments } from "@/contexts/DocumentContext";

interface SimilarityResultsPopupProps {
  selectedText: string;
  isVisible: boolean;
  onClose: () => void;
}

export function SimilarityResultsPopup({
  selectedText,
  isVisible,
  onClose,
}: SimilarityResultsPopupProps) {
  const [results, setResults] = useState<SimilarityResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTimestamp, setSearchTimestamp] = useState<string>("");
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  
  // New popup states
  const [showDocumentViewer, setShowDocumentViewer] = useState(false);
  const [showContextHighlighter, setShowContextHighlighter] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<any>(null);
  const [highlightedContext, setHighlightedContext] = useState<string>("");
  
  // Document context for navigation
  const { previousFiles, currentFiles, selectFile } = useDocuments();

  // Helper function to find document by filename
  const findDocumentByName = (filename: string) => {
    console.log("🔍 Looking for document:", filename);
    console.log("🔍 Previous files:", previousFiles.map(f => f.name));
    console.log("🔍 Current files:", currentFiles.map(f => f.name));
    
    // Try to find in current files first
    let foundDoc = currentFiles.find(file => file.name === filename);
    
    // If not found, try previous files
    if (!foundDoc) {
      foundDoc = previousFiles.find(file => file.name === filename);
    }
    
    console.log("🔍 Found document:", foundDoc ? foundDoc.name : "Not found");
    return foundDoc;
  };

  // Helper function to highlight text in content
  const highlightTextInContent = (content: string, searchText: string): string => {
    if (!searchText.trim()) return content;
    
    try {
      // Find the sentence containing the search text
      const sentences = content.split(/[.!?]+/);
      const matchingSentence = sentences.find(sentence => 
        sentence.toLowerCase().includes(searchText.toLowerCase())
      );
      
      if (matchingSentence) {
        // Return the complete sentence with highlighting
        const highlighted = matchingSentence.replace(
          new RegExp(searchText, 'gi'),
          `**${searchText}**`
        );
        return highlighted.trim() + '.';
      }
      
      // Fallback: return first 200 chars around the match
      const index = content.toLowerCase().indexOf(searchText.toLowerCase());
      if (index !== -1) {
        const start = Math.max(0, index - 100);
        const end = Math.min(content.length, index + searchText.length + 100);
        const excerpt = content.substring(start, end);
        return (start > 0 ? '...' : '') + excerpt + (end < content.length ? '...' : '');
      }
      
      return searchText; // Fallback
    } catch (error) {
      console.error("Error highlighting text:", error);
      return searchText;
    }
  };

  // Search for similar content when popup opens
  useEffect(() => {
    if (isVisible && selectedText.trim()) {
      console.log("🔍 Similarity popup opened, searching for:", selectedText);
      searchSimilarContent();
    }
  }, [isVisible, selectedText]);

  const searchSimilarContent = async () => {
    if (!selectedText.trim()) {
      console.log("🔍 ERROR: No selected text to search");
      return;
    }

    console.log("🔍 Starting similarity search...");
    console.log("🔍 Text to search:", selectedText);
    console.log("🔍 Text length:", selectedText.length);

    setIsLoading(true);
    setError(null);
    setResults([]);

    try {
      console.log("🔍 Calling aiApi.searchSimilar...");
      const response = await aiApi.searchSimilar(selectedText, 8, 0.25);
      console.log("🔍 Similarity search response:", response);
      setResults(response.results);
      setSearchTimestamp(response.search_timestamp);
    } catch (err) {
      console.error("🔍 Similarity search error:", err);
      setError(err instanceof Error ? err.message : "Failed to search for similar content");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyContent = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      // You could add a toast notification here
    } catch (err) {
      console.error("Failed to copy content:", err);
    }
  };

  const getStrengthColor = (score: number) => {
    if (score >= 0.8) return "bg-green-500";
    if (score >= 0.6) return "bg-blue-500";
    if (score >= 0.4) return "bg-orange-500";
    return "bg-gray-500";
  };

  const getStrengthLabel = (score: number) => {
    if (score >= 0.8) return "High";
    if (score >= 0.6) return "Medium";
    if (score >= 0.4) return "Low";
    return "Weak";
  };

  // Debug logging
  console.log("🔍 SimilarityResultsPopup render - isVisible:", isVisible, "selectedText:", selectedText);

  if (!isVisible) return null;

  return (
    <>
      <Dialog open={isVisible} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] sm:max-w-4xl lg:max-w-6xl max-h-[95vh] p-0 bg-gradient-to-br from-background via-background/95 to-primary/5 overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0 p-4 sm:p-6 pb-3 sm:pb-4 border-b border-border/20 bg-gradient-to-r from-blue-500/5 to-transparent">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0 overflow-hidden">
              <DialogTitle className="text-lg sm:text-xl font-bold text-foreground mb-2 sm:mb-3 flex items-center">
                <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500 mr-2 flex-shrink-0" />
                <span className="truncate">Similar Content Found</span>
              </DialogTitle>
              <div className="bg-muted/50 rounded-lg p-3 border border-border/30 overflow-hidden">
                <p className="text-xs sm:text-sm text-muted-foreground mb-1">Selected Text:</p>
                <p className="text-xs sm:text-sm font-medium text-foreground leading-relaxed break-words">
                  "{selectedText ? aiApiHelpers.truncateText(selectedText, 150) : 'No text selected'}"
                </p>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <ScrollArea className={cn(
            "h-[calc(95vh-180px)] px-3 sm:px-6",
            // Custom scrollbar styling with Tailwind
            "[&>div>div[data-radix-scroll-area-scrollbar]]:w-2",
            "[&>div>div[data-radix-scroll-area-scrollbar]]:bg-border/50",
            "[&>div>div[data-radix-scroll-area-scrollbar]]:rounded-md",
            "[&_[data-radix-scroll-area-thumb]]:bg-muted-foreground/60",
            "[&_[data-radix-scroll-area-thumb]]:rounded-md",
            "[&_[data-radix-scroll-area-thumb]:hover]:bg-muted-foreground/80",
            "[&_[data-radix-scroll-area-thumb]]:transition-colors"
          )}>
            <div className="pt-3 sm:pt-4 pb-16 sm:pb-20 space-y-4 sm:space-y-6">
              {/* Loading State */}
              {isLoading && (
                <div className="text-center py-12">
                  <RefreshCw className="h-8 w-8 text-blue-500 animate-spin mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    Analyzing Documents...
                  </h3>
                  <p className="text-muted-foreground">
                    Searching across your document library for similar content
                  </p>
                </div>
              )}

              {/* Error State */}
              {error && !isLoading && (
                <div className="text-center py-12">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-red-500/10 rounded-full mb-4">
                    <AlertCircle className="h-8 w-8 text-red-500" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    Search Failed
                  </h3>
                  <p className="text-muted-foreground mb-4 max-w-md mx-auto">
                    {error}
                  </p>
                  <Button onClick={searchSimilarContent} variant="outline">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Try Again
                  </Button>
                </div>
              )}

              {/* No Results State */}
              {!isLoading && !error && results.length === 0 && (
                <div className="text-center py-12">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-500/10 rounded-full mb-4">
                    <FileText className="h-8 w-8 text-gray-500" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    No Similar Content Found
                  </h3>
                  <p className="text-muted-foreground mb-4 max-w-md mx-auto">
                    This content appears to be unique in your document library. Try uploading more related documents to find connections.
                  </p>
                  <div className="flex gap-2 justify-center">
                    <Button onClick={searchSimilarContent} variant="outline">
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Search Again
                    </Button>
                  </div>
                </div>
              )}

              {/* Results */}
              {!isLoading && !error && results.length > 0 && (
                <>
                  {/* Summary Stats */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                    <Card className="bg-gradient-to-br from-green-500/5 to-green-500/10 border-green-500/20 overflow-hidden">
                      <CardContent className="p-3 sm:p-4">
                        <div className="flex items-center justify-between">
                          <div className="min-w-0">
                            <p className="text-xs sm:text-sm text-green-600 dark:text-green-400 font-medium truncate">Total Matches</p>
                            <p className="text-xl sm:text-2xl font-bold text-green-700 dark:text-green-300">{results.length}</p>
                          </div>
                          <CheckCircle className="h-6 w-6 sm:h-8 sm:w-8 text-green-500 flex-shrink-0" />
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-blue-500/5 to-blue-500/10 border-blue-500/20 overflow-hidden">
                      <CardContent className="p-3 sm:p-4">
                        <div className="flex items-center justify-between">
                          <div className="min-w-0">
                            <p className="text-xs sm:text-sm text-blue-600 dark:text-blue-400 font-medium truncate">Best Match</p>
                            <p className="text-xl sm:text-2xl font-bold text-blue-700 dark:text-blue-300">
                              {results.length > 0 ? `${Math.round(results[0].similarity_score * 100)}%` : '0%'}
                            </p>
                          </div>
                          <TrendingUp className="h-6 w-6 sm:h-8 sm:w-8 text-blue-500 flex-shrink-0" />
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-purple-500/5 to-purple-500/10 border-purple-500/20 overflow-hidden sm:col-span-2 lg:col-span-1">
                      <CardContent className="p-3 sm:p-4">
                        <div className="flex items-center justify-between">
                          <div className="min-w-0">
                            <p className="text-xs sm:text-sm text-purple-600 dark:text-purple-400 font-medium truncate">Documents</p>
                            <p className="text-xl sm:text-2xl font-bold text-purple-700 dark:text-purple-300">
                              {new Set(results.map(r => r.metadata.filename)).size}
                            </p>
                          </div>
                          <FileText className="h-6 w-6 sm:h-8 sm:w-8 text-purple-500 flex-shrink-0" />
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Search Metadata */}
                  <div className="flex items-center text-sm text-muted-foreground mb-4">
                    <Clock className="h-4 w-4 mr-2" />
                    <span>Search completed: {aiApiHelpers.formatTimestamp(searchTimestamp)}</span>
                  </div>

                  {/* Results List */}
                  <div className="space-y-3 sm:space-y-4 pb-8">
                    {results.map((result, index) => (
                      <Card 
                        key={result.metadata.chunk_id} 
                        className={cn(
                          "hover:shadow-lg transition-all duration-200 cursor-pointer group border-border/50 overflow-hidden",
                          expandedCard === result.metadata.chunk_id && "ring-2 ring-blue-500/20"
                        )}
                        onClick={() => setExpandedCard(
                          expandedCard === result.metadata.chunk_id ? null : result.metadata.chunk_id
                        )}
                      >
                        <CardHeader className="pb-2 sm:pb-3 p-3 sm:p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0 overflow-hidden">
                              <div className="flex flex-wrap items-center gap-2 mb-2">
                                <Badge 
                                  variant="secondary" 
                                  className={cn(
                                    "text-xs px-2 py-1 flex-shrink-0",
                                    aiApiHelpers.getSimilarityColor(result.similarity_score)
                                  )}
                                >
                                  {result.similarity_percentage}%
                                </Badge>
                                <Badge 
                                  variant="outline" 
                                  className={cn(
                                    "text-xs px-2 py-1 flex-shrink-0",
                                    `${getStrengthColor(result.similarity_score)} text-white border-0`
                                  )}
                                >
                                  {getStrengthLabel(result.similarity_score)}
                                </Badge>
                                <span className="text-xs text-muted-foreground flex-shrink-0">
                                  #{index + 1}
                                </span>
                              </div>
                              <CardTitle className="text-sm sm:text-lg group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors flex items-center mb-1">
                                <FileText className="h-3 w-3 sm:h-4 sm:w-4 mr-2 flex-shrink-0" />
                                <span className="truncate">{result.metadata.filename}</span>
                              </CardTitle>
                              <p className="text-xs sm:text-sm text-muted-foreground">
                                Section {result.metadata.chunk_index + 1} of {result.metadata.total_chunks}
                              </p>
                            </div>
                            <div className="flex items-center space-x-2 flex-shrink-0">
                              <Progress 
                                value={result.similarity_score * 100} 
                                className="w-12 sm:w-16 h-2"
                              />
                              <ChevronRight className={cn(
                                "h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground transition-transform flex-shrink-0",
                                expandedCard === result.metadata.chunk_id && "rotate-90"
                              )} />
                            </div>
                          </div>
                        </CardHeader>

                        <CardContent className="pt-0 p-3 sm:p-4 overflow-hidden">
                          {/* Content Preview */}
                          <div className="bg-muted/30 rounded-lg p-3 sm:p-4 border border-border/30 mb-3 overflow-hidden">
                            <p className="text-xs sm:text-sm leading-relaxed text-foreground break-words">
                              {aiApiHelpers.truncateText(result.content, expandedCard === result.metadata.chunk_id ? 400 : 120)}
                            </p>
                          </div>

                          {/* Expanded Content */}
                          {expandedCard === result.metadata.chunk_id && (
                            <div className="space-y-3 overflow-hidden">
                              <Separator />
                              
                              {/* Full Content */}
                              <div className="bg-background/50 rounded-lg p-3 sm:p-4 border border-border/20 overflow-hidden">
                                <div className="flex items-center justify-between mb-2 gap-2">
                                  <h4 className="text-xs sm:text-sm font-semibold text-foreground truncate">Full Content</h4>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="flex-shrink-0 h-7 px-2"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleCopyContent(result.content);
                                    }}
                                  >
                                    <Copy className="h-3 w-3 mr-1" />
                                    <span className="hidden sm:inline">Copy</span>
                                  </Button>
                                </div>
                                <div className={cn(
                                  "max-h-48 overflow-y-auto scrollbar-thin",
                                  "scrollbar-track-transparent scrollbar-thumb-muted-foreground/30",
                                  "hover:scrollbar-thumb-muted-foreground/50 scrollbar-thumb-rounded-md"
                                )}>
                                  <p className="text-xs sm:text-sm leading-relaxed text-foreground whitespace-pre-wrap break-words pr-2">
                                    {result.content}
                                  </p>
                                </div>
                              </div>

                              {/* Metadata */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4 text-xs text-muted-foreground">
                                <div className="truncate">
                                  <span className="font-medium">Document ID:</span> {result.metadata.file_id.substring(0, 8)}...
                                </div>
                                <div className="truncate">
                                  <span className="font-medium">Chunk:</span> {result.metadata.chunk_index + 1} of {result.metadata.total_chunks}
                                </div>
                              </div>

                              {/* Actions */}
                              <div className="flex flex-col sm:flex-row gap-2 pt-2">
                                                                 <Button 
                                   variant="outline" 
                                   size="sm"
                                   className="flex-1 sm:flex-none h-8"
                                   onClick={(e) => {
                                     e.stopPropagation();
                                     const document = findDocumentByName(result.metadata.filename);
                                     if (document) {
                                       console.log("📖 Opening document viewer for:", document.name);
                                       setSelectedDocument(document);
                                       setShowDocumentViewer(true);
                                     } else {
                                       console.error("❌ Document not found:", result.metadata.filename);
                                     }
                                   }}
                                 >
                                   <Eye className="h-3 w-3 mr-1" />
                                   <span className="text-xs">View Document</span>
                                 </Button>
                                 <Button 
                                   variant="outline" 
                                   size="sm"
                                   className="flex-1 sm:flex-none h-8"
                                   onClick={(e) => {
                                     e.stopPropagation();
                                     // Show highlighted text in custom popup
                                     const highlighted = highlightTextInContent(result.content, selectedText);
                                     console.log("🎯 Showing context highlighter for:", selectedText);
                                     setHighlightedContext(highlighted);
                                     setShowContextHighlighter(true);
                                   }}
                                 >
                                   <Search className="h-3 w-3 mr-1" />
                                   <span className="text-xs">Show Context</span>
                                 </Button>
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Footer Actions */}
        {!isLoading && !error && results.length > 0 && (
          <div className="flex-shrink-0 p-3 sm:p-6 border-t border-border/20 bg-gradient-to-r from-blue-500/5 to-transparent">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="text-xs sm:text-sm text-muted-foreground">
                Found {results.length} content blocks across{" "}
                {new Set(results.map(r => r.metadata.filename)).size} documents
              </div>
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <Button variant="outline" onClick={searchSimilarContent} size="sm" className="w-full sm:w-auto">
                  <RefreshCw className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                  <span className="text-xs sm:text-sm">Refresh</span>
                </Button>
                <Button onClick={onClose} size="sm" className="w-full sm:w-auto">
                  <span className="text-xs sm:text-sm">Close</span>
                </Button>
              </div>
            </div>
          </div>
        )}
       </DialogContent>
     </Dialog>

     {/* Document Viewer Popup */}
     <Dialog open={showDocumentViewer} onOpenChange={setShowDocumentViewer}>
       <DialogContent className="max-w-[95vw] sm:max-w-4xl lg:max-w-6xl max-h-[95vh] p-0 bg-gradient-to-br from-background via-background/95 to-green-500/5 overflow-hidden flex flex-col">
         <DialogHeader className="flex-shrink-0 px-3 sm:px-6 py-3 sm:py-4 border-b border-border/50 bg-background/80 backdrop-blur-sm">
           <div className="flex items-center justify-between">
             <div className="flex items-center space-x-2">
               <div className="p-1.5 sm:p-2 bg-green-500/10 rounded-lg">
                 <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-green-500" />
               </div>
               <div className="min-w-0 flex-1">
                 <DialogTitle className="text-base sm:text-lg font-semibold text-foreground truncate">
                   Document Viewer
                 </DialogTitle>
                 <p className="text-xs sm:text-sm text-muted-foreground truncate">
                   {selectedDocument?.name || "Document"}
                 </p>
               </div>
             </div>
           </div>
         </DialogHeader>

         <div className="flex-1 overflow-hidden">
           <ScrollArea className={cn(
             "h-[calc(95vh-120px)] px-3 sm:px-6",
             "[&>div>div[data-radix-scroll-area-scrollbar]]:w-2",
             "[&>div>div[data-radix-scroll-area-scrollbar]]:bg-border/50",
             "[&>div>div[data-radix-scroll-area-scrollbar]]:rounded-md",
             "[&_[data-radix-scroll-area-thumb]]:bg-muted-foreground/60",
             "[&_[data-radix-scroll-area-thumb]]:rounded-md",
             "[&_[data-radix-scroll-area-thumb]:hover]:bg-muted-foreground/80",
             "[&_[data-radix-scroll-area-thumb]]:transition-colors"
           )}>
             <div className="pt-3 sm:pt-4 pb-6 sm:pb-8">
               {selectedDocument?.content ? (
                 <div className="bg-muted/30 rounded-lg p-4 sm:p-6 border border-border/30">
                   <h3 className="text-sm sm:text-base font-semibold text-foreground mb-3 sm:mb-4">
                     Document Content
                   </h3>
                   <div className="prose prose-sm sm:prose-base max-w-none text-foreground">
                     <pre className="whitespace-pre-wrap text-xs sm:text-sm leading-relaxed">
                       {selectedDocument.content}
                     </pre>
                   </div>
                 </div>
               ) : (
                 <div className="text-center py-8 sm:py-12">
                   <FileText className="h-12 w-12 sm:h-16 sm:w-16 text-muted-foreground/50 mx-auto mb-3 sm:mb-4" />
                   <p className="text-sm sm:text-base text-muted-foreground">
                     No content available for this document
                   </p>
                 </div>
               )}
             </div>
           </ScrollArea>
         </div>
       </DialogContent>
     </Dialog>

     {/* Context Highlighter Popup */}
     <Dialog open={showContextHighlighter} onOpenChange={setShowContextHighlighter}>
       <DialogContent className="max-w-[95vw] sm:max-w-3xl lg:max-w-5xl max-h-[95vh] p-0 bg-gradient-to-br from-background via-background/95 to-yellow-500/5 overflow-hidden flex flex-col">
         <DialogHeader className="flex-shrink-0 px-3 sm:px-6 py-3 sm:py-4 border-b border-border/50 bg-background/80 backdrop-blur-sm">
           <div className="flex items-center justify-between">
             <div className="flex items-center space-x-2">
               <div className="p-1.5 sm:p-2 bg-yellow-500/10 rounded-lg">
                 <Search className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-500" />
               </div>
               <div className="min-w-0 flex-1">
                 <DialogTitle className="text-base sm:text-lg font-semibold text-foreground">
                   Text Context Highlighter
                 </DialogTitle>
                 <p className="text-xs sm:text-sm text-muted-foreground">
                   Highlighted content from similar text
                 </p>
               </div>
             </div>
           </div>
         </DialogHeader>

         <div className="flex-1 overflow-hidden">
           <ScrollArea className={cn(
             "h-[calc(95vh-120px)] px-3 sm:px-6",
             "[&>div>div[data-radix-scroll-area-scrollbar]]:w-2",
             "[&>div>div[data-radix-scroll-area-scrollbar]]:bg-border/50",
             "[&>div>div[data-radix-scroll-area-scrollbar]]:rounded-md",
             "[&_[data-radix-scroll-area-thumb]]:bg-muted-foreground/60",
             "[&_[data-radix-scroll-area-thumb]]:rounded-md",
             "[&_[data-radix-scroll-area-thumb]:hover]:bg-muted-foreground/80",
             "[&_[data-radix-scroll-area-thumb]]:transition-colors"
           )}>
             <div className="pt-3 sm:pt-4 pb-6 sm:pb-8">
               <div className="bg-muted/30 rounded-lg p-4 sm:p-6 border border-border/30">
                 <h3 className="text-sm sm:text-base font-semibold text-foreground mb-3 sm:mb-4 flex items-center">
                   <Search className="h-4 w-4 mr-2 text-yellow-500" />
                   Highlighted Context
                 </h3>
                 
                 {/* Selected Text Preview */}
                 <div className="bg-blue-500/10 rounded-lg p-3 sm:p-4 border border-blue-500/20 mb-4">
                   <h4 className="text-xs sm:text-sm font-semibold text-blue-600 dark:text-blue-400 mb-2 flex items-center">
                     <Eye className="h-3 w-3 mr-2" />
                     Your Selected Text
                   </h4>
                   <p className="text-xs sm:text-sm text-foreground leading-relaxed break-words">
                     "{selectedText}"
                   </p>
                 </div>

                 {/* Highlighted Context */}
                 <div className="bg-yellow-500/10 rounded-lg p-3 sm:p-4 border border-yellow-500/20">
                   <h4 className="text-xs sm:text-sm font-semibold text-yellow-600 dark:text-yellow-400 mb-2 flex items-center">
                     <Search className="h-3 w-3 mr-2" />
                     Matching Context Found
                   </h4>
                   <div className="bg-background/50 rounded-lg p-3 sm:p-4 border border-border/20">
                     <p className="text-sm sm:text-base leading-relaxed text-foreground whitespace-pre-wrap break-words">
                       {highlightedContext || "No context available"}
                     </p>
                   </div>
                 </div>
                 
                 {/* Actions */}
                 <div className="mt-4 pt-3 border-t border-border/30">
                   <div className="flex flex-col sm:flex-row gap-2">
                     <Button
                       variant="outline"
                       size="sm"
                       onClick={() => {
                         navigator.clipboard.writeText(highlightedContext);
                       }}
                       className="flex-1 sm:flex-none"
                     >
                       <Copy className="h-3 w-3 mr-2" />
                       Copy Context
                     </Button>
                     <Button
                       variant="outline"
                       size="sm"
                       onClick={() => setShowContextHighlighter(false)}
                       className="flex-1 sm:flex-none"
                     >
                       <X className="h-3 w-3 mr-2" />
                       Close
                     </Button>
                   </div>
                 </div>
               </div>
             </div>
           </ScrollArea>
         </div>
       </DialogContent>
     </Dialog>
    </>
   );
 }
