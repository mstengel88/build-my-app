-- Add is_super_admin column to profiles table for secure super admin checking
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_super_admin boolean NOT NULL DEFAULT false;

-- Set the existing super admin
UPDATE public.profiles 
SET is_super_admin = true 
WHERE email = 'matthewstengel69@gmail.com';

-- Create function to check super admin status securely
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_super_admin FROM public.profiles WHERE user_id = _user_id LIMIT 1),
    false
  )
$$;

-- Fix storage policies: Drop duplicates and broken policies
DROP POLICY IF EXISTS "Staff can view work photos" ON storage.objects;
DROP POLICY IF EXISTS "Clients can view their account work photos" ON storage.objects;

-- Recreate staff view policy (single instance)
CREATE POLICY "Staff can view work photos" ON storage.objects
FOR SELECT USING (
  bucket_id = 'work-photos' AND
  is_staff(auth.uid())
);

-- Create correct client access policy that checks work_logs and shovel_work_logs
CREATE POLICY "Clients can view their photos" ON storage.objects
FOR SELECT USING (
  bucket_id = 'work-photos' AND
  (
    EXISTS (
      SELECT 1 FROM public.work_logs wl
      JOIN public.accounts a ON a.id = wl.account_id
      WHERE a.client_user_id = auth.uid()
      AND wl.photo_url = name
    ) 
    OR 
    EXISTS (
      SELECT 1 FROM public.shovel_work_logs swl
      JOIN public.accounts a ON a.id = swl.account_id  
      WHERE a.client_user_id = auth.uid()
      AND swl.photo_url = name
    )
  )
);