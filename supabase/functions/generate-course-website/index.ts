import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { courseId } = await req.json();
    
    console.log('Generating course website for courseId:', courseId);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get course details
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('*')
      .eq('id', courseId)
      .single();

    if (courseError) {
      console.error('Error fetching course:', courseError);
      throw new Error('Course not found');
    }

    console.log('Course found:', course.title);

    // Update status to generating
    await supabase
      .from('courses')
      .update({ website_status: 'generating' })
      .eq('id', courseId);

    // Use Lovable AI to generate the course website components
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;
    
    const prompt = `Generate a complete course website interface with the following structure:

Course Title: ${course.title}
Description: ${course.description}
Target Audience: ${course.audience}
Level: ${course.level}
Style: ${course.style}

Modules and Lessons:
${JSON.stringify(course.modules, null, 2)}

Create the following React components in a JSON structure:
1. CourseHomePage - Landing page with course overview and modules list
2. ModulePage - Individual module page with lessons
3. LessonPage - Individual lesson content page
4. ProgressTracker - Component to track student progress
5. CourseNavigation - Navigation between modules and lessons

Return ONLY valid JSON with this structure:
{
  "components": {
    "CourseHomePage": "component code here",
    "ModulePage": "component code here",
    "LessonPage": "component code here",
    "ProgressTracker": "component code here",
    "CourseNavigation": "component code here"
  },
  "styles": "tailwind classes and custom styles",
  "routes": [array of route definitions]
}`;

    const aiResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': supabaseUrl,
        'X-Title': 'Nyra Course Generator'
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      })
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', errorText);
      throw new Error('Failed to generate course website');
    }

    const aiData = await aiResponse.json();
    const generatedContent = aiData.choices[0].message.content;
    
    console.log('AI response received, parsing...');

    // Parse the generated content
    let websiteCode;
    try {
      // Try to extract JSON from markdown code blocks if present
      const jsonMatch = generatedContent.match(/```json\n([\s\S]*?)\n```/) || 
                       generatedContent.match(/```\n([\s\S]*?)\n```/);
      
      if (jsonMatch) {
        websiteCode = JSON.parse(jsonMatch[1]);
      } else {
        websiteCode = JSON.parse(generatedContent);
      }
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      // Fallback structure
      websiteCode = {
        components: {
          CourseHomePage: generatedContent,
          error: 'Failed to parse AI response into structured format'
        }
      };
    }

    // Store the generated website code
    const { error: updateError } = await supabase
      .from('courses')
      .update({
        website_code: websiteCode,
        website_status: 'completed'
      })
      .eq('id', courseId);

    if (updateError) {
      console.error('Error updating course:', updateError);
      throw updateError;
    }

    console.log('Course website generated successfully');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Course website generated successfully',
        websiteCode
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in generate-course-website:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate course website';
    
    return new Response(
      JSON.stringify({
        error: errorMessage
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
