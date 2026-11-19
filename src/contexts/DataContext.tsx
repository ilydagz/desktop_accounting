import React, { createContext, useContext, useState, useEffect, useMemo, useRef } from 'react';
import { getAccounts, getLedgers, getTransactions } from '@/services/db';
import { useAuth } from '@/contexts/AuthContext';
import { createRefreshQueue } from '@/lib/refresh-queue';

interface DataContextType {
  accounts: any[];
  ledgers: any[];
  transactions: any[];
  isLoading: boolean;
  hasLoaded: boolean;
  isRefreshing: boolean;
  lastUpdatedAt: string | null;
  error: string | null;
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
  const [error, setError] = useState<string | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);
  const { user, institutionId } = useAuth();
  const userId = user?.id;
  const generation = useRef(0);
  const active = useRef(false);

  const refreshData = useMemo(() => createRefreshQueue(async () => {
    if (!userId || !institutionId || !active.current) return;
    const requestGeneration = generation.current;
    setIsRefreshing(true);
    try {
      const [accData, ledData, txData] = await Promise.all([
        getAccounts(institutionId),
        getLedgers(institutionId),
        getTransactions(institutionId)
      ]);
      if (generation.current !== requestGeneration) return;
      setAccounts(accData);
      setLedgers(ledData);
      setTransactions(txData);
      setError(null);
      setHasLoaded(true);
      setLastUpdatedAt(new Date().toISOString());
    } catch (error) {
      console.error("Failed to refresh data:", error);
      if (generation.current === requestGeneration) setError('Hesap bilgileri yenilenemedi. Görünen tutarlar güncel olmayabilir. Bağlantınızı kontrol edin; eski işlemleri yeniden girmeyin.');
    } finally {
      if (generation.current === requestGeneration) { setIsLoading(false); setIsRefreshing(false); }
    }
  }), [userId, institutionId]);

  useEffect(() => {
    active.current = true;
    generation.current += 1;
    setAccounts([]); setLedgers([]); setTransactions([]);
    setError(userId && !institutionId ? 'Kurum bilgisi yüklenemedi. Sayfayı yeniden açın veya hesabınıza yeniden giriş yapın. Kayıtlar boş veya sıfır kabul edilmemelidir.' : null); setHasLoaded(false); setLastUpdatedAt(null); setIsRefreshing(false);
    setIsLoading(Boolean(userId && institutionId));
    if (userId && institutionId) void refreshData();
    const onRefresh = () => { if (document.visibilityState === 'visible') void refreshData(); };
    window.addEventListener('online', onRefresh);
    window.addEventListener('focus', onRefresh);
    return () => {
      active.current = false; generation.current += 1;
      window.removeEventListener('online', onRefresh);
      window.removeEventListener('focus', onRefresh);
    };
  }, [userId, institutionId, refreshData]);

  return (
    <DataContext.Provider value={{
      accounts,
      ledgers,
      transactions,
      isLoading,
      hasLoaded,
      isRefreshing,
      lastUpdatedAt,
      error,
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
