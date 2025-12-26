-- Create storage bucket for reject images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'reject-images',
  'reject-images',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Create policy to allow public read access
CREATE POLICY "Public can view reject images"
ON storage.objects FOR SELECT
USING (bucket_id = 'reject-images');

-- Create policy to allow anyone to upload reject images
CREATE POLICY "Anyone can upload reject images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'reject-images' AND
  (storage.foldername(name))[1] = 'rejects'
);

