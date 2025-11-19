-- Storage policies for maintenance-photos bucket
-- Run this in your Supabase SQL Editor after creating the bucket

-- Policy 1: Allow authenticated users to upload photos to their own folder
CREATE POLICY "Users can upload maintenance photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'maintenance-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Policy 2: Allow anyone to view photos (public bucket)
CREATE POLICY "Anyone can view maintenance photos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'maintenance-photos');

-- Policy 3: Allow users to delete their own photos
CREATE POLICY "Users can delete their own maintenance photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'maintenance-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Policy 4: Allow users to delete their own photos
CREATE POLICY "Users can delete their own maintenance photos delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'maintenance-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

