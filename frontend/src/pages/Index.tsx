import { Header } from "@/components/layout/Header";
import { DocumentSidebar } from "@/components/layout/DocumentSidebar";
import { ActiveReader } from "@/components/layout/ActiveReader";
import { GridBackground } from "@/components/ui/grid-background";

const Index = () => {
  return (
    <GridBackground>
      <div className="min-h-screen w-full flex flex-col">
        {/* Header - Always visible */}
        <Header />
        
        {/* Main Content - Mobile First */}
        <div className="lg:hidden flex-1">
          {/* Mobile: Active Reader */}
          <div className="p-3">
            <ActiveReader />
          </div>
        </div>

        {/* Desktop Layout */}
        <div className="hidden lg:flex flex-1 p-6 gap-6">
          {/* Left Sidebar - Document Library */}
          <div className="w-80 flex-shrink-0">
            <div className="h-full bg-card rounded-lg border border-border">
              <DocumentSidebar />
            </div>
          </div>
          
          {/* Main Content Area */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Active Reader */}
            <div className="flex-1">
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
      </div>
    </GridBackground>
  );
};

export default Index;
