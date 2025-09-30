import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import * as OTPAuth from 'otpauth';
import QRCode from 'qrcode';

const TwoFA = () => {
  const [code, setCode] = useState('');
  const [secret, setSecret] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const setupTwoFA = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }

      // Check if 2FA is already set up
      const { data: existingSecret } = await supabase
        .from('two_fa_secrets')
        .select('*')
        .eq('user_id', user.id)
        .single();

      let totpSecret = existingSecret?.secret;

      if (!totpSecret) {
        // Generate new secret
        const totp = new OTPAuth.TOTP({
          issuer: 'SafeFlow',
          label: user.email,
          algorithm: 'SHA1',
          digits: 6,
          period: 30,
        });

        totpSecret = totp.secret.base32;

        // Save to database
        await supabase.from('two_fa_secrets').insert({
          user_id: user.id,
          secret: totpSecret,
          enabled: false,
        });

        setSecret(totpSecret);

        // Generate QR code
        const otpauthUrl = totp.toString();
        const qrCode = await QRCode.toDataURL(otpauthUrl);
        setQrCodeUrl(qrCode);
      } else {
        setSecret(totpSecret);
        const totp = new OTPAuth.TOTP({
          issuer: 'SafeFlow',
          label: user.email,
          algorithm: 'SHA1',
          digits: 6,
          period: 30,
          secret: totpSecret,
        });
        const otpauthUrl = totp.toString();
        const qrCode = await QRCode.toDataURL(otpauthUrl);
        setQrCodeUrl(qrCode);
      }
    };

    setupTwoFA();
  }, [navigate]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      // Verify the code
      const totp = new OTPAuth.TOTP({
        issuer: 'SafeFlow',
        label: user.email,
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        secret: secret,
      });

      const delta = totp.validate({ token: code, window: 1 });

      if (delta === null) {
        toast({
          title: 'Error',
          description: 'Invalid code. Please try again.',
          variant: 'destructive',
        });
        return;
      }

      // Enable 2FA
      await supabase
        .from('two_fa_secrets')
        .update({ enabled: true })
        .eq('user_id', user.id);

      toast({
        title: 'Success',
        description: '2FA enabled successfully!',
      });

      navigate('/dashboard');
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
          <CardTitle className="text-2xl text-secondary">Two-Factor Authentication</CardTitle>
          <CardDescription>Scan the QR code with your authenticator app</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {qrCodeUrl && (
              <div className="flex flex-col items-center space-y-4">
                <img src={qrCodeUrl} alt="QR Code" className="border rounded-lg p-2" />
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-2">Or enter this code manually:</p>
                  <code className="bg-muted px-3 py-1 rounded text-sm font-mono break-all">
                    {secret}
                  </code>
                </div>
              </div>
            )}

            <form onSubmit={handleVerify} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="code">Enter 6-digit code</Label>
                <Input
                  id="code"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  maxLength={6}
                  required
                  placeholder="000000"
                  className="text-center text-2xl tracking-widest"
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading || code.length !== 6}>
                {loading ? 'Verifying...' : 'Verify & Enable'}
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
