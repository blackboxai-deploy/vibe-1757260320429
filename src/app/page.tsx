"use client";

import { useState } from "react";
import { VideoGenerator } from "@/components/VideoGenerator";
import { GenerationHistory } from "@/components/GenerationHistory";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function HomePage() {
  const [refreshHistory, setRefreshHistory] = useState(0);

  const handleGenerationComplete = () => {
    setRefreshHistory(prev => prev + 1);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent mb-4">
          Text → Minecraft Video Generator
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Generate stunning 20-second Minecraft-style videos from your text prompts using AI. 
          Create epic adventures, building montages, and exploration scenes.
        </p>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="generate" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="generate">Generate Video</TabsTrigger>
          <TabsTrigger value="history">Generation History</TabsTrigger>
        </TabsList>
        
        <TabsContent value="generate">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                🎬 Create Your Minecraft Video
              </CardTitle>
              <CardDescription>
                Describe your Minecraft scene and we'll generate a 20-second video with smooth animations and story progression.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <VideoGenerator onGenerationComplete={handleGenerationComplete} />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                📚 Generation History
              </CardTitle>
              <CardDescription>
                View and download your previously generated videos.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <GenerationHistory key={refreshHistory} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Features Section */}
      <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-green-200">
          <CardHeader>
            <CardTitle className="text-green-700 text-lg">🏗️ Story-Driven</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              Our AI creates narrative flow across 20 seconds with scene transitions and progressive storytelling.
            </p>
          </CardContent>
        </Card>

        <Card className="border-blue-200">
          <CardHeader>
            <CardTitle className="text-blue-700 text-lg">⚡ Optimized Generation</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              Intelligent batching and memory management for smooth 160-frame video generation.
            </p>
          </CardContent>
        </Card>

        <Card className="border-purple-200">
          <CardHeader>
            <CardTitle className="text-purple-700 text-lg">🎮 Minecraft Style</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              Specialized prompts and settings optimized for authentic Minecraft voxel aesthetics.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Footer */}
      <footer className="mt-16 text-center text-sm text-gray-500">
        <p>Powered by Stable Diffusion and FFmpeg • Generate realistic Minecraft adventures</p>
      </footer>
    </div>
  );
}