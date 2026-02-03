import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { GalleryVerticalEnd, Sun, Moon } from "lucide-react" // İkonlar eklendi
import { useTheme } from "next-themes" // Tema kancası eklendi
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

export default function LoginPage() {
  const navigate = useNavigate()
  const { theme, setTheme } = useTheme() // Tema kontrolü
  const [isLoading, setIsLoading] = useState(false)

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    
    // Simüle edilmiş giriş işlemi
    setTimeout(() => {
      setIsLoading(false)
      navigate("/dashboard")
    }, 1000)
  }

  // Temayı değiştiren fonksiyon
  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark")
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-muted/40 p-4">
      
      {/* --- KOYU MOD BUTONU (SAĞ ÜST) --- */}
      <div className="absolute right-4 top-4 md:right-8 md:top-8">
        <Button variant="ghost" size="icon" onClick={toggleTheme} className="rounded-full">
          <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Temayı Değiştir</span>
        </Button>
      </div>

      <div className="w-full max-w-[500px] space-y-8 animate-in fade-in zoom-in duration-500">
        
        {/* Logo Kısmı */}
        <div className="flex items-center justify-center gap-3 font-medium">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <GalleryVerticalEnd className="size-6" />
          </div>
          <span className="text-2xl font-bold tracking-tight">Limes Muhasebe</span>
        </div>

        {/* Giriş Kartı */}
        <Card className="shadow-xl border-muted/60">
          <CardHeader className="space-y-3 text-center p-8 pb-4">
            <CardTitle className="text-3xl font-bold tracking-tight">Hoş Geldiniz</CardTitle>
            <CardDescription className="text-base">
              Devam etmek için hesabınıza giriş yapın
            </CardDescription>
          </CardHeader>
          
          <CardContent className="p-8 pt-4">
            <form onSubmit={handleLogin} className="space-y-6">
              
              <div className="space-y-2">
                <Label htmlFor="email" className="text-base font-medium">E-posta</Label>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="m@example.com" 
                  required 
                  className="h-12 text-base" 
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password" className="text-base font-medium">Şifre</Label>
                <Input 
                  id="password" 
                  type="password" 
                  required 
                  className="h-12 text-base" 
                />
              </div>

              <Button type="submit" className="w-full h-12 text-base font-semibold transition-all hover:scale-[1.02]" disabled={isLoading}>
                {isLoading ? "Giriş yapılıyor..." : "Giriş Yap"}
              </Button>
              
            </form>
          </CardContent>
        </Card>
        
        <div className="text-center text-sm text-muted-foreground">
            &copy; 2026 Limes Muhasebe Sistemleri
        </div>
      </div>
    </div>
  )
}