"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { checkGenerationStatus } from "@/lib/api";

interface ProgressTrackerProps {
  jobId: string;
  downloadUrl: string;
  estimatedTime: number;
  onComplete: (videoUrl: string) => void;
  onError: (error: string) => void;
}

export function ProgressTracker({ 
  jobId, 
  downloadUrl, 
  estimatedTime,
  onComplete, 
  onError 
}: ProgressTrackerProps) {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("initializing");
  const [framesGenerated, setFramesGenerated] = useState(0);
  const [totalFrames, setTotalFrames] = useState(160); // Default for 20s at 8fps
  const [elapsedTime, setElapsedTime] = useState(0);
  const [estimatedTimeLeft, setEstimatedTimeLeft] = useState(estimatedTime * 60); // Convert to seconds

  useEffect(() => {
    const startTime = Date.now();
    
    const checkStatus = async () => {
      try {
        const result = await checkGenerationStatus(jobId);
        
        if (!result.exists) {
          onError("Generation job not found");
          return;
        }

        if (result.error) {
          onError("Generation failed. Please try again.");
          return;
        }

        if (result.ready) {
          setProgress(100);
          setStatus("completed");
          onComplete(downloadUrl);
          return;
        }

        // Update progress from server
        if (result.progress) {
          const progressPercent = parseFloat(result.progress.progress_percent || "0");
          const framesGen = parseInt(result.progress.frames_generated || "0");
          const totalF = parseInt(result.progress.total_frames || "160");
          
          setProgress(progressPercent);
          setFramesGenerated(framesGen);
          setTotalFrames(totalF);
          
          // Calculate estimated time left
          const elapsed = (Date.now() - startTime) / 1000;
          setElapsedTime(elapsed);
          
          if (framesGen > 0) {
            const timePerFrame = elapsed / framesGen;
            const framesLeft = totalF - framesGen;
            const timeLeft = Math.max(0, timePerFrame * framesLeft);
            setEstimatedTimeLeft(timeLeft);
          }
        }

        // Update status
        if (result.status) {
          setStatus(result.status);
        }

      } catch (error) {
        console.error("Status check failed:", error);
        onError("Failed to check generation status");
      }
    };

    // Check immediately
    checkStatus();
    
    // Poll every 5 seconds
    const interval = setInterval(checkStatus, 5000);
    
    return () => clearInterval(interval);
  }, [jobId, downloadUrl, onComplete, onError]);

  const getStatusMessage = (status: string) => {
    switch (status) {
      case "starting":
        return "🚀 Starting generation...";
      case "checking_ffmpeg":
        return "🔧 Checking system requirements...";
      case "initializing":
        return "⚙️ Initializing AI model...";
      case "generating_frames":
        return "🎨 Generating video frames...";
      case "assembling_video":
        return "🎬 Assembling final video...";
      case "completed":
        return "✅ Generation completed!";
      case "error":
        return "❌ Generation failed";
      default:
        return "🔄 Processing...";
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Card className="border-blue-200 bg-blue-50">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>🎬 Generating Your Video</span>
          <span className="text-sm font-normal text-blue-600">Job ID: {jobId}</span>
        </CardTitle>
        <CardDescription>
          {getStatusMessage(status)}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Overall Progress</span>
            <span>{progress.toFixed(1)}%</span>
          </div>
          <Progress value={progress} className="h-3" />
        </div>

        {/* Frame Progress */}
        {status === "generating_frames" && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Frames Generated</span>
              <span>{framesGenerated} / {totalFrames}</span>
            </div>
            <Progress value={(framesGenerated / totalFrames) * 100} className="h-2" />
          </div>
        )}

        {/* Time Information */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="bg-white p-3 rounded-lg border">
            <div className="font-medium text-gray-600">Elapsed Time</div>
            <div className="text-lg font-bold text-blue-600">
              {formatTime(elapsedTime)}
            </div>
          </div>
          
          <div className="bg-white p-3 rounded-lg border">
            <div className="font-medium text-gray-600">Est. Time Left</div>
            <div className="text-lg font-bold text-green-600">
              {status === "completed" ? "Done!" : formatTime(estimatedTimeLeft)}
            </div>
          </div>
        </div>

        {/* Current Phase Information */}
        <div className="bg-white p-4 rounded-lg border">
          <h4 className="font-medium mb-2">Current Phase:</h4>
          <div className="text-sm text-gray-600 space-y-1">
            {status === "generating_frames" && (
              <>
                <p>• Generating {totalFrames} individual frames</p>
                <p>• Processing in batches for optimal memory usage</p>
                <p>• Each frame uses advanced Minecraft-style prompting</p>
                <p>• Story progression across 4 scene segments</p>
              </>
            )}
            {status === "assembling_video" && (
              <>
                <p>• Combining all frames into smooth video</p>
                <p>• Applying high-quality encoding (H.264)</p>
                <p>• Optimizing for web playback</p>
                <p>• Cleaning up temporary files</p>
              </>
            )}
            {status === "completed" && (
              <p>• Your 20-second Minecraft video is ready!</p>
            )}
          </div>
        </div>

        {/* Timeline Visualization for 20-second video */}
        {status === "generating_frames" && (
          <div className="bg-white p-4 rounded-lg border">
            <h4 className="font-medium mb-3">20-Second Timeline Progress</h4>
            <div className="flex space-x-1">
              {Array.from({ length: 20 }, (_, i) => {
                const secondProgress = (framesGenerated / totalFrames) * 20;
                const isComplete = i < secondProgress;
                const isCurrent = i >= secondProgress - 1 && i < secondProgress;
                
                return (
                  <div
                    key={i}
                    className={`h-6 flex-1 rounded text-xs flex items-center justify-center text-white font-medium ${
                      isComplete 
                        ? "bg-green-500" 
                        : isCurrent 
                          ? "bg-blue-500 animate-pulse" 
                          : "bg-gray-200"
                    }`}
                  >
                    {i + 1}
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>Start</span>
              <span>10s</span>
              <span>End (20s)</span>
            </div>
          </div>
        )}

        {/* Action Button */}
        {status === "completed" && (
          <Button 
            onClick={() => window.open(downloadUrl, '_blank')}
            className="w-full bg-green-600 hover:bg-green-700"
          >
            📥 Download Your Video
          </Button>
        )}
      </CardContent>
    </Card>
  );
}