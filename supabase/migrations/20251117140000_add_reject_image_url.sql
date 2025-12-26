-- Add reject_image_url column to sorting_logs table
ALTER TABLE public.sorting_logs 
ADD COLUMN reject_image_url TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.sorting_logs.reject_image_url IS 'URL to the image of rejected items stored in Supabase Storage';

