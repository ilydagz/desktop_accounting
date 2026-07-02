import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { GalleryVerticalEnd, Sun, Moon, Briefcase, Users, Building, Heart, User } from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import { ArrowLeft } from "lucide-react"

export default function LoginPage() {
  const navigate = useNavigate()
  const { theme, setTheme } = useTheme()
  const { toast } = useToast()
  
  const [isLoading, setIsLoading] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  
  // Görünüm State'i: ilk olarak tip seçimi, sonra auth (giriş/kayıt)
  const [viewMode, setViewMode] = useState<"type-selection" | "auth">("type-selection")
  
  // Kayıt state'leri
  const [fullName, setFullName] = useState("")
  const [institutionName, setInstitutionName] = useState("")
  const [institutionType, setInstitutionType] = useState<string | null>(null)
  
  // Ekstra Kurum Bilgileri
  const [address, setAddress] = useState("")
  const [taxOffice, setTaxOffice] = useState("")
  const [taxNumber, setTaxNumber] = useState("")
  const [buildingUnits, setBuildingUnits] = useState("")

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      // Demo modu kapatıldı, gerçek giriş yapılıyor.
      if (!email || !password) {
        toast({ title: "Hata", description: "Lütfen email ve şifre giriniz.", variant: "destructive" })
        return
      }

      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      if (authData.user && institutionType) {
        const { data: prof } = await supabase.from('profiles').select('institution_id').eq('id', authData.user.id).single();
        if (prof) {
          const { data: inst } = await supabase.from('institutions').select('type').eq('id', prof.institution_id).single();
          if (inst && inst.type !== institutionType) {
            await supabase.auth.signOut();
            throw new Error(`Seçtiğiniz kurum türü ile kayıtlı hesabınızın türü uyuşmuyor. Lütfen ilk ekranda doğru türü seçerek tekrar deneyin.`);
          }
        }
      }

      navigate("/dashboard")
      
    } catch (error: any) {
      toast({ title: "Giriş Başarısız", description: error.message, variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      // Demo modu kapatıldı, gerçek kayıt yapılıyor.
      if (!email || !password || !fullName || !institutionName) {
        toast({ title: "Hata", description: "Lütfen tüm alanları doldurunuz.", variant: "destructive" })
        return
      }

      // 1. Kullanıcıyı oluştur
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      })

      if (authError) throw authError

      if (authData.user) {
        // 2. Kurumu oluştur
        const instPayload: any = { name: institutionType === 'bireysel' ? fullName : institutionName, type: institutionType, address };
        if (institutionType === 'sirket') { instPayload.tax_office = taxOffice; instPayload.tax_number = taxNumber; }
        if (institutionType === 'apartman' || institutionType === 'koop') { instPayload.building_units = buildingUnits; }

        const { data: instData, error: instError } = await supabase
          .from('institutions')
          .insert([instPayload])
          .select()
          .single()

        if (instError) throw instError

        // 3. Profili güncelle (Tetkikleyici (trigger) yoksa manuel)
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            id: authData.user.id,
            institution_id: instData.id,
            full_name: fullName,
            role: 'admin'
          })

        if (profileError) throw profileError

        toast({ title: "Kayıt Başarılı", description: "Yönlendiriliyorsunuz..." })
        navigate("/dashboard")
      }
    } catch (error: any) {
      toast({ title: "Kayıt Başarısız", description: error.message, variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }

  const toggleTheme = () => setTheme(theme === "dark" ? "light" : "dark")

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-muted/40 p-4">
      <div className="absolute right-4 top-4 md:right-8 md:top-8">
        <Button variant="ghost" size="icon" onClick={toggleTheme} className="rounded-full">
          <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Temayı Değiştir</span>
        </Button>
      </div>

      <div className="w-full max-w-[500px] space-y-8 animate-in fade-in zoom-in duration-500">
        <div className="flex items-center justify-center gap-3 font-medium">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <GalleryVerticalEnd className="size-6" />
          </div>
          <span className="text-2xl font-bold tracking-tight">Limes Muhasebe</span>
        </div>

        {viewMode === "type-selection" ? (
          <Card className="shadow-xl border-muted/60">
            <CardHeader className="space-y-3 text-center p-8 pb-4">
              <CardTitle className="text-3xl font-bold tracking-tight">Hoş Geldiniz</CardTitle>
              <CardDescription className="text-base">Devam etmek için kurum türünüzü seçin</CardDescription>
            </CardHeader>
            <CardContent className="p-8 pt-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[
                  { id: 'sirket', label: 'Şirket', icon: Briefcase },
                  { id: 'koop', label: 'Kooperatif', icon: Users },
                  { id: 'apartman', label: 'Apartman', icon: Building },
                  { id: 'dernek', label: 'Dernek', icon: Heart },
                  { id: 'bireysel', label: 'Bireysel', icon: User }
                ].map(type => (
                  <button 
                    key={type.id} 
                    type="button" 
                    onClick={() => {
                      setInstitutionType(type.id);
                      setViewMode("auth");
                    }} 
                    className="flex flex-col items-center justify-center gap-3 p-6 rounded-xl border-2 border-muted/60 bg-transparent text-muted-foreground hover:border-primary/50 hover:bg-primary/5 transition-all group"
                  >
                    <type.icon className="h-10 w-10 group-hover:scale-110 transition-transform duration-300" />
                    <span className="text-sm font-semibold">{type.label}</span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
            <Button variant="ghost" className="mb-2 -ml-4 text-muted-foreground" onClick={() => setViewMode("type-selection")}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Geri Dön
            </Button>
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="login">Giriş Yap</TabsTrigger>
                <TabsTrigger value="register">Kayıt Ol</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <Card className="shadow-xl border-muted/60">
                  <CardHeader className="space-y-3 text-center p-8 pb-4">
                    <CardTitle className="text-2xl font-bold tracking-tight">Hesabınıza Giriş Yapın</CardTitle>
                  </CardHeader>
                  <CardContent className="p-8 pt-4">
                    <form onSubmit={handleLogin} className="space-y-6">
                      <div className="space-y-2">
                        <Label htmlFor="email" className="text-base font-medium">E-posta</Label>
                        <Input id="email" type="email" value={email} onChange={(e)=>setEmail(e.target.value)} required className="h-12 text-base" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="password" className="text-base font-medium">Şifre</Label>
                        <Input id="password" type="password" value={password} onChange={(e)=>setPassword(e.target.value)} required className="h-12 text-base" />
                      </div>
                      <Button type="submit" className="w-full h-12 text-base font-semibold" disabled={isLoading}>
                        {isLoading ? "İşleniyor..." : "Giriş Yap"}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </TabsContent>

          <TabsContent value="register">
            <Card className="shadow-xl border-muted/60">
              <CardHeader className="space-y-3 text-center p-6 pb-2">
                <CardTitle className="text-2xl font-bold tracking-tight">Yeni Hesap Oluştur</CardTitle>
                <CardDescription>Sisteme kütüphanenizi ve profilinizi ekleyin</CardDescription>
              </CardHeader>
              <CardContent className="p-6 pt-4">
                <form onSubmit={handleRegister} className="space-y-4">
                  {/* Kurum Seçimi Kaldırıldı çünkü ilk ekranda yapılıyor */}

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Ad Soyad</Label>
                      <Input value={fullName} onChange={(e)=>setFullName(e.target.value)} required />
                    </div>
                    {institutionType !== 'bireysel' && (
                      <div className="space-y-2">
                        <Label>{institutionType === 'apartman' ? 'Apartman/Site Adı' : institutionType === 'koop' ? 'Kooperatif Adı' : institutionType === 'dernek' ? 'Dernek Adı' : 'Şirket Ünvanı'}</Label>
                        <Input value={institutionName} onChange={(e)=>setInstitutionName(e.target.value)} required placeholder={institutionType === 'apartman' ? "Örn: Güneş Sitesi" : ""} />
                      </div>
                    )}
                  </div>

                  {institutionType === 'sirket' && (
                     <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-2">
                         <Label>Vergi Dairesi</Label>
                         <Input value={taxOffice} onChange={(e)=>setTaxOffice(e.target.value)} required placeholder="Örn: Kadıköy V.D." />
                       </div>
                       <div className="space-y-2">
                         <Label>Vergi Numarası</Label>
                         <Input value={taxNumber} onChange={(e)=>setTaxNumber(e.target.value)} required />
                       </div>
                     </div>
                  )}

                  {(institutionType === 'apartman' || institutionType === 'koop') && (
                     <div className="space-y-2">
                       <Label>{institutionType === 'apartman' ? 'Toplam Daire/Bölüm Sayısı' : 'Toplam Üye Sayısı'}</Label>
                       <Input type="number" value={buildingUnits} onChange={(e)=>setBuildingUnits(e.target.value)} required placeholder="Örn: 24" />
                     </div>
                  )}

                  <div className="space-y-2">
                    <Label>Kayıtlı Adres</Label>
                    <Input value={address} onChange={(e)=>setAddress(e.target.value)} placeholder="Açık adres (İsteğe bağlı)" />
                  </div>

                  <div className="space-y-2">
                    <Label>E-posta</Label>
                    <Input type="email" value={email} onChange={(e)=>setEmail(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Şifre</Label>
                    <Input type="password" value={password} onChange={(e)=>setPassword(e.target.value)} required />
                  </div>
                  <Button type="submit" className="w-full h-12 mt-2 font-semibold" disabled={isLoading}>
                    {isLoading ? "Oluşturuluyor..." : "Kayıt Ol"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
            </Tabs>
          </div>
        )}
        
        <div className="text-center text-sm text-muted-foreground mt-8">
            &copy; 2026 Limes Muhasebe Sistemleri
        </div>
      </div>
    </div>
  )
}