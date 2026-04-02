-- Function to link employee to user based on email
CREATE OR REPLACE FUNCTION public.link_employee_to_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  matching_user_id uuid;
BEGIN
  -- Only proceed if email is set and user_id is null
  IF NEW.email IS NOT NULL AND NEW.user_id IS NULL THEN
    -- Find matching user by email
    SELECT user_id INTO matching_user_id
    FROM public.profiles
    WHERE LOWER(email) = LOWER(NEW.email)
    LIMIT 1;
    
    IF matching_user_id IS NOT NULL THEN
      NEW.user_id := matching_user_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Function to link user to employee when user signs up
CREATE OR REPLACE FUNCTION public.link_user_to_employee()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update employee with matching email to set user_id
  UPDATE public.employees
  SET user_id = NEW.user_id
  WHERE LOWER(email) = LOWER(NEW.email)
    AND user_id IS NULL;
  
  RETURN NEW;
END;
$$;

-- Trigger to link employee to user when employee is created/updated
CREATE TRIGGER link_employee_to_user_trigger
BEFORE INSERT OR UPDATE OF email ON public.employees
FOR EACH ROW
EXECUTE FUNCTION public.link_employee_to_user();

-- Trigger to link user to employee when profile is created
CREATE TRIGGER link_user_to_employee_trigger
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.link_user_to_employee();

-- Also run a one-time update to link existing employees to existing users
UPDATE public.employees e
SET user_id = p.user_id
FROM public.profiles p
WHERE LOWER(e.email) = LOWER(p.email)
  AND e.user_id IS NULL;