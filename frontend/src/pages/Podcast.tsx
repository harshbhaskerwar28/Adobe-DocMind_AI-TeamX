import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GridBackground } from "@/components/ui/grid-background";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PodcastPopup } from "@/components/ui/podcast-popup";
import { Play, Clock, Download, Heart, Headphones, Share, Star, ArrowLeft, RefreshCw, Eye, Loader2, FileText } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useDocuments } from "@/contexts/DocumentContext";
import { aiApi } from "@/utils/aiApi";
import { useNotifications } from "@/hooks/use-notifications";

interface PodcastRecommendation {
  title: string;
  description: string;
  duration: string;
  category: string;
  script: string;
  key_topics: string[];
  target_audience: string;
}

interface PodcastDisplay extends PodcastRecommendation {
  id: number;
  publishedAt: string;
  image: string;
}

const Podcast = () => {
  // Load recommendations from localStorage on init
  const [aiRecommendations, setAiRecommendations] = useState<PodcastRecommendation[]>(() => {
    try {
      const saved = localStorage.getItem('aiPodcastRecommendations');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [selectedPodcast, setSelectedPodcast] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [scriptViewOpen, setScriptViewOpen] = useState(false);
  const [selectedScript, setSelectedScript] = useState<any>(null);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Audio player state for existing podcast dialog
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isGeneratingTTS, setIsGeneratingTTS] = useState(false);
  const [ttsAudioUrl, setTtsAudioUrl] = useState<string | null>(null);
  const [ttsError, setTtsError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  
  // TTS Popup state for hardcoded podcast
  const [ttsPodcastOpen, setTtsPodcastOpen] = useState(false);
  const [ttsSelectedText, setTtsSelectedText] = useState<string>('');
  
  // Recent TTS podcast state - load from localStorage
  const [recentTTSPodcast, setRecentTTSPodcast] = useState<any>(() => {
    try {
      const saved = localStorage.getItem('recentTTSPodcast');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  
  // Track document list changes to clear stale data
  const [lastDocumentState, setLastDocumentState] = useState<string>('');
  
  const { currentFiles, previousFiles } = useDocuments();
  const { showError, showSuccess } = useNotifications();

  // Hardcoded featured podcast (don't touch this)
  const featuredPodcast = {
    id: 1,
    title: "Getting Started with Document Analysis",
    description: "An introduction to AI-powered document analysis and how to make the most of your research workflow.",
    duration: "15 min",
    category: "Tutorial",
    publishedAt: "2024-01-15",
    image: "/placeholder.svg",
    script: `Welcome to DocMind AI Podcasts! I'm excited to help you get started with intelligent document analysis.

Today, we'll explore how AI can transform your research and learning experience. Whether you're a student working on assignments, a researcher analyzing papers, or a professional reviewing documents, AI-powered analysis can help you discover insights you might have missed.

We'll cover three key areas:

First, semantic similarity - how AI can find connections between different documents and ideas, even when they don't use the same exact words.

Second, cross-document analysis - identifying patterns, contradictions, and trends across your entire document collection.

Third, intelligent summarization - getting the key points from complex documents in seconds, not hours.

Upload your first PDF document to begin your journey with AI-powered insights. The system will automatically analyze it and help you discover connections you never knew existed.

Ready to transform how you work with documents? Let's get started!`,
    key_topics: ["AI Analysis", "Document Management", "Research Workflow"],
    target_audience: "New Users"
  };

  const totalFiles = currentFiles.length + previousFiles.length;

  // Create a unique identifier for current document state
  const documentStateId = [
    ...currentFiles.map(f => f.id),
    ...previousFiles.map(f => f.id)
  ].sort().join(',');

  // Save recommendations to localStorage whenever they change
  useEffect(() => {
    if (aiRecommendations.length > 0) {
      localStorage.setItem('aiPodcastRecommendations', JSON.stringify(aiRecommendations));
      localStorage.setItem('aiPodcastRecommendations_state', documentStateId);
    }
  }, [aiRecommendations, documentStateId]);

  // Save recent TTS podcast to localStorage whenever it changes
  useEffect(() => {
    if (recentTTSPodcast) {
      localStorage.setItem('recentTTSPodcast', JSON.stringify(recentTTSPodcast));
    }
  }, [recentTTSPodcast]);

  // Clear recommendations when no files are present OR when document list changes
  useEffect(() => {
    if (totalFiles === 0) {
      console.log('🎙️ Clearing podcast recommendations: No documents');
      setAiRecommendations([]);
      localStorage.removeItem('aiPodcastRecommendations');
      localStorage.removeItem('aiPodcastRecommendations_state');
      // Also clear recent TTS podcast when no documents
      setRecentTTSPodcast(null);
      localStorage.removeItem('recentTTSPodcast');
      setLastDocumentState('');
    } else if (lastDocumentState && documentStateId !== lastDocumentState) {
      console.log('🎙️ Clearing podcast recommendations: Document list changed');
      console.log('Previous state:', lastDocumentState);
      console.log('Current state:', documentStateId);
      setAiRecommendations([]);
      localStorage.removeItem('aiPodcastRecommendations');
      localStorage.removeItem('aiPodcastRecommendations_state');
      // Clear recent TTS podcast when document list changes
      setRecentTTSPodcast(null);
      localStorage.removeItem('recentTTSPodcast');
    }
    setLastDocumentState(documentStateId);
  }, [totalFiles, documentStateId, lastDocumentState]);

  // Audio event listeners for real audio playback
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => {
      setCurrentTime(audio.currentTime);
      setProgress(audio.duration > 0 ? (audio.currentTime / audio.duration) * 100 : 0);
    };

    const updateDuration = () => {
      setDuration(audio.duration);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      setProgress(0);
    };

    const handleError = () => {
      setTtsError("Failed to load audio. Please try again.");
      setIsPlaying(false);
    };

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
    };
  }, [ttsAudioUrl]);

  // Cleanup when dialog closes or component unmounts
  useEffect(() => {
    if (!isDialogOpen) {
      setIsPlaying(false);
      setCurrentTime(0);
      setProgress(0);
      setIsGeneratingTTS(false);
      setTtsAudioUrl(null);
      setTtsError(null);
      
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
    }
  }, [isDialogOpen]);

  // Load recommendations from localStorage only if document state matches
  useEffect(() => {
    if (totalFiles > 0 && aiRecommendations.length === 0) {
      try {
        const savedRecommendations = localStorage.getItem('aiPodcastRecommendations');
        const savedState = localStorage.getItem('aiPodcastRecommendations_state');
        
        if (savedRecommendations && savedState === documentStateId) {
          console.log('🎙️ Loading podcast recommendations: Document state matches');
          setAiRecommendations(JSON.parse(savedRecommendations));
        } else if (savedRecommendations && savedState !== documentStateId) {
          console.log('🎙️ Clearing stale podcast recommendations: Document state mismatch');
          localStorage.removeItem('aiPodcastRecommendations');
          localStorage.removeItem('aiPodcastRecommendations_state');
        }
      } catch (error) {
        console.error('Error loading podcast recommendations:', error);
        localStorage.removeItem('aiPodcastRecommendations');
        localStorage.removeItem('aiPodcastRecommendations_state');
      }
    }
  }, [totalFiles, documentStateId, aiRecommendations.length]);

  const loadAIRecommendations = async (isRefresh = false) => {
    if (totalFiles === 0) {
      setAiRecommendations([]);
      return;
    }

    try {
      if (isRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoadingAI(true);
      }

      console.log('🎙️ Loading AI podcast recommendations...');
      const response = await aiApi.generatePodcastRecommendations();
      
      if (response && response.recommendations) {
        setAiRecommendations(response.recommendations);
        
        if (isRefresh) {
          showSuccess(`Refreshed ${response.recommendations.length} AI podcast recommendations`);
        } else {
          showSuccess(`Generated ${response.recommendations.length} AI podcast recommendations`);
        }
      }
    } catch (error) {
      console.error('Failed to load AI recommendations:', error);
      showError("Failed to generate AI recommendations. Please try again.");
    } finally {
      setIsLoadingAI(false);
      setIsRefreshing(false);
    }
  };

  // No automatic loading - only load when user clicks refresh

  const handlePlayPodcast = (podcast: any) => {
    setSelectedPodcast(podcast);
    setIsDialogOpen(true);
    // Reset all audio state when opening new podcast
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setProgress(0);
    setIsGeneratingTTS(false);
    setTtsAudioUrl(null);
    setTtsError(null);
    
    // Reset audio element
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  };

  const generateTTSPodcast = async () => {
    if (!selectedPodcast) return;
    
    setIsGeneratingTTS(true);
    setTtsError(null);

    try {
      // Prepare podcast content as context for TTS generation
      const podcastContent = `Title: ${selectedPodcast.title}

Description: ${selectedPodcast.description}

Full Script:
${selectedPodcast.script}`;

      console.log('🎙️ Generating TTS for podcast:', selectedPodcast.title);
      const response = await aiApi.generateTTSPodcast(podcastContent);
      
      console.log('🎙️ TTS generated successfully:', response);
      setTtsAudioUrl(`http://localhost:8000${response.audio_url}`);
      setDuration(response.duration_seconds);
      
      showSuccess(`Podcast audio generated successfully! (${response.duration_seconds}s)`);
      
    } catch (error: any) {
      console.error('🎙️ TTS generation failed:', error);
      setTtsError(error.message || "Failed to generate podcast audio. Please try again.");
      showError("Failed to generate podcast audio. Please try again.");
    } finally {
      setIsGeneratingTTS(false);
    }
  };

  const togglePlayPause = async () => {
    // If no TTS audio exists yet, generate it first
    if (!ttsAudioUrl && !isGeneratingTTS) {
      await generateTTSPodcast();
      return;
    }

    // If still generating, do nothing
    if (isGeneratingTTS) {
      return;
    }

    // If TTS exists, play/pause the actual audio
    if (ttsAudioUrl && audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  const parseDuration = (durationStr: string): number => {
    // Convert "15 min" to seconds
    const minutes = parseInt(durationStr.replace(/\D/g, '')) || 15;
    return minutes * 60;
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleViewScript = (podcast: any) => {
    setSelectedScript(podcast);
    setScriptViewOpen(true);
  };

  const handlePlayTTSPodcast = (podcast: any) => {
    // Use the podcast script as the selected text for TTS generation
    const podcastContent = `Title: ${podcast.title}

Description: ${podcast.description}

Full Script:
${podcast.script}`;
    
    console.log('🎙️ Opening TTS Podcast for:', podcast.title);
    setTtsSelectedText(podcastContent);
    setTtsPodcastOpen(true);
  };

  const saveRecentTTSPodcast = (podcastData: any, originalPodcast: any) => {
    const recentPodcast = {
      ...originalPodcast,
      ttsAudioUrl: podcastData.audio_url,
      ttsDuration: podcastData.duration_seconds,
      ttsTitle: podcastData.title,
      generatedAt: new Date().toISOString(),
    };
    
    setRecentTTSPodcast(recentPodcast);
    localStorage.setItem('recentTTSPodcast', JSON.stringify(recentPodcast));
    console.log('🎙️ Saved recent TTS podcast:', recentPodcast);
  };

  const handleRefresh = () => {
    loadAIRecommendations(true);
  };

  const handleGenerate = () => {
    // For first-time generation, use loading state instead of refresh state
    loadAIRecommendations(false);
  };

  const handleButtonClick = () => {
    if (aiRecommendations.length === 0) {
      // First time generation
      handleGenerate();
    } else {
      // Refresh existing recommendations
      handleRefresh();
    }
  };

  // Enhanced markdown renderer for podcast scripts
  const renderMarkdown = (text: string) => {
    if (!text) return '';
    
    let formatted = text;
    
    // Handle bold text (**text** or __text__)
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    formatted = formatted.replace(/__(.*?)__/g, '<strong>$1</strong>');
    
    // Handle italic text (*text* or _text_)
    formatted = formatted.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    formatted = formatted.replace(/_([^_]+)_/g, '<em>$1</em>');
    
    // Handle code (`code`)
    formatted = formatted.replace(/`([^`]+)`/g, '<code>$1</code>');
    
    // Split into paragraphs first
    const paragraphs = formatted.split(/\n\s*\n/);
    
    const processedParagraphs = paragraphs.map(paragraph => {
      if (!paragraph.trim()) return '';
      
      // Handle single line breaks within paragraphs
      const processedParagraph = paragraph.replace(/\n/g, '<br/>');
      
      return `<p>${processedParagraph}</p>`;
    });
    
    return processedParagraphs.join('');
  };

  return (
    <GridBackground>
      <div className="min-h-screen w-full">
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
        
        <div className="w-full px-4 py-4 lg:container lg:mx-auto lg:px-8 lg:py-8 pb-6">
          {/* Page Header */}
          <div className="text-center mb-8 sm:mb-12">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-4">
              DocMind AI Podcasts
            </h1>
            <p className="text-sm sm:text-lg lg:text-xl text-muted-foreground max-w-2xl mx-auto px-4">
              Discover the latest insights in AI, education, and technology through our expert-curated podcast series.
            </p>
          </div>

          {/* Featured Podcast - Shows Recent TTS or Blurred Default */}
          <div className="mb-8 relative">
            {!recentTTSPodcast && (
              <div className="absolute inset-0 bg-background/60 backdrop-blur-sm z-10 rounded-lg flex items-center justify-center">
                <div className="text-center p-6">
                  <div className="text-muted-foreground mb-2 font-medium">No Recent AI Podcast</div>
                  <div className="text-sm text-muted-foreground mb-3">Generate a podcast to see it here</div>
                  <Button 
                    size="sm" 
                    className="bg-primary hover:bg-primary/90"
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePlayTTSPodcast(featuredPodcast);
                    }}
                  >
                    <Play className="h-3 w-3 mr-2" />
                    Generate First Podcast
                  </Button>
                </div>
              </div>
            )}
          <Card 
              className={`bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20 cursor-pointer hover:shadow-lg transition-shadow ${!recentTTSPodcast ? 'opacity-40' : ''}`}
              onClick={() => recentTTSPodcast ? handlePlayTTSPodcast(recentTTSPodcast) : handlePlayTTSPodcast(featuredPodcast)}
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <Badge className="bg-primary text-primary-foreground">✨ AI Recommended</Badge>
                {recentTTSPodcast && (
                  <Badge variant="secondary" className="text-xs bg-green-500/20 text-green-400">
                    🎙️ AI Generated
                  </Badge>
                )}
                </div>
              <CardTitle className="text-2xl">
                {recentTTSPodcast ? recentTTSPodcast.ttsTitle || recentTTSPodcast.title : featuredPodcast.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                {recentTTSPodcast ? recentTTSPodcast.description : featuredPodcast.description}
              </p>
              <div className="flex items-center space-x-2 mb-4">
                <Badge variant="outline" className="text-xs">
                  {recentTTSPodcast ? recentTTSPodcast.target_audience : featuredPodcast.target_audience}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {recentTTSPodcast ? recentTTSPodcast.category : featuredPodcast.category}
                </Badge>
                {recentTTSPodcast && recentTTSPodcast.ttsDuration && (
                  <Badge variant="secondary" className="text-xs bg-blue-500/20 text-blue-400">
                    🎵 {Math.floor(recentTTSPodcast.ttsDuration / 60)}:{(recentTTSPodcast.ttsDuration % 60).toString().padStart(2, '0')}
                  </Badge>
                )}
              </div>
              <div className="flex items-center space-x-4">
                <Button 
                  size="lg" 
                  className="bg-primary hover:bg-primary/90" 
                  onClick={(e) => {
                    e.stopPropagation(); 
                    if (recentTTSPodcast) {
                      handlePlayTTSPodcast(recentTTSPodcast);
                    } else {
                      handlePlayTTSPodcast(featuredPodcast);
                    }
                  }}
                  disabled={!recentTTSPodcast}
                >
                  <Play className="h-4 w-4 mr-2" />
                  {recentTTSPodcast ? 'Play Audio' : 'Generate & Play'}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={(e) => {e.stopPropagation(); handleViewScript(recentTTSPodcast || featuredPodcast);}}
                  disabled={!recentTTSPodcast}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  View Script
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={(e) => e.stopPropagation()}
                  disabled={!recentTTSPodcast}
                >
                  <Heart className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
          </div>

          {/* AI-Generated Recommendations Section */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">AI-Powered Recommendations</h2>
            
            {/* No Files Message */}
            {totalFiles === 0 && (
              <div className="text-center py-12 border-2 border-dashed border-muted-foreground/20 rounded-lg">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground text-lg mb-2">Upload files to get AI recommended podcasts</p>
                <p className="text-sm text-muted-foreground">Your personalized podcast recommendations will appear here</p>
              </div>
            )}

            {/* Loading State */}
            {totalFiles > 0 && (isLoadingAI || isRefreshing) && (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                <p className="text-muted-foreground">
                  {isLoadingAI 
                    ? "Generating AI podcast recommendations based on your documents..." 
                    : "Refreshing podcast recommendations..."
                  }
                </p>
              </div>
            )}

            {/* AI Recommendations Grid */}
            {totalFiles > 0 && !isLoadingAI && !isRefreshing && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {aiRecommendations.length > 0 ? (
                  aiRecommendations.map((podcast, index) => (
              <Card 
                       key={index} 
                       className="h-96 flex flex-col hover:shadow-lg transition-shadow cursor-pointer group overflow-hidden"
                       onClick={() => handlePlayPodcast({...podcast, id: index + 10, publishedAt: "AI Generated"})}
                     >
                       <CardHeader className="flex-shrink-0 p-4">
                  <div className="flex items-center justify-between mb-2">
                           <Badge 
                             variant="secondary" 
                             className="text-xs max-w-24 truncate flex-shrink-0"
                             title={podcast.category}
                           >
                             {podcast.category.length > 12 ? `${podcast.category.substring(0, 12)}...` : podcast.category}
                           </Badge>
                           <div className="flex items-center space-x-1 text-muted-foreground text-sm flex-shrink-0">
                             <Clock className="h-3 w-3 flex-shrink-0" />
                             <span className="text-xs whitespace-nowrap">{podcast.duration}</span>
                    </div>
                  </div>
                         <CardTitle className="text-lg leading-tight line-clamp-2 min-h-[3.5rem] break-words">{podcast.title}</CardTitle>
                </CardHeader>
                       <CardContent className="flex-1 flex flex-col p-4 pt-0 overflow-hidden">
                         <p className="text-muted-foreground mb-4 text-sm line-clamp-4 flex-1 break-words overflow-hidden">{podcast.description}</p>
                         <div className="flex flex-wrap gap-1 mb-4 min-h-[2rem] items-start overflow-hidden">
                           {podcast.key_topics.slice(0, 3).map((topic, topicIndex) => (
                             <Badge 
                               key={topicIndex} 
                               variant="outline" 
                               className="text-xs max-w-16 truncate flex-shrink-0"
                               title={topic}
                             >
                               {topic.length > 8 ? `${topic.substring(0, 8)}...` : topic}
                             </Badge>
                           ))}
                         </div>
                         <div className="flex items-center justify-between mt-auto flex-shrink-0">
                           <span className="text-xs text-muted-foreground truncate flex-shrink-0">AI Generated</span>
                           <div className="flex items-center space-x-1 flex-shrink-0">
                             <Button 
                               size="sm" 
                               variant="ghost"
                               className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                               onClick={(e) => {e.stopPropagation(); handleViewScript({...podcast, id: index + 10, publishedAt: "AI Generated"});}}
                               title="View Script"
                             >
                               <Eye className="h-3 w-3" />
                             </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                               className="h-7 text-xs px-2 flex-shrink-0"
                               onClick={(e) => {e.stopPropagation(); handlePlayPodcast({...podcast, id: index + 10, publishedAt: "AI Generated"});}}
                      >
                        <Play className="h-3 w-3 mr-1" />
                        Play
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
                  ))
                ) : (
                  <div className="col-span-full text-center py-8">
                    <p className="text-muted-foreground">No AI recommendations yet. Upload more documents for better suggestions.</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Action Button */}
          {totalFiles > 0 && (
            <div className="text-center">
              <Button 
                size="lg" 
                className="bg-primary hover:bg-primary/90"
                onClick={handleButtonClick}
                disabled={isRefreshing || isLoadingAI}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${(isRefreshing || isLoadingAI) ? 'animate-spin' : ''}`} />
                {(isRefreshing || isLoadingAI)
                  ? 'Generating...' 
                  : (aiRecommendations.length === 0 
                      ? 'Generate AI Podcasts' 
                      : 'Refresh Podcasts'
                    )
                }
              </Button>
              <p className="text-sm text-muted-foreground mt-2">
                {aiRecommendations.length === 0 
                  ? `Generate personalized podcasts from your ${totalFiles} document${totalFiles === 1 ? '' : 's'}`
                  : `Based on ${totalFiles} document${totalFiles === 1 ? '' : 's'} in your library`
                }
              </p>
          </div>
          )}
        </div>
      </div>
      
      {/* Podcast Player Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md max-w-[90vw] max-h-[84vh] mx-auto bg-card border border-border">
          <ScrollArea className="max-h-[80vh] overflow-y-auto">
            <div className="px-6 py-4">
          <DialogHeader className="text-center pb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full flex items-center justify-center mx-auto mb-3">
              <Headphones className="h-8 w-8 text-primary" />
            </div>
            <DialogTitle className="text-lg font-bold">
              {selectedPodcast?.title}
            </DialogTitle>
            <div className="flex items-center justify-center mt-2">
              <Badge variant="secondary" className="text-xs">{selectedPodcast?.category}</Badge>
            </div>
          </DialogHeader>
          
          <div className="space-y-4">
            <p className="text-muted-foreground text-center text-sm">
              {selectedPodcast?.description}
            </p>

            {/* Hidden Audio Element */}
            {ttsAudioUrl && (
              <audio 
                ref={audioRef} 
                src={ttsAudioUrl}
                preload="metadata"
                style={{ display: 'none' }}
              />
            )}

            {/* TTS Generation Loading State */}
            {isGeneratingTTS && (
              <div className="bg-muted/30 rounded-lg p-4 text-center space-y-2">
                <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" />
                <div className="space-y-1">
                  <p className="text-sm font-medium">Generating AI Podcast Audio...</p>
                  <p className="text-xs text-muted-foreground">
                    Creating conversation between Sarah & Mike
                  </p>
                  <p className="text-xs text-muted-foreground">
                    🎙️ Female (coral) + Male (onyx) voices
                  </p>
                </div>
              </div>
            )}

            {/* TTS Error State */}
            {ttsError && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-center">
                <p className="text-red-400 text-xs">{ttsError}</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-2 text-xs h-7"
                  onClick={() => {
                    setTtsError(null);
                    generateTTSPodcast();
                  }}
                >
                  Try Again
                </Button>
              </div>
            )}
            
            {/* Player Controls */}
            <div className="bg-muted/30 rounded-lg p-3 space-y-3">
              <div className="flex items-center justify-center">
                <Button 
                  size="default" 
                  className="bg-primary hover:bg-primary/90"
                  onClick={togglePlayPause}
                  disabled={isGeneratingTTS}
                >
                                    {isGeneratingTTS ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : isPlaying ? (
                    <>
                      <svg className="h-4 w-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
                      </svg>
                      Pause
                    </>
                  ) : ttsAudioUrl ? (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      Play Audio
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      Generate & Play
                    </>
                  )}
                </Button>
              </div>
              
              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="h-2 bg-muted rounded-full">
                  <div 
                    className="h-2 bg-primary rounded-full transition-all duration-300" 
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{formatTime(currentTime)}</span>
                  <span>
                    {duration > 0 ? formatTime(duration) : 
                     ttsAudioUrl ? "Loading..." : 
                     selectedPodcast?.duration}
                  </span>
                </div>
                {!ttsAudioUrl && !isGeneratingTTS && (
                  <p className="text-[10px] text-muted-foreground text-center mt-1">
                    Click "Generate & Play" to create audio
                  </p>
                )}
              </div>
            </div>
            
            <div className="text-center text-xs text-muted-foreground">
              <div className="text-[10px]">Published {selectedPodcast?.publishedAt}</div>
              {ttsAudioUrl && (
                <div className="text-green-600 dark:text-green-400 text-[10px] mt-1">
                  🎙️ Audio Ready • Sarah & Mike
                </div>
              )}
              {!ttsAudioUrl && !isGeneratingTTS && (
                <div className="text-amber-600 dark:text-amber-400 text-[10px] mt-1">
                  📝 Script available • Generate audio
                </div>
              )}
            </div>
          </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

             {/* Script View Dialog */}
       <Dialog open={scriptViewOpen} onOpenChange={setScriptViewOpen}>
         <DialogContent className="max-w-4xl w-full max-h-[90vh] bg-card border border-border overflow-hidden">
           <DialogHeader className="text-center pb-4 border-b flex-shrink-0">
             <div className="w-16 h-16 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full flex items-center justify-center mx-auto mb-4">
               <FileText className="h-8 w-8 text-primary" />
             </div>
             <DialogTitle className="text-2xl font-bold break-words">
               {selectedScript?.title}
             </DialogTitle>
             <div className="flex items-center justify-center space-x-4 text-sm text-muted-foreground mt-2 flex-wrap">
               <div className="flex items-center">
                 <Clock className="h-4 w-4 mr-1" />
                 <span>{selectedScript?.duration}</span>
               </div>
               <Badge variant="secondary" className="truncate max-w-32">{selectedScript?.category}</Badge>
               <Badge variant="outline" className="text-xs truncate max-w-32">{selectedScript?.target_audience}</Badge>
             </div>
           </DialogHeader>
           
           <div className="flex-1 min-h-0 overflow-hidden">
             <ScrollArea className="h-[60vh] pr-4">
               <div className="space-y-6 pr-2 pb-4">
                 {/* Key Topics */}
                 <div>
                   <h3 className="text-sm font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
                     Key Topics Covered
                   </h3>
                   <div className="flex flex-wrap gap-2 overflow-hidden">
                     {selectedScript?.key_topics?.map((topic: string, index: number) => (
                       <Badge 
                         key={index} 
                         variant="outline" 
                         className="text-xs max-w-32 truncate flex-shrink-0"
                         title={topic}
                       >
                         {topic.length > 20 ? `${topic.substring(0, 20)}...` : topic}
                       </Badge>
                     ))}
                   </div>
                 </div>

                 {/* Script Content */}
                 <div>
                   <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
                     Full Podcast Script
                   </h3>
                   <div className="bg-muted/20 rounded-lg p-6 pb-8 overflow-hidden">
                     <div 
                       className="text-sm leading-relaxed break-words overflow-wrap-anywhere prose prose-sm max-w-none"
                       style={{
                         lineHeight: '1.7',
                       }}
                       dangerouslySetInnerHTML={{ 
                         __html: renderMarkdown(selectedScript?.script || '') 
                       }}
                     />
                </div>
              </div>
               </div>
             </ScrollArea>
            </div>
            
            {/* Action Buttons */}
           <div className="flex justify-between items-center pt-4 border-t flex-shrink-0">
             <div className="flex items-center text-xs text-muted-foreground">
               <span>AI-generated script • Ready to record</span>
             </div>
             <div className="flex space-x-3">
               <Button variant="outline" onClick={() => setScriptViewOpen(false)}>
                 Close
              </Button>
               <Button 
                 onClick={() => {
                   setScriptViewOpen(false);
                   if (selectedScript) {
                     handlePlayPodcast(selectedScript);
                   }
                 }}
               >
                 <Play className="h-4 w-4 mr-2" />
                 Play Podcast
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* TTS Podcast Popup for hardcoded podcast */}
      <PodcastPopup
        isVisible={ttsPodcastOpen}
        onClose={() => setTtsPodcastOpen(false)}
        selectedText={ttsSelectedText}
        onPodcastGenerated={(podcastData) => {
          // Save the generated podcast as recent TTS podcast
          const currentPodcast = recentTTSPodcast || featuredPodcast;
          saveRecentTTSPodcast(podcastData, currentPodcast);
        }}
      />
    </GridBackground>
  );
};

export default Podcast;
