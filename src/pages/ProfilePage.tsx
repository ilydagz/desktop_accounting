import { User, Mail, Phone, Building, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function ProfilePage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Profil Ayarları</h1>
        <p className="text-muted-foreground">Hesap bilgilerinizi ve tercihlerinizi yönetin.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-[1fr_2fr]">
        {/* Sol Taraf: Özet Kartı */}
        <Card>
          <CardContent className="flex flex-col items-center gap-4 pt-6">
            {/* Profil Resmi / Baş Harfler */}
            <div className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center text-primary text-4xl font-bold">
              AY
            </div>
            
            <div className="text-center space-y-1">
              <h2 className="text-xl font-semibold">Ahmet Yılmaz</h2>
              <p className="text-sm text-muted-foreground">Baş Muhasebeci</p>
            </div>

            {/* Alt Bilgi - Üyelik Kısmı Kaldırıldı */}
            <div className="w-full border-t pt-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Hesap Durumu</span>
                <span className="text-green-600 font-medium flex items-center gap-1">
                  <ShieldCheck className="h-3 w-3" /> Aktif
                </span>
              </div>
              {/* Buradaki Üyelik satırı silindi */}
            </div>
          </CardContent>
        </Card>

        {/* Sağ Taraf: Form */}
        <Card>
          <CardHeader>
            <CardTitle>Kişisel Bilgiler</CardTitle>
            <CardDescription>
              Buradaki bilgiler faturalarda ve raporlarda görünebilir.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Ad</Label>
                <div className="relative">
                  <User className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input id="name" defaultValue="Ahmet" className="pl-9" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="surname">Soyad</Label>
                <Input id="surname" defaultValue="Yılmaz" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">E-posta</Label>
              <div className="relative">
                <Mail className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input id="email" defaultValue="ahmet@limes.com" className="pl-9" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Telefon</Label>
              <div className="relative">
                <Phone className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input id="phone" defaultValue="+90 532 123 45 67" className="pl-9" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="company">Şirket Ünvanı</Label>
              <div className="relative">
                <Building className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input id="company" defaultValue="Limes Muhasebe A.Ş." className="pl-9" />
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <Button>Değişiklikleri Kaydet</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}