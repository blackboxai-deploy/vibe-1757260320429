"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface HistoryItem {
  id: string;
  prompt: string;
  videoUrl: string;
  timestamp: string;
  settings: {
    length_seconds: number;
    fps: number;
    width: number;
    height: number;
  };
}

export function GenerationHistory() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);

  useEffect(() => {
    const savedHistory = localStorage.getItem('video-history');
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch (error) {
        console.error('Failed to parse history:', error);
        setHistory([]);
      }
    }
  }, []);

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const handleDownload = (videoUrl: string, prompt: string) => {
    const link = document.createElement('a');
    link.href = videoUrl;
    link.download = `minecraft-${prompt.slice(0, 30).replace(/[^a-zA-Z0-9]/g, '-')}.mp4`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const clearHistory = () => {
    if (confirm('Are you sure you want to clear all generation history?')) {
      localStorage.removeItem('video-history');
      setHistory([]);
    }
  };

  const deleteItem = (id: string) => {
    const newHistory = history.filter(item => item.id !== id);
    setHistory(newHistory);
    localStorage.setItem('video-history', JSON.stringify(newHistory));
  };

  if (history.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <div className="text-6xl mb-4">🎬</div>
            <h3 className="text-lg font-medium mb-2">No videos generated yet</h3>
            <p className="text-gray-600 mb-4">
              Start generating your first Minecraft video to see it appear here!
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Clear Button */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">Your Generated Videos</h3>
          <p className="text-sm text-gray-600">{history.length} videos in history</p>
        </div>
        <Button
          onClick={clearHistory}
          variant="outline"
          size="sm"
          className="text-red-600 border-red-200 hover:bg-red-50"
        >
          🗑️ Clear All
        </Button>
      </div>

      {/* Video Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {history.map((item) => (
          <Card key={item.id} className="overflow-hidden hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <CardTitle className="text-base line-clamp-2">
                  {item.prompt.slice(0, 60)}
                  {item.prompt.length > 60 ? '...' : ''}
                </CardTitle>
                <Button
                  onClick={() => deleteItem(item.id)}
                  variant="ghost"
                  size="sm"
                  className="text-gray-400 hover:text-red-500 p-1"
                >
                  ❌
                </Button>
              </div>
              <CardDescription>
                Generated on {formatDate(item.timestamp)}
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-3">
              {/* Video Preview */}
              <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
                <video
                  className="w-full h-full object-cover cursor-pointer"
                  poster="https://storage.googleapis.com/workspace-0f70711f-8b4e-4d94-86f1-2a93ccde5887/image/4fb0e4ec-e5a9-48f7-84af-45eddbbc0e5c.png"
                  onClick={() => setSelectedVideo(selectedVideo === item.videoUrl ? null : item.videoUrl)}
                  preload="metadata"
                >
                  <source src={item.videoUrl} type="video/mp4" />
                </video>
                
                {/* Play Overlay */}
                <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity cursor-pointer">
                  <div className="w-12 h-12 bg-white bg-opacity-90 rounded-full flex items-center justify-center">
                    <span className="text-2xl">▶️</span>
                  </div>
                </div>
              </div>

              {/* Full Video Player (when selected) */}
              {selectedVideo === item.videoUrl && (
                <div className="bg-black rounded-lg overflow-hidden">
                  <video
                    controls
                    className="w-full aspect-video"
                    autoPlay
                  >
                    <source src={item.videoUrl} type="video/mp4" />
                  </video>
                </div>
              )}

              {/* Video Info */}
              <div className="space-y-2">
                <div className="flex flex-wrap gap-1">
                  <Badge variant="secondary" className="text-xs">
                    {item.settings.length_seconds}s
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    {item.settings.fps} FPS
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    {item.settings.width}×{item.settings.height}
                  </Badge>
                </div>

                <p className="text-sm text-gray-600 line-clamp-3">
                  {item.prompt}
                </p>
              </div>

              {/* Actions */}
              <div className="flex space-x-2">
                <Button
                  onClick={() => handleDownload(item.videoUrl, item.prompt)}
                  variant="outline"
                  size="sm"
                  className="flex-1"
                >
                  📥 Download
                </Button>
                
                <Button
                  onClick={() => {
                    navigator.clipboard.writeText(item.prompt);
                    // You could show a toast notification here
                  }}
                  variant="outline"
                  size="sm"
                  className="flex-1"
                >
                  📋 Copy Prompt
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Load More Button (if needed in the future) */}
      {history.length >= 10 && (
        <Card className="border-dashed">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-3">
                Showing recent 10 videos. Older videos are automatically cleaned up.
              </p>
              <Button variant="outline" size="sm" disabled>
                🔄 Auto-cleanup enabled
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}