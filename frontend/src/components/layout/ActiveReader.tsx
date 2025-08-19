import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { SparklesCore } from "@/components/ui/sparkles";
import { TextSelectionPopupWithAI } from "@/components/ui/text-selection-popup";
import { useDocuments } from "@/contexts/DocumentContext";
import { useTextSelection } from "@/hooks/use-text-selection";
import { useRef } from "react";


export function ActiveReader() {
  const { selectedFile, isLoadingContent } = useDocuments();
  const contentRef = useRef<HTMLDivElement>(null);
  
  // Text selection functionality
  const {
    selectedText,
    isVisible: isSelectionPopupVisible,
    position: selectionPosition,
    clearSelection,
  } = useTextSelection({
    containerRef: contentRef,
    enabled: !!selectedFile?.content && !isLoadingContent,
    minSelectionLength: 3,
  });

  // Handler functions for the three action buttons
  const handleSimilarSearch = (text: string) => {
    // TODO: Implement similar content search functionality
    console.log("Similar search for:", text);
  };

  const handleAIInsights = (text: string) => {
    // TODO: Implement AI insights functionality
    console.log("AI insights for:", text);
  };

  const handlePodcastGeneration = (text: string) => {
    // TODO: Implement podcast generation functionality
    console.log("Podcast generation for:", text);
  };
  
  return (
    <div className="h-full bg-card rounded-lg border border-border flex flex-col relative overflow-hidden">
      {/* Background Effect */}
      <div className="absolute inset-0 z-0">
        <SparklesCore
          id="reader-sparkles"
          background="transparent"
          minSize={0.3}
          maxSize={0.8}
          particleDensity={30}
          className="w-full h-full"
          particleColor="hsl(var(--primary))"
        />
      </div>

      {/* Mobile-First Header */}
      <div className="relative z-10 flex-shrink-0 min-h-[80px] lg:min-h-[60px] p-3 border-b border-border bg-card/80 backdrop-blur-sm">
        {/* Mobile Layout */}
        <div className="lg:hidden">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-semibold text-foreground truncate flex-1">
              {selectedFile ? selectedFile.name : 'No Document Selected'}
            </h3>
          </div>
        </div>

        {/* Desktop Layout */}
        <div className="hidden lg:block">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-3 flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-foreground truncate">
                {selectedFile ? selectedFile.name : 'No Document Selected'}
              </h3>
            </div>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <ScrollArea className="flex-1 relative z-10">
        <div className="p-4 lg:p-8">
          <div className="bg-background/95 backdrop-blur-sm rounded-lg p-4 lg:p-8 shadow-lg border border-border/50">
            {selectedFile ? (
              /* PDF Content Display */
              <div className="space-y-4 lg:space-y-6">
                <div className="border-b border-border pb-4 mb-6">
                  <h2 className="text-xl lg:text-2xl font-bold text-foreground mb-2">
                    {selectedFile.name}
                  </h2>
                  <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                    <span>Size: {(selectedFile.size / 1024 / 1024).toFixed(2)} MB</span>
                    {selectedFile.pages && <span>Pages: {selectedFile.pages}</span>}
                    {selectedFile.lastRead && <span>Last read: {selectedFile.lastRead}</span>}
                  </div>
                </div>
                
                {selectedFile.content && !isLoadingContent ? (
                  /* Display extracted PDF content */
                  <ScrollArea className="h-[740px]">
                    <div 
                      ref={contentRef}
                      className="text-sm lg:text-base text-foreground leading-relaxed whitespace-pre-wrap pr-4 select-text cursor-text"
                      style={{ userSelect: 'text' }}
                    >
                      {selectedFile.content}
                    </div>
                  </ScrollArea>
                ) : (
                  /* PDF content loading/extraction placeholder */
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-muted-foreground mb-2">
                      {isLoadingContent ? 'Extracting PDF content...' : 'Loading PDF content...'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Processing: {selectedFile.name}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              /* No file selected state */
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                  <span className="text-2xl">📄</span>
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  No Document Selected
                </h3>
                <p className="text-muted-foreground mb-4 max-w-md">
                  Select a PDF from the sidebar to view its content here. Click the eye icon (👁️) next to any document to get started.
                </p>
                <div className="text-xs text-muted-foreground">
                  Upload PDFs using the sidebar to build your document library.
                </div>
              </div>
            )}
          </div>
        </div>
      </ScrollArea>

      {/* Text Selection Popup with AI Features */}
      <TextSelectionPopupWithAI
        selectedText={selectedText}
        isVisible={isSelectionPopupVisible}
        position={selectionPosition}
        onClose={clearSelection}
        onSimilar={handleSimilarSearch}
        onAIInsights={handleAIInsights}
        onPodcast={handlePodcastGeneration}
      />
      
      {/* Debug logging for selected text */}
      {isSelectionPopupVisible && (
        <div style={{ display: 'none' }}>
          {/* Debug info hidden */}
        </div>
      )}
    </div>
  );
}