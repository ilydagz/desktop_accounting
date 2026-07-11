"use client"

import { useState } from "react"
import { Wallet, ArrowUp, ArrowDown, Activity, Search, AlertCircle, CheckCircle2, Users, ArrowRightLeft } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
// removed unused import
import { useAuth } from "@/contexts/AuthContext"
import { useData } from "@/contexts/DataContext"

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(amount)
}

export default function Dashboard() {
  const { accounts, transactions } = useData()
  const recentTransactions = transactions.slice(0, 10)
  const [selectedAccountId, setSelectedAccountId] = useState<string>("all")
  const { institutionType } = useAuth()

  const getAccountsTitle = () => {
    switch(institutionType) {
      case 'sirket': return "Cari Hesaplar";
      case 'koop': return "Kooperatif Üyeleri";
      case 'apartman': return "Kat Malikleri / Sakinler";
      case 'dernek': return "Üyeler / Bağışçılar";
      case 'cami': return "Bağışçılar";
      case 'bireysel': return "Kişiler / Borçlular";
      default: return "Cari Hesaplar";
    }
  }

  const getAccountsSingleName = () => {
    switch(institutionType) {
      case 'apartman': return "Sakin/Malik"
      case 'koop': return "Üye"
      case 'dernek': return "Üye/Bağışçı"
      case 'bireysel': return "Kişi"
      case 'sirket': return "Cari"
      case 'cami': return "Bağışçı"
      default: return "Cari"
    }
  }

  const tSingle = getAccountsSingleName();
  const tTitle = getAccountsTitle();

  // useEffect loadData removed because DataContext handles it

  const selectedAccount = accounts.find(a => a.id.toString() === selectedAccountId)

  let statusColor = "text-muted-foreground bg-muted/20 border-muted"
  let statusText = "HESAP KAPALI (Sıfır Bakiye)"
  let StatusIcon = Wallet
  let netFark = 0;

  if (selectedAccount) {
      const borc = selectedAccount.borc || 0;
      const alacak = selectedAccount.alacak || 0;
      
      netFark = borc - alacak;

      if (netFark > 0) {
          statusColor = "text-green-700 bg-green-600/10 border-green-600/20"
          statusText = `BU ${tSingle.toUpperCase()} SİZE BORÇLU (Tahsil Edilecek: ${formatCurrency(netFark)})`
          StatusIcon = CheckCircle2
      } else if (netFark < 0) {
          statusColor = "text-destructive bg-destructive/10 border-destructive/20"
          statusText = `BU ${tSingle.toUpperCase()} SİZDEN ALACAKLI (Ödenecek: ${formatCurrency(Math.abs(netFark))})`
          StatusIcon = AlertCircle
      }
  }

  // --- FİLTRELEME: Hızlı Eklenen Sahipleri (owner) Çıkar ---
  const visibleAccounts = accounts.filter(acc => acc.type !== "owner");

  // Eğer hiç cari (Müşteri/Üye vb.) eklenmemişse Boş Durum Rehberi göster:
  if (visibleAccounts.length === 0) {
    return (
      <div className="flex flex-col gap-6 animate-in fade-in duration-500 max-w-4xl mx-auto">
        <div className="text-center space-y-2 mb-4">
          <h1 className="text-4xl font-bold tracking-tight text-primary">Limes Muhasebe'ye Hoş Geldiniz! 🍋</h1>
          <p className="text-lg text-muted-foreground">Sisteminizin kurulumunu tamamlamak ve finansal takibe başlamak için aşağıdaki adımları izleyin.</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="border-2 border-primary/20 shadow-md">
            <CardHeader className="bg-primary/5 pb-4">
              <CardTitle className="flex items-center gap-2 text-xl"><Wallet className="text-primary"/> 1. Kasa ve Bankalar</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              <p className="text-sm text-muted-foreground">
                <strong className="text-foreground">Kasa Nedir?</strong> İşletmenize ait nakit paraların durduğu fiziki yerdir (Merkez Kasa vb.). <br/>
                <strong className="text-foreground">Banka Nedir?</strong> Havale/EFT işlemlerinizin geçtiği resmi hesaplarınızdır (İş Bankası, Ziraat vb.).
              </p>
              <div className="p-3 bg-muted rounded-lg text-sm border">
                <strong>Nasıl Başlarım?</strong> Sol menüden <em>Kasa & Bankalar</em> sayfasına gidin ve kullandığınız hesapları sisteme tanımlayın.
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-primary/20 shadow-md">
            <CardHeader className="bg-primary/5 pb-4">
              <CardTitle className="flex items-center gap-2 text-xl"><Users className="text-primary"/> 2. {tTitle}</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              <p className="text-sm text-muted-foreground">
                <strong className="text-foreground">{tSingle} Nedir?</strong> İşlem yaptığınız kişi veya kurumlardır.
              </p>
              <div className="p-3 bg-muted rounded-lg text-sm border">
                <strong>Nasıl Başlarım?</strong> Sol menüden ilgili sayfaya gidin ve işlem yapacağınız kişileri sisteme ekleyin.
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="border-2 shadow-sm mt-2">
          <CardHeader className="bg-muted/30 pb-4">
            <CardTitle className="flex items-center gap-2 text-xl"><ArrowRightLeft className="text-primary"/> 3. İşlem Mantığı (Tahsilat ve Ödeme)</CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="flex gap-4">
                <div className="mt-1 bg-green-100 text-green-700 p-2 rounded-full h-10 w-10 flex items-center justify-center shrink-0"><ArrowUp/></div>
                <div>
                  <h3 className="font-bold text-green-700">Tahsilat (Alacak)</h3>
                  <p className="text-sm text-muted-foreground mt-1">Sizin bir kişiden/kurumdan para almanız demektir. Bu işlem seçtiğiniz kasanıza para sokar ve o kişinin size olan borcunu azaltır.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="mt-1 bg-red-100 text-red-700 p-2 rounded-full h-10 w-10 flex items-center justify-center shrink-0"><ArrowDown/></div>
                <div>
                  <h3 className="font-bold text-red-700">Ödeme (Borç)</h3>
                  <p className="text-sm text-muted-foreground mt-1">Sizin bir kişiye/kuruma para vermeniz veya masraf yapmanızdır. Kasanızdan para çıkar ve o kişinin size olan borcunu artırır.</p>
                </div>
              </div>
            </div>
            <div className="mt-4 p-4 border-l-4 border-orange-500 bg-orange-50 text-sm">
              <strong>İpucu:</strong> Tüm alım-satım ve para transferlerinizi sol menüdeki <em>Kasa ve Hareketler</em> sayfasından "Yeni İşlem Ekle" butonuna basarak yapabilirsiniz. Ayrıca aynı menüden geciken borçlara <strong>Faiz/Gecikme Zammı</strong> ekleyebilirsiniz.
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Hızlı Bakış</h1>
          <p className="text-muted-foreground mt-1">{tTitle} hesap durumlarını hızlıca sorgulayın ve son işlemleri izleyin.</p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          className="text-orange-600 border-orange-200 bg-orange-50 hover:bg-orange-100"
          onClick={async () => {
            if (window.confirm("DİKKAT: Bu işlem tüm hesap ve kasa bakiyelerini mevcut işlemlere göre baştan hesaplayacaktır. Geçmişteki silme hatalarından kaynaklı bozuk bakiyeleri (ekside kalan hesapları vs.) onarmak içindir. Onaylıyor musunuz?")) {
              try {
                const { recalculateAllBalances } = await import("@/services/db");
                await recalculateAllBalances();
                alert("Bakiyeler başarıyla onarıldı! Sayfa yenileniyor...");
                window.location.reload();
              } catch (error: any) {
                alert("Hata oluştu: " + error.message);
              }
            }
          }}
        >
          <AlertCircle className="h-4 w-4 mr-2" /> Bozuk Bakiyeleri Onar
        </Button>
      </div>

      <Card className="border-2 border-primary/10 shadow-md">
        <CardHeader className="bg-muted/30 border-b pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Search className="h-5 w-5 text-primary"/> {tSingle} Durum Sorgulama
            </CardTitle>
            <CardDescription>Durumunu ve bakiyesini görmek istediğiniz {tSingle.toLowerCase()}yi seçin.</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
            
            <div className="max-w-md mb-8">
                <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                    <SelectTrigger className="h-12 text-base font-medium">
                        <SelectValue placeholder={`Listeden Bir ${tSingle} Seçin...`} />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all" className="font-semibold text-muted-foreground">-- Seçim Yapılmadı --</SelectItem>
                        {/* GÖRÜNÜR CARİLERİ MAPLİYORUZ */}
                        {visibleAccounts.map(acc => (
                            <SelectItem key={acc.id} value={acc.id.toString()}>{acc.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {selectedAccount ? (
                <div className="animate-in fade-in slide-in-from-bottom-4">
                    <div className="grid gap-4 md:grid-cols-3 mb-6">
                        <div className="p-5 rounded-xl border bg-destructive/5 text-center shadow-sm">
                            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{tSingle}nin Borcu</span>
                            <div className="text-2xl font-bold text-destructive mt-1">{formatCurrency(selectedAccount.borc || 0)}</div>
                        </div>
                        <div className="p-5 rounded-xl border bg-green-600/5 text-center shadow-sm">
                            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{tSingle}nin Alacağı</span>
                            <div className="text-2xl font-bold text-green-700 mt-1">{formatCurrency(selectedAccount.alacak || 0)}</div>
                        </div>
                        <div className="p-5 rounded-xl border bg-card shadow-sm text-center relative overflow-hidden">
                            <div className={`absolute top-0 left-0 w-1 h-full ${netFark > 0 ? 'bg-green-500' : netFark < 0 ? 'bg-destructive' : 'bg-muted'}`}></div>
                            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Net Bakiye</span>
                            <div className={`text-3xl font-bold mt-1 ${netFark > 0 ? 'text-green-700' : netFark < 0 ? 'text-destructive' : 'text-foreground'}`}>
                                {formatCurrency(Math.abs(netFark))}
                            </div>
                        </div>
                    </div>
                    
                    <div className={`flex items-center justify-center gap-3 p-4 rounded-lg border-2 ${statusColor} font-bold text-lg`}>
                        <StatusIcon className="h-6 w-6" />
                        {statusText}
                    </div>
                </div>
            ) : (
                <div className="text-center py-10 border-2 border-dashed rounded-lg text-muted-foreground bg-muted/10">
                    Hesap detaylarını görüntülemek için yukarıdaki menüden bir kişi veya kurum seçin.
                </div>
            )}

        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            İşletme Geneli Son Hareketler
          </CardTitle>
          <CardDescription>Sisteme girilen en son 10 finansal işlem.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {recentTransactions.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-4 border border-dashed rounded-lg">Henüz işlem yapılmadı.</p>
            ) : (
                recentTransactions.map((tx, index) => (
                    <div key={index} className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0 hover:bg-muted/50 p-2 rounded-lg transition-colors">
                        <div className="flex items-center gap-4">
                             <div className={`flex h-10 w-10 items-center justify-center rounded-full ${tx.type === 'tahsilat' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-destructive'}`}>
                                {tx.type === 'tahsilat' ? <ArrowUp className="h-5 w-5" /> : <ArrowDown className="h-5 w-5" />}
                             </div>
                             <div className="space-y-1">
                                <p className="text-sm font-bold leading-none">{tx.accountName || `Silinmiş ${tSingle}`}</p>
                                <p className="text-xs text-muted-foreground font-medium">
                                    {/* SAAT GÖRÜNÜMÜ EKLENDİ */}
                                    {tx.description} • {new Date(tx.date).toLocaleDateString('tr-TR')} {new Date(tx.date).toLocaleTimeString('tr-TR', {hour: '2-digit', minute:'2-digit'})}
                                </p>
                             </div>
                        </div>
                        <div className={`text-lg font-bold ${tx.type === 'tahsilat' ? 'text-green-600' : 'text-destructive'}`}>
                            {tx.type === 'tahsilat' ? '+' : '-'}{formatCurrency(tx.amount)}
                        </div>
                    </div>
                ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}