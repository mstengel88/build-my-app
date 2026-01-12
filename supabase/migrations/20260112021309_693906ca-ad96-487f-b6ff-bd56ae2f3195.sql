-- Add explicit authentication check to work_logs SELECT policies
-- Drop and recreate policies with explicit auth.uid() IS NOT NULL check

DROP POLICY IF EXISTS "Staff can view all work logs" ON public.work_logs;
CREATE POLICY "Staff can view all work logs" 
ON public.work_logs 
FOR SELECT 
USING (auth.uid() IS NOT NULL AND is_staff(auth.uid()));

DROP POLICY IF EXISTS "Clients can view their account work logs" ON public.work_logs;
CREATE POLICY "Clients can view their account work logs" 
ON public.work_logs 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL AND 
  EXISTS (
    SELECT 1 FROM accounts
    WHERE accounts.id = work_logs.account_id 
    AND accounts.client_user_id = auth.uid()
  )
);

-- Also fix shovel_work_logs for consistency
DROP POLICY IF EXISTS "Staff can view all shovel work logs" ON public.shovel_work_logs;
CREATE POLICY "Staff can view all shovel work logs" 
ON public.shovel_work_logs 
FOR SELECT 
USING (auth.uid() IS NOT NULL AND is_staff(auth.uid()));

DROP POLICY IF EXISTS "Clients can view their account shovel work logs" ON public.shovel_work_logs;
CREATE POLICY "Clients can view their account shovel work logs" 
ON public.shovel_work_logs 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL AND 
  EXISTS (
    SELECT 1 FROM accounts
    WHERE accounts.id = shovel_work_logs.account_id 
    AND accounts.client_user_id = auth.uid()
  )
);