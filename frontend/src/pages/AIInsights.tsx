import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GridBackground } from "@/components/ui/grid-background";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, Lightbulb, Zap, Brain, Target, Sparkles, RefreshCw, Eye, Loader2, FileText } from "lucide-react";
import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { useDocuments } from "@/contexts/DocumentContext";
import { aiApi } from "@/utils/aiApi";
import { useNotifications } from "@/hooks/use-notifications";

interface AIInsight {
  title: string;
  description: string;
  category: string;
  confidence: number;
  impact: string;
  source: string;
  implications: string[];
  recommendations: string[];
}

const getImpactColor = (impact: string) => {
  switch (impact) {
    case "Critical": return "bg-red-100 text-red-800 border-red-200";
    case "High": return "bg-orange-100 text-orange-800 border-orange-200";
    case "Strategic": return "bg-purple-100 text-purple-800 border-purple-200";
    case "Medium": return "bg-blue-100 text-blue-800 border-blue-200";
    default: return "bg-gray-100 text-gray-800 border-gray-200";
  }
};

const AIInsights = () => {
  // Load insights from localStorage on init
  const [insights, setInsights] = useState<AIInsight[]>(() => {
    try {
      const saved = localStorage.getItem('aiInsights');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [selectedInsight, setSelectedInsight] = useState<AIInsight | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [totalDocuments, setTotalDocuments] = useState(0);
  
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

  // Save insights to localStorage whenever they change
  useEffect(() => {
    if (insights.length > 0) {
      localStorage.setItem('aiInsights', JSON.stringify(insights));
      localStorage.setItem('aiInsights_state', documentStateId);
    }
  }, [insights, documentStateId]);

  // Clear insights when no files are present OR when document list changes
  useEffect(() => {
    if (totalFiles === 0) {
      console.log('🧠 Clearing insights: No documents');
      setInsights([]);
      localStorage.removeItem('aiInsights');
      localStorage.removeItem('aiInsights_state');
      setLastDocumentState('');
    } else if (lastDocumentState && documentStateId !== lastDocumentState) {
      console.log('🧠 Clearing insights: Document list changed');
      console.log('Previous state:', lastDocumentState);
      console.log('Current state:', documentStateId);
      setInsights([]);
      localStorage.removeItem('aiInsights');
      localStorage.removeItem('aiInsights_state');
    }
    setLastDocumentState(documentStateId);
  }, [totalFiles, documentStateId, lastDocumentState]);

  // Load insights from localStorage only if document state matches
  useEffect(() => {
    if (totalFiles > 0 && insights.length === 0) {
      try {
        const savedInsights = localStorage.getItem('aiInsights');
        const savedState = localStorage.getItem('aiInsights_state');
        
        if (savedInsights && savedState === documentStateId) {
          console.log('🧠 Loading insights: Document state matches');
          setInsights(JSON.parse(savedInsights));
        } else if (savedInsights && savedState !== documentStateId) {
          console.log('🧠 Clearing stale insights: Document state mismatch');
          localStorage.removeItem('aiInsights');
          localStorage.removeItem('aiInsights_state');
        }
      } catch (error) {
        console.error('Error loading insights:', error);
        localStorage.removeItem('aiInsights');
        localStorage.removeItem('aiInsights_state');
      }
    }
  }, [totalFiles, documentStateId, insights.length]);

  const loadInsights = async (isRefresh = false) => {
    if (totalFiles === 0) {
      setInsights([]);
      return;
    }

    try {
      if (isRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      console.log('🧠 Loading AI insights...');
      const response = await aiApi.generateDocumentInsights();
      
      if (response && response.insights) {
        setInsights(response.insights);
        setTotalDocuments(response.total_documents_analyzed);
        
        if (isRefresh) {
          showSuccess(`Refreshed ${response.insights.length} AI insights`);
        } else {
          showSuccess(`Generated ${response.insights.length} AI insights`);
        }
      }
    } catch (error) {
      console.error('Failed to load insights:', error);
      showError("Failed to generate insights. Please try again.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleViewDetails = (insight: AIInsight) => {
    setSelectedInsight(insight);
    setIsDialogOpen(true);
  };

  const handleRefresh = () => {
    loadInsights(true);
  };

  const handleGenerate = () => {
    loadInsights(false);
  };

  const handleButtonClick = () => {
    if (insights.length === 0) {
      handleGenerate();
    } else {
      handleRefresh();
    }
  };

  // Calculate average confidence
  const avgConfidence = insights.length > 0 
    ? Math.round(insights.reduce((acc, insight) => acc + insight.confidence, 0) / insights.length)
    : 0;

  // Get high impact insights count
  const highImpactCount = insights.filter(insight => 
    insight.impact === "High" || insight.impact === "Critical" || insight.impact === "Strategic"
  ).length;

  // Get unique categories
  const uniqueCategories = new Set(insights.map(insight => insight.category));

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
              <div className="w-16 h-16 bg-gradient-to-br from-accent/20 to-accent/10 rounded-full flex items-center justify-center">
                <Lightbulb className="h-8 w-8 text-accent" />
              </div>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-4">
              AI Insights
            </h1>
            <p className="text-sm sm:text-lg lg:text-xl text-muted-foreground max-w-2xl mx-auto px-4">
              AI-powered analysis and insights generated from your document collection to reveal hidden patterns and opportunities.
            </p>
          </div>

          {/* No Files Message */}
          {totalFiles === 0 && (
            <div className="text-center py-12 border-2 border-dashed border-muted-foreground/20 rounded-lg">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground text-lg mb-2">Upload documents to generate AI insights</p>
              <p className="text-sm text-muted-foreground">Discover patterns and opportunities in your documents</p>
            </div>
          )}

          {/* Loading State */}
          {totalFiles > 0 && (isLoading || isRefreshing) && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-accent mb-4" />
              <p className="text-muted-foreground">
                {isLoading 
                  ? "Analyzing documents for insights..." 
                  : "Refreshing AI insights..."
                }
              </p>
            </div>
          )}

          {/* Insights Stats */}
          {totalFiles > 0 && !isLoading && !isRefreshing && insights.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Insights</CardTitle>
                <Brain className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{insights.length}</div>
                <p className="text-xs text-muted-foreground">Generated insights</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Confidence</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                  <div className="text-2xl font-bold">{avgConfidence}%</div>
                <p className="text-xs text-muted-foreground">High reliability</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">High Impact</CardTitle>
                <Zap className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                  <div className="text-2xl font-bold">{highImpactCount}</div>
                <p className="text-xs text-muted-foreground">Strategic insights</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Categories</CardTitle>
                <Sparkles className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                  <div className="text-2xl font-bold">{uniqueCategories.size}</div>
                <p className="text-xs text-muted-foreground">Diverse areas</p>
              </CardContent>
            </Card>
          </div>
          )}

          {/* Insights Grid */}
          {totalFiles > 0 && !isLoading && !isRefreshing && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
              {insights.length > 0 ? (
                insights.map((insight, index) => (
                  <Card 
                    key={index} 
                    className="h-80 flex flex-col hover:shadow-lg transition-shadow cursor-pointer group overflow-hidden"
                    onClick={() => handleViewDetails(insight)}
                  >
                    <CardHeader className="flex-shrink-0 p-4">
                  <div className="flex items-center justify-between mb-3">
                        <Badge variant="secondary" className="text-xs truncate max-w-20">
                      {insight.category}
                    </Badge>
                    <div className="flex items-center space-x-2">
                          <Badge className={`text-xs border ${getImpactColor(insight.impact)} truncate max-w-16`}>
                        {insight.impact}
                      </Badge>
                          <div className="flex items-center space-x-1 flex-shrink-0">
                        <Zap className="h-3 w-3 text-accent" />
                        <span className="text-xs font-bold text-accent">{insight.confidence}%</span>
                      </div>
                    </div>
                  </div>
                      <CardTitle className="text-lg leading-tight line-clamp-2 min-h-[3.5rem] break-words group-hover:text-accent transition-colors">
                    {insight.title}
                  </CardTitle>
                </CardHeader>
                    <CardContent className="flex-1 flex flex-col p-4 pt-0 overflow-hidden">
                      <p className="text-muted-foreground mb-4 text-sm line-clamp-4 flex-1 break-words overflow-hidden">
                    {insight.description}
                  </p>
                      <div className="flex items-center justify-between text-xs text-muted-foreground mt-auto">
                    <div className="flex items-center">
                      <Brain className="h-3 w-3 mr-1" />
                      <span>AI Generated</span>
                    </div>
                        <div className="flex items-center">
                          <span className="truncate max-w-20" title={insight.source}>{insight.source}</span>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 ml-2"
                            onClick={(e) => {e.stopPropagation(); handleViewDetails(insight);}}
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
                  <p className="text-muted-foreground">No insights generated yet. Click the button below to analyze your documents.</p>
                </div>
              )}
          </div>
          )}

          {/* Action Button */}
          {totalFiles > 0 && (
            <div className="mt-8 text-center pb-8">
            <div className="space-y-4">
                <Button 
                  size="lg" 
                  className="bg-accent hover:bg-accent/90"
                  onClick={handleButtonClick}
                  disabled={isLoading || isRefreshing}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${(isLoading || isRefreshing) ? 'animate-spin' : ''}`} />
                  {(isLoading || isRefreshing)
                    ? 'Analyzing...' 
                    : (insights.length === 0 
                        ? 'Generate AI Insights' 
                        : 'Refresh Insights'
                      )
                  }
              </Button>
              <p className="text-sm text-muted-foreground">
                  {insights.length === 0 
                    ? `Analyze ${totalFiles} document${totalFiles === 1 ? '' : 's'} for strategic insights`
                    : `Based on ${totalDocuments || totalFiles} document${(totalDocuments || totalFiles) === 1 ? '' : 's'} in your library`
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
            <div className="w-16 h-16 bg-gradient-to-br from-accent/20 to-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lightbulb className="h-8 w-8 text-accent" />
            </div>
            <DialogTitle className="text-2xl font-bold break-words">
              {selectedInsight?.title}
            </DialogTitle>
            <div className="flex items-center justify-center space-x-4 text-sm text-muted-foreground mt-2 flex-wrap">
              <div className="flex items-center">
                <Zap className="h-4 w-4 mr-1" />
                <span>{selectedInsight?.confidence}% confidence</span>
              </div>
              <Badge className={`border ${selectedInsight ? getImpactColor(selectedInsight.impact) : ''}`}>
                {selectedInsight?.impact} Impact
              </Badge>
              <Badge variant="secondary" className="truncate max-w-32">
                {selectedInsight?.category}
              </Badge>
            </div>
          </DialogHeader>
          
          <div className="flex-1 min-h-0 overflow-hidden">
            <ScrollArea className="h-[60vh] pr-4">
              <div className="space-y-6 pr-2 pb-10">
                {/* Description */}
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-wide">
                    Insight Details
                  </h3>
                  <div className="bg-muted/20 rounded-lg p-6 border border-muted/30">
                    <p className="text-sm leading-relaxed break-words text-foreground" style={{lineHeight: '1.7'}}>
                      {selectedInsight?.description}
                    </p>
                  </div>
                </div>

                {/* Implications */}
                {selectedInsight?.implications && selectedInsight.implications.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-wide">
                      Key Implications
                    </h3>
                    <div className="space-y-3">
                      {selectedInsight.implications.map((implication, index) => (
                        <div key={index} className="bg-muted/20 rounded-lg p-4 border border-muted/30">
                          <div className="flex items-start">
                            <Target className="h-4 w-4 mr-3 text-accent flex-shrink-0 mt-0.5" />
                            <p className="text-sm break-words leading-relaxed text-foreground">
                              {implication}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recommendations */}
                {selectedInsight?.recommendations && selectedInsight.recommendations.length > 0 && (
                  <div className="pb-6">
                    <h3 className="text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-wide">
                      Actionable Recommendations
                    </h3>
                    <div className="space-y-3">
                      {selectedInsight.recommendations.map((recommendation, index) => (
                        <div key={index} className="bg-accent/5 rounded-lg p-4 border border-accent/20">
                          <div className="flex items-start">
                            <Sparkles className="h-4 w-4 mr-3 text-accent flex-shrink-0 mt-0.5" />
                            <p className="text-sm break-words leading-relaxed text-foreground font-medium">
                              {recommendation}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Source Info */}
                <div className="pb-4">
                  <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
                    Analysis Source
                  </h3>
                  <div className="bg-muted/10 rounded-lg p-4 border border-muted/30">
                    <div className="flex items-center">
                      <Brain className="h-4 w-4 mr-2 text-accent" />
                      <span className="text-sm text-foreground font-medium">
                        {selectedInsight?.source}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </ScrollArea>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between items-center pt-4 border-t flex-shrink-0">
            <div className="flex items-center text-xs text-muted-foreground">
              <span>AI-generated strategic insight</span>
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

export default AIInsights;
