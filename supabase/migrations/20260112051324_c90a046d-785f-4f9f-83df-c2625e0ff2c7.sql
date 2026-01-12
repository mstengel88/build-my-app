-- Drop and recreate the view without SECURITY DEFINER (use SECURITY INVOKER which is the default)
-- This ensures the view respects the RLS policies of the querying user
DROP VIEW IF EXISTS public.accounts_secure;

CREATE VIEW public.accounts_secure 
WITH (security_invoker = true) AS
SELECT 
  id, 
  name, 
  address, 
  city, 
  state, 
  zip, 
  latitude, 
  longitude, 
  priority, 
  service_type, 
  status, 
  notes, 
  client_user_id, 
  created_at, 
  updated_at,
  -- Mask contact info for non-admin/manager roles
  CASE WHEN is_admin_or_manager(auth.uid()) THEN contact_name ELSE NULL END as contact_name,
  CASE WHEN is_admin_or_manager(auth.uid()) THEN contact_email ELSE NULL END as contact_email,
  CASE WHEN is_admin_or_manager(auth.uid()) THEN contact_phone ELSE NULL END as contact_phone
FROM accounts;

-- Grant select access on the view to authenticated users
GRANT SELECT ON public.accounts_secure TO authenticated;

-- Add comment explaining the view's purpose
COMMENT ON VIEW public.accounts_secure IS 'Secure view that masks contact information for non-admin/manager roles. Uses SECURITY INVOKER to respect RLS policies of the querying user.';