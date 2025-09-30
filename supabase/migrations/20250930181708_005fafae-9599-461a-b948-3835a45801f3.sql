-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  birth_date DATE,
  cpf TEXT,
  balance DECIMAL(10, 2) DEFAULT 0.00,
  credit_score INTEGER DEFAULT 600,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create transactions table
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  to_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('deposit', 'transfer', 'withdrawal')),
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed')),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create fraud_logs table
CREATE TABLE IF NOT EXISTS public.fraud_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  severity TEXT DEFAULT 'low' CHECK (severity IN ('low', 'medium', 'high')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create two_fa_secrets table
CREATE TABLE IF NOT EXISTS public.two_fa_secrets (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  secret TEXT NOT NULL,
  enabled BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fraud_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.two_fa_secrets ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Transactions policies
CREATE POLICY "Users can view their own transactions"
  ON public.transactions FOR SELECT
  USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);

CREATE POLICY "Users can insert transactions"
  ON public.transactions FOR INSERT
  WITH CHECK (auth.uid() = from_user_id OR auth.uid() = to_user_id);

-- Fraud logs policies
CREATE POLICY "Users can view their own fraud logs"
  ON public.fraud_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert fraud logs"
  ON public.fraud_logs FOR INSERT
  WITH CHECK (true);

-- 2FA secrets policies
CREATE POLICY "Users can view their own 2FA secret"
  ON public.two_fa_secrets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own 2FA secret"
  ON public.two_fa_secrets FOR ALL
  USING (auth.uid() = user_id);

-- Create function to update credit score
CREATE OR REPLACE FUNCTION update_credit_score(user_id_param UUID)
RETURNS void AS $$
DECLARE
  user_balance DECIMAL(10, 2);
  transaction_count INTEGER;
  fraud_count INTEGER;
  new_score INTEGER;
BEGIN
  -- Get user balance
  SELECT balance INTO user_balance FROM public.profiles WHERE user_id = user_id_param;
  
  -- Count transactions
  SELECT COUNT(*) INTO transaction_count 
  FROM public.transactions 
  WHERE (from_user_id = user_id_param OR to_user_id = user_id_param) AND status = 'completed';
  
  -- Count fraud logs
  SELECT COUNT(*) INTO fraud_count FROM public.fraud_logs WHERE user_id = user_id_param;
  
  -- Calculate credit score
  new_score := 600 + (user_balance / 10)::INTEGER + (transaction_count * 10) - (fraud_count * 50);
  
  -- Ensure score is between 300 and 850
  IF new_score < 300 THEN
    new_score := 300;
  ELSIF new_score > 850 THEN
    new_score := 850;
  END IF;
  
  -- Update profile
  UPDATE public.profiles SET credit_score = new_score WHERE user_id = user_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to handle new user
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Enable realtime for tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.fraud_logs;