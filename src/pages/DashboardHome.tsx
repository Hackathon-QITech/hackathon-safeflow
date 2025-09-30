import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from '@/hooks/useProfile';
import { User } from '@supabase/supabase-js';
import { CryptoChart } from '@/components/CryptoChart';
import { Wallet, TrendingUp, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface Transaction {
  id: string;
  from_user_id: string | null;
  to_user_id: string;
  amount: number;
  type: string;
  description: string | null;
  created_at: string;
}

export default function DashboardHome() {
  const [user, setUser] = useState<User | null>(null);
  const { profile } = useProfile(user);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });
  }, []);

  useEffect(() => {
    if (!user) return;

    const fetchTransactions = async () => {
      const { data } = await supabase
        .from('transactions')
        .select('*')
        .or(`from_user_id.eq.${user.id},to_user_id.eq.${user.id}`)
        .order('created_at', { ascending: false })
        .limit(10);

      if (data) setTransactions(data);
    };

    fetchTransactions();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('transactions-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transactions',
          filter: `to_user_id=eq.${user.id}`,
        },
        () => fetchTransactions()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  if (!profile) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Balance</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              ${Number(profile.balance).toFixed(2)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Credit Score</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-secondary">{profile.credit_score}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {profile.credit_score >= 750 ? 'Excellent' : 
               profile.credit_score >= 650 ? 'Good' : 
               profile.credit_score >= 550 ? 'Fair' : 'Poor'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Transactions</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{transactions.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Total transactions</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Transaction History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {transactions.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No transactions yet</p>
              ) : (
                transactions.map((transaction) => (
                  <div key={transaction.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      {transaction.type === 'deposit' ? (
                        <ArrowDownRight className="h-5 w-5 text-green-600" />
                      ) : (
                        <ArrowUpRight className="h-5 w-5 text-red-600" />
                      )}
                      <div>
                        <p className="font-medium capitalize">{transaction.type}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(transaction.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className={`font-semibold ${
                      transaction.to_user_id === user?.id ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {transaction.to_user_id === user?.id ? '+' : '-'}
                      ${Number(transaction.amount).toFixed(2)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <CryptoChart />
      </div>
    </div>
  );
}