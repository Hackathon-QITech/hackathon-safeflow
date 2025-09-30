import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';
import { ShieldAlert } from 'lucide-react';

interface FraudLog {
  id: string;
  description: string;
  severity: string;
  created_at: string;
}

export default function FraudLogs() {
  const [logs, setLogs] = useState<FraudLog[]>([]);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });
  }, []);

  useEffect(() => {
    if (!user) return;

    const fetchLogs = async () => {
      const { data } = await supabase
        .from('fraud_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (data) setLogs(data);
    };

    fetchLogs();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('fraud-logs-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'fraud_logs',
          filter: `user_id=eq.${user.id}`,
        },
        () => fetchLogs()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'destructive';
      case 'medium':
        return 'default';
      case 'low':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  return (
    <div className="max-w-4xl">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-6 w-6 text-primary" />
            <CardTitle>Anti-Fraud Logs</CardTitle>
          </div>
          <CardDescription>Security alerts and suspicious activity monitoring</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {logs.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No fraud alerts. Your account is secure.
              </p>
            ) : (
              logs.map((log) => (
                <div key={log.id} className="p-4 border rounded-lg">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <p className="font-medium">{log.description}</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {new Date(log.created_at).toLocaleString()}
                      </p>
                    </div>
                    <Badge variant={getSeverityColor(log.severity)}>
                      {log.severity.toUpperCase()}
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}