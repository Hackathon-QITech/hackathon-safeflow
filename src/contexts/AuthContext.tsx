import React, { createContext, useContext, useState, useEffect } from 'react';

interface User {
  id: string;
  email: string;
  name: string;
  birth_date?: string;
  cpf?: string;
  balance: number;
  two_fa_enabled: boolean;
  two_fa_secret?: string;
  credit_score: number;
  google_login?: boolean;
}

interface Transaction {
  id: string;
  from_id: string;
  to_id: string;
  from_email: string;
  to_email: string;
  amount: number;
  timestamp: string;
  status: string;
}

interface FraudLog {
  id: string;
  user_id: string;
  description: string;
  timestamp: string;
}

interface AuthContextType {
  user: User | null;
  users: User[];
  transactions: Transaction[];
  fraudLogs: FraudLog[];
  login: (email: string, password: string) => Promise<{ success: boolean; needsTwoFA?: boolean; error?: string }>;
  register: (email: string, password: string, name: string, birth_date: string, cpf: string) => Promise<{ success: boolean; error?: string }>;
  googleLogin: (email: string, name: string) => Promise<{ success: boolean; needsProfile?: boolean }>;
  logout: () => void;
  setup2FA: () => string;
  verify2FA: (code: string) => boolean;
  completeProfile: (birth_date: string, cpf: string) => void;
  deposit: (amount: number) => void;
  transfer: (toEmail: string, amount: number) => { success: boolean; error?: string };
  searchUser: (email: string) => User | null;
  updateCreditScore: () => void;
  addFraudLog: (description: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [fraudLogs, setFraudLogs] = useState<FraudLog[]>([]);
  const [passwords, setPasswords] = useState<Record<string, string>>({});

  useEffect(() => {
    const storedUser = localStorage.getItem('safeflow_user');
    const storedUsers = localStorage.getItem('safeflow_users');
    const storedTransactions = localStorage.getItem('safeflow_transactions');
    const storedFraudLogs = localStorage.getItem('safeflow_fraud_logs');
    const storedPasswords = localStorage.getItem('safeflow_passwords');

    if (storedUser) setUser(JSON.parse(storedUser));
    if (storedUsers) setUsers(JSON.parse(storedUsers));
    if (storedTransactions) setTransactions(JSON.parse(storedTransactions));
    if (storedFraudLogs) setFraudLogs(JSON.parse(storedFraudLogs));
    if (storedPasswords) setPasswords(JSON.parse(storedPasswords));
  }, []);

  useEffect(() => {
    if (user) localStorage.setItem('safeflow_user', JSON.stringify(user));
    else localStorage.removeItem('safeflow_user');
  }, [user]);

  useEffect(() => {
    localStorage.setItem('safeflow_users', JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    localStorage.setItem('safeflow_transactions', JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem('safeflow_fraud_logs', JSON.stringify(fraudLogs));
  }, [fraudLogs]);

  useEffect(() => {
    localStorage.setItem('safeflow_passwords', JSON.stringify(passwords));
  }, [passwords]);

  const login = async (email: string, password: string) => {
    const foundUser = users.find(u => u.email === email);
    if (!foundUser) {
      addFraudLog('Failed login attempt');
      return { success: false, error: 'Invalid credentials' };
    }
    
    if (passwords[email] !== password) {
      addFraudLog('Failed login attempt');
      return { success: false, error: 'Invalid credentials' };
    }

    if (foundUser.two_fa_enabled) {
      return { success: true, needsTwoFA: true };
    }

    setUser(foundUser);
    return { success: true };
  };

  const register = async (email: string, password: string, name: string, birth_date: string, cpf: string) => {
    if (users.find(u => u.email === email)) {
      return { success: false, error: 'Email already exists' };
    }

    if (password.length < 8) {
      return { success: false, error: 'Password must be at least 8 characters' };
    }

    if (cpf.length !== 11) {
      return { success: false, error: 'CPF must be 11 digits' };
    }

    const newUser: User = {
      id: Math.random().toString(36).substr(2, 9),
      email,
      name,
      birth_date,
      cpf,
      balance: 0,
      two_fa_enabled: false,
      credit_score: 600,
    };

    setUsers([...users, newUser]);
    setPasswords({ ...passwords, [email]: password });
    return { success: true };
  };

  const googleLogin = async (email: string, name: string) => {
    const foundUser = users.find(u => u.email === email);
    
    if (foundUser) {
      if (!foundUser.birth_date || !foundUser.cpf) {
        setUser({ ...foundUser });
        return { success: true, needsProfile: true };
      }
      setUser(foundUser);
      return { success: true };
    }

    const newUser: User = {
      id: Math.random().toString(36).substr(2, 9),
      email,
      name,
      balance: 0,
      two_fa_enabled: false,
      credit_score: 600,
      google_login: true,
    };

    setUsers([...users, newUser]);
    setUser(newUser);
    return { success: true, needsProfile: true };
  };

  const logout = () => {
    setUser(null);
  };

  const setup2FA = () => {
    const secret = Math.random().toString(36).substr(2, 16);
    if (user) {
      const updatedUser = { ...user, two_fa_secret: secret };
      setUser(updatedUser);
      setUsers(users.map(u => u.id === user.id ? updatedUser : u));
    }
    return secret;
  };

  const verify2FA = (code: string) => {
    if (code === '123456') {
      if (user) {
        const updatedUser = { ...user, two_fa_enabled: true };
        setUser(updatedUser);
        setUsers(users.map(u => u.id === user.id ? updatedUser : u));
      }
      return true;
    }
    return false;
  };

  const completeProfile = (birth_date: string, cpf: string) => {
    if (user) {
      const updatedUser = { ...user, birth_date, cpf };
      setUser(updatedUser);
      setUsers(users.map(u => u.id === user.id ? updatedUser : u));
    }
  };

  const deposit = (amount: number) => {
    if (user) {
      const updatedUser = { ...user, balance: user.balance + amount };
      setUser(updatedUser);
      setUsers(users.map(u => u.id === user.id ? updatedUser : u));
      updateCreditScore();
    }
  };

  const transfer = (toEmail: string, amount: number) => {
    if (!user) return { success: false, error: 'Not logged in' };
    
    const receiver = users.find(u => u.email === toEmail);
    if (!receiver) return { success: false, error: 'User not found' };
    
    if (user.balance < amount) return { success: false, error: 'Insufficient balance' };

    if (amount > 5000) {
      addFraudLog(`High transfer attempted: $${amount} to ${toEmail}`);
    }

    const updatedSender = { ...user, balance: user.balance - amount };
    const updatedReceiver = { ...receiver, balance: receiver.balance + amount };

    setUser(updatedSender);
    setUsers(users.map(u => 
      u.id === user.id ? updatedSender : 
      u.id === receiver.id ? updatedReceiver : u
    ));

    const transaction: Transaction = {
      id: Math.random().toString(36).substr(2, 9),
      from_id: user.id,
      to_id: receiver.id,
      from_email: user.email,
      to_email: toEmail,
      amount,
      timestamp: new Date().toISOString(),
      status: 'completed',
    };

    setTransactions([transaction, ...transactions]);
    updateCreditScore();

    return { success: true };
  };

  const searchUser = (email: string) => {
    return users.find(u => u.email === email) || null;
  };

  const updateCreditScore = () => {
    if (user) {
      const userTransactions = transactions.filter(t => t.from_id === user.id || t.to_id === user.id);
      const userFraudLogs = fraudLogs.filter(f => f.user_id === user.id);
      
      const score = 600 + (user.balance / 10) + (userTransactions.length * 10) - (userFraudLogs.length * 50);
      const updatedUser = { ...user, credit_score: Math.max(300, Math.min(850, Math.round(score))) };
      
      setUser(updatedUser);
      setUsers(users.map(u => u.id === user.id ? updatedUser : u));
    }
  };

  const addFraudLog = (description: string) => {
    if (user) {
      const log: FraudLog = {
        id: Math.random().toString(36).substr(2, 9),
        user_id: user.id,
        description,
        timestamp: new Date().toISOString(),
      };
      setFraudLogs([log, ...fraudLogs]);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        users,
        transactions,
        fraudLogs,
        login,
        register,
        googleLogin,
        logout,
        setup2FA,
        verify2FA,
        completeProfile,
        deposit,
        transfer,
        searchUser,
        updateCreditScore,
        addFraudLog,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
