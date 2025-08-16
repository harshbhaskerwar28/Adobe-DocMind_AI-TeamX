import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GridBackground } from "@/components/ui/grid-background";
import { ArrowLeft, Link as LinkIcon, TrendingUp, FileText, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";

const similarIdeas = [
  { 
    title: "Transformer Architecture", 
    similarity: 94, 
    source: "Attention Is All You Need",
    description: "The Transformer architecture revolutionized natural language processing by relying entirely on attention mechanisms.",
    category: "Neural Networks"
  },
  { 
    title: "Self-Attention Patterns", 
    similarity: 89, 
    source: "Deep Learning.pdf",
    description: "Self-attention allows models to weigh different positions in a sequence when processing each element.",
    category: "Attention Mechanisms"
  },
  { 
    title: "Multi-Head Attention", 
    similarity: 87, 
    source: "Computer Vision.pdf",
    description: "Multi-head attention enables the model to attend to information from different representation subspaces.",
    category: "Deep Learning"
  },
  { 
    title: "Positional Encoding", 
    similarity: 82, 
    source: "Machine Learning Basics.pdf",
    description: "Positional encodings provide sequence order information to Transformer models.",
    category: "Embeddings"
  },
  { 
    title: "BERT Architecture", 
    similarity: 78, 
    source: "NLP Research.pdf",
    description: "BERT uses bidirectional training of Transformer, achieving state-of-the-art results on many NLP tasks.",
    category: "Language Models"
  },
  { 
    title: "Attention Visualization", 
    similarity: 75, 
    source: "AI Interpretability.pdf",
    description: "Attention weights can be visualized to understand what the model focuses on during processing.",
    category: "Interpretability"
  }
];

const SimilarIdeas = () => {
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
        
        <div className="w-full px-4 py-4 lg:container lg:mx-auto lg:px-8 lg:py-8">
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

          {/* Stats Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Connections</CardTitle>
                <LinkIcon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{similarIdeas.length}</div>
                <p className="text-xs text-muted-foreground">Found across {new Set(similarIdeas.map(item => item.source)).size} documents</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Average Similarity</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {Math.round(similarIdeas.reduce((acc, item) => acc + item.similarity, 0) / similarIdeas.length)}%
                </div>
                <p className="text-xs text-muted-foreground">High confidence matches</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Categories</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {new Set(similarIdeas.map(item => item.category)).size}
                </div>
                <p className="text-xs text-muted-foreground">Different topic areas</p>
              </CardContent>
            </Card>
          </div>

          {/* Similar Ideas List */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {similarIdeas.map((idea, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow cursor-pointer group">
                <CardHeader>
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="secondary">{idea.category}</Badge>
                    <div className="flex items-center space-x-1 text-muted-foreground text-sm">
                      <TrendingUp className="h-3 w-3" />
                      <span className="font-bold text-primary">{idea.similarity}%</span>
                    </div>
                  </div>
                  <CardTitle className="text-lg group-hover:text-primary transition-colors">
                    {idea.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4 text-sm leading-relaxed">
                    {idea.description}
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center text-xs text-muted-foreground">
                      <FileText className="h-3 w-3 mr-1" />
                      <span className="truncate">{idea.source}</span>
                    </div>
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Actions */}
          <div className="mt-8 text-center">
            <div className="space-y-4">
              <Button size="lg" className="bg-primary hover:bg-primary/90">
                <TrendingUp className="h-4 w-4 mr-2" />
                Refresh Connections
              </Button>
              <p className="text-sm text-muted-foreground">
                Last updated: Just now • Based on your current document library
              </p>
            </div>
          </div>
        </div>
      </div>
    </GridBackground>
  );
};

export default SimilarIdeas;
