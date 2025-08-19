import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GridBackground } from "@/components/ui/grid-background";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, Link as LinkIcon, TrendingUp, FileText, Eye, Loader2, RefreshCw } from "lucide-react";
import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { useDocuments } from "@/contexts/DocumentContext";
import { aiApi } from "@/utils/aiApi";
import { useNotifications } from "@/hooks/use-notifications";

interface SimilarityMatch {
  concept: string;
  description: string;
  source_document: string;
  target_document: string;
  similarity_score: number;
  key_phrases: string[];
}

const SimilarIdeas = () => {
  // Load similarities from localStorage on init
  const [similarities, setSimilarities] = useState<SimilarityMatch[]>(() => {
    try {
      const saved = localStorage.getItem('documentSimilarities');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [selectedSimilarity, setSelectedSimilarity] = useState<SimilarityMatch | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [totalComparisons, setTotalComparisons] = useState(0);
  
  // Track document list changes to clear stale data
  const [lastDocumentState, setLastDocumentState] = useState<string>('');
  
  const { currentFiles, previousFiles } = useDocuments();
  const { showError, showSuccess } = useNotifications();

  const totalFiles = currentFiles.length + previousFiles.length;

  // Create a unique identifier for current document state
  const documentStateId = [
    ...currentFiles.map(f => f.id),
    ...previousFiles.map(f => f.id)
  ].sort().join(',');

  // Save similarities to localStorage whenever they change
  useEffect(() => {
    if (similarities.length > 0) {
      localStorage.setItem('documentSimilarities', JSON.stringify(similarities));
      localStorage.setItem('documentSimilarities_state', documentStateId);
    }
  }, [similarities, documentStateId]);

  // Clear similarities when no files are present OR when document list changes
  useEffect(() => {
    if (totalFiles === 0) {
      console.log('🔍 Clearing similarities: No documents');
      setSimilarities([]);
      localStorage.removeItem('documentSimilarities');
      localStorage.removeItem('documentSimilarities_state');
      setLastDocumentState('');
    } else if (lastDocumentState && documentStateId !== lastDocumentState) {
      console.log('🔍 Clearing similarities: Document list changed');
      console.log('Previous state:', lastDocumentState);
      console.log('Current state:', documentStateId);
      setSimilarities([]);
      localStorage.removeItem('documentSimilarities');
      localStorage.removeItem('documentSimilarities_state');
    }
    setLastDocumentState(documentStateId);
  }, [totalFiles, documentStateId, lastDocumentState]);

  // Load similarities from localStorage only if document state matches
  useEffect(() => {
    if (totalFiles > 0 && similarities.length === 0) {
      try {
        const savedSimilarities = localStorage.getItem('documentSimilarities');
        const savedState = localStorage.getItem('documentSimilarities_state');
        
        if (savedSimilarities && savedState === documentStateId) {
          console.log('🔍 Loading similarities: Document state matches');
          setSimilarities(JSON.parse(savedSimilarities));
        } else if (savedSimilarities && savedState !== documentStateId) {
          console.log('🔍 Clearing stale similarities: Document state mismatch');
          localStorage.removeItem('documentSimilarities');
          localStorage.removeItem('documentSimilarities_state');
        }
      } catch (error) {
        console.error('Error loading similarities:', error);
        localStorage.removeItem('documentSimilarities');
        localStorage.removeItem('documentSimilarities_state');
      }
    }
  }, [totalFiles, documentStateId, similarities.length]);

  const loadSimilarities = async (isRefresh = false) => {
    if (totalFiles < 2) {
      setSimilarities([]);
      return;
    }

    try {
      if (isRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      console.log('🔍 Loading document similarities...');
      const response = await aiApi.generateSimilarities();
      
      if (response && response.similarities) {
        setSimilarities(response.similarities);
        setTotalComparisons(response.total_comparisons);
        
        if (isRefresh) {
          showSuccess(`Refreshed ${response.similarities.length} similarity connections`);
        } else {
          showSuccess(`Generated ${response.similarities.length} similarity connections`);
        }
      }
    } catch (error) {
      console.error('Failed to load similarities:', error);
      showError("Failed to generate similarities. Please try again.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleViewDetails = (similarity: SimilarityMatch) => {
    setSelectedSimilarity(similarity);
    setIsDialogOpen(true);
  };

  const handleRefresh = () => {
    loadSimilarities(true);
  };

  const handleGenerate = () => {
    loadSimilarities(false);
  };

  const handleButtonClick = () => {
    if (similarities.length === 0) {
      handleGenerate();
    } else {
      handleRefresh();
    }
  };

  // Calculate average similarity score
  const avgSimilarity = similarities.length > 0 
    ? Math.round(similarities.reduce((acc, sim) => acc + sim.similarity_score, 0) / similarities.length * 100)
    : 0;

  // Get unique documents
  const uniqueDocuments = new Set([
    ...similarities.map(s => s.source_document),
    ...similarities.map(s => s.target_document)
  ]);

  return (
    <GridBackground>
      <div className="min-h-screen w-full pb-12">
        <Header />
        
        {/* Back Button */}
        <div className="px-4 pt-4 lg:container lg:mx-auto lg:px-8">
          <Link to="/">
            <Button variant="ghost" className="mb-4 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Documents
            </Button>
          </Link>
        </div>
        
        <div className="w-full px-4 py-4 lg:container lg:mx-auto lg:px-8 lg:py-8 pb-10">
          {/* Page Header */}
          <div className="text-center mb-8 sm:mb-12">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-gradient-to-br from-primary/20 to-primary/10 rounded-full flex items-center justify-center">
                <LinkIcon className="h-8 w-8 text-primary" />
              </div>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-4">
              Similar Ideas
            </h1>
            <p className="text-sm sm:text-lg lg:text-xl text-muted-foreground max-w-2xl mx-auto px-4">
              Discover related concepts and connections from your document library based on semantic similarity.
            </p>
          </div>

          {/* No Files Message */}
          {totalFiles === 0 && (
            <div className="text-center py-12 border-2 border-dashed border-muted-foreground/20 rounded-lg">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground text-lg mb-2">Upload files to discover similar ideas</p>
              <p className="text-sm text-muted-foreground">Need at least 2 documents to find connections</p>
            </div>
          )}

          {/* Need More Files Message */}
          {totalFiles === 1 && (
            <div className="text-center py-12 border-2 border-dashed border-muted-foreground/20 rounded-lg">
              <LinkIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground text-lg mb-2">Upload one more file to find similarities</p>
              <p className="text-sm text-muted-foreground">Semantic connections require at least 2 documents</p>
            </div>
          )}

          {/* Loading State */}
          {totalFiles >= 2 && (isLoading || isRefreshing) && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
              <p className="text-muted-foreground">
                {isLoading 
                  ? "Analyzing document similarities..." 
                  : "Refreshing similarity connections..."
                }
              </p>
            </div>
          )}

          {/* Stats Summary */}
          {totalFiles >= 2 && !isLoading && !isRefreshing && similarities.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Connections</CardTitle>
                <LinkIcon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                  <div className="text-2xl font-bold">{similarities.length}</div>
                  <p className="text-xs text-muted-foreground">Found across {uniqueDocuments.size} documents</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Average Similarity</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                  <div className="text-2xl font-bold">{avgSimilarity}%</div>
                <p className="text-xs text-muted-foreground">High confidence matches</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Comparisons</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                  <div className="text-2xl font-bold">{totalComparisons}</div>
                  <p className="text-xs text-muted-foreground">Document pairs analyzed</p>
              </CardContent>
            </Card>
          </div>
          )}

          {/* Similar Ideas Grid */}
          {totalFiles >= 2 && !isLoading && !isRefreshing && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {similarities.length > 0 ? (
                similarities.map((similarity, index) => (
                  <Card 
                    key={index} 
                    className="h-80 flex flex-col hover:shadow-lg transition-shadow cursor-pointer group overflow-hidden"
                    onClick={() => handleViewDetails(similarity)}
                  >
                    <CardHeader className="flex-shrink-0 p-4">
                  <div className="flex items-center justify-between mb-2">
                        <Badge variant="secondary" className="text-xs truncate max-w-24" title="Semantic Connection">
                          Connection
                        </Badge>
                        <div className="flex items-center space-x-1 text-muted-foreground text-sm flex-shrink-0">
                          <TrendingUp className="h-3 w-3 flex-shrink-0" />
                          <span className="font-bold text-primary text-xs">
                            {Math.round(similarity.similarity_score * 100)}%
                          </span>
                    </div>
                  </div>
                      <CardTitle className="text-lg leading-tight line-clamp-2 min-h-[3.5rem] break-words group-hover:text-primary transition-colors">
                        {similarity.concept}
                  </CardTitle>
                </CardHeader>
                    <CardContent className="flex-1 flex flex-col p-4 pt-0 overflow-hidden">
                      <p className="text-muted-foreground mb-4 text-sm line-clamp-4 flex-1 break-words overflow-hidden">
                        {similarity.description}
                      </p>
                      <div className="flex flex-col gap-1 mt-auto flex-shrink-0">
                        <div className="bg-muted/10 rounded px-2 py-1 mb-1">
                          <div className="flex items-center text-xs text-foreground">
                            <FileText className="h-3 w-3 mr-1 flex-shrink-0 text-primary" />
                            <span className="truncate font-medium" title={similarity.source_document}>
                              {similarity.source_document.length > 16 
                                ? `${similarity.source_document.substring(0, 16)}...` 
                                : similarity.source_document
                              }
                            </span>
                          </div>
                        </div>
                        <div className="bg-muted/10 rounded px-2 py-1 mb-2">
                          <div className="flex items-center text-xs text-foreground">
                            <FileText className="h-3 w-3 mr-1 flex-shrink-0 text-primary" />
                            <span className="truncate font-medium" title={similarity.target_document}>
                              {similarity.target_document.length > 16 
                                ? `${similarity.target_document.substring(0, 16)}...` 
                                : similarity.target_document
                              }
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between mt-1">
                          <div className="flex flex-wrap gap-1 overflow-hidden max-h-12 flex-1 pr-2">
                            {similarity.key_phrases.slice(0, 2).map((phrase, phraseIndex) => (
                              <Badge 
                                key={phraseIndex} 
                                variant="secondary" 
                                className="text-xs h-5 px-2 py-0 truncate max-w-24 flex-shrink-0 bg-primary/10 text-primary border-primary/20"
                                title={phrase}
                              >
                                {phrase.length > 12 ? `${phrase.substring(0, 12)}...` : phrase}
                              </Badge>
                            ))}
                    </div>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                            onClick={(e) => {e.stopPropagation(); handleViewDetails(similarity);}}
                            title="View Details"
                          >
                            <Eye className="h-3 w-3" />
                    </Button>
                        </div>
                  </div>
                </CardContent>
              </Card>
                ))
              ) : (
                <div className="col-span-full text-center py-8">
                  <p className="text-muted-foreground">No similarities found yet. Click the button below to generate connections.</p>
                </div>
              )}
          </div>
          )}

          {/* Action Button */}
          {totalFiles >= 2 && (
            <div className="mt-8 text-center pb-8">
            <div className="space-y-4">
                <Button 
                  size="lg" 
                  className="bg-primary hover:bg-primary/90"
                  onClick={handleButtonClick}
                  disabled={isLoading || isRefreshing}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${(isLoading || isRefreshing) ? 'animate-spin' : ''}`} />
                  {(isLoading || isRefreshing)
                    ? 'Analyzing...' 
                    : (similarities.length === 0 
                        ? 'Generate Similar Ideas' 
                        : 'Refresh Connections'
                      )
                  }
              </Button>
              <p className="text-sm text-muted-foreground">
                  {similarities.length === 0 
                    ? `Analyze ${totalFiles} document${totalFiles === 1 ? '' : 's'} for semantic connections`
                    : `Based on ${totalFiles} document${totalFiles === 1 ? '' : 's'} in your library`
                  }
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Details Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl w-full max-h-[90vh] bg-card border border-border overflow-hidden">
          <DialogHeader className="text-center pb-4 border-b flex-shrink-0">
            <div className="w-16 h-16 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <LinkIcon className="h-8 w-8 text-primary" />
            </div>
            <DialogTitle className="text-2xl font-bold break-words">
              {selectedSimilarity?.concept}
            </DialogTitle>
            <div className="flex items-center justify-center space-x-4 text-sm text-muted-foreground mt-2 flex-wrap">
              <div className="flex items-center">
                <TrendingUp className="h-4 w-4 mr-1" />
                <span>{selectedSimilarity ? Math.round(selectedSimilarity.similarity_score * 100) : 0}% similarity</span>
              </div>
              <Badge variant="secondary" className="truncate max-w-32">Semantic Connection</Badge>
            </div>
          </DialogHeader>
          
          <div className="flex-1 min-h-0 overflow-hidden">
            <ScrollArea className="h-[60vh] pr-4">
              <div className="space-y-6 pr-2 pb-10">
                {/* Description */}
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-wide">
                    Connection Details
                  </h3>
                  <div className="bg-muted/20 rounded-lg p-6 border border-muted/30">
                    <p className="text-sm leading-relaxed break-words text-foreground" style={{lineHeight: '1.7'}}>
                      {selectedSimilarity?.description}
                    </p>
                  </div>
                </div>

                {/* Source Documents */}
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
                    Connected Documents
                  </h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="bg-muted/20 rounded-lg p-5 border border-muted/30">
                      <div className="flex items-center mb-3">
                        <FileText className="h-4 w-4 mr-2 text-primary" />
                        <span className="text-sm font-semibold text-foreground">First Document</span>
                      </div>
                      <div className="bg-background/50 rounded-md px-3 py-2 border">
                        <p className="text-sm break-words leading-relaxed font-medium text-foreground">
                          {selectedSimilarity?.source_document}
                        </p>
                      </div>
                    </div>
                    <div className="bg-muted/20 rounded-lg p-5 border border-muted/30">
                      <div className="flex items-center mb-3">
                        <FileText className="h-4 w-4 mr-2 text-primary" />
                        <span className="text-sm font-semibold text-foreground">Second Document</span>
                      </div>
                      <div className="bg-background/50 rounded-md px-3 py-2 border">
                        <p className="text-sm break-words leading-relaxed font-medium text-foreground">
                          {selectedSimilarity?.target_document}
              </p>
            </div>
          </div>
        </div>
      </div>

                {/* Key Phrases */}
                <div className="pb-6">
                  <h3 className="text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-wide">
                    Key Matching Phrases
                  </h3>
                  <div className="bg-muted/10 rounded-lg p-4 border border-muted/30">
                    <div className="flex flex-wrap gap-2">
                      {selectedSimilarity?.key_phrases.map((phrase, index) => (
                        <Badge 
                          key={index} 
                          variant="secondary" 
                          className="text-xs px-3 py-1 h-6 font-medium bg-background/80 hover:bg-background border"
                        >
                          {phrase}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </ScrollArea>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between items-center pt-4 border-t flex-shrink-0">
            <div className="flex items-center text-xs text-muted-foreground">
              <span>AI-generated semantic connection</span>
            </div>
            <div className="flex space-x-3">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </GridBackground>
  );
};

export default SimilarIdeas;
