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

interface TransferResult {
  success: boolean;
  error?: string;
  transaction_id?: string;
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
      // Use secure database function for user search
      const { data, error } = await supabase.rpc('search_user_by_email', {
        p_email: searchEmail.trim().toLowerCase(),
      });

      if (error) throw error;

      if (data && data.length > 0) {
        setSearchedUser({
          id: data[0].id,
          user_id: data[0].user_id,
          name: data[0].name,
        });
        toast({
          title: 'User Found',
          description: `Found ${data[0].name}`,
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

      // Use the atomic transfer RPC function with proper transaction handling
      const { data, error } = await supabase.rpc('execute_transfer', {
        p_from_user_id: user.id,
        p_to_user_id: searchedUser.user_id,
        p_amount: transferAmount,
        p_description: `Transfer to ${searchedUser.name}`,
      });

      if (error) throw error;

      const result = data as unknown as TransferResult;

      if (result && result.success) {
        toast({
          title: 'Success',
          description: `Transferred $${transferAmount.toFixed(2)} to ${searchedUser.name}`,
        });

        setAmount('');
        setSearchEmail('');
        setSearchedUser(null);
      } else {
        toast({
          title: 'Error',
          description: result?.error || 'Transfer failed',
          variant: 'destructive',
        });
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