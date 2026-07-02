import { useState } from "react"
import { Building2, ArrowRight, ShieldCheck, Activity, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"

const banks = [
    { id: "is", name: "Türkiye İş Bankası", logo: "🏦", status: "available" },
    { id: "ziraat", name: "Ziraat Bankası", logo: "🏦", status: "available" },
    { id: "garanti", name: "Garanti BBVA", logo: "🏦", status: "available" },
    { id: "yapi", name: "Yapı Kredi", logo: "🏦", status: "available" },
    { id: "akbank", name: "Akbank", logo: "🏦", status: "available" },
    { id: "qnb", name: "QNB Finansbank", logo: "🏦", status: "available" },
]

export default function BankIntegrationPage() {
  const { toast } = useToast()
  const [searchQuery, setSearchQuery] = useState("")

  const handleConnect = () => {
    toast({
        title: "Pek Yakında!",
        description: "Açık bankacılık (API) entegrasyonu altyapı çalışmaları devam etmektedir. Çok yakında bankalarınızı buraya bağlayabileceksiniz.",
    })
  }

  const filteredBanks = banks.filter(b => b.name.toLowerCase().includes(searchQuery.toLowerCase()))

  return (
    <div className="w-full space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Banka Entegrasyonları</h1>
          <p className="text-muted-foreground mt-1">Açık bankacılık ile tüm banka hareketlerinizi tek ekrana taşıyın.</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="col-span-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" /> Canlı Veri Akışı
            </CardTitle>
            <CardDescription>Banka hesaplarınızı bağlayarak tüm havale, EFT ve pos işlemlerinizin Limes sistemine otomatik düşmesini sağlayın.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-3">
                <li className="flex items-center gap-3 text-sm"><ShieldCheck className="h-5 w-5 text-green-600" /> Tamamen güvenli (TCMB Onaylı Açık Bankacılık Standartları)</li>
                <li className="flex items-center gap-3 text-sm"><ShieldCheck className="h-5 w-5 text-green-600" /> Gelen paraların ilgili cariye anında otomatik işlenmesi</li>
                <li className="flex items-center gap-3 text-sm"><ShieldCheck className="h-5 w-5 text-green-600" /> Hesap mutabakatı (Banka bakiyesi ile Limes bakiyesinin eşleşmesi)</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="flex flex-col items-center justify-center text-center p-6 border-dashed border-2">
            <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center mb-4">
                <Building2 className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold mb-2">Kurumsal Başvuru</h3>
            <p className="text-xs text-muted-foreground mb-4">Mevcut bankalarınızın API yetkilerini açmak için şubenizle görüşmeniz gerekebilir.</p>
            <Button variant="outline" className="w-full">Bilgi Al</Button>
        </Card>
      </div>

      <div className="space-y-4 pt-4">
        <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Desteklenen Bankalar</h2>
            <div className="relative w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Banka ara..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9" />
            </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredBanks.map(bank => (
                <Card key={bank.id} className="hover:border-primary/50 transition-all">
                    <CardContent className="p-5 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="text-2xl">{bank.logo}</div>
                            <span className="font-medium">{bank.name}</span>
                        </div>
                        <Button variant="ghost" size="sm" onClick={handleConnect} className="text-primary hover:text-primary">
                            Bağla <ArrowRight className="h-4 w-4 ml-1" />
                        </Button>
                    </CardContent>
                </Card>
            ))}
            {filteredBanks.length === 0 && (
                <div className="col-span-3 text-center py-8 text-muted-foreground">Aradığınız banka bulunamadı.</div>
            )}
        </div>
      </div>
    </div>
  )
}
