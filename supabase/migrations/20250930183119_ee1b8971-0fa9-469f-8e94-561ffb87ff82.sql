-- Add storage bucket for avatars with proper security
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  2097152, -- 2MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = 2097152,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

-- Storage policies for avatars
CREATE POLICY "Users can upload their own avatar"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own avatar"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own avatar"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Avatar images are publicly accessible"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'avatars');

-- Add validation constraints
ALTER TABLE public.profiles
ADD CONSTRAINT cpf_format CHECK (cpf ~ '^\d{11}$' OR cpf IS NULL),
ADD CONSTRAINT balance_non_negative CHECK (balance >= 0);

ALTER TABLE public.transactions
ADD CONSTRAINT amount_positive CHECK (amount > 0),
ADD CONSTRAINT amount_reasonable CHECK (amount <= 100000);

-- Improve fraud detection with more granular severity levels
ALTER TABLE public.fraud_logs
DROP CONSTRAINT IF EXISTS fraud_logs_severity_check;

ALTER TABLE public.fraud_logs
ADD CONSTRAINT fraud_logs_severity_check 
CHECK (severity IN ('low', 'medium', 'high', 'critical'));

-- Create function for enhanced fraud detection
CREATE OR REPLACE FUNCTION public.check_fraud_patterns(user_id_param uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recent_transfer_count INTEGER;
  recent_transfer_total DECIMAL(10, 2);
BEGIN
  -- Check for velocity-based fraud (multiple rapid transactions)
  SELECT COUNT(*), COALESCE(SUM(amount), 0)
  INTO recent_transfer_count, recent_transfer_total
  FROM public.transactions
  WHERE from_user_id = user_id_param
    AND created_at > NOW() - INTERVAL '1 hour'
    AND status = 'completed';
  
  -- Log if user made too many transfers in short time
  IF recent_transfer_count >= 5 THEN
    INSERT INTO public.fraud_logs (user_id, description, severity)
    VALUES (
      user_id_param,
      'High velocity detected: ' || recent_transfer_count || ' transfers in 1 hour',
      'high'
    );
  END IF;
  
  -- Log if total transfer amount is suspicious
  IF recent_transfer_total >= 5000 THEN
    INSERT INTO public.fraud_logs (user_id, description, severity)
    VALUES (
      user_id_param,
      'High volume detected: $' || recent_transfer_total || ' transferred in 1 hour',
      'critical'
    );
  END IF;
END;
$$;

-- Add trigger to check fraud patterns on transactions
CREATE OR REPLACE FUNCTION public.trigger_fraud_check()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check for high-value transfers
  IF NEW.amount >= 1000 THEN
    INSERT INTO public.fraud_logs (user_id, description, severity)
    VALUES (
      NEW.from_user_id,
      'High value transfer: $' || NEW.amount,
      CASE
        WHEN NEW.amount >= 10000 THEN 'critical'
        WHEN NEW.amount >= 5000 THEN 'high'
        ELSE 'medium'
      END
    );
  END IF;
  
  -- Run velocity checks
  PERFORM public.check_fraud_patterns(NEW.from_user_id);
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER check_fraud_on_transaction
AFTER INSERT ON public.transactions
FOR EACH ROW
EXECUTE FUNCTION public.trigger_fraud_check();