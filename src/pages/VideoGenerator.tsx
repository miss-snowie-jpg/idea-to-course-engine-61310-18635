import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Sparkles, ArrowLeft, Video, Download } from "lucide-react";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/ThemeToggle";

const VideoGenerator = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    prompt: "",
    duration: "30",
    style: "professional",
  });

  useEffect(() => {
    // Check authentication
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate('/auth');
      }
    });
  }, [navigate]);

  const handleGenerate = async () => {
    if (!formData.prompt.trim()) {
      toast.error("Please enter a video description");
      return;
    }

    setLoading(true);
    setVideoUrl(null);
    
    try {
      toast.info("Starting video generation... This may take a few minutes.");
      
      // Start video generation
      const { data: startData, error: startError } = await supabase.functions.invoke('generate-video', {
        body: { prompt: formData.prompt }
      });

      if (startError) throw startError;
      if (!startData?.videoId) throw new Error("Failed to start video generation");

      const videoId = startData.videoId;
      
      // Poll for completion
      let attempts = 0;
      const maxAttempts = 60; // 5 minutes max
      
      const checkStatus = async (): Promise<void> => {
        const { data: statusData, error: statusError } = await supabase.functions.invoke('generate-video', {
          body: { videoId }
        });

        if (statusError) throw statusError;

        console.log('Video status:', statusData);

        if (statusData.status === 'completed') {
          const videoUrl = statusData.video_url;
          if (videoUrl) {
            setVideoUrl(videoUrl);
            toast.success("Video generated successfully!");
            setLoading(false);
          } else {
            throw new Error("No video URL in response");
          }
        } else if (statusData.status === 'failed' || statusData.error) {
          throw new Error(statusData.error || "Video generation failed");
        } else if (attempts < maxAttempts) {
          attempts++;
          setTimeout(checkStatus, 5000); // Check every 5 seconds
        } else {
          throw new Error("Video generation timed out");
        }
      };

      await checkStatus();
      
    } catch (error: any) {
      console.error('Video generation error:', error);
      toast.error(error.message || "Failed to generate video");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            <span className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Video Generator
            </span>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Button variant="outline" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto max-w-4xl px-4 py-12">
        <Card className="border-border/50 bg-card/80 p-8 backdrop-blur-sm">
          <div className="space-y-6">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent mb-4">
                <Video className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-3xl font-bold mb-2">AI Video Generator</h2>
              <p className="text-muted-foreground">Create professional videos with AI</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="prompt">Video Description</Label>
                <Textarea
                  id="prompt"
                  placeholder="Describe the video you want to create..."
                  value={formData.prompt}
                  onChange={(e) => setFormData({ ...formData, prompt: e.target.value })}
                  className="min-h-32 border-border/50 bg-background/50"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="duration">Duration (seconds)</Label>
                  <Input
                    id="duration"
                    type="number"
                    placeholder="30"
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                    className="border-border/50 bg-background/50"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="style">Video Style</Label>
                  <Input
                    id="style"
                    placeholder="professional, casual, animated..."
                    value={formData.style}
                    onChange={(e) => setFormData({ ...formData, style: e.target.value })}
                    className="border-border/50 bg-background/50"
                  />
                </div>
              </div>

              <Button
                size="lg"
                className="w-full bg-gradient-to-r from-primary to-accent"
                onClick={handleGenerate}
                disabled={loading}
              >
                <Sparkles className="mr-2 h-5 w-5" />
                {loading ? "Generating..." : "Generate Video"}
              </Button>
            </div>

            {videoUrl && (
              <div className="mt-8 space-y-4">
                <div className="aspect-video rounded-lg bg-muted overflow-hidden">
                  <video src={videoUrl} controls className="w-full h-full" />
                </div>
                <Button variant="outline" className="w-full">
                  <Download className="mr-2 h-4 w-4" />
                  Download Video
                </Button>
              </div>
            )}
          </div>
        </Card>
      </main>
    </div>
  );
};

export default VideoGenerator;
