import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GridBackground } from "@/components/ui/grid-background";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Play, Clock, Download, Heart, Headphones, Share, Star, ArrowLeft } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

const podcasts = [
  {
    id: 1,
    title: "AI in Education: The Future of Learning",
    description: "Exploring how artificial intelligence is transforming educational experiences and making learning more personalized.",
    duration: "45 min",
    category: "Education Tech",
    publishedAt: "2 days ago",
    image: "/placeholder.svg"
  },
  {
    id: 2,
    title: "Deep Learning Fundamentals",
    description: "A comprehensive guide to understanding neural networks and their applications in modern technology.",
    duration: "38 min",
    category: "Machine Learning",
    publishedAt: "1 week ago",
    image: "/placeholder.svg"
  },
  {
    id: 3,
    title: "Digital Transformation in Academia",
    description: "How universities and schools are adapting to digital tools and remote learning technologies.",
    duration: "52 min",
    category: "Digital Education",
    publishedAt: "2 weeks ago",
    image: "/placeholder.svg"
  }
];

const Podcast = () => {
  const [selectedPodcast, setSelectedPodcast] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handlePodcastClick = (podcast) => {
    setSelectedPodcast(podcast);
    setIsDialogOpen(true);
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
        
        <div className="w-full px-4 py-4 lg:container lg:mx-auto lg:px-8 lg:py-8">
          {/* Page Header */}
          <div className="text-center mb-8 sm:mb-12">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-4">
              DocMind AI Podcasts
            </h1>
            <p className="text-sm sm:text-lg lg:text-xl text-muted-foreground max-w-2xl mx-auto px-4">
              Discover the latest insights in AI, education, and technology through our expert-curated podcast series.
            </p>
          </div>

          {/* Featured Podcast */}
          <Card 
            className="mb-8 bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20 cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => handlePodcastClick(podcasts[0])}
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <Badge className="bg-primary text-primary-foreground">Featured</Badge>
                <div className="flex items-center space-x-2 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>45 min</span>
                </div>
              </div>
              <CardTitle className="text-2xl">AI in Education: The Future of Learning</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Join our experts as they discuss the revolutionary impact of artificial intelligence on modern education systems.
              </p>
              <div className="flex items-center space-x-4">
                <Button size="lg" className="bg-primary hover:bg-primary/90" onClick={(e) => {e.stopPropagation(); handlePodcastClick(podcasts[0]);}}>
                  <Play className="h-4 w-4 mr-2" />
                  Play Now
                </Button>
                <Button variant="outline" onClick={(e) => e.stopPropagation()}>
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
                <Button variant="ghost" size="icon" onClick={(e) => e.stopPropagation()}>
                  <Heart className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Podcast List */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {podcasts.map((podcast) => (
              <Card 
                key={podcast.id} 
                className="hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => handlePodcastClick(podcast)}
              >
                <CardHeader>
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="secondary">{podcast.category}</Badge>
                    <div className="flex items-center space-x-1 text-muted-foreground text-sm">
                      <Clock className="h-3 w-3" />
                      <span>{podcast.duration}</span>
                    </div>
                  </div>
                  <CardTitle className="text-lg">{podcast.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">{podcast.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{podcast.publishedAt}</span>
                    <div className="flex items-center space-x-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={(e) => {e.stopPropagation(); handlePodcastClick(podcast);}}
                      >
                        <Play className="h-3 w-3 mr-1" />
                        Play
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
      
      {/* Podcast Player Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md mx-auto bg-card border border-border">
          <DialogHeader className="text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Headphones className="h-10 w-10 text-primary" />
            </div>
            <DialogTitle className="text-xl font-bold">
              {selectedPodcast?.title}
            </DialogTitle>
            <div className="flex items-center justify-center space-x-4 text-sm text-muted-foreground mt-2">
              <div className="flex items-center">
                <Clock className="h-4 w-4 mr-1" />
                <span>{selectedPodcast?.duration}</span>
              </div>
              <Badge variant="secondary">{selectedPodcast?.category}</Badge>
            </div>
          </DialogHeader>
          
          <div className="space-y-6">
            <p className="text-muted-foreground text-center">
              {selectedPodcast?.description}
            </p>
            
            {/* Player Controls */}
            <div className="bg-muted/30 rounded-lg p-4 space-y-4">
              <div className="flex items-center justify-center space-x-4">
                <Button size="lg" className="bg-primary hover:bg-primary/90">
                  <Play className="h-5 w-5 mr-2" />
                  Play Now
                </Button>
              </div>
              
              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="h-2 bg-muted rounded-full">
                  <div className="h-2 bg-primary rounded-full w-1/3"></div>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>0:00</span>
                  <span>{selectedPodcast?.duration}</span>
                </div>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="grid grid-cols-3 gap-3">
              <Button variant="outline" className="flex flex-col items-center space-y-1 h-auto py-3">
                <Download className="h-4 w-4" />
                <span className="text-xs">Download</span>
              </Button>
              <Button variant="outline" className="flex flex-col items-center space-y-1 h-auto py-3">
                <Share className="h-4 w-4" />
                <span className="text-xs">Share</span>
              </Button>
              <Button variant="outline" className="flex flex-col items-center space-y-1 h-auto py-3">
                <Star className="h-4 w-4" />
                <span className="text-xs">Favorite</span>
              </Button>
            </div>
            
            <div className="text-center text-xs text-muted-foreground">
              Published {selectedPodcast?.publishedAt}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </GridBackground>
  );
};

export default Podcast;
