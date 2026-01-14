-- Add DELETE policy for time_clock table so admins can delete shifts
CREATE POLICY "Admin can delete time clock entries"
ON public.time_clock
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));