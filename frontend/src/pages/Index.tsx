import { Header } from "@/components/layout/Header";
import { DocumentSidebar } from "@/components/layout/DocumentSidebar";
import { ActiveReader } from "@/components/layout/ActiveReader";
import { GridBackground } from "@/components/ui/grid-background";
import { InitialSetup } from "@/components/InitialSetup";
import { PDFChatbot } from "@/components/ui/pdf-chatbot";
import { useDocuments } from "@/contexts/DocumentContext";

const Index = () => {
  const { isInitialSetupComplete, completeInitialSetup } = useDocuments();

  const handleSetupComplete = (files: any[]) => {
    console.log('=== INITIAL SETUP COMPLETE ===');
    console.log('Files received from InitialSetup:', files);
    
    // Convert the files to DocumentFile format
    const documentFiles = files.map(file => {
      console.log('Processing file for DocumentContext:', file.name);
      console.log('- ID:', file.id);
      console.log('- Content length:', file.content?.length || 0);
      console.log('- Pages:', file.pages);
      console.log('- SavedPath:', file.savedPath);
      
      return {
        id: file.id,
        name: file.name,
        size: file.size,
        type: file.type,
        folderName: file.folderName,
        savedPath: file.savedPath,
        timestamp: file.timestamp,
        content: file.content, // ✅ Make sure content is passed
        pages: file.pages,     // ✅ Make sure pages is passed
        lastRead: file.lastRead, // ✅ Make sure lastRead is passed
      };
    });
    
    console.log('Final documentFiles for context:', documentFiles);
    completeInitialSetup(documentFiles);
  };

  // Show initial setup if not completed
  if (!isInitialSetupComplete) {
    return <InitialSetup onSetupComplete={handleSetupComplete} />;
  }

  return (
    <GridBackground>
      <div className="min-h-screen w-full flex flex-col">
        {/* Header - Always visible */}
        <Header />
        
        {/* Mobile & Tablet Layout */}
        <div className="lg:hidden flex-1">
          {/* Mobile: Active Reader - Full space */}
          <div className="flex-1 p-3">
            <ActiveReader />
          </div>
        </div>

        {/* Desktop Layout */}
        <div className="hidden lg:flex flex-1 p-6 gap-6 overflow-hidden">
          {/* Left Sidebar - Document Library */}
          <div className="w-80 flex-shrink-0 overflow-hidden">
            <div className="h-full bg-card rounded-lg border border-border overflow-hidden">
              <DocumentSidebar />
            </div>
          </div>
          
          {/* Main Content Area */}
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            {/* Active Reader */}
            <div className="flex-1 overflow-hidden">
              <ActiveReader />
            </div>
          </div>
        </div>
        
        {/* Footer - Fixed at Bottom */}
        <div className="border-t border-border bg-card/50 backdrop-blur-sm w-full mt-auto">
          <div className="w-full px-3 sm:px-4 lg:px-6 h-10 flex items-center justify-center">
            <div className="text-center text-muted-foreground text-xs">
              Smart Document Analyzer • AI-Powered Reading Assistant
            </div>
          </div>
        </div>
        
        {/* PDF Chatbot - Floating at bottom right */}
        <PDFChatbot />
      </div>
    </GridBackground>
  );
};

export default Index;
