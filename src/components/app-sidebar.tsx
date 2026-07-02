import { useLocation, useNavigate } from "react-router-dom"
import { useTheme } from "next-themes"
import { LayoutDashboard, Users, ArrowRightLeft, Search, Sun, Moon, User, LogOut, Wallet, Landmark } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Link } from "react-router-dom"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar"
import { useAuth } from "@/contexts/AuthContext"


export function AppSidebar() {
  const navigate = useNavigate()
  const location = useLocation()
  const pathname = location.pathname
  const { theme, setTheme } = useTheme()
  const { user, institutionName, institutionType, signOut } = useAuth()

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark")
  }

  const getAccountsTitle = () => {
    switch(institutionType) {
      case 'sirket': return "Cariler";
      case 'koop': return "Kooperatif Üyeleri";
      case 'apartman': return "Kat Malikleri / Sakinler";
      case 'dernek': return "Üyeler / Bağışçılar";
      case 'bireysel': return "Kişiler / Borçlular";
      default: return "Cariler";
    }
  }

  const navItems = [
    {
      title: "Genel Bakış",
      href: "/dashboard",
      icon: LayoutDashboard,
    },
    {
      title: getAccountsTitle(),
      href: "/accounts",
      icon: Users,
    },
    {
      title: "Kasa & Hareketler",
      href: "/transactions",
      icon: ArrowRightLeft,
    },
    {
      title: "Kasa & Bankalar",
      href: "/ledgers",
      icon: Wallet,
    },
    {
      title: "Banka Entegrasyonları",
      href: "/bank-integration",
      icon: Landmark,
    },
  ]

  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
       navigate("/accounts")
    }
  }

  // ÇIKIŞ YAPMA FONKSİYONU
  const handleLogout = async (e: React.MouseEvent) => {
    e.stopPropagation() // Profil sayfasına gitmesini engelle (Tıklamayı durdur)
    await signOut()
    navigate("/") // Giriş sayfasına at
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <div className="flex items-center gap-2 px-1 group-data-[collapsible=icon]:justify-center">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <LayoutDashboard className="h-5 w-5" />
            </div>
            <div className="flex flex-col gap-0.5 leading-none group-data-[collapsible=icon]:hidden">
                <span className="font-semibold">{institutionName || "Limes Muhasebe"}</span>
                <span className="text-xs text-muted-foreground">{getAccountsTitle()} Takibi</span>
            </div>
        </div>
        
        <div className="mt-4 group-data-[collapsible=icon]:hidden">
            <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                    placeholder="Ara..." 
                    className="pl-9 bg-sidebar-accent/50" 
                    onKeyDown={handleSearch} 
                />
            </div>
            <p className="text-[10px] text-muted-foreground mt-2 px-1">
                Bulmak için yazıp Enter'a basın
            </p>
        </div>
      </SidebarHeader>

      <SidebarContent className="p-2">
        <SidebarMenu>
          {navItems.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton 
                asChild 
                isActive={pathname === item.href}
                tooltip={item.title === "Cariler" ? getAccountsTitle() : item.title}
                className="h-10"
              >
                <Link to={item.href}>
                  <item.icon className="!h-5 !w-5" />
                  <span>{item.title === "Cariler" ? getAccountsTitle() : item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-2">
         {/* Tema Değiştirme Butonu */}
         <div className="flex flex-col gap-2">
             <div className="flex items-center justify-between px-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
                <span className="text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">Görünüm</span>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={toggleTheme}
                    className="h-8 w-8 shrink-0"
                >
                    <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                    <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                </Button>
             </div>
         </div>

         {/* Profil ve Çıkış */}
         <SidebarMenu>
            <SidebarMenuItem>
                <SidebarMenuButton
                    size="lg"
                    className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-2"
                    onClick={() => navigate("/profile")}
                >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <User className="h-4 w-4" />
                    </div>
                    
                    <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                        <span className="truncate font-semibold">{user?.email?.split('@')[0] || "Kullanıcı"}</span>
                        <span className="truncate text-xs text-muted-foreground">{user?.email || "Yönetici"}</span>
                    </div>

                    {/* ÇIKIŞ BUTONU - ÖZELLEŞTİRİLDİ */}
                    <div 
                        role="button"
                        onClick={handleLogout}
                        className="ml-auto flex h-7 w-7 items-center justify-center rounded-md hover:bg-background hover:text-destructive transition-colors group-data-[collapsible=icon]:hidden"
                        title="Çıkış Yap"
                    >
                        <LogOut className="h-4 w-4" />
                    </div>
                </SidebarMenuButton>
            </SidebarMenuItem>
         </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}