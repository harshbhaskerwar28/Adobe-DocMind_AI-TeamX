import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GridBackground } from "@/components/ui/grid-background";
import { ArrowLeft, Lightbulb, Zap, Brain, Target, Sparkles, RefreshCw } from "lucide-react";
import { Link } from "react-router-dom";

const insights = [
  { 
    title: "Cross-Domain Applications", 
    description: "Attention mechanisms show promising results in computer vision tasks, extending beyond their original NLP applications. This suggests broader applicability across AI domains.",
    confidence: 92,
    category: "Pattern Recognition",
    impact: "High",
    source: "Multiple documents analysis"
  },
  { 
    title: "Computational Efficiency", 
    description: "Linear attention variants significantly reduce computational complexity from O(n²) to O(n), making large-scale applications more feasible.",
    confidence: 85,
    category: "Performance",
    impact: "Critical",
    source: "Technical analysis"
  },
  { 
    title: "Interpretability Benefits", 
    description: "Attention weights provide valuable model interpretability, allowing researchers to understand which parts of the input the model considers important.",
    confidence: 78,
    category: "Explainability",
    impact: "Medium",
    source: "Research synthesis"
  },
  { 
    title: "Transfer Learning Potential", 
    description: "Pre-trained attention-based models demonstrate excellent transfer learning capabilities across related tasks and domains.",
    confidence: 88,
    category: "Generalization",
    impact: "High",
    source: "Empirical evidence"
  },
  { 
    title: "Scaling Laws Discovery", 
    description: "Larger attention-based models follow predictable scaling laws, suggesting optimal resource allocation strategies for training.",
    confidence: 91,
    category: "Architecture",
    impact: "Strategic",
    source: "Scaling analysis"
  },
  { 
    title: "Multimodal Integration", 
    description: "Attention mechanisms excel at integrating information across different modalities (text, image, audio), enabling more sophisticated AI systems.",
    confidence: 83,
    category: "Integration",
    impact: "High",
    source: "Multimodal research"
  }
];

const getImpactColor = (impact: string) => {
  switch (impact) {
    case "Critical": return "bg-red-100 text-red-800 border-red-200";
    case "High": return "bg-orange-100 text-orange-800 border-orange-200";
    case "Strategic": return "bg-purple-100 text-purple-800 border-purple-200";
    case "Medium": return "bg-blue-100 text-blue-800 border-blue-200";
    default: return "bg-gray-100 text-gray-800 border-gray-200";
  }
};

const AIInsights = () => {
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
              <div className="w-16 h-16 bg-gradient-to-br from-accent/20 to-accent/10 rounded-full flex items-center justify-center">
                <Lightbulb className="h-8 w-8 text-accent" />
              </div>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-4">
              AI Insights
            </h1>
            <p className="text-sm sm:text-lg lg:text-xl text-muted-foreground max-w-2xl mx-auto px-4">
              AI-powered analysis and insights generated from your document collection to reveal hidden patterns and opportunities.
            </p>
          </div>

          {/* Insights Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Insights</CardTitle>
                <Brain className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{insights.length}</div>
                <p className="text-xs text-muted-foreground">Generated insights</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Confidence</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {Math.round(insights.reduce((acc, item) => acc + item.confidence, 0) / insights.length)}%
                </div>
                <p className="text-xs text-muted-foreground">High reliability</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">High Impact</CardTitle>
                <Zap className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {insights.filter(insight => insight.impact === "High" || insight.impact === "Critical").length}
                </div>
                <p className="text-xs text-muted-foreground">Strategic insights</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Categories</CardTitle>
                <Sparkles className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {new Set(insights.map(item => item.category)).size}
                </div>
                <p className="text-xs text-muted-foreground">Diverse areas</p>
              </CardContent>
            </Card>
          </div>

          {/* Insights Grid */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
            {insights.map((insight, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow group">
                <CardHeader>
                  <div className="flex items-center justify-between mb-3">
                    <Badge variant="secondary" className="text-xs">
                      {insight.category}
                    </Badge>
                    <div className="flex items-center space-x-2">
                      <Badge className={`text-xs border ${getImpactColor(insight.impact)}`}>
                        {insight.impact}
                      </Badge>
                      <div className="flex items-center space-x-1">
                        <Zap className="h-3 w-3 text-accent" />
                        <span className="text-xs font-bold text-accent">{insight.confidence}%</span>
                      </div>
                    </div>
                  </div>
                  <CardTitle className="text-lg group-hover:text-accent transition-colors">
                    {insight.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4 text-sm leading-relaxed">
                    {insight.description}
                  </p>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center">
                      <Brain className="h-3 w-3 mr-1" />
                      <span>AI Generated</span>
                    </div>
                    <span>{insight.source}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Generate More Insights */}
          <div className="mt-8 text-center">
            <div className="space-y-4">
              <Button size="lg" className="bg-accent hover:bg-accent/90">
                <RefreshCw className="h-4 w-4 mr-2" />
                Generate New Insights
              </Button>
              <p className="text-sm text-muted-foreground">
                Last analysis: Just now • Based on {insights.length} document patterns
              </p>
            </div>
          </div>

          {/* Insight Categories */}
          <div className="mt-12">
            <h3 className="text-xl font-semibold text-foreground mb-6">Insight Categories</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Array.from(new Set(insights.map(item => item.category))).map((category, index) => {
                const categoryCount = insights.filter(item => item.category === category).length;
                return (
                  <Card key={index} className="text-center p-4 hover:bg-accent/5 transition-colors cursor-pointer">
                    <div className="text-lg font-bold text-foreground">{categoryCount}</div>
                    <div className="text-sm text-muted-foreground">{category}</div>
                  </Card>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </GridBackground>
  );
};

export default AIInsights;
