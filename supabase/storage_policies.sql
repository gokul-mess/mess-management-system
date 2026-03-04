-- STORAGE BUCKET POLICIES FOR MENU PHOTOS
-- Run this after creating the 'menu-photos' bucket in Supabase Storage

-- Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload menu photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'menu-photos');

-- Allow authenticated users to update
CREATE POLICY "Authenticated users can update menu photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'menu-photos');

-- Allow authenticated users to delete
CREATE POLICY "Authenticated users can delete menu photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'menu-photos');

-- Allow everyone to view
CREATE POLICY "Anyone can view menu photos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'menu-photos');
