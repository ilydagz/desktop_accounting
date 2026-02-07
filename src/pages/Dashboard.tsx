"use client"

import { useEffect, useState } from "react"
import { Wallet, Landmark, ArrowUp, ArrowDown, HandCoins, Activity } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getDashboardStats } from "@/services/db" // Veritabanı servisini çağırdık

// Para birimi formatlama fonksiyonu
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(amount)
}

export default function Dashboard() {
  // İstatistikleri tutacak State
  const [stats, setStats] = useState({
    totalAlacak: 0,
    totalBorc: 0,
     recentTransactions: [] as any[] // Yeni eklenen alan
  })

  // Sayfa açılınca verileri çek
  useEffect(() => {
    async function loadStats() {
      try {
        const data = await getDashboardStats()
        setStats(data)
      } catch (error) {
        console.error("İstatistikler yüklenemedi:", error)
      }
    }
    loadStats()
  }, [])

  // Net Durum (Alacak - Borç)
  const netBalance = stats.totalAlacak - stats.totalBorc

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500">
      
      {/* Üst Başlık */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Genel Bakış</h1>
        <p className="text-muted-foreground mt-1">İşletmenizin finansal özeti ve son durum.</p>
      </div>

      {/* İstatistik Kartları */}
      <div className="grid gap-4 md:grid-cols-3">
        
        {/* Toplam Alacak Kartı - YEŞİL */}
        <Card className="shadow-md border-green-200 dark:border-green-900/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Toplam Alacak</CardTitle>
            <div className="h-8 w-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                 <HandCoins className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
                {formatCurrency(stats.totalAlacak)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Piyasadan tahsil edilecek</p>
          </CardContent>
        </Card>

        {/* Toplam Borç Kartı - KIRMIZI */}
        <Card className="shadow-md border-red-200 dark:border-red-900/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Toplam Borç</CardTitle>
             <div className="h-8 w-8 rounded-lg bg-destructive/10 flex items-center justify-center">
                <Wallet className="h-4 w-4 text-destructive" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
                {formatCurrency(stats.totalBorc)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Ödenmesi gereken tutar</p>
          </CardContent>
        </Card>

        {/* Net Durum Kartı - MAVİ */}
        <Card className="shadow-md border-blue-200 dark:border-blue-900/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Genel Bakiye</CardTitle>
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Landmark className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${netBalance >= 0 ? 'text-primary' : 'text-destructive'}`}>
                {formatCurrency(netBalance)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Alacak - Borç farkı</p>
          </CardContent>
        </Card>
      </div>

      {/* Son İşlemler Listesi */}
      <Card className="col-span-3 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Son İşlemler
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {stats.recentTransactions.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-4">Henüz işlem yapılmadı.</p>
            ) : (
                stats.recentTransactions.map((tx, index) => (
                    <div key={index} className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0">
                        <div className="flex items-center gap-4">
                             <div className={`flex h-9 w-9 items-center justify-center rounded-full ${tx.type === 'tahsilat' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-destructive'}`}>
                                {tx.type === 'tahsilat' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
                             </div>
                             <div className="space-y-1">
                                <p className="text-sm font-medium leading-none">{tx.accountName}</p>
                                <p className="text-xs text-muted-foreground">
                                    {tx.description} • {new Date(tx.date).toLocaleDateString('tr-TR')} {new Date(tx.date).toLocaleTimeString('tr-TR', {hour: '2-digit', minute:'2-digit'})}
                                </p>
                             </div>
                        </div>
                        <div className={`font-bold ${tx.type === 'tahsilat' ? 'text-green-600' : 'text-destructive'}`}>
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