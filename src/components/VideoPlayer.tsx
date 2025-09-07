"use client";

import { useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

interface VideoPlayerProps {
  videoUrl: string;
  prompt: string;
}

export function VideoPlayer({ videoUrl, prompt }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(20); // Default 20 seconds
  const [volume, setVolume] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  const handlePlayPause = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
    } else {
      video.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;
    setCurrentTime(video.currentTime);
  };

  const handleLoadedMetadata = () => {
    const video = videoRef.current;
    if (!video) return;
    setDuration(video.duration);
    setIsLoading(false);
  };

  const handleSeek = (value: number[]) => {
    const video = videoRef.current;
    if (!video) return;
    const newTime = value[0];
    video.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleVolumeChange = (value: number[]) => {
    const video = videoRef.current;
    const newVolume = value[0] / 100;
    setVolume(newVolume);
    if (video) {
      video.volume = newVolume;
    }
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = videoUrl;
    link.download = `minecraft-video-${Date.now()}.mp4`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-4">
      {/* Video Container */}
      <div className="relative bg-black rounded-lg overflow-hidden">
        <video
          ref={videoRef}
          className="w-full aspect-video object-contain"
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={() => setIsPlaying(false)}
          poster="https://storage.googleapis.com/workspace-0f70711f-8b4e-4d94-86f1-2a93ccde5887/image/8a4de768-353c-49d9-b36e-26fb081c26b6.png"
        >
          <source src={videoUrl} type="video/mp4" />
          Your browser does not support the video tag.
        </video>
        
        {isLoading && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="text-white text-center">
              <div className="animate-spin w-8 h-8 border-2 border-white border-t-transparent rounded-full mx-auto mb-2"></div>
              <p>Loading video...</p>
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <Card>
        <CardContent className="pt-4">
          {/* Progress Bar */}
          <div className="space-y-2 mb-4">
            <div className="flex justify-between text-sm text-gray-600">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
            <Slider
              value={[currentTime]}
              max={duration}
              step={0.1}
              onValueChange={handleSeek}
              className="w-full"
            />
          </div>

          {/* Control Buttons */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {/* Play/Pause Button */}
              <Button
                onClick={handlePlayPause}
                variant="outline"
                size="sm"
                disabled={isLoading}
              >
                {isPlaying ? "⏸️" : "▶️"}
              </Button>

              {/* Volume Control */}
              <div className="flex items-center space-x-2 min-w-[100px]">
                <span className="text-sm">🔊</span>
                <Slider
                  value={[volume * 100]}
                  max={100}
                  step={1}
                  onValueChange={handleVolumeChange}
                  className="w-16"
                />
              </div>
            </div>

            {/* Download Button */}
            <Button
              onClick={handleDownload}
              variant="outline"
              size="sm"
              className="bg-green-50 border-green-200 hover:bg-green-100"
            >
              📥 Download
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Video Info */}
      <Card className="bg-gradient-to-r from-green-50 to-blue-50">
        <CardHeader>
          <CardTitle className="text-lg">🎬 Generated Video Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div>
              <span className="font-medium text-gray-600">Prompt:</span>
              <p className="text-sm mt-1 p-2 bg-white rounded border">{prompt}</p>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-600">Duration:</span>
                <p className="font-mono">{formatTime(duration)}</p>
              </div>
              
              <div>
                <span className="font-medium text-gray-600">Format:</span>
                <p className="font-mono">MP4 (H.264)</p>
              </div>
              
              <div>
                <span className="font-medium text-gray-600">Style:</span>
                <p className="font-mono">Minecraft Voxel</p>
              </div>
              
              <div>
                <span className="font-medium text-gray-600">Quality:</span>
                <p className="font-mono">HD Ready</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Share Options */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">📤 Share Your Video</CardTitle>
          <CardDescription>
            Share your generated Minecraft video with others
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                // You could show a toast notification here
              }}
            >
              🔗 Copy Link
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const text = `Check out this amazing Minecraft video I generated with AI: "${prompt}"`;
                const url = encodeURIComponent(window.location.href);
                window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${url}`, '_blank');
              }}
            >
              🐦 Share on Twitter
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
            >
              💾 Save to Device
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}