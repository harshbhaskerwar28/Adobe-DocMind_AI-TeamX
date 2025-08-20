import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Lightbulb, Mic, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { SimilarityResultsPopup } from "@/components/ui/similarity-results-popup";
import { AIInsightsPopup } from "@/components/ui/ai-insights-popup";
import { PodcastPopup } from "@/components/ui/podcast-popup";

interface TextSelectionPopupProps {
  selectedText: string;
  isVisible: boolean;
  position: { x: number; y: number };
  onClose: () => void;
  onSimilar: (text: string) => void;
  onAIInsights: (text: string) => void;
  onPodcast: (text: string) => void;
}

export function TextSelectionPopup({
  selectedText,
  isVisible,
  position,
  onClose,
  onSimilar,
  onAIInsights,
  onPodcast,
}: TextSelectionPopupProps) {
  const popupRef = useRef<HTMLDivElement>(null);
  
  // State for new popup components
  const [showSimilarityResults, setShowSimilarityResults] = useState(false);
  const [showAIInsights, setShowAIInsights] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    if (isVisible) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isVisible, onClose]);

  if (!isVisible || !selectedText.trim()) return null;

  const truncatedText = selectedText.length > 100 
    ? selectedText.substring(0, 100) + "..."
    : selectedText;

  return (
    <div
      ref={popupRef}
      className={cn(
        "fixed z-50 animate-in fade-in-0 zoom-in-95 duration-200",
        "transition-all ease-out"
      )}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: "translate(-50%, -100%)",
      }}
    >
      <Card className="shadow-2xl border-border/50 bg-background/95 backdrop-blur-sm max-w-sm sm:max-w-md">
        <CardContent className="p-4">
          {/* Header with selected text */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1 mr-2">
              <Badge variant="secondary" className="mb-2 text-xs">
                Selected Text
              </Badge>
              <p className="text-sm text-foreground/80 leading-relaxed line-clamp-3">
                "{truncatedText}"
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 hover:bg-destructive/10 hover:text-destructive"
              onClick={onClose}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex items-center justify-center gap-2 h-10 border-border/50 hover:bg-transparent hover:text-foreground hover:border-blue-400/60 hover:shadow-[0_0_0_1px_rgba(59,130,246,0.3)] dark:hover:border-blue-500/60 dark:hover:shadow-[0_0_0_1px_rgba(59,130,246,0.2)] transition-all duration-200 ease-out"
              onClick={() => {
                onSimilar(selectedText);
                onClose();
              }}
            >
              <Sparkles className="h-4 w-4" />
              <span className="text-xs font-medium">Similar</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="flex items-center justify-center gap-2 h-10 border-border/50 hover:bg-transparent hover:text-foreground hover:border-blue-400/60 hover:shadow-[0_0_0_1px_rgba(59,130,246,0.3)] dark:hover:border-blue-500/60 dark:hover:shadow-[0_0_0_1px_rgba(59,130,246,0.2)] transition-all duration-200 ease-out"
              onClick={() => {
                onAIInsights(selectedText);
                onClose();
              }}
            >
              <Lightbulb className="h-4 w-4" />
              <span className="text-xs font-medium">AI Insights</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="flex items-center justify-center gap-2 h-10 border-border/50 hover:bg-transparent hover:text-foreground hover:border-blue-400/60 hover:shadow-[0_0_0_1px_rgba(59,130,246,0.3)] dark:hover:border-blue-500/60 dark:hover:shadow-[0_0_0_1px_rgba(59,130,246,0.2)] transition-all duration-200 ease-out"
              onClick={() => {
                onPodcast(selectedText);
                onClose();
              }}
            >
              <Mic className="h-4 w-4" />
              <span className="text-xs font-medium">Podcast</span>
            </Button>
          </div>

          {/* Mobile: Stack buttons vertically on very small screens */}
          <div className="sm:hidden mt-2">
            <div className="text-xs text-muted-foreground text-center">
              Tap any button to proceed with "{selectedText.substring(0, 20)}..."
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Arrow pointing down to selected text */}
      <div className="absolute left-1/2 top-full transform -translate-x-1/2">
        <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-l-transparent border-r-transparent border-t-border"></div>
        <div className="w-0 h-0 border-l-[5px] border-r-[5px] border-t-[5px] border-l-transparent border-r-transparent border-t-background absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-px"></div>
      </div>
    </div>
  );
}

// Enhanced component that includes AI popup functionality
export function TextSelectionPopupWithAI({
  selectedText,
  isVisible,
  position,
  onClose,
  onSimilar,
  onAIInsights,
  onPodcast,
}: TextSelectionPopupProps) {
  const [showSimilarityResults, setShowSimilarityResults] = useState(false);
  const [showAIInsightsPopup, setShowAIInsightsPopup] = useState(false);
  const [showPodcastPopup, setShowPodcastPopup] = useState(false);
  const [capturedText, setCapturedText] = useState<string>("");

  // Capture the selected text when the popup becomes visible
  useEffect(() => {
    if (isVisible && selectedText && selectedText.trim()) {
      console.log("📝 Capturing selected text:", selectedText);
      setCapturedText(selectedText);
    }
  }, [isVisible, selectedText]);

  // Handle similarity search
  const handleSimilarClick = (text: string) => {
    const textToUse = text || capturedText || selectedText;
    console.log("🔍 Opening similarity search for:", textToUse);
    console.log("🔍 Selected text length:", textToUse.length);
    console.log("🔍 Selected text preview:", textToUse.substring(0, 100));
    setShowSimilarityResults(true);
    onSimilar(textToUse); // Also call the original handler
  };

  // Handle AI insights
  const handleAIInsightsClick = (text: string) => {
    const textToUse = text || capturedText || selectedText;
    console.log("🧠 Opening AI insights for:", textToUse);
    console.log("🧠 Selected text length:", textToUse.length);
    console.log("🧠 Selected text preview:", textToUse.substring(0, 100));
    setShowAIInsightsPopup(true);
    onAIInsights(textToUse); // Also call the original handler
  };

  // Handle podcast generation
  const handlePodcastClick = (text: string) => {
    const textToUse = text || capturedText || selectedText;
    console.log("🎙️ Opening podcast for:", textToUse);
    console.log("🎙️ Selected text length:", textToUse.length);
    console.log("🎙️ Selected text preview:", textToUse.substring(0, 100));
    setShowPodcastPopup(true);
    onPodcast(textToUse); // Also call the original handler
  };

  return (
    <>
      <TextSelectionPopup
        selectedText={selectedText}
        isVisible={isVisible}
        position={position}
        onClose={onClose}
        onSimilar={handleSimilarClick}
        onAIInsights={handleAIInsightsClick}
        onPodcast={handlePodcastClick}
      />
      
      {/* AI-Powered Popup Components */}
      <SimilarityResultsPopup
        selectedText={capturedText || selectedText}
        isVisible={showSimilarityResults}
        onClose={() => {
          console.log("🔍 Closing similarity results popup");
          setShowSimilarityResults(false);
        }}
      />
      
      <AIInsightsPopup
        selectedText={capturedText || selectedText}
        isVisible={showAIInsightsPopup}
        onClose={() => {
          console.log("🧠 Closing AI insights popup");
          setShowAIInsightsPopup(false);
        }}
      />

      <PodcastPopup
        selectedText={capturedText || selectedText}
        isVisible={showPodcastPopup}
        onClose={() => {
          console.log("🎙️ Closing podcast popup");
          setShowPodcastPopup(false);
        }}
      />
    </>
  );
}
