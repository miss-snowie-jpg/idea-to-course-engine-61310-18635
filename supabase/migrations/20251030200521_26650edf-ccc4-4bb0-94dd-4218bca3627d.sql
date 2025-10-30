-- Add column to store generated course website code
ALTER TABLE public.courses
ADD COLUMN website_code jsonb DEFAULT '{}'::jsonb;

-- Add column to track website generation status
ALTER TABLE public.courses
ADD COLUMN website_status text DEFAULT 'pending';

COMMENT ON COLUMN public.courses.website_code IS 'Generated website components and pages for the course';
COMMENT ON COLUMN public.courses.website_status IS 'Status of website generation: pending, generating, completed, failed';