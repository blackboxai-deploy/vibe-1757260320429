"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ProgressTracker } from "./ProgressTracker";
import { VideoPlayer } from "./VideoPlayer";
import { generateVideo, GenerationRequest } from "@/lib/api";

const STORY_TEMPLATES = [
  {
    name: "Epic Mining Adventure",
    prompt: "Steve explores deep caves, discovers diamond ore, encounters lava pools, and escapes with treasures through dangerous passages"
  },
  {
    name: "Village Defense",
    prompt: "Minecraft village under attack by zombies and skeletons, villagers running for safety, epic battle with sword and bow, sunrise victory"
  },
  {
    name: "Building Montage",
    prompt: "Time-lapse construction of massive castle, placing blocks rapidly, building towers and walls, adding decorative elements, final reveal"
  },
  {
    name: "Exploration Quest", 
    prompt: "Journey through different biomes - forest to desert to snow mountains, discovering new structures, collecting resources along the way"
  },
  {
    name: "Nether Adventure",
    prompt: "Portal activation, entering the Nether dimension, fighting ghasts and blazes, collecting nether stars, dramatic escape back to overworld"
  },
  {
    name: "Ocean Monument Raid",
    prompt: "Underwater adventure to ocean monument, swimming past guardians, navigating maze-like corridors, finding treasure room, ascending to surface"
  }
];

interface VideoGeneratorProps {
  onGenerationComplete?: () => void;
}

export function VideoGenerator({ onGenerationComplete }: VideoGeneratorProps) {
  const [formData, setFormData] = useState<GenerationRequest>({
    prompt: "",
    length_seconds: 20,
    fps: 8,
    width: 512,
    height: 512,
    seed: undefined,
    num_inference_steps: 20
  });
  
  const [currentJob, setCurrentJob] = useState<{
    jobId: string;
    downloadUrl: string;
    estimatedTime: number;
  } | null>(null);
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedVideo, setGeneratedVideo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleTemplateSelect = (template: string) => {
    const selectedTemplate = STORY_TEMPLATES.find(t => t.name === template);
    if (selectedTemplate) {
      setFormData(prev => ({ ...prev, prompt: selectedTemplate.prompt }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.prompt.trim()) {
      setError("Please enter a prompt or select a story template");
      return;
    }

    setIsGenerating(true);
    setError(null);
    setGeneratedVideo(null);
    setCurrentJob(null);

    try {
      const result = await generateVideo(formData);
      
      setCurrentJob({
        jobId: result.job_id,
        downloadUrl: result.download_url,
        estimatedTime: result.estimated_time_minutes || 20
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start generation");
      setIsGenerating(false);
    }
  };

  const handleGenerationComplete = (videoUrl: string) => {
    setGeneratedVideo(videoUrl);
    setIsGenerating(false);
    setCurrentJob(null);
    
    // Save to history
    const historyItem = {
      id: Date.now().toString(),
      prompt: formData.prompt,
      videoUrl,
      timestamp: new Date().toISOString(),
      settings: { ...formData }
    };
    
    const history = JSON.parse(localStorage.getItem('video-history') || '[]');
    history.unshift(historyItem);
    localStorage.setItem('video-history', JSON.stringify(history.slice(0, 10))); // Keep last 10
    
    onGenerationComplete?.();
  };

  const handleGenerationError = (errorMessage: string) => {
    setError(errorMessage);
    setIsGenerating(false);
    setCurrentJob(null);
  };

  return (
    <div className="space-y-6">
      {/* Generation Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Story Templates */}
        <div className="space-y-2">
          <Label>Story Templates (Optional)</Label>
          <Select onValueChange={handleTemplateSelect}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a pre-built story template" />
            </SelectTrigger>
            <SelectContent>
              {STORY_TEMPLATES.map((template) => (
                <SelectItem key={template.name} value={template.name}>
                  {template.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Prompt Input */}
        <div className="space-y-2">
          <Label htmlFor="prompt">Video Description *</Label>
          <Textarea
            id="prompt"
            placeholder="Describe your 20-second Minecraft video scene... (e.g., 'Steve explores a dark cave, finds diamonds, encounters monsters, and escapes through a waterfall')"
            value={formData.prompt}
            onChange={(e) => setFormData(prev => ({ ...prev, prompt: e.target.value }))}
            rows={4}
            className="resize-none"
          />
        </div>

        {/* Settings Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label htmlFor="length">Duration (seconds)</Label>
            <Input
              id="length"
              type="number"
              min="5"
              max="60"
              value={formData.length_seconds}
              onChange={(e) => setFormData(prev => ({ ...prev, length_seconds: parseInt(e.target.value) }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="fps">Frame Rate (FPS)</Label>
            <Select 
              value={formData.fps.toString()} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, fps: parseInt(value) }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="6">6 FPS (Fast)</SelectItem>
                <SelectItem value="8">8 FPS (Balanced)</SelectItem>
                <SelectItem value="12">12 FPS (Smooth)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="width">Width</Label>
            <Select 
              value={formData.width.toString()} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, width: parseInt(value) }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="512">512px (Fast)</SelectItem>
                <SelectItem value="768">768px (Balanced)</SelectItem>
                <SelectItem value="1024">1024px (High Quality)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="height">Height</Label>
            <Select 
              value={formData.height.toString()} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, height: parseInt(value) }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="512">512px (Fast)</SelectItem>
                <SelectItem value="768">768px (Balanced)</SelectItem>
                <SelectItem value="1024">1024px (High Quality)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Advanced Settings */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="seed">Seed (Optional)</Label>
            <Input
              id="seed"
              type="number"
              placeholder="Leave empty for random"
              value={formData.seed || ""}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                seed: e.target.value ? parseInt(e.target.value) : undefined 
              }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="steps">Quality Steps</Label>
            <Select 
              value={formData.num_inference_steps.toString()} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, num_inference_steps: parseInt(value) }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="15">15 Steps (Fast)</SelectItem>
                <SelectItem value="20">20 Steps (Balanced)</SelectItem>
                <SelectItem value="30">30 Steps (High Quality)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Estimated Time Info */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-4">
            <p className="text-sm text-blue-800">
              ⏱️ <strong>Estimated Generation Time:</strong> {Math.ceil(formData.length_seconds * formData.fps / 10)} minutes
              {formData.length_seconds === 20 && " (160 frames for 20-second video)"}
            </p>
          </CardContent>
        </Card>

        {/* Generate Button */}
        <Button 
          type="submit" 
          disabled={isGenerating || !formData.prompt.trim()}
          className="w-full bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700"
          size="lg"
        >
          {isGenerating ? "Generating Video..." : "🎬 Generate 20-Second Video"}
        </Button>
      </form>

      {/* Error Display */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-4">
            <p className="text-red-800">❌ {error}</p>
          </CardContent>
        </Card>
      )}

      {/* Progress Tracker */}
      {currentJob && (
        <ProgressTracker
          jobId={currentJob.jobId}
          downloadUrl={currentJob.downloadUrl}
          estimatedTime={currentJob.estimatedTime}
          onComplete={handleGenerationComplete}
          onError={handleGenerationError}
        />
      )}

      {/* Video Player */}
      {generatedVideo && (
        <Card>
          <CardHeader>
            <CardTitle>🎉 Your Generated Video</CardTitle>
            <CardDescription>
              20-second Minecraft video generated successfully!
            </CardDescription>
          </CardHeader>
          <CardContent>
            <VideoPlayer videoUrl={generatedVideo} prompt={formData.prompt} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}