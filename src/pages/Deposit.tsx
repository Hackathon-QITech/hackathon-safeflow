import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';
import { Wallet } from 'lucide-react';

export default function Deposit() {
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });
  }, []);

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      const depositAmount = parseFloat(amount);
      if (isNaN(depositAmount) || depositAmount <= 0) {
        toast({
          title: 'Error',
          description: 'Please enter a valid amount',
          variant: 'destructive',
        });
        return;
      }

      // Get current balance
      const { data: profile } = await supabase
        .from('profiles')
        .select('balance')
        .eq('user_id', user.id)
        .single();

      if (!profile) throw new Error('Profile not found');

      // Update balance
      const newBalance = Number(profile.balance) + depositAmount;
      await supabase
        .from('profiles')
        .update({ balance: newBalance })
        .eq('user_id', user.id);

      // Log transaction
      await supabase.from('transactions').insert({
        to_user_id: user.id,
        amount: depositAmount,
        type: 'deposit',
        status: 'completed',
        description: 'Account deposit',
      });

      // Update credit score
      await supabase.rpc('update_credit_score', { user_id_param: user.id });

      toast({
        title: 'Success',
        description: `Deposited $${depositAmount.toFixed(2)} successfully!`,
      });

      setAmount('');
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
    <div className="max-w-2xl">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Wallet className="h-6 w-6 text-primary" />
            <CardTitle>Deposit Funds</CardTitle>
          </div>
          <CardDescription>Add money to your SafeFlow wallet</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleDeposit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount (USD)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Processing...' : 'Deposit'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}