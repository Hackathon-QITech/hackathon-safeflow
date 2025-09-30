import { useMemo } from 'react';
import { Progress } from '@/components/ui/progress';

interface PasswordStrengthProps {
  password: string;
}

export const PasswordStrength = ({ password }: PasswordStrengthProps) => {
  const strength = useMemo(() => {
    if (!password) return { score: 0, label: '', color: '' };
    
    let score = 0;
    
    // Length
    if (password.length >= 8) score += 25;
    if (password.length >= 12) score += 25;
    
    // Complexity
    if (/[a-z]/.test(password)) score += 12.5;
    if (/[A-Z]/.test(password)) score += 12.5;
    if (/[0-9]/.test(password)) score += 12.5;
    if (/[^a-zA-Z0-9]/.test(password)) score += 12.5;
    
    if (score <= 25) return { score, label: 'Weak', color: 'bg-destructive' };
    if (score <= 50) return { score, label: 'Fair', color: 'bg-orange-500' };
    if (score <= 75) return { score, label: 'Good', color: 'bg-yellow-500' };
    return { score, label: 'Strong', color: 'bg-green-500' };
  }, [password]);

  if (!password) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Password strength:</span>
        <span className={`font-medium ${
          strength.label === 'Weak' ? 'text-destructive' :
          strength.label === 'Fair' ? 'text-orange-500' :
          strength.label === 'Good' ? 'text-yellow-500' :
          'text-green-500'
        }`}>
          {strength.label}
        </span>
      </div>
      <Progress value={strength.score} className="h-2" />
    </div>
  );
};