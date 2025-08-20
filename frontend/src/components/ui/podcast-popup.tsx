import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Loader2, Mic, Play, Pause, SkipBack, SkipForward, Volume2, Download, Clock, Users } from 'lucide-react';
import { aiApi } from '@/utils/aiApi';
import { cn } from '@/lib/utils';

interface PodcastPopupProps {
  isVisible: boolean;
  onClose: () => void;
  selectedText: string;
  onPodcastGenerated?: (podcastData: TTSPodcastResponse) => void;
}

interface TTSPodcastResponse {
  audio_url: string;
  title: string;
  duration_seconds: number;
  segments_count: number;
  generation_timestamp: string;
  file_size_mb: number;
}

export function PodcastPopup({ isVisible, onClose, selectedText, onPodcastGenerated }: PodcastPopupProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [podcastData, setPodcastData] = useState<TTSPodcastResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Audio player state
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);

  // Track which text has been processed to prevent duplicate API calls
  const [processedText, setProcessedText] = useState<string>('');

  // Reset state and clear processed text when new text is selected
  useEffect(() => {
    if (isVisible && selectedText && selectedText.trim().length > 0) {
      // If different text is selected, reset everything
      if (selectedText !== processedText) {
        console.log("🎙️ New text selected - ready for generation:", selectedText.substring(0, 50) + "...");
        setPodcastData(null);
        setError(null);
        setIsLoading(false);
        setIsPlaying(false);
        setCurrentTime(0);
        setDuration(0);
        setProcessedText(selectedText);
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
        }
      }
    }
  }, [isVisible, selectedText, processedText]);

  // Reset state when popup closes
  useEffect(() => {
    if (!isVisible) {
      setPodcastData(null);
      setError(null);
      setIsLoading(false);
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
      setProcessedText(''); // Reset processed text when popup closes
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
    }
  }, [isVisible]);

  // Audio event listeners
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [podcastData]);

  const generateTTSPodcast = async () => {
    if (!selectedText || selectedText.trim().length < 50) {
      setError("Selected text is too short for podcast generation (minimum 50 characters)");
      return;
    }

    // Prevent duplicate calls if already loading
    if (isLoading) {
      console.log("🎙️ Already generating podcast - skipping duplicate call");
      return;
    }

    setIsLoading(true);
    setError(null);
    setPodcastData(null);

    try {
      console.log("🎙️ TTS Podcast Popup: Starting TTS podcast generation...");
      console.log("🎙️ TTS Podcast Popup: Selected text length:", selectedText.length);

      const response = await aiApi.generateTTSPodcast(selectedText);
      
      console.log("🎙️ TTS Podcast Popup: TTS podcast generated successfully:", response);
      setPodcastData(response);
      
      // Call the callback to save the podcast data
      if (onPodcastGenerated) {
        onPodcastGenerated(response);
      }
      
    } catch (err: any) {
      console.error("🎙️ TTS Podcast Popup: Error generating TTS podcast:", err);
      setError(err.message || "Failed to generate TTS podcast. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const togglePlayPause = async () => {
    // If no podcast data exists, generate it first
    if (!podcastData && !isLoading) {
      console.log("🎙️ Play button clicked - generating podcast first...");
      await generateTTSPodcast();
      return;
    }

    // If still loading, do nothing
    if (isLoading) {
      console.log("🎙️ Podcast still generating...");
      return;
    }

    // Normal play/pause functionality
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const seekTo = (seconds: number) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = seconds;
    setCurrentTime(seconds);
  };

  const skipForward = () => {
    if (!audioRef.current) return;
    const newTime = Math.min(audioRef.current.currentTime + 10, duration);
    seekTo(newTime);
  };

  const skipBackward = () => {
    if (!audioRef.current) return;
    const newTime = Math.max(audioRef.current.currentTime - 10, 0);
    seekTo(newTime);
  };

  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0] / 100;
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
  };

  const handleSeek = (value: number[]) => {
    const newTime = (value[0] / 100) * duration;
    seekTo(newTime);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const downloadPodcast = () => {
    if (!podcastData) return;
    
    const link = document.createElement('a');
    link.href = `${window.location.origin}${podcastData.audio_url}`;
    link.download = `${podcastData.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.mp3`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Dialog open={isVisible} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Mic className="h-5 w-5 text-purple-500" />
            TTS Podcast Player
            <Badge variant="secondary" className="text-xs bg-purple-500/20 text-purple-300">
              AI Generated
            </Badge>
          </DialogTitle>
        </DialogHeader>

            {isLoading && (
              <div className="mx-4 sm:mx-6 text-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-purple-300 mx-auto mb-4" />
            <div className="font-medium text-white mb-2">Creating your podcast...</div>
                    <div className="text-sm text-white/80">
              Generating conversation between Sarah & Mike with alternating voices...
                    </div>
            <div className="text-xs text-white/60 mt-2">
              🎙️ Female (coral) + Male (onyx) voices • Natural dialogue
                </div>
              </div>
            )}

            {error && (
          <div className="mx-4 sm:mx-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            {!podcastData && !isLoading && !error && (
              <div className="mx-4 sm:mx-6 space-y-4">
                {/* Initial State - Ready to Generate */}
                <div className="p-6 bg-gradient-to-br from-purple-500/10 to-blue-500/10 rounded-lg border border-purple-500/20 text-center">
                  <Mic className="h-12 w-12 text-purple-400 mx-auto mb-4" />
                  <h3 className="font-semibold text-lg text-foreground mb-2">Ready to Generate Podcast</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Click the play button below to generate an AI podcast conversation about your selected text.
                  </p>
                  <div className="text-xs text-muted-foreground/80">
                    🎙️ <strong>Sarah</strong> & <strong>Mike</strong> will discuss your content in natural conversation
                  </div>
                </div>

                {/* Play Button to Generate */}
                <div className="p-6 bg-gradient-to-br from-slate-900/50 to-slate-800/50 rounded-xl border border-slate-700/50">
                  <div className="flex items-center justify-center">
                    <Button
                      variant="default"
                      size="icon"
                      onClick={togglePlayPause}
                      className="h-16 w-16 rounded-full bg-purple-600 hover:bg-purple-700 transition-transform hover:scale-105"
                      disabled={isLoading}
                    >
                      <Play className="h-6 w-6 ml-1" />
                    </Button>
                  </div>
                  <div className="text-center mt-4 text-sm text-muted-foreground">
                    Click to generate and play podcast
                  </div>
                </div>

                {/* Selected Text Preview */}
                <div className="p-4 bg-muted/20 rounded-lg border border-muted/30">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-medium text-sm">Selected Text</span>
                    <Badge variant="outline" className="text-xs">
                      {selectedText.length} characters
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground max-h-24 overflow-y-auto">
                    <p className="whitespace-pre-wrap leading-relaxed">
                      {selectedText.length > 200 ? selectedText.substring(0, 200) + "..." : selectedText}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {podcastData && (
              <div className="mx-4 sm:mx-6 space-y-6">
            {/* Hidden audio element */}
            <audio 
              ref={audioRef} 
              src={`${window.location.origin}${podcastData.audio_url}`}
              preload="metadata"
            />

            {/* Podcast Info Header */}
            <div className="p-4 bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded-lg border border-purple-500/20">
              <h3 className="font-semibold text-lg text-foreground mb-2">{podcastData.title}</h3>
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    <span>{formatTime(podcastData.duration_seconds)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    <span>{podcastData.segments_count} segments</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Volume2 className="h-4 w-4" />
                    <span>{podcastData.file_size_mb.toFixed(1)} MB</span>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={downloadPodcast}
                  className="flex items-center gap-1"
                >
                  <Download className="h-3 w-3" />
                  Download
                </Button>
              </div>
                  </div>

            {/* Audio Player */}
            <div className="p-6 bg-gradient-to-br from-slate-900/50 to-slate-800/50 rounded-xl border border-slate-700/50">
              {/* Progress Bar */}
              <div className="mb-6">
                <Slider
                  value={[duration > 0 ? (currentTime / duration) * 100 : 0]}
                  onValueChange={handleSeek}
                  max={100}
                  step={0.1}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-2">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>

              {/* Player Controls */}
              <div className="flex items-center justify-center gap-4 mb-6">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={skipBackward}
                  className="h-12 w-12 rounded-full bg-slate-800/50 hover:bg-slate-700/50"
                  title="Skip back 10 seconds"
                >
                  <SkipBack className="h-5 w-5" />
                </Button>

                <Button
                  variant="default"
                  size="icon"
                  onClick={togglePlayPause}
                  className="h-16 w-16 rounded-full bg-purple-600 hover:bg-purple-700 transition-transform hover:scale-105"
                >
                  {isPlaying ? (
                    <Pause className="h-6 w-6" />
                  ) : (
                    <Play className="h-6 w-6 ml-1" />
                  )}
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={skipForward}
                  className="h-12 w-12 rounded-full bg-slate-800/50 hover:bg-slate-700/50"
                  title="Skip forward 10 seconds"
                >
                  <SkipForward className="h-5 w-5" />
                </Button>
              </div>

              {/* Volume Control */}
              <div className="flex items-center gap-3">
                <Volume2 className="h-4 w-4 text-muted-foreground" />
                <Slider
                  value={[volume * 100]}
                  onValueChange={handleVolumeChange}
                  max={100}
                  step={1}
                  className="flex-1 max-w-32"
                />
                <span className="text-xs text-muted-foreground w-8">
                  {Math.round(volume * 100)}%
                </span>
              </div>
            </div>

            {/* Podcast Details */}
            <div className="p-4 bg-muted/20 rounded-lg border border-muted/30">
              <div className="flex items-center gap-2 mb-2">
                <Mic className="h-4 w-4 text-purple-400" />
                <span className="font-medium text-sm">Podcast Details</span>
              </div>
              <div className="text-sm text-muted-foreground">
                <p>• 🎙️ <strong>Sarah</strong> (Female Host) & <strong>Mike</strong> (Male Guest)</p>
                <p>• 🗣️ Natural conversation with alternating voices</p>
                <p>• 🎯 Focused analysis of your selected text</p>
                <p>• 🤖 Generated with Azure OpenAI TTS (coral + onyx voices)</p>
                <p>• 📅 Created on {new Date(podcastData.generation_timestamp).toLocaleString()}</p>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
