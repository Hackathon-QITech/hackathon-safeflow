import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';
import { Send, Search, AlertTriangle } from 'lucide-react';
import { z } from 'zod';

const transferSchema = z.object({
  amount: z.number().positive('Amount must be positive').max(100000, 'Amount exceeds maximum limit'),
  receiverId: z.string().uuid('Invalid receiver ID'),
});

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

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(searchEmail)) {
      toast({
        title: 'Error',
        description: 'Please enter a valid email address',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      // Use secure server-side search via edge function
      const { data, error } = await supabase.functions.invoke('search-users', {
        body: { email: searchEmail },
      });

      if (error) throw error;

      if (data?.user) {
        setSearchedUser(data.user);
        toast({
          title: 'User Found',
          description: `Found ${data.user.name}`,
        });
      } else {
        setSearchedUser(null);
        toast({
          title: 'Not Found',
          description: 'No user found with this email address',
          variant: 'default',
        });
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
      setSearchedUser(null);
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
      
      // Validate transfer data with zod
      const validation = transferSchema.safeParse({
        amount: transferAmount,
        receiverId: searchedUser.user_id,
      });

      if (!validation.success) {
        toast({
          title: 'Validation Error',
          description: validation.error.errors[0].message,
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      // Prevent self-transfer
      if (searchedUser.user_id === user.id) {
        toast({
          title: 'Error',
          description: 'You cannot transfer money to yourself',
          variant: 'destructive',
        });
        setLoading(false);
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

      // Fraud detection is now handled by database triggers automatically

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