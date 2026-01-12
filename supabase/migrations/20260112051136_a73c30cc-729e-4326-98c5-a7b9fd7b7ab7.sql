-- Create a secure view that masks contact info for lower-privilege staff
-- Admin/Manager see full contact info, drivers/shovel_crew see NULL for contact fields
CREATE OR REPLACE VIEW public.accounts_secure AS
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
COMMENT ON VIEW public.accounts_secure IS 'Secure view that masks contact information for non-admin/manager roles. Use this for read operations where contact info should be restricted based on role.';