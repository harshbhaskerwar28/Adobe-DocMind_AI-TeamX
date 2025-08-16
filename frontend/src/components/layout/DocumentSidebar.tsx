import { FileText, Network, ChevronRight, Star, Clock, BookOpen, Upload, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { GlowingEffect } from "@/components/ui/glowing-effect";

const documents = [
  { name: "Neural Networks.pdf", pages: 45, lastRead: "2 hours ago", starred: true },
  { name: "Deep Learning.pdf", pages: 120, lastRead: "1 day ago", starred: false },
  { name: "Transformers.pdf", pages: 32, lastRead: "3 days ago", starred: true },
  { name: "Computer Vision.pdf", pages: 87, lastRead: "1 week ago", starred: false },
  { name: "Natural Language Processing.pdf", pages: 156, lastRead: "2 weeks ago", starred: false },
  { name: "Reinforcement Learning.pdf", pages: 203, lastRead: "1 month ago", starred: true },
];

export function DocumentSidebar() {
  return (
    <div className="w-full h-full flex flex-col">
      {/* Header */}
      <div className="p-3 sm:p-4 lg:p-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-foreground flex items-center">
            <BookOpen className="h-5 w-5 mr-2 text-primary" />
            Document Library
          </h2>
          <Badge variant="secondary" className="text-xs ml-2 px-2 py-1">
            {documents.length} docs
          </Badge>
        </div>
        <div className="space-y-3">
          <Button className="w-full bg-gradient-primary hover:bg-gradient-primary/90 text-primary-foreground text-xs sm:text-sm" size="sm">
            <Upload className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Upload Document</span>
            <span className="sm:hidden">Upload</span>
          </Button>
          <div className="flex space-x-1 sm:space-x-2">
            <Button variant="outline" size="sm" className="flex-1 text-xs sm:text-sm px-2 sm:px-3">
              Recent
            </Button>
            <Button variant="ghost" size="sm" className="flex-1 text-xs sm:text-sm px-2 sm:px-3">
              Starred
            </Button>
          </div>
        </div>
      </div>

      {/* Document List */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {documents.map((doc, index) => (
            <div key={index} className="relative group">
              <div className="relative rounded-lg border border-transparent hover:border-primary/20 transition-all duration-200">
                <GlowingEffect
                  blur={1}
                  borderWidth={1}
                  spread={60}
                  glow={true}
                  proximity={40}
                  inactiveZone={0.02}
                />
                <div className="relative p-3 rounded-lg bg-card/50 hover:bg-card/80 transition-all cursor-pointer">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3 flex-1">
                      <FileText className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <p className="text-sm font-medium text-foreground truncate">
                            {doc.name}
                          </p>
                          {doc.starred && (
                            <Star className="h-3 w-3 text-yellow-500 fill-current flex-shrink-0" />
                          )}
                        </div>
                        <div className="flex items-center space-x-3 mt-1">
                          <p className="text-xs text-muted-foreground">
                            {doc.pages} pages
                          </p>
                          <div className="flex items-center space-x-1">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            <p className="text-xs text-muted-foreground">
                              {doc.lastRead}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Knowledge Graph Button */}
      <div className="p-4 border-t border-border">
        <Button variant="outline" className="w-full justify-start" size="sm">
          <Network className="h-4 w-4 mr-2 text-primary" />
          Knowledge Graph View
        </Button>
      </div>
    </div>
  );
}