-- Function to link employee to user based on email
CREATE OR REPLACE FUNCTION public.link_employee_to_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  matching_user_id uuid;
BEGIN
  -- Only proceed if employee has an email and no user_id yet
  IF NEW.email IS NOT NULL AND NEW.user_id IS NULL THEN
    -- Find a user with matching email from profiles
    SELECT user_id INTO matching_user_id
    FROM public.profiles
    WHERE LOWER(email) = LOWER(NEW.email)
    LIMIT 1;
    
    -- If found, link the employee to the user
    IF matching_user_id IS NOT NULL THEN
      NEW.user_id := matching_user_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Function to link user to employee when profile is created/updated
CREATE OR REPLACE FUNCTION public.link_user_to_employee()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update any employee with matching email that doesn't have a user_id
  IF NEW.email IS NOT NULL THEN
    UPDATE public.employees
    SET user_id = NEW.user_id
    WHERE LOWER(email) = LOWER(NEW.email)
      AND user_id IS NULL;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger on employees table for insert/update
DROP TRIGGER IF EXISTS trigger_link_employee_to_user ON public.employees;
CREATE TRIGGER trigger_link_employee_to_user
  BEFORE INSERT OR UPDATE OF email ON public.employees
  FOR EACH ROW
  EXECUTE FUNCTION public.link_employee_to_user();

-- Trigger on profiles table for insert/update
DROP TRIGGER IF EXISTS trigger_link_user_to_employee ON public.profiles;
CREATE TRIGGER trigger_link_user_to_employee
  AFTER INSERT OR UPDATE OF email ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.link_user_to_employee();

-- Also run a one-time update to link existing employees to users
UPDATE public.employees e
SET user_id = p.user_id
FROM public.profiles p
WHERE LOWER(e.email) = LOWER(p.email)
  AND e.user_id IS NULL;