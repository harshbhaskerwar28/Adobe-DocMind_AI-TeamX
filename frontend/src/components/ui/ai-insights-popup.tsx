import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { 
  Lightbulb, 
  Brain, 
  Zap, 
  Target,
  RefreshCw, 
  AlertCircle,
  CheckCircle,
  Clock,
  TrendingUp,
  ArrowRight,
  X,
  Copy,
  Sparkles,
  ExternalLink,
  BarChart3,
  Users,
  BookOpen,
  Star,
  Search,
  Eye,
  FileText
} from "lucide-react";
import { cn } from "@/lib/utils";
import { aiApi, AIInsight, aiApiHelpers } from "@/utils/aiApi";
import { useDocuments } from "@/contexts/DocumentContext";

interface AIInsightsPopupProps {
  selectedText: string;
  isVisible: boolean;
  onClose: () => void;
}

export function AIInsightsPopup({
  selectedText,
  isVisible,
  onClose,
}: AIInsightsPopupProps) {
  const [insights, setInsights] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysisTimestamp, setAnalysisTimestamp] = useState<string>("");
  const [expandedInsight, setExpandedInsight] = useState<number | null>(null);
  
  // New popup states
  const [showContextHighlighter, setShowContextHighlighter] = useState(false);
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

  // Generate insights when popup opens
  useEffect(() => {
    if (isVisible && selectedText.trim()) {
      console.log("🧠 AI Insights popup opened, analyzing:", selectedText);
      generateInsights();
    }
  }, [isVisible, selectedText]);

  const generateInsights = async () => {
    if (!selectedText.trim()) {
      console.log("🧠 ERROR: No selected text to analyze");
      return;
    }

    console.log("🧠 Starting AI insights generation...");
    console.log("🧠 Text to analyze:", selectedText);
    console.log("🧠 Text length:", selectedText.length);

    setIsLoading(true);
    setError(null);
    setInsights(null);

    try {
      console.log("🧠 Calling aiApi.generateAIInsights...");
      const response = await aiApi.generateAIInsights(selectedText);
      console.log("🧠 AI insights response:", response);
      setInsights(response.insights);
      setAnalysisTimestamp(response.analysis_timestamp);
    } catch (err) {
      console.error("🧠 AI insights error:", err);
      setError(err instanceof Error ? err.message : "Failed to generate AI insights");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyInsight = async (insight: AIInsight) => {
    const text = `${insight.title}\n\n${insight.description}\n\nEvidence: ${insight.evidence}\nConfidence: ${insight.confidence}%\nCategory: ${insight.category}`;
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.error("Failed to copy insight:", err);
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 85) return "text-green-600 dark:text-green-400";
    if (confidence >= 70) return "text-blue-600 dark:text-blue-400";
    if (confidence >= 50) return "text-orange-600 dark:text-orange-400";
    return "text-red-600 dark:text-red-400";
  };

  const getInsightIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'contradiction':
        return <Users className="h-5 w-5 text-red-500" />;
      case 'discovery':
        return <Star className="h-5 w-5 text-yellow-500" />;
      case 'pattern':
        return <BarChart3 className="h-5 w-5 text-blue-500" />;
      case 'opportunity':
        return <TrendingUp className="h-5 w-5 text-green-500" />;
      default:
        return <Lightbulb className="h-5 w-5 text-purple-500" />;
    }
  };

  // Debug logging
  console.log("🧠 AIInsightsPopup render - isVisible:", isVisible, "selectedText:", selectedText);

  if (!isVisible) return null;

  return (
    <>
      <Dialog open={isVisible} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] sm:max-w-4xl lg:max-w-6xl max-h-[95vh] p-0 bg-gradient-to-br from-background via-background/95 to-purple-500/5 overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0 p-4 sm:p-6 pb-3 sm:pb-4 border-b border-border/20 bg-gradient-to-r from-purple-500/5 to-transparent">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0 overflow-hidden">
              <DialogTitle className="text-lg sm:text-xl font-bold text-foreground mb-2 sm:mb-3 flex flex-col sm:flex-row items-start sm:items-center gap-2">
                <div className="flex items-center">
                  <Brain className="h-4 w-4 sm:h-5 sm:w-5 text-purple-500 mr-2 flex-shrink-0" />
                  <span className="truncate">AI-Powered Insights</span>
                </div>
                <Badge variant="outline" className="text-xs self-start sm:self-auto">
                  Powered by Gemini 2.5 Pro
                </Badge>
              </DialogTitle>
              <div className="bg-muted/50 rounded-lg p-3 border border-border/30 overflow-hidden">
                <p className="text-xs sm:text-sm text-muted-foreground mb-1">Analyzing:</p>
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
            <div className="pt-3 sm:pt-4 pb-20 sm:pb-24 space-y-4 sm:space-y-6">
              {/* Loading State */}
              {isLoading && (
                <div className="text-center py-12">
                  <Brain className="h-8 w-8 text-purple-500 animate-spin mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    AI is Thinking...
                  </h3>
                  <p className="text-muted-foreground">
                    Analyzing patterns, discovering connections, and generating insights from your document library
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
                    Analysis Failed
                  </h3>
                  <p className="text-muted-foreground mb-4 max-w-md mx-auto">
                    {error}
                  </p>
                  <Button onClick={generateInsights} variant="outline">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Try Again
                  </Button>
                </div>
              )}

              {/* Results */}
              {!isLoading && !error && insights && (
                <div className="space-y-6">
                  {/* Summary */}
                  <Card className="bg-gradient-to-br from-purple-500/5 to-purple-500/10 border-purple-500/20">
                    <CardHeader>
                      <CardTitle className="flex items-center text-purple-700 dark:text-purple-300">
                        <Sparkles className="h-5 w-5 mr-2" />
                        Executive Summary
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-foreground leading-relaxed">
                        {insights.summary}
                      </p>
                    </CardContent>
                  </Card>

                  {/* Stats Overview */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                    <Card className="bg-gradient-to-br from-blue-500/5 to-blue-500/10 border-blue-500/20 overflow-hidden">
                      <CardContent className="p-3 sm:p-4">
                        <div className="flex items-center justify-between">
                          <div className="min-w-0">
                            <p className="text-xs sm:text-sm text-blue-600 dark:text-blue-400 font-medium truncate">Total Insights</p>
                            <p className="text-xl sm:text-2xl font-bold text-blue-700 dark:text-blue-300">
                              {insights.insights?.length || 0}
                            </p>
                          </div>
                          <Lightbulb className="h-6 w-6 sm:h-8 sm:w-8 text-blue-500 flex-shrink-0" />
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-green-500/5 to-green-500/10 border-green-500/20 overflow-hidden">
                      <CardContent className="p-3 sm:p-4">
                        <div className="flex items-center justify-between">
                          <div className="min-w-0">
                            <p className="text-xs sm:text-sm text-green-600 dark:text-green-400 font-medium truncate">Avg Confidence</p>
                            <p className="text-xl sm:text-2xl font-bold text-green-700 dark:text-green-300">
                              {insights.insights ? 
                                Math.round(insights.insights.reduce((acc: number, insight: AIInsight) => acc + insight.confidence, 0) / insights.insights.length) 
                                : 0}%
                            </p>
                          </div>
                          <Target className="h-6 w-6 sm:h-8 sm:w-8 text-green-500 flex-shrink-0" />
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-orange-500/5 to-orange-500/10 border-orange-500/20 overflow-hidden">
                      <CardContent className="p-3 sm:p-4">
                        <div className="flex items-center justify-between">
                          <div className="min-w-0">
                            <p className="text-xs sm:text-sm text-orange-600 dark:text-orange-400 font-medium truncate">High Impact</p>
                            <p className="text-xl sm:text-2xl font-bold text-orange-700 dark:text-orange-300">
                              {insights.insights ? 
                                insights.insights.filter((insight: AIInsight) => insight.impact === "High").length 
                                : 0}
                            </p>
                          </div>
                          <Zap className="h-6 w-6 sm:h-8 sm:w-8 text-orange-500 flex-shrink-0" />
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-purple-500/5 to-purple-500/10 border-purple-500/20 overflow-hidden">
                      <CardContent className="p-3 sm:p-4">
                        <div className="flex items-center justify-between">
                          <div className="min-w-0">
                            <p className="text-xs sm:text-sm text-purple-600 dark:text-purple-400 font-medium truncate">Categories</p>
                            <p className="text-xl sm:text-2xl font-bold text-purple-700 dark:text-purple-300">
                              {insights.insights ? 
                                new Set(insights.insights.map((insight: AIInsight) => insight.category)).size 
                                : 0}
                            </p>
                          </div>
                          <BookOpen className="h-6 w-6 sm:h-8 sm:w-8 text-purple-500 flex-shrink-0" />
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Timestamp */}
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Clock className="h-4 w-4 mr-2" />
                    <span>Analysis completed: {aiApiHelpers.formatTimestamp(analysisTimestamp)}</span>
                  </div>

                  {/* Individual Insights */}
                  {insights.insights && insights.insights.length > 0 && (
                    <>
                      <h3 className="text-sm sm:text-lg font-semibold text-foreground flex items-center">
                        <Brain className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-purple-500" />
                        Detailed Insights
                      </h3>
                      
                      <div className="space-y-3 sm:space-y-4 pb-12">
                        {insights.insights.map((insight: AIInsight, index: number) => (
                          <Card 
                            key={index} 
                            className={cn(
                              "hover:shadow-lg transition-all duration-200 cursor-pointer group border-border/50 overflow-hidden",
                              expandedInsight === index && "ring-2 ring-purple-500/20"
                            )}
                            onClick={() => setExpandedInsight(
                              expandedInsight === index ? null : index
                            )}
                          >
                            <CardHeader className="pb-2 sm:pb-3 p-3 sm:p-4">
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0 overflow-hidden">
                                  <div className="flex flex-wrap items-center gap-2 mb-2">
                                    {getInsightIcon(insight.type)}
                                    <Badge variant="secondary" className="text-xs flex-shrink-0">
                                      {aiApiHelpers.getInsightTypeIcon(insight.type)} {insight.type}
                                    </Badge>
                                    <Badge 
                                      className={cn(
                                        "text-xs border flex-shrink-0",
                                        aiApiHelpers.getImpactColor(insight.impact)
                                      )}
                                    >
                                      {insight.impact}
                                    </Badge>
                                    <Badge variant="outline" className="text-xs flex-shrink-0">
                                      {insight.category}
                                    </Badge>
                                  </div>
                                  <CardTitle className="text-sm sm:text-lg group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors leading-tight">
                                    {insight.title}
                                  </CardTitle>
                                </div>
                                <div className="flex items-center space-x-2 flex-shrink-0">
                                  <div className={cn(
                                    "text-xs sm:text-sm font-semibold",
                                    getConfidenceColor(insight.confidence)
                                  )}>
                                    {insight.confidence}%
                                  </div>
                                  <Progress 
                                    value={insight.confidence} 
                                    className="w-12 sm:w-16 h-2"
                                  />
                                </div>
                              </div>
                            </CardHeader>

                            <CardContent className="pt-0 p-3 sm:p-4 overflow-hidden">
                              <p className="text-muted-foreground text-xs sm:text-sm leading-relaxed mb-3 break-words">
                                {insight.description}
                              </p>

                              {expandedInsight === index && (
                                <div className="space-y-3 overflow-hidden">
                                  <Separator />
                                  
                                  {/* Evidence */}
                                  <div className="bg-muted/30 rounded-lg p-3 sm:p-4 border border-border/30 overflow-hidden">
                                    <h4 className="text-xs sm:text-sm font-semibold text-foreground mb-2 flex items-center">
                                      <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 mr-2 text-green-500 flex-shrink-0" />
                                      <span className="truncate">Supporting Evidence</span>
                                    </h4>
                                    <div className={cn(
                                      "max-h-32 overflow-y-auto scrollbar-thin",
                                      "scrollbar-track-transparent scrollbar-thumb-muted-foreground/30",
                                      "hover:scrollbar-thumb-muted-foreground/50 scrollbar-thumb-rounded-md"
                                    )}>
                                      <p className="text-xs sm:text-sm text-foreground leading-relaxed break-words pr-2">
                                        {insight.evidence}
                                      </p>
                                    </div>
                                  </div>

                                  {/* Actions */}
                                  <div className="flex flex-col sm:flex-row gap-2">
                                    <Button 
                                      variant="outline" 
                                      size="sm"
                                      className="flex-1 sm:flex-none h-8"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleCopyInsight(insight);
                                      }}
                                    >
                                      <Copy className="h-3 w-3 mr-1" />
                                      <span className="text-xs">Copy Insight</span>
                                    </Button>
                                                                         <Button 
                                       variant="outline" 
                                       size="sm"
                                       className="flex-1 sm:flex-none h-8"
                                       onClick={(e) => {
                                         e.stopPropagation();
                                         // Show highlighted text context for this insight in popup
                                         const context = insight.evidence || selectedText;
                                         const highlighted = highlightTextInContent(context, selectedText);
                                         console.log("🎯 Showing insight context highlighter for:", selectedText);
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

                  {/* Cross-Document Analysis */}
                  {insights.cross_document_analysis && (
                    <Card className="bg-gradient-to-br from-blue-500/5 to-blue-500/10 border-blue-500/20">
                      <CardHeader>
                        <CardTitle className="flex items-center text-blue-700 dark:text-blue-300">
                          <BarChart3 className="h-5 w-5 mr-2" />
                          Cross-Document Analysis
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {insights.cross_document_analysis.agreements?.length > 0 && (
                          <div>
                            <h4 className="text-sm font-semibold text-green-600 dark:text-green-400 mb-2 flex items-center">
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Agreements Across Documents
                            </h4>
                            <ul className="space-y-1">
                              {insights.cross_document_analysis.agreements.map((agreement: string, index: number) => (
                                <li key={index} className="text-sm text-foreground flex items-start">
                                  <ArrowRight className="h-3 w-3 mr-2 mt-0.5 text-green-500 flex-shrink-0" />
                                  {agreement}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {insights.cross_document_analysis.disagreements?.length > 0 && (
                          <div>
                            <h4 className="text-sm font-semibold text-red-600 dark:text-red-400 mb-2 flex items-center">
                              <AlertCircle className="h-4 w-4 mr-2" />
                              Disagreements & Contradictions
                            </h4>
                            <ul className="space-y-1">
                              {insights.cross_document_analysis.disagreements.map((disagreement: string, index: number) => (
                                <li key={index} className="text-sm text-foreground flex items-start">
                                  <ArrowRight className="h-3 w-3 mr-2 mt-0.5 text-red-500 flex-shrink-0" />
                                  {disagreement}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {insights.cross_document_analysis.evolution && (
                          <div>
                            <h4 className="text-sm font-semibold text-blue-600 dark:text-blue-400 mb-2 flex items-center">
                              <TrendingUp className="h-4 w-4 mr-2" />
                              Knowledge Evolution
                            </h4>
                            <p className="text-sm text-foreground leading-relaxed">
                              {insights.cross_document_analysis.evolution}
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {/* Actionable Recommendations */}
                  {insights.actionable_recommendations?.length > 0 && (
                    <Card className="bg-gradient-to-br from-green-500/5 to-green-500/10 border-green-500/20">
                      <CardHeader>
                        <CardTitle className="flex items-center text-green-700 dark:text-green-300">
                          <Target className="h-5 w-5 mr-2" />
                          Actionable Recommendations
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-2">
                          {insights.actionable_recommendations.map((recommendation: string, index: number) => (
                            <li key={index} className="text-sm text-foreground flex items-start">
                              <ArrowRight className="h-4 w-4 mr-2 mt-0.5 text-green-500 flex-shrink-0" />
                              {recommendation}
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Footer Actions */}
        {!isLoading && !error && insights && (
          <div className="flex-shrink-0 p-3 sm:p-6 border-t border-border/20 bg-gradient-to-r from-purple-500/5 to-transparent">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="text-xs sm:text-sm text-muted-foreground">
                Generated {insights.insights?.length || 0} insights with AI analysis
              </div>
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <Button variant="outline" onClick={generateInsights} size="sm" className="w-full sm:w-auto">
                  <RefreshCw className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                  <span className="text-xs sm:text-sm">Regenerate</span>
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

     {/* Context Highlighter Popup */}
     <Dialog open={showContextHighlighter} onOpenChange={setShowContextHighlighter}>
       <DialogContent className="max-w-[95vw] sm:max-w-3xl lg:max-w-5xl max-h-[95vh] p-0 bg-gradient-to-br from-background via-background/95 to-purple-500/5 overflow-hidden flex flex-col">
         <DialogHeader className="flex-shrink-0 px-3 sm:px-6 py-3 sm:py-4 border-b border-border/50 bg-background/80 backdrop-blur-sm">
           <div className="flex items-center justify-between">
             <div className="flex items-center space-x-2">
               <div className="p-1.5 sm:p-2 bg-purple-500/10 rounded-lg">
                 <Brain className="h-4 w-4 sm:h-5 sm:w-5 text-purple-500" />
               </div>
               <div className="min-w-0 flex-1">
                 <DialogTitle className="text-base sm:text-lg font-semibold text-foreground">
                   AI Insight Context
                 </DialogTitle>
                 <p className="text-xs sm:text-sm text-muted-foreground">
                   Highlighted content from AI analysis
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
             <div className="pt-3 sm:pt-4 pb-8 sm:pb-12">
               <div className="bg-muted/30 rounded-lg p-4 sm:p-6 border border-border/30">
                 <h3 className="text-sm sm:text-base font-semibold text-foreground mb-3 sm:mb-4 flex items-center">
                   <Brain className="h-4 w-4 mr-2 text-purple-500" />
                   AI Insight Context
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
                 <div className="bg-purple-500/10 rounded-lg p-3 sm:p-4 border border-purple-500/20">
                   <h4 className="text-xs sm:text-sm font-semibold text-purple-600 dark:text-purple-400 mb-2 flex items-center">
                     <Sparkles className="h-3 w-3 mr-2" />
                     AI Generated Context
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
