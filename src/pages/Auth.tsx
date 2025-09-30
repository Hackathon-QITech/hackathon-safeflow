import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Wallet } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { PasswordStrength } from '@/components/PasswordStrength';

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [cpf, setCpf] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate('/dashboard');
      }
    });
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        // Check if 2FA is enabled
        const { data: twoFAData } = await supabase
          .from('two_fa_secrets')
          .select('enabled')
          .eq('user_id', data.user.id)
          .single();

        if (twoFAData?.enabled) {
          navigate('/auth/2fa');
        } else {
          navigate('/dashboard');
        }
      } else {
        // Validation
        if (password !== confirmPassword) {
          toast({
            title: 'Error',
            description: 'Passwords do not match',
            variant: 'destructive',
          });
          return;
        }

        // Enforce strong password requirements
        if (password.length < 8) {
          toast({
            title: 'Weak Password',
            description: 'Password must be at least 8 characters',
            variant: 'destructive',
          });
          return;
        }

        // Check password strength
        const hasUpperCase = /[A-Z]/.test(password);
        const hasLowerCase = /[a-z]/.test(password);
        const hasNumber = /\d/.test(password);
        
        if (!hasUpperCase || !hasLowerCase || !hasNumber) {
          toast({
            title: 'Weak Password',
            description: 'Password must contain uppercase, lowercase, and numbers',
            variant: 'destructive',
          });
          return;
        }

        if (!cpf || cpf.length !== 11) {
          toast({
            title: 'Error',
            description: 'CPF must be 11 digits',
            variant: 'destructive',
          });
          return;
        }

        const { error: signUpError, data } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              name,
              birth_date: birthDate,
              cpf,
            },
            emailRedirectTo: `${window.location.origin}/dashboard`,
          },
        });

        if (signUpError) throw signUpError;

        // Update profile with additional info
        if (data.user) {
          await supabase
            .from('profiles')
            .update({ birth_date: birthDate, cpf })
            .eq('user_id', data.user.id);
        }

        toast({
          title: 'Success',
          description: 'Account created! You can now login.',
        });
        setIsLogin(true);
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
        },
      });

      if (error) throw error;
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-primary text-primary-foreground p-4 rounded-full">
              <Wallet className="w-8 h-8" />
            </div>
          </div>
          <CardTitle className="text-3xl text-secondary">SafeFlow</CardTitle>
          <CardDescription>
            {isLogin ? 'Login to your account' : 'Create a new account'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
              />
              {!isLogin && <PasswordStrength password={password} />}
            </div>

            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={8}
                />
              </div>
            )}

            {!isLogin && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="birthDate">Birth Date</Label>
                  <Input
                    id="birthDate"
                    type="date"
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cpf">CPF (11 digits)</Label>
                  <Input
                    id="cpf"
                    value={cpf}
                    onChange={(e) => setCpf(e.target.value.replace(/\D/g, ''))}
                    maxLength={11}
                    required
                  />
                </div>
              </>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Loading...' : isLogin ? 'Login' : 'Register'}
            </Button>
          </form>

          <div className="mt-4">
            <Button variant="outline" className="w-full" onClick={handleGoogleLogin} disabled={loading}>
              {loading ? 'Loading...' : 'Continue with Google'}
            </Button>
          </div>

          <div className="mt-4 text-center">
            <Button
              variant="link"
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm"
            >
              {isLogin ? 'Create account' : 'Already have account'}
            </Button>
          </div>

          <div className="mt-6 text-center text-sm text-muted-foreground space-x-4">
            <a href="/privacy-policy" className="hover:text-primary">
              Privacy Policy
            </a>
            <a href="/terms-of-service" className="hover:text-primary">
              Terms of Service
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
