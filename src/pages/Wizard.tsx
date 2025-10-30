import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, ArrowLeft, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { PaymentMethodDialog } from "@/components/PaymentMethodDialog";

interface CourseModule {
  title: string;
  lessons: string[];
}

interface GeneratedCourse {
  title: string;
  description: string;
  modules: CourseModule[];
}

const Wizard = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [generatedCourse, setGeneratedCourse] = useState<GeneratedCourse | null>(null);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [formData, setFormData] = useState({
    topic: "",
    audience: "",
    style: "",
    level: "",
    monetization: "",
  });

  useEffect(() => {
    // Check authentication
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate('/auth');
      }
    });
  }, [navigate]);

  const handleNext = () => {
    if (step < 5) {
      setStep(step + 1);
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    } else {
      navigate('/dashboard');
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Please sign in to create courses");
        navigate('/auth');
        return;
      }

      // Generate course using AI
      const { data: courseData, error: generateError } = await supabase.functions.invoke('generate-course', {
        body: {
          topic: formData.topic,
          audience: formData.audience,
          style: formData.style,
          level: formData.level,
          monetization: formData.monetization,
        }
      });

      if (generateError) throw generateError;

      // Save to database
      const { data: insertedCourse, error: insertError } = await (supabase as any)
        .from('courses')
        .insert({
          user_id: session.user.id,
          title: courseData.course.title,
          description: courseData.course.description,
          topic: formData.topic,
          audience: formData.audience,
          style: formData.style,
          level: formData.level,
          monetization: formData.monetization,
          modules: courseData.course.modules,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Set generated course to display
      setGeneratedCourse(courseData.course);
      setStep(6); // Move to course preview step
      toast.success("Course generated successfully!");

      // Generate course website in background
      toast.info("Generating your course website...");
      supabase.functions.invoke('generate-course-website', {
        body: { courseId: insertedCourse.id }
      }).then(({ data, error }) => {
        if (error) {
          console.error('Website generation error:', error);
          toast.error("Course website generation failed");
        } else {
          toast.success("Course website ready!");
        }
      });
    } catch (error: any) {
      console.error('Course generation error:', error);
      toast.error(error.message || "Failed to generate course");
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const isStepValid = () => {
    switch (step) {
      case 1: return formData.topic.trim().length > 0;
      case 2: return formData.audience.trim().length > 0;
      case 3: return formData.style.length > 0;
      case 4: return formData.level.length > 0;
      case 5: return formData.monetization.length > 0;
      default: return false;
    }
  };

  const handlePaymentSelection = async (method: "paypal" | "telebirr") => {
    setPaymentLoading(true);
    try {
      if (method === "paypal") {
        const { data, error } = await supabase.functions.invoke('paypal-payment', {
          body: { 
            amount: 40, 
            currency: "USD",
            courseId: generatedCourse?.title 
          }
        });
        
        if (error) throw error;
        
        if (data.approvalUrl) {
          window.open(data.approvalUrl, '_blank');
          toast.success("Redirecting to PayPal...");
        }
      } else {
        const { data, error } = await supabase.functions.invoke('telebirr-payment', {
          body: { 
            amount: 1600,
            phoneNumber: "+251911234567", // In production, collect from user
            courseId: generatedCourse?.title 
          }
        });
        
        if (error) throw error;
        
        if (data.paymentUrl) {
          window.open(data.paymentUrl, '_blank');
          toast.success("Redirecting to Telebirr...");
        }
      }
      
      setShowPaymentDialog(false);
    } catch (error: any) {
      console.error('Payment error:', error);
      toast.error(error.message || "Payment failed");
    } finally {
      setPaymentLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto flex items-center gap-2 px-4 py-4">
          <Sparkles className="h-6 w-6 text-primary" />
          <span className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Nyra Course Wizard
          </span>
        </div>
      </header>

      {/* Progress Bar */}
      {step <= 5 && (
        <div className="border-b border-border/50 bg-card/30">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between text-sm">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-full ${
                    i <= step ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'
                  }`}>
                    {i}
                  </div>
                  {i < 5 && <div className={`h-1 w-12 md:w-24 ${i < step ? 'bg-primary' : 'bg-muted'}`} />}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="container mx-auto max-w-4xl px-4 py-12">
        <Card className="border-border/50 bg-card/80 p-8 backdrop-blur-sm">
          {step === 6 && generatedCourse ? (
            <div className="space-y-6">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent mb-4">
                  <Sparkles className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-3xl font-bold mb-2">Your Course is Ready!</h2>
                <p className="text-muted-foreground">Review your AI-generated course structure below</p>
              </div>

              <div className="space-y-6 bg-gradient-to-br from-primary/5 to-accent/5 rounded-lg p-6">
                <div>
                  <h3 className="text-2xl font-bold mb-2">{generatedCourse.title}</h3>
                  <p className="text-muted-foreground">{generatedCourse.description}</p>
                </div>

                <div className="space-y-4">
                  <h4 className="text-xl font-semibold">Course Modules</h4>
                  {generatedCourse.modules.map((module, idx) => (
                    <Card key={idx} className="p-6 bg-card hover:shadow-md transition-shadow">
                      <h5 className="font-semibold text-lg mb-3 text-primary">
                        Module {idx + 1}: {module.title}
                      </h5>
                      <ul className="space-y-2">
                        {module.lessons.map((lesson, lessonIdx) => (
                          <li key={lessonIdx} className="flex items-start gap-2 text-sm">
                            <span className="text-accent mt-1">•</span>
                            <span>{lesson}</span>
                          </li>
                        ))}
                      </ul>
                    </Card>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <Button
                  size="lg"
                  className="w-full bg-gradient-to-r from-accent to-primary hover:opacity-90 transition-opacity text-lg"
                  onClick={() => setShowPaymentDialog(true)}
                  disabled={paymentLoading}
                >
                  <Sparkles className="mr-2 h-5 w-5" />
                  {paymentLoading ? "Processing..." : "Publish Course"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate('/dashboard')}
                >
                  Back to Dashboard
                </Button>
              </div>
            </div>
          ) : step === 1 && (
            <div className="space-y-4">
              <h2 className="text-3xl font-bold">What's your course about?</h2>
              <p className="text-muted-foreground">Tell us the main topic of your course</p>
              <div className="space-y-2">
                <Label htmlFor="topic">Course Topic</Label>
                <Input
                  id="topic"
                  placeholder="e.g., Digital Marketing for Beginners"
                  value={formData.topic}
                  onChange={(e) => updateField('topic', e.target.value)}
                  className="border-border/50 bg-background/50"
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-3xl font-bold">Who is your audience?</h2>
              <p className="text-muted-foreground">Describe who will benefit from this course</p>
              <div className="space-y-2">
                <Label htmlFor="audience">Target Audience</Label>
                <Textarea
                  id="audience"
                  placeholder="e.g., Small business owners looking to grow their online presence"
                  value={formData.audience}
                  onChange={(e) => updateField('audience', e.target.value)}
                  className="min-h-32 border-border/50 bg-background/50"
                />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h2 className="text-3xl font-bold">What's your teaching style?</h2>
              <p className="text-muted-foreground">Choose the tone for your course</p>
              <div className="space-y-2">
                <Label htmlFor="style">Teaching Style</Label>
                <Select value={formData.style} onValueChange={(value) => updateField('style', value)}>
                  <SelectTrigger className="border-border/50 bg-background/50">
                    <SelectValue placeholder="Select a style" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="educational">Educational & Informative</SelectItem>
                    <SelectItem value="entertaining">Entertaining & Engaging</SelectItem>
                    <SelectItem value="professional">Professional & Formal</SelectItem>
                    <SelectItem value="casual">Casual & Conversational</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <h2 className="text-3xl font-bold">Course difficulty level?</h2>
              <p className="text-muted-foreground">Select the appropriate level for your students</p>
              <div className="space-y-2">
                <Label htmlFor="level">Difficulty Level</Label>
                <Select value={formData.level} onValueChange={(value) => updateField('level', value)}>
                  <SelectTrigger className="border-border/50 bg-background/50">
                    <SelectValue placeholder="Select a level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">Beginner - No prior knowledge needed</SelectItem>
                    <SelectItem value="intermediate">Intermediate - Some experience required</SelectItem>
                    <SelectItem value="advanced">Advanced - Expert level content</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-4">
              <h2 className="text-3xl font-bold">Monetization strategy?</h2>
              <p className="text-muted-foreground">How do you plan to sell your course?</p>
              <div className="space-y-2">
                <Label htmlFor="monetization">Pricing Model</Label>
                <Select value={formData.monetization} onValueChange={(value) => updateField('monetization', value)}>
                  <SelectTrigger className="border-border/50 bg-background/50">
                    <SelectValue placeholder="Select a model" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free">Free - Build audience first</SelectItem>
                    <SelectItem value="one-time">One-time Payment</SelectItem>
                    <SelectItem value="subscription">Monthly Subscription</SelectItem>
                    <SelectItem value="tiered">Tiered Pricing (Basic/Pro/Premium)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          {step <= 5 && (
            <div className="mt-8 flex justify-between">
              <Button variant="outline" onClick={handleBack}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                {step === 1 ? 'Cancel' : 'Back'}
              </Button>
              <Button 
                onClick={handleNext} 
                disabled={!isStepValid() || loading}
                className="bg-gradient-to-r from-primary to-accent"
              >
                {loading ? 'Generating...' : step === 5 ? 'Generate Course' : 'Next'}
                {step < 5 && <ArrowRight className="ml-2 h-4 w-4" />}
              </Button>
            </div>
          )}
        </Card>
      </main>

      {/* Payment Method Selection */}
      <PaymentMethodDialog
        open={showPaymentDialog}
        onOpenChange={setShowPaymentDialog}
        onSelectPayment={handlePaymentSelection}
      />
    </div>
  );
};

export default Wizard;