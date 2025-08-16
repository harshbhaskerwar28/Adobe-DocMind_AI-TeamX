import { ZoomIn, ZoomOut, RotateCw, Download, Share, BookmarkPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { SparklesCore } from "@/components/ui/sparkles";

export function ActiveReader() {
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
      <div className="relative z-10 p-3 border-b border-border bg-card/80 backdrop-blur-sm">
        {/* Mobile Layout */}
        <div className="lg:hidden">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-semibold text-foreground truncate flex-1">Neural Networks.pdf</h3>
            <div className="flex items-center space-x-1">
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <BookmarkPlus className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <Share className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1">
              <Button variant="outline" size="sm" className="px-2 py-1">
                <ZoomOut className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" className="px-2 py-1">
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" className="px-2 py-1">
                <RotateCw className="h-4 w-4" />
              </Button>
            </div>
            <div className="text-sm text-muted-foreground">15/45</div>
          </div>
        </div>

        {/* Desktop Layout */}
        <div className="hidden lg:block">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-3 flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-foreground truncate">Neural Networks.pdf</h3>
              <Badge variant="secondary" className="text-xs">Chapter 3: Attention Mechanisms</Badge>
            </div>
            <div className="flex items-center space-x-2 flex-shrink-0">
              <Button variant="ghost" size="icon">
                <BookmarkPlus className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon">
                <Share className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon">
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm">
                <ZoomOut className="h-4 w-4 mr-1" />
                75%
              </Button>
              <Button variant="outline" size="sm">
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm">
                <RotateCw className="h-4 w-4" />
              </Button>
            </div>
            <div className="text-sm text-muted-foreground">Page 15 of 45</div>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <ScrollArea className="flex-1 relative z-10">
        <div className="p-4 lg:p-8">
          <div className="bg-background/95 backdrop-blur-sm rounded-lg p-4 lg:p-8 shadow-lg border border-border/50">
            {/* Simulated PDF Content */}
            <div className="space-y-4 lg:space-y-6">
              <h2 className="text-xl lg:text-2xl font-bold text-foreground mb-3 lg:mb-4">
                3.2 Attention Mechanisms in Neural Networks
              </h2>
              
              <p className="text-sm lg:text-base text-foreground leading-relaxed">
                Attention mechanisms have revolutionized the field of deep learning by allowing models to 
                <span className="bg-primary/20 px-1 rounded text-primary font-medium cursor-pointer hover:bg-primary/30 transition-colors">
                  selectively focus on relevant parts of the input sequence
                </span>
                . This selective focus mimics human cognitive attention and has proven particularly effective 
                in sequence-to-sequence tasks.
              </p>

              <div className="bg-muted/50 p-4 rounded-lg border-l-4 border-primary">
                <h4 className="font-semibold text-foreground mb-2">Key Insight</h4>
                <p className="text-muted-foreground">
                  <span className="bg-accent/20 px-1 rounded text-accent font-medium cursor-pointer hover:bg-accent/30 transition-colors">
                    Attention mechanisms improve model performance by learning weighted representations
                  </span>
                  of input elements, allowing the model to focus on the most relevant information for each output step.
                </p>
              </div>

              <h3 className="text-xl font-semibold text-foreground mt-6 mb-3">
                Mathematical Foundation
              </h3>

              <p className="text-foreground leading-relaxed">
                The attention mechanism can be formulated as a function that maps a query and a set of 
                key-value pairs to an output. The output is computed as a weighted sum of the values, 
                where the weight assigned to each value is computed by a compatibility function of the 
                query with the corresponding key.
              </p>

              <div className="bg-card/50 p-6 rounded-lg border border-border my-6">
                <div className="font-mono text-center text-lg text-foreground">
                  Attention(Q, K, V) = softmax(QK<sup>T</sup>/√d<sub>k</sub>)V
                </div>
              </div>

              <p className="text-foreground leading-relaxed">
                Where Q represents queries, K represents keys, V represents values, and d<sub>k</sub> is 
                the dimension of the key vectors. The 
                <span className="bg-primary/20 px-1 rounded text-primary font-medium cursor-pointer hover:bg-primary/30 transition-colors">
                  scaling factor √d<sub>k</sub> prevents the softmax function from having extremely small gradients
                </span>
                for large values of d<sub>k</sub>.
              </p>

              <h3 className="text-xl font-semibold text-foreground mt-6 mb-3">
                Applications and Impact
              </h3>

              <ul className="space-y-2 text-foreground">
                <li className="flex items-start">
                  <span className="text-primary mr-2">•</span>
                  Machine Translation: Enabling models to align source and target language words
                </li>
                <li className="flex items-start">
                  <span className="text-primary mr-2">•</span>
                  Text Summarization: Focusing on the most important sentences and phrases
                </li>
                <li className="flex items-start">
                  <span className="text-primary mr-2">•</span>
                  <span className="bg-accent/20 px-1 rounded text-accent font-medium cursor-pointer hover:bg-accent/30 transition-colors">
                    Image Captioning: Attending to relevant regions of an image when generating descriptions
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}