import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { topic } = await req.json();
    
    if (!topic) {
      throw new Error("Topic is required");
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log("Generating course for topic:", topic);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are an expert course curriculum designer. Create comprehensive, well-structured courses that are engaging and educational. Return courses in JSON format with the following structure:
{
  "title": "Course Title",
  "description": "Brief course description (2-3 sentences)",
  "modules": [
    {
      "title": "Module Title",
      "lessons": ["Lesson 1", "Lesson 2", "Lesson 3"]
    }
  ]
}
Create 4-6 modules with 3-5 lessons each. Be specific and practical.`,
          },
          {
            role: "user",
            content: `Create a comprehensive course about: ${topic}`,
          },
        ],
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    // Parse the JSON response from the AI
    let course;
    try {
      course = JSON.parse(content);
    } catch (e) {
      // If parsing fails, try to extract JSON from markdown code blocks
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/);
      if (jsonMatch) {
        course = JSON.parse(jsonMatch[1]);
      } else {
        throw new Error("Failed to parse course structure");
      }
    }

    console.log("Course generated successfully");

    return new Response(JSON.stringify({ course }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in generate-course function:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to generate course";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
