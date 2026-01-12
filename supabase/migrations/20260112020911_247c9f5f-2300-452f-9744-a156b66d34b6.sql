-- Fix: Make work-photos bucket private
UPDATE storage.buckets 
SET public = false 
WHERE id = 'work-photos';

-- Drop the overly permissive public read policy
DROP POLICY IF EXISTS "Anyone can view work photos" ON storage.objects;

-- Create restrictive SELECT policy for staff and clients only
CREATE POLICY "Staff can view all work photos" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'work-photos' AND 
  public.is_staff(auth.uid())
);

CREATE POLICY "Clients can view their account work photos" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'work-photos' AND 
  EXISTS (
    SELECT 1 FROM public.accounts a
    WHERE a.client_user_id = auth.uid()
    AND name LIKE a.id::text || '/%'
  )
);