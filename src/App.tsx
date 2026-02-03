import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

// Sayfalar
import LoginPage from "@/pages/LoginPage";
import AccountsPage from "@/pages/AccountsPage";
import TransactionsPage from "@/pages/TransactionsPage";
import ProfilePage from "@/pages/ProfilePage";
import Dashboard from "@/components/Dashboard";

// Menü ve Çerçeve
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";

function Layout({ children }: { children: React.ReactNode }) {
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

        {/* İçerik Alanı - Padding ve Genişlik Ayarı */}
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 w-full max-w-full overflow-x-hidden">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/dashboard" element={<Layout><Dashboard /></Layout>} />
        <Route path="/accounts" element={<Layout><AccountsPage /></Layout>} />
        <Route path="/transactions" element={<Layout><TransactionsPage /></Layout>} />
        <Route path="/profile" element={<Layout><ProfilePage /></Layout>} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;