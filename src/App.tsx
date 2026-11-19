import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { DataProvider, useData } from "@/contexts/DataContext";
import { Button } from "@/components/ui/button";

// --- SAYFALAR (Import yollarına dikkat) ---
import LoginPage from "@/pages/LoginPage";
import AccountsPage from "@/pages/AccountsPage";
import TransactionsPage from "@/pages/TransactionsPage";
import LedgersPage from "@/pages/LedgersPage";
import BankIntegrationPage from "@/pages/BankIntegrationPage";
import ProfilePage from "@/pages/ProfilePage";
import Dashboard from "@/pages/Dashboard"; // Burası 'components' değil 'pages' olmalı

// --- MENÜ VE ÇERÇEVE ---
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/toaster";
import { AutoUpdater } from "@/components/AutoUpdater";
import { ActionSafetyProvider } from '@/contexts/ActionSafetyContext';
import { WriteSafetyStatus } from '@/components/WriteSafetyStatus';
import { useAuth } from '@/contexts/AuthContext';

// Layout Bileşeni (Sidebar ve Header yapısı)
function Layout({ children }: { children: React.ReactNode }) {
  const { error, refreshData, isLoading, hasLoaded, isRefreshing, lastUpdatedAt } = useData();
  return (
    <SidebarProvider defaultOpen={true}>
      <AppSidebar />
      <SidebarInset>
        {/* Header */}
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4 bg-background sticky top-0 z-10">
          <SidebarTrigger className="-ml-1" />
          <div className="mr-2 h-4 w-[1px] bg-border" />
          <h2 className="font-semibold text-sm">Limes Muhasebe</h2>
        </header>

        {/* İçerik Alanı */}
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 w-full max-w-full overflow-x-hidden">
          <WriteSafetyStatus />
          {error && <div role="alert" className="mb-4 rounded-lg border border-destructive p-3 text-sm"><p>{error}</p><Button variant="outline" disabled={isRefreshing} className="mt-2" onClick={() => void refreshData()}>Tekrar dene</Button></div>}
          {lastUpdatedAt && <div className="flex items-center justify-end gap-2 text-xs text-muted-foreground"><span>Son başarılı yenileme: {new Date(lastUpdatedAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</span><Button size="sm" variant="ghost" disabled={isRefreshing} onClick={() => void refreshData()}>{isRefreshing ? 'Yenileniyor…' : 'Yenile'}</Button></div>}
          {isLoading ? <p role="status" className="p-6 text-center text-muted-foreground">Hesap bilgileri yükleniyor…</p> : hasLoaded || !error ? children : null}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

function App() {
  const { user } = useAuth();
  return (
    <DataProvider>
      <Router>
        <ActionSafetyProvider userId={user?.id}>
        <AutoUpdater />
        <Routes>
          {/* Login Sayfası (Layout dışındadır) */}
          <Route path="/" element={<LoginPage />} />
          
          {/* Diğer Sayfalar (Layout içindedir) */}
          <Route path="/dashboard" element={<Layout><Dashboard /></Layout>} />
          <Route path="/accounts" element={<Layout><AccountsPage /></Layout>} />
          <Route path="/transactions" element={<Layout><TransactionsPage /></Layout>} />
          <Route path="/ledgers" element={<Layout><LedgersPage /></Layout>} />
          <Route path="/bank-integration" element={<Layout><BankIntegrationPage /></Layout>} />
          <Route path="/profile" element={<Layout><ProfilePage /></Layout>} />
          
          {/* Hatalı link girilirse ana sayfaya yönlendir */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
        <Toaster />
        </ActionSafetyProvider>
      </Router>
    </DataProvider>
  );
}

export default App;
