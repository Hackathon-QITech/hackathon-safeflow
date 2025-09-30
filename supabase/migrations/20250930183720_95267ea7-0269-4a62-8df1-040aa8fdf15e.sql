-- Fix fraud_logs INSERT policy to restrict access to system only
DROP POLICY IF EXISTS "System can insert fraud logs" ON public.fraud_logs;

CREATE POLICY "System can insert fraud logs" 
ON public.fraud_logs 
FOR INSERT 
WITH CHECK (false);

-- Create a security definer function to insert fraud logs (bypasses RLS)
CREATE OR REPLACE FUNCTION public.insert_fraud_log(
  p_user_id UUID,
  p_description TEXT,
  p_severity TEXT DEFAULT 'low'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.fraud_logs (user_id, description, severity)
  VALUES (p_user_id, p_description, p_severity);
END;
$$;

-- Create atomic transfer function with proper transaction handling
CREATE OR REPLACE FUNCTION public.execute_transfer(
  p_from_user_id UUID,
  p_to_user_id UUID,
  p_amount DECIMAL(10, 2),
  p_description TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_from_balance DECIMAL(10, 2);
  v_transaction_id UUID;
BEGIN
  -- Validate amount
  IF p_amount <= 0 THEN
    RETURN json_build_object('success', false, 'error', 'Invalid amount');
  END IF;
  
  IF p_amount > 100000 THEN
    RETURN json_build_object('success', false, 'error', 'Amount exceeds maximum limit');
  END IF;
  
  -- Prevent self-transfers
  IF p_from_user_id = p_to_user_id THEN
    RETURN json_build_object('success', false, 'error', 'Cannot transfer to yourself');
  END IF;
  
  -- Lock and check sender balance (prevents race conditions)
  SELECT balance INTO v_from_balance
  FROM public.profiles
  WHERE user_id = p_from_user_id
  FOR UPDATE;
  
  IF v_from_balance IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Sender profile not found');
  END IF;
  
  IF v_from_balance < p_amount THEN
    RETURN json_build_object('success', false, 'error', 'Insufficient balance');
  END IF;
  
  -- Verify receiver exists (with lock)
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = p_to_user_id
    FOR UPDATE
  ) THEN
    RETURN json_build_object('success', false, 'error', 'Receiver not found');
  END IF;
  
  -- Update balances atomically
  UPDATE public.profiles
  SET balance = balance - p_amount
  WHERE user_id = p_from_user_id;
  
  UPDATE public.profiles
  SET balance = balance + p_amount
  WHERE user_id = p_to_user_id;
  
  -- Insert transaction record
  INSERT INTO public.transactions (from_user_id, to_user_id, amount, type, description, status)
  VALUES (p_from_user_id, p_to_user_id, p_amount, 'transfer', p_description, 'completed')
  RETURNING id INTO v_transaction_id;
  
  -- Update credit scores
  PERFORM public.update_credit_score(p_from_user_id);
  PERFORM public.update_credit_score(p_to_user_id);
  
  -- Check fraud patterns (using security definer function)
  PERFORM public.check_fraud_patterns(p_from_user_id);
  
  RETURN json_build_object(
    'success', true, 
    'transaction_id', v_transaction_id
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Update check_fraud_patterns to use the new insert function
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
    PERFORM public.insert_fraud_log(
      user_id_param,
      'High velocity detected: ' || recent_transfer_count || ' transfers in 1 hour',
      'high'
    );
  END IF;
  
  -- Log if total transfer amount is suspicious
  IF recent_transfer_total >= 5000 THEN
    PERFORM public.insert_fraud_log(
      user_id_param,
      'High volume detected: $' || recent_transfer_total || ' transferred in 1 hour',
      'critical'
    );
  END IF;
END;
$$;

-- Update trigger_fraud_check to use the new insert function
CREATE OR REPLACE FUNCTION public.trigger_fraud_check()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check for high-value transfers
  IF NEW.amount >= 1000 THEN
    PERFORM public.insert_fraud_log(
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

-- Create function to search users by email securely
CREATE OR REPLACE FUNCTION public.search_user_by_email(p_email TEXT)
RETURNS TABLE(user_id UUID, name TEXT, id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Validate email format
  IF p_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' THEN
    RETURN;
  END IF;
  
  -- Search in auth.users and join with profiles
  -- Only return exact matches to prevent user enumeration
  RETURN QUERY
  SELECT p.user_id, p.name, p.id
  FROM public.profiles p
  INNER JOIN auth.users u ON u.id = p.user_id
  WHERE u.email = p_email
  AND u.id != auth.uid() -- Don't return the searching user
  LIMIT 1;
END;
$$;

-- Add rate limiting table for authentication attempts
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_identifier TEXT NOT NULL,
  action_type TEXT NOT NULL,
  attempt_count INTEGER DEFAULT 1,
  last_attempt TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_identifier, action_type)
);

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "System can manage rate limits"
ON public.rate_limits
FOR ALL
USING (false)
WITH CHECK (false);

-- Function to check rate limit
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_identifier TEXT,
  p_action TEXT,
  p_max_attempts INTEGER DEFAULT 5,
  p_window_minutes INTEGER DEFAULT 15
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
  v_last_attempt TIMESTAMP WITH TIME ZONE;
BEGIN
  SELECT attempt_count, last_attempt
  INTO v_count, v_last_attempt
  FROM public.rate_limits
  WHERE user_identifier = p_identifier
    AND action_type = p_action;
  
  IF v_count IS NULL THEN
    -- First attempt
    INSERT INTO public.rate_limits (user_identifier, action_type, attempt_count)
    VALUES (p_identifier, p_action, 1);
    RETURN TRUE;
  END IF;
  
  -- Check if window has expired
  IF v_last_attempt < NOW() - (p_window_minutes || ' minutes')::INTERVAL THEN
    -- Reset counter
    UPDATE public.rate_limits
    SET attempt_count = 1, last_attempt = NOW()
    WHERE user_identifier = p_identifier AND action_type = p_action;
    RETURN TRUE;
  END IF;
  
  -- Check if limit exceeded
  IF v_count >= p_max_attempts THEN
    RETURN FALSE;
  END IF;
  
  -- Increment counter
  UPDATE public.rate_limits
  SET attempt_count = attempt_count + 1, last_attempt = NOW()
  WHERE user_identifier = p_identifier AND action_type = p_action;
  
  RETURN TRUE;
END;
$$;