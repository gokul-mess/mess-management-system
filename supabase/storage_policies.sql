-- STORAGE BUCKET POLICIES FOR MENU PHOTOS
-- Run this after creating the 'menu-photos' bucket in Supabase Storage

-- Allow only owners to upload
CREATE POLICY "Only owners can upload menu photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'menu-photos' AND
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'OWNER')
);

-- Allow only owners to update
CREATE POLICY "Only owners can update menu photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'menu-photos' AND
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'OWNER')
);

-- Allow only owners to delete
CREATE POLICY "Only owners can delete menu photos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'menu-photos' AND
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'OWNER')
);

-- Allow everyone to view
CREATE POLICY "Anyone can view menu photos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'menu-photos');
