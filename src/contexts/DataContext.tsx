import React, { createContext, useContext, useState, useEffect } from 'react';
import { getAccounts, getLedgers, getTransactions } from '@/services/db';
import { useAuth } from '@/contexts/AuthContext';

interface DataContextType {
  accounts: any[];
  ledgers: any[];
  transactions: any[];
  isLoading: boolean;
  refreshData: () => Promise<void>;
  
  // Optimistic UI helpers
  setAccounts: React.Dispatch<React.SetStateAction<any[]>>;
  setLedgers: React.Dispatch<React.SetStateAction<any[]>>;
  setTransactions: React.Dispatch<React.SetStateAction<any[]>>;
}

const DataContext = createContext<DataContextType | null>(null);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [ledgers, setLedgers] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { session } = useAuth(); // Only fetch if logged in

  const refreshData = async () => {
    if (!session) return;
    try {
      const [accData, ledData, txData] = await Promise.all([
        getAccounts(),
        getLedgers(),
        getTransactions()
      ]);
      setAccounts(accData);
      setLedgers(ledData);
      setTransactions(txData);
    } catch (error) {
      console.error("Failed to refresh data:", error);
    }
  };

  useEffect(() => {
    if (session) {
      refreshData().finally(() => setIsLoading(false));
    } else {
      setAccounts([]);
      setLedgers([]);
      setTransactions([]);
      setIsLoading(false);
    }
  }, [session]);

  return (
    <DataContext.Provider value={{
      accounts,
      ledgers,
      transactions,
      isLoading,
      refreshData,
      setAccounts,
      setLedgers,
      setTransactions
    }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}
