import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Shield } from 'lucide-react';

const TwoFA = () => {
  const [code, setCode] = useState('');
  const [secret, setSecret] = useState('');
  const { setup2FA, verify2FA } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const generatedSecret = setup2FA();
    setSecret(generatedSecret);
  }, []);

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (verify2FA(code)) {
      toast({ title: 'Success', description: '2FA enabled successfully!' });
      navigate('/dashboard');
    } else {
      toast({ title: 'Error', description: 'Invalid code. Use 123456 for demo.', variant: 'destructive' });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-primary text-primary-foreground p-4 rounded-full">
              <Shield className="w-8 h-8" />
            </div>
          </div>
          <CardTitle className="text-2xl text-secondary">Setup 2FA</CardTitle>
          <CardDescription>
            Secure your account with two-factor authentication
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="bg-muted p-4 rounded-lg text-center">
              <p className="text-sm text-muted-foreground mb-2">Your 2FA Secret:</p>
              <p className="font-mono text-lg font-bold break-all">{secret}</p>
              <p className="text-xs text-muted-foreground mt-2">
                (In production, scan QR code with authenticator app)
              </p>
            </div>

            <form onSubmit={handleVerify} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="code">Enter 6-digit code</Label>
                <Input
                  id="code"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  maxLength={6}
                  placeholder="123456"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Demo code: 123456
                </p>
              </div>

              <Button type="submit" className="w-full">
                Verify and Enable 2FA
              </Button>
            </form>

            <Button
              variant="ghost"
              className="w-full"
              onClick={() => navigate('/dashboard')}
            >
              Skip for now
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TwoFA;
