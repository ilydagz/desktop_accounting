import { useState } from "react"
import { Printer, Plus, User, Building2, ChevronDown, ChevronUp, Check, ChevronsUpDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { AccountsTable } from "@/components/accounts-table"
import { cn } from "@/lib/utils"

// --- ÜLKE LİSTESİ (Genişletilebilir) ---
const countries = [
  { label: "Türkiye", value: "TR", code: "+90", flag: "🇹🇷" },
  { label: "ABD", value: "US", code: "+1", flag: "🇺🇸" },
  { label: "Almanya", value: "DE", code: "+49", flag: "🇩🇪" },
  { label: "İngiltere", value: "UK", code: "+44", flag: "🇬🇧" },
  { label: "Fransa", value: "FR", code: "+33", flag: "🇫🇷" },
  { label: "Azerbaycan", value: "AZ", code: "+994", flag: "🇦🇿" },
  { label: "Kıbrıs", value: "CY", code: "+357", flag: "🇨🇾" },
  { label: "Rusya", value: "RU", code: "+7", flag: "🇷🇺" },
]

export default function AccountsPage() {
  const [showNewAccount, setShowNewAccount] = useState(false)
  
  // Form Durumları
  const [accountType, setAccountType] = useState<"individual" | "corporate">("individual")
  const [showBuildingInfo, setShowBuildingInfo] = useState(false)
  
  // Telefon Ülke Seçimi Durumu
  const [openCountry, setOpenCountry] = useState(false)
  const [selectedCountry, setSelectedCountry] = useState(countries[0]) // Varsayılan TR

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="w-full space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Cariler</h1>
          <p className="text-muted-foreground mt-1">Tüm cari hesapları görüntüleyin ve yönetin</p>
        </div>
        
        <div className="no-print flex items-center gap-3">
          <Button variant="outline" onClick={handlePrint} className="gap-2">
            <Printer className="h-4 w-4" />
            Yazdır
          </Button>

          <Button onClick={() => setShowNewAccount(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Yeni Cari Ekle
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Hesap Listesi</CardTitle>
        </CardHeader>
        <CardContent>
          <AccountsTable />
        </CardContent>
      </Card>

      {/* YENİ CARİ EKLEME PENCERESİ */}
      <Dialog open={showNewAccount} onOpenChange={setShowNewAccount}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Yeni Cari Hesap</DialogTitle>
          </DialogHeader>
          
          <div className="py-4 space-y-5">
            {/* TİP SEÇİMİ (Tablar) */}
            <div className="grid grid-cols-2 p-1 bg-muted rounded-lg">
                <button
                    type="button"
                    onClick={() => setAccountType('individual')}
                    className={cn(
                        "flex items-center justify-center gap-2 text-sm font-medium py-2 rounded-md transition-all",
                        accountType === 'individual' 
                            ? "bg-background text-foreground shadow-sm" 
                            : "text-muted-foreground hover:text-foreground"
                    )}
                >
                    <User className="h-4 w-4" />
                    Şahıs
                </button>
                <button
                    type="button"
                    onClick={() => setAccountType('corporate')}
                    className={cn(
                        "flex items-center justify-center gap-2 text-sm font-medium py-2 rounded-md transition-all",
                        accountType === 'corporate' 
                            ? "bg-background text-foreground shadow-sm" 
                            : "text-muted-foreground hover:text-foreground"
                    )}
                >
                    <Building2 className="h-4 w-4" />
                    Kurum / Yapı
                </button>
            </div>

            {/* ŞAHIS FORMU */}
            {accountType === 'individual' && (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="ad">Ad</Label>
                            <Input id="ad" placeholder="Adınızı giriniz" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="soyad">Soyad</Label>
                            <Input id="soyad" placeholder="Soyadınızı giriniz" />
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="tc">TC Kimlik No</Label>
                            <Input id="tc" placeholder="11 haneli TC no" maxLength={11} />
                        </div>
                        
                        {/* --- MODERN TELEFON GİRİŞİ (COUNTRY SELECT) --- */}
                        <div className="space-y-2">
                            <Label htmlFor="tel">Telefon</Label>
                            <div className="flex">
                                {/* Ülke Seçici Butonu */}
                                <Popover open={openCountry} onOpenChange={setOpenCountry}>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            role="combobox"
                                            aria-expanded={openCountry}
                                            className="w-[110px] justify-between rounded-r-none border-r-0 px-3"
                                        >
                                            <span className="flex items-center gap-2 truncate">
                                                <span>{selectedCountry.flag}</span>
                                                <span>{selectedCountry.code}</span>
                                            </span>
                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[200px] p-0" align="start">
                                        <Command>
                                            <CommandInput placeholder="Ülke ara..." />
                                            <CommandList>
                                                <CommandEmpty>Ülke bulunamadı.</CommandEmpty>
                                                <CommandGroup>
                                                    {countries.map((country) => (
                                                        <CommandItem
                                                            key={country.value}
                                                            value={country.label}
                                                            onSelect={() => {
                                                                setSelectedCountry(country)
                                                                setOpenCountry(false)
                                                            }}
                                                        >
                                                            <Check
                                                                className={cn(
                                                                    "mr-2 h-4 w-4",
                                                                    selectedCountry.value === country.value ? "opacity-100" : "opacity-0"
                                                                )}
                                                            />
                                                            <span className="mr-2">{country.flag}</span>
                                                            {country.label} ({country.code})
                                                        </CommandItem>
                                                    ))}
                                                </CommandGroup>
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                                
                                {/* Numara Giriş Alanı */}
                                <Input 
                                    id="tel" 
                                    type="tel"
                                    placeholder="5XX XXX XX XX" 
                                    className="rounded-l-none focus-visible:ring-0 focus-visible:ring-offset-0 relative z-0"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="email">E-posta</Label>
                        <Input id="email" type="email" placeholder="ornek@email.com" />
                    </div>
                </div>
            )}

            {/* KURUM FORMU */}
            {accountType === 'corporate' && (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="space-y-2">
                        <Label htmlFor="unvan">Ünvan</Label>
                        <Input id="unvan" placeholder="Kurum / Apartman adı" />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="vkn">Vergi Kimlik No</Label>
                            <Input id="vkn" placeholder="10 haneli vergi no" maxLength={10} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="vd">Vergi Dairesi</Label>
                            <Input id="vd" placeholder="Vergi dairesi adı" />
                        </div>
                    </div>

                    {/* Yapı & Arsa Bilgileri */}
                    <div className="border rounded-lg overflow-hidden">
                        <button 
                            type="button"
                            onClick={() => setShowBuildingInfo(!showBuildingInfo)}
                            className="w-full flex items-center justify-between p-3 bg-muted/50 hover:bg-muted transition-colors"
                        >
                            <span className="text-sm font-medium">Yapı & Arsa Bilgileri</span>
                            {showBuildingInfo ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </button>
                        
                        {showBuildingInfo && (
                            <div className="p-3 space-y-4 bg-card border-t animate-in slide-in-from-top-2">
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="arsa" className="text-xs">Arsa Payı</Label>
                                        <Input id="arsa" placeholder="Örn: 15/1000" className="h-8 text-sm" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="ada" className="text-xs">Ada / Parsel</Label>
                                        <Input id="ada" placeholder="Örn: 123/45" className="h-8 text-sm" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="blok" className="text-xs">Blok No</Label>
                                        <Input id="blok" placeholder="Örn: A Blok" className="h-8 text-sm" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="daire" className="text-xs">Daire Sayısı</Label>
                                        <Input id="daire" placeholder="Örn: 24" className="h-8 text-sm" />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewAccount(false)}>
                İptal
            </Button>
            <Button type="submit" onClick={() => setShowNewAccount(false)}>
                Kaydet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}