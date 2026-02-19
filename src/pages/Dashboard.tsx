"use client"

import { useEffect, useState } from "react"
import { Wallet, ArrowUp, ArrowDown, Activity, Search, AlertCircle, CheckCircle2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getAccounts, getTransactions } from "@/services/db"

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(amount)
}

export default function Dashboard() {
  const [accounts, setAccounts] = useState<any[]>([])
  const [recentTransactions, setRecentTransactions] = useState<any[]>([])
  const [selectedAccountId, setSelectedAccountId] = useState<string>("all")

  useEffect(() => {
    async function loadData() {
      try {
        const accData = await getAccounts()
        setAccounts(accData)

        const txData = await getTransactions()
        setRecentTransactions(txData.slice(0, 10)) 
      } catch (error) {
        console.error("Veriler yüklenemedi:", error)
      }
    }
    loadData()
  }, [])

  const selectedAccount = accounts.find(a => a.id.toString() === selectedAccountId)

  // --- MATEMATİKSEL MANTIK BURADA DÜZELTİLDİ ---
  let statusColor = "text-muted-foreground bg-muted/20 border-muted"
  let statusText = "HESAP KAPALI (Sıfır Bakiye)"
  let StatusIcon = Wallet
  let netFark = 0;

  if (selectedAccount) {
      const borc = selectedAccount.borc || 0;
      const alacak = selectedAccount.alacak || 0;
      
      // Müşterinin Borcu - Müşterinin Alacağı
      netFark = borc - alacak;

      if (netFark > 0) {
          // Müşterinin borcu daha yüksek
          statusColor = "text-green-700 bg-green-600/10 border-green-600/20"
          statusText = `BU CARİ SİZE BORÇLU (Tahsil Edilecek: ${formatCurrency(netFark)})`
          StatusIcon = CheckCircle2
      } else if (netFark < 0) {
          // Müşterinin alacağı daha yüksek
          statusColor = "text-destructive bg-destructive/10 border-destructive/20"
          statusText = `BU CARİ SİZDEN ALACAKLI (Ödenecek: ${formatCurrency(Math.abs(netFark))})`
          StatusIcon = AlertCircle
      }
  }

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500">
      
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Hızlı Bakış</h1>
        <p className="text-muted-foreground mt-1">Cari hesap durumlarını hızlıca sorgulayın ve son işlemleri izleyin.</p>
      </div>

      <Card className="border-2 border-primary/10 shadow-md">
        <CardHeader className="bg-muted/30 border-b pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Search className="h-5 w-5 text-primary"/> Cari Durum Sorgulama
            </CardTitle>
            <CardDescription>Durumunu ve bakiyesini görmek istediğiniz cariyi seçin.</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
            
            <div className="max-w-md mb-8">
                <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                    <SelectTrigger className="h-12 text-base font-medium">
                        <SelectValue placeholder="Listeden Bir Cari Seçin..." />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all" className="font-semibold text-muted-foreground">-- Seçim Yapılmadı --</SelectItem>
                        {accounts.map(acc => (
                            <SelectItem key={acc.id} value={acc.id.toString()}>{acc.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {selectedAccount ? (
                <div className="animate-in fade-in slide-in-from-bottom-4">
                    <div className="grid gap-4 md:grid-cols-3 mb-6">
                        <div className="p-5 rounded-xl border bg-destructive/5 text-center shadow-sm">
                            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Müşterinin Borcu</span>
                            <div className="text-2xl font-bold text-destructive mt-1">{formatCurrency(selectedAccount.borc || 0)}</div>
                        </div>
                        <div className="p-5 rounded-xl border bg-green-600/5 text-center shadow-sm">
                            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Müşterinin Alacağı</span>
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
                                <p className="text-sm font-bold leading-none">{tx.accountName || "Silinmiş Cari"}</p>
                                <p className="text-xs text-muted-foreground font-medium">
                                    {tx.description} • {new Date(tx.date).toLocaleDateString('tr-TR')}
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