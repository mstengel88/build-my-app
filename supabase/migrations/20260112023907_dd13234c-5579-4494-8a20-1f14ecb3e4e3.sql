-- Create RLS policies for work-photos storage bucket
CREATE POLICY "Staff can upload work photos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'work-photos' 
  AND public.is_staff(auth.uid())
);

CREATE POLICY "Staff can view work photos"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'work-photos'
  AND public.is_staff(auth.uid())
);

CREATE POLICY "Admins and managers can delete work photos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'work-photos'
  AND public.is_admin_or_manager(auth.uid())
);