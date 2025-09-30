import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';
import { Send, Search } from 'lucide-react';

interface SearchedUser {
  id: string;
  user_id: string;
  name: string;
}

export default function Transfer() {
  const [searchEmail, setSearchEmail] = useState('');
  const [amount, setAmount] = useState('');
  const [searchedUser, setSearchedUser] = useState<SearchedUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });
  }, []);

  const handleSearch = async () => {
    if (!searchEmail) return;

    setLoading(true);
    try {
      // Search by querying profiles joined with auth data
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .limit(100);

      if (error) throw error;

      // Note: In production, you'd want server-side search with proper email matching
      // For now, we'll search through profile names or use a different approach
      toast({
        title: 'Info',
        description: 'Please enter the exact user ID or email for P2P transfers',
        variant: 'default',
      });
      
      setSearchedUser(null);
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

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !searchedUser) return;

    setLoading(true);
    try {
      const transferAmount = parseFloat(amount);
      if (isNaN(transferAmount) || transferAmount <= 0) {
        toast({
          title: 'Error',
          description: 'Please enter a valid amount',
          variant: 'destructive',
        });
        return;
      }

      // Get sender's balance
      const { data: senderProfile } = await supabase
        .from('profiles')
        .select('balance')
        .eq('user_id', user.id)
        .single();

      if (!senderProfile) throw new Error('Profile not found');

      if (Number(senderProfile.balance) < transferAmount) {
        toast({
          title: 'Error',
          description: 'Insufficient balance',
          variant: 'destructive',
        });
        return;
      }

      // Check for suspicious activity (high transfer amount)
      if (transferAmount > 10000) {
        await supabase.from('fraud_logs').insert({
          user_id: user.id,
          description: `High transfer amount: $${transferAmount}`,
          severity: 'high',
        });
      }

      // Update sender's balance
      await supabase
        .from('profiles')
        .update({ balance: Number(senderProfile.balance) - transferAmount })
        .eq('user_id', user.id);

      // Get receiver's balance
      const { data: receiverProfile } = await supabase
        .from('profiles')
        .select('balance')
        .eq('user_id', searchedUser.user_id)
        .single();

      if (!receiverProfile) throw new Error('Receiver profile not found');

      // Update receiver's balance
      await supabase
        .from('profiles')
        .update({ balance: Number(receiverProfile.balance) + transferAmount })
        .eq('user_id', searchedUser.user_id);

      // Log transaction
      await supabase.from('transactions').insert({
        from_user_id: user.id,
        to_user_id: searchedUser.user_id,
        amount: transferAmount,
        type: 'transfer',
        status: 'completed',
        description: `Transfer to ${searchedUser.name}`,
      });

      // Update credit scores for both users
      await supabase.rpc('update_credit_score', { user_id_param: user.id });
      await supabase.rpc('update_credit_score', { user_id_param: searchedUser.user_id });

      toast({
        title: 'Success',
        description: `Transferred $${transferAmount.toFixed(2)} to ${searchedUser.name}`,
      });

      setAmount('');
      setSearchEmail('');
      setSearchedUser(null);
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
    <div className="max-w-2xl space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Search className="h-6 w-6 text-primary" />
            <CardTitle>Search User</CardTitle>
          </div>
          <CardDescription>Find a user to transfer money to</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              type="email"
              value={searchEmail}
              onChange={(e) => setSearchEmail(e.target.value)}
              placeholder="Enter email address"
            />
            <Button onClick={handleSearch} disabled={loading || !searchEmail}>
              {loading ? 'Searching...' : 'Search'}
            </Button>
          </div>

          {searchedUser && (
            <div className="mt-4 p-4 border rounded-lg bg-muted/50">
              <p className="font-medium">{searchedUser.name}</p>
              <p className="text-sm text-muted-foreground">User found</p>
            </div>
          )}
        </CardContent>
      </Card>

      {searchedUser && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Send className="h-6 w-6 text-primary" />
              <CardTitle>Transfer Money</CardTitle>
            </div>
            <CardDescription>Send money to {searchedUser.name}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleTransfer} className="space-y-4">
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
                {loading ? 'Processing...' : 'Transfer'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}