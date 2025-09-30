-- Fix security warning by setting search_path for update_credit_score function
CREATE OR REPLACE FUNCTION update_credit_score(user_id_param UUID)
RETURNS void AS $$
DECLARE
  user_balance DECIMAL(10, 2);
  transaction_count INTEGER;
  fraud_count INTEGER;
  new_score INTEGER;
BEGIN
  SELECT balance INTO user_balance FROM public.profiles WHERE user_id = user_id_param;
  SELECT COUNT(*) INTO transaction_count 
  FROM public.transactions 
  WHERE (from_user_id = user_id_param OR to_user_id = user_id_param) AND status = 'completed';
  SELECT COUNT(*) INTO fraud_count FROM public.fraud_logs WHERE user_id = user_id_param;
  new_score := 600 + (user_balance / 10)::INTEGER + (transaction_count * 10) - (fraud_count * 50);
  IF new_score < 300 THEN
    new_score := 300;
  ELSIF new_score > 850 THEN
    new_score := 850;
  END IF;
  UPDATE public.profiles SET credit_score = new_score WHERE user_id = user_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fix security warning by setting search_path for handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, name, balance, credit_score)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    0.00,
    600
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;