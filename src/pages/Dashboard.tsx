import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Wallet, ArrowUpRight, ArrowDownRight, Shield, TrendingUp, LogOut } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const Dashboard = () => {
  const { user, transactions, fraudLogs, logout, deposit, transfer, searchUser } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [depositAmount, setDepositAmount] = useState('');
  const [transferEmail, setTransferEmail] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [searchedUser, setSearchedUser] = useState<any>(null);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
    }
  }, [user, navigate]);

  if (!user) return null;

  const handleDeposit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(depositAmount);
    if (amount > 0) {
      deposit(amount);
      toast({ title: 'Success', description: `Deposited $${amount.toFixed(2)}` });
      setDepositAmount('');
    }
  };

  const handleSearchUser = () => {
    const foundUser = searchUser(transferEmail);
    if (foundUser) {
      setSearchedUser(foundUser);
    } else {
      toast({ title: 'Error', description: 'User not found', variant: 'destructive' });
      setSearchedUser(null);
    }
  };

  const handleTransfer = () => {
    const amount = parseFloat(transferAmount);
    if (amount > 0 && searchedUser) {
      const result = transfer(searchedUser.email, amount);
      if (result.success) {
        toast({ title: 'Success', description: `Transferred $${amount.toFixed(2)} to ${searchedUser.name}` });
        setTransferAmount('');
        setTransferEmail('');
        setSearchedUser(null);
      } else {
        toast({ title: 'Error', description: result.error, variant: 'destructive' });
      }
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/auth');
  };

  const userTransactions = transactions.filter(
    t => t.from_id === user.id || t.to_id === user.id
  );

  const userFraudLogs = fraudLogs.filter(f => f.user_id === user.id);

  return (
    <div className="min-h-screen bg-background">
      <nav className="bg-card border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wallet className="w-6 h-6 text-primary" />
            <span className="text-xl font-bold text-secondary">SafeFlow</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              Welcome, {user.name}
            </span>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Balance</CardTitle>
              <Wallet className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                ${user.balance.toFixed(2)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Credit Score</CardTitle>
              <TrendingUp className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-secondary">
                {user.credit_score}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">2FA Status</CardTitle>
              <Shield className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <Badge variant={user.two_fa_enabled ? 'default' : 'secondary'}>
                {user.two_fa_enabled ? 'Enabled' : 'Disabled'}
              </Badge>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-2 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Deposit Funds</CardTitle>
              <CardDescription>Add money to your wallet</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleDeposit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="depositAmount">Amount ($)</Label>
                  <Input
                    id="depositAmount"
                    type="number"
                    step="0.01"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    placeholder="0.00"
                    required
                  />
                </div>
                <Button type="submit" className="w-full">
                  <ArrowDownRight className="w-4 h-4 mr-2" />
                  Deposit
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>P2P Transfer</CardTitle>
              <CardDescription>Send money to another user</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="transferEmail">Recipient Email</Label>
                <div className="flex gap-2">
                  <Input
                    id="transferEmail"
                    type="email"
                    value={transferEmail}
                    onChange={(e) => setTransferEmail(e.target.value)}
                    placeholder="user@example.com"
                  />
                  <Button onClick={handleSearchUser} variant="outline">
                    Search
                  </Button>
                </div>
              </div>

              {searchedUser && (
                <div className="bg-muted p-3 rounded-lg">
                  <p className="font-medium">{searchedUser.name}</p>
                  <p className="text-sm text-muted-foreground">{searchedUser.email}</p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="transferAmount">Amount ($)</Label>
                <Input
                  id="transferAmount"
                  type="number"
                  step="0.01"
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(e.target.value)}
                  placeholder="0.00"
                  disabled={!searchedUser}
                />
              </div>

              <Button
                onClick={handleTransfer}
                className="w-full"
                disabled={!searchedUser}
              >
                <ArrowUpRight className="w-4 h-4 mr-2" />
                Transfer
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Transaction History</CardTitle>
              <CardDescription>Your recent transactions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {userTransactions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No transactions yet</p>
                ) : (
                  userTransactions.map((t) => (
                    <div key={t.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div>
                        <p className="text-sm font-medium">
                          {t.from_id === user.id ? `To: ${t.to_email}` : `From: ${t.from_email}`}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(t.timestamp).toLocaleString()}
                        </p>
                      </div>
                      <span className={`font-bold ${t.from_id === user.id ? 'text-destructive' : 'text-primary'}`}>
                        {t.from_id === user.id ? '-' : '+'}${t.amount.toFixed(2)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Anti-Fraud Logs</CardTitle>
              <CardDescription>Security alerts and monitoring</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {userFraudLogs.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No fraud alerts</p>
                ) : (
                  userFraudLogs.map((log) => (
                    <div key={log.id} className="p-3 bg-destructive/10 rounded-lg border border-destructive/20">
                      <p className="text-sm font-medium text-destructive">
                        {log.description}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(log.timestamp).toLocaleString()}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
