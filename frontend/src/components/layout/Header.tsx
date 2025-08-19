import { Headphones, Link as LinkIcon, Lightbulb } from "lucide-react";
import { CompactTextHoverEffect } from "@/components/ui/compact-text-hover-effect";
import { Button } from "@/components/ui/button";
import { HoverBorderGradient } from "@/components/ui/hover-border-gradient";
import { MobileMenu } from "./MobileMenu";
import { Link } from "react-router-dom";

export function Header() {
  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50 w-full">
      <div className="w-full px-3 sm:px-4 lg:px-6 h-12 flex items-center justify-between">
        {/* Logo - Mobile First */}
        <div className="flex items-center space-x-3 flex-shrink-0">
          <div className="lg:hidden">
            <MobileMenu />
          </div>
          <Link to="/" className="flex-shrink-0">
            <div className="w-fit cursor-pointer">
              <CompactTextHoverEffect text="DocMind AI" duration={0.1} />
            </div>
          </Link>
        </div>

        {/* Navigation - Mobile Optimized */}
        <nav className="flex items-center space-x-2 flex-shrink-0">
          <Link to="/podcast">
            <HoverBorderGradient className="flex px-3 py-1 text-xs font-medium cursor-pointer">
              <Headphones className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline text-sm">Podcast</span>
            </HoverBorderGradient>
          </Link>
          
          <Link to="/similar-ideas">
            <HoverBorderGradient className="flex px-3 py-1 text-xs font-medium cursor-pointer">
              <LinkIcon className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline text-sm">Similar Ideas</span>
            </HoverBorderGradient>
          </Link>
          
          <Link to="/ai-insights">
            <HoverBorderGradient className="flex px-3 py-1 text-xs font-medium cursor-pointer">
              <Lightbulb className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline text-sm">AI Insights</span>
            </HoverBorderGradient>
          </Link>
        </nav>
      </div>
    </header>
  );
}