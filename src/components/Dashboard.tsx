"use client"

import { Wallet, Landmark, ArrowUp, ArrowDown, HandCoins } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function Dashboard() {
  return (
    <div className="flex flex-col gap-6">
      
      {/* Üst Başlık */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Genel Bakış</h1>
        <p className="text-muted-foreground">Müşterilerinizin finansal durumu</p>
      </div>

      {/* İstatistik Kartları */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Toplam Alacak Kartı - YEŞİL */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Toplam Alacak</CardTitle>
            <div className="h-8 w-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                 {/* v0 Tasarımındaki El ve Para İkonu */}
                 <HandCoins className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            {/* Miktar Yazısı da Yeşil */}
            <div className="text-2xl font-bold text-green-600">₺222.000,25</div>
            <p className="text-xs text-muted-foreground">Tahsil Edilecek</p>
          </CardContent>
        </Card>

        {/* Toplam Borç Kartı - KIRMIZI (Mevcut) */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Toplam Borç</CardTitle>
             <div className="h-8 w-8 rounded-lg bg-destructive/10 flex items-center justify-center">
                {/* v0 Tasarımındaki Cüzdan İkonu */}
                <Wallet className="h-4 w-4 text-destructive" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">₺64.750,75</div>
            <p className="text-xs text-muted-foreground">Ödenmesi Gereken</p>
          </CardContent>
        </Card>

        {/* Kasa Bakiyesi Kartı - MAVİ (Primary Renk) */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Kasa Bakiyesi</CardTitle>
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                {/* v0 Tasarımındaki Banka/Bina İkonu */}
                <Landmark className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">₺157.249,50</div>
            <p className="text-xs text-muted-foreground">Mevcut Nakit</p>
          </CardContent>
        </Card>
      </div>

      {/* Son İşlemler Listesi - OK İKONLARI DÜZELTİLDİ */}
      <Card className="col-span-3">
        <CardHeader>
          <CardTitle>Son İşlemler</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-8">
            {/* İşlem 1 (Tahsilat - Yeşil Yukarı Ok) */}
            <div className="flex items-center">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-green-500/10">
                 <ArrowUp className="h-4 w-4 text-green-600" />
              </div>
              <div className="ml-4 space-y-1">
                <p className="text-sm font-medium leading-none">Ahmet Yılmaz</p>
                <p className="text-xs text-muted-foreground">Tahsilat - 2026-01-30</p>
              </div>
              <div className="ml-auto font-medium text-green-600">+₺5.000,00</div>
            </div>

            {/* İşlem 2 (Ödeme - Kırmızı Aşağı Ok) */}
            <div className="flex items-center">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-destructive/10">
                 <ArrowDown className="h-4 w-4 text-destructive" />
              </div>
              <div className="ml-4 space-y-1">
                <p className="text-sm font-medium leading-none">ABC İnşaat Ltd.</p>
                <p className="text-xs text-muted-foreground">Ödeme - 2026-01-29</p>
              </div>
              <div className="ml-auto font-medium text-destructive">-₺12.500,00</div>
            </div>

            {/* İşlem 3 (Tahsilat - Yeşil Yukarı Ok) */}
            <div className="flex items-center">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-green-500/10">
                 <ArrowUp className="h-4 w-4 text-green-600" />
              </div>
              <div className="ml-4 space-y-1">
                <p className="text-sm font-medium leading-none">Yıldız Apartmanı</p>
                <p className="text-xs text-muted-foreground">Tahsilat - 2026-01-28</p>
              </div>
              <div className="ml-auto font-medium text-green-600">+₺8.750,00</div>
            </div>
             {/* İşlem 4 (Tahsilat - Yeşil Yukarı Ok) */}
             <div className="flex items-center">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-green-500/10">
                 <ArrowUp className="h-4 w-4 text-green-600" />
              </div>
              <div className="ml-4 space-y-1">
                <p className="text-sm font-medium leading-none">Fatma Kaya</p>
                <p className="text-xs text-muted-foreground">Tahsilat - 2026-01-27</p>
              </div>
              <div className="ml-auto font-medium text-green-600">+₺3.200,00</div>
            </div>
             {/* İşlem 5 (Ödeme - Kırmızı Aşağı Ok) */}
             <div className="flex items-center">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-destructive/10">
                 <ArrowDown className="h-4 w-4 text-destructive" />
              </div>
              <div className="ml-4 space-y-1">
                <p className="text-sm font-medium leading-none">Merkez İş Hanı</p>
                <p className="text-xs text-muted-foreground">Ödeme - 2026-01-26</p>
              </div>
              <div className="ml-auto font-medium text-destructive">-₺6.800,00</div>
            </div>

          </div>
        </CardContent>
      </Card>
    </div>
  )
}