import { useState, useEffect } from "react"
import { Printer, Plus, User, Building2, ChevronDown, ChevronUp, Check, ChevronsUpDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AccountsTable } from "@/components/accounts-table"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { getAccounts, addAccount, deleteAccount, updateAccount } from "@/services/db" // Update fonksiyonunu ekledik

// Ülke Listesi
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

export type Account = {
  id: string;
  type: "individual" | "corporate";
  name: string;
  phone: string;
  email: string;
  city?: string;
  district?: string;
  tax_number?: string;    
  tax_office?: string;    
  land_share?: string;    
  block_number?: string;  
  parcel?: string;        
  flat_count?: string;    
  currency?: string;      
  borc: number;
  alacak: number;
}

export default function AccountsPage() {
  const { toast } = useToast()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [showNewAccount, setShowNewAccount] = useState(false)
  
  // DÜZENLEME MODU İÇİN STATE
  const [editingId, setEditingId] = useState<string | null>(null)

  // Form Durumları
  const [accountType, setAccountType] = useState<"individual" | "corporate">("individual")
  const [showBuildingInfo, setShowBuildingInfo] = useState(false) 
  
  const [openCountry, setOpenCountry] = useState(false)
  const [selectedCountry, setSelectedCountry] = useState(countries[0])

  // FORM DATASI
  const [formData, setFormData] = useState({
      ad: "", soyad: "", unvan: "", 
      tc: "", vkn: "", vergiDairesi: "",
      telefon: "", email: "", 
      city: "", district: "",
      arsaPayi: "", adaParsel: "", blokNo: "", daireSayisi: "",
      currency: "TRY", initialBalance: "", balanceType: "borc"
  })

  const loadAccounts = async () => {
    try {
      const data = await getAccounts();
      setAccounts(data as Account[]);
    } catch (error) { console.error(error) }
  }

  useEffect(() => { loadAccounts() }, [])

  // 1. DÜZENLEME FONKSİYONU (Formu Doldurur)
  const handleEdit = (account: Account) => {
      setEditingId(account.id); // Düzenleme modunu aç
      setAccountType(account.type);
      
      // İsmi parçala (Şahıs ise Ad/Soyad diye ayırmaya çalışalım)
      let ad = "", soyad = "", unvan = "";
      if (account.type === "individual") {
          const parts = account.name.split(" ");
          if (parts.length > 1) {
              soyad = parts.pop() || ""; // Son kelimeyi soyad yap
              ad = parts.join(" "); // Kalanları ad yap
          } else {
              ad = account.name;
          }
      } else {
          unvan = account.name;
      }

      // Telefonu temizle (Ülke kodunu ayıklamak zor olabilir, direkt koyalım)
      let phone = account.phone || "";
      // Basitçe ülke kodunu silelim (+90 )
      phone = phone.replace("+90 ", "").replace("+1 ", "").replace("+49 ", "");

      setFormData({
          ad, soyad, unvan,
          tc: account.tax_number || "",
          vkn: account.tax_number || "",
          vergiDairesi: account.tax_office || "",
          telefon: phone,
          email: account.email || "",
          city: account.city || "",
          district: account.district || "",
          arsaPayi: account.land_share || "",
          adaParsel: account.parcel || "",
          blokNo: account.block_number || "",
          daireSayisi: account.flat_count || "",
          currency: account.currency || "TRY",
          initialBalance: "", // Düzenlemede açılış bakiyesi değiştirilmez, sıfır bırak
          balanceType: "borc"
      });

      setShowNewAccount(true); // Modalı aç
  }

  // Yeni Ekleme Modunu Sıfırla
  const openNewAccountModal = () => {
      setEditingId(null); // Düzenleme modunu kapat
      setFormData({ 
            ad: "", soyad: "", unvan: "", tc: "", vkn: "", vergiDairesi: "",
            telefon: "", email: "", city: "", district: "", 
            arsaPayi: "", adaParsel: "", blokNo: "", daireSayisi: "",
            currency: "TRY", initialBalance: "", balanceType: "borc" 
      });
      setShowNewAccount(true);
  }

  const handleSave = async () => {
    const displayName = accountType === "individual" ? `${formData.ad} ${formData.soyad}` : formData.unvan
    
    if (!displayName.trim()) {
        toast({ title: "Hata", description: "Lütfen Ad/Soyad veya Ünvan giriniz.", variant: "destructive" }); return
    }

    try {
        const commonData = {
            type: accountType,
            name: displayName,
            tax_number: accountType === 'individual' ? formData.tc : formData.vkn,
            tax_office: accountType === 'corporate' ? formData.vergiDairesi : "",
            phone: `${selectedCountry.code} ${formData.telefon}`,
            email: formData.email,
            city: formData.city,
            district: formData.district,
            land_share: formData.arsaPayi,
            block_number: formData.blokNo,
            parcel: formData.adaParsel,
            flat_count: formData.daireSayisi,
            currency: formData.currency,
        };

        if (editingId) {
            // GÜNCELLEME İŞLEMİ
            await updateAccount(editingId, commonData);
            toast({ title: "Güncellendi", description: "Cari bilgileri başarıyla güncellendi." })
        } else {
            // YENİ KAYIT İŞLEMİ
            let initialBorc = 0;
            let initialAlacak = 0;
            const balance = parseFloat(formData.initialBalance);
            if (!isNaN(balance) && balance > 0) {
                if (formData.balanceType === "borc") initialBorc = balance;
                else initialAlacak = balance;
            }

            await addAccount({
                ...commonData,
                borc: initialBorc,
                alacak: initialAlacak
            });
            toast({ title: "Başarılı", description: "Cari kart oluşturuldu." })
        }

        await loadAccounts();
        setShowNewAccount(false)
        setEditingId(null);

    } catch (error) { 
        toast({ title: "Hata", description: "Kaydedilemedi.", variant: "destructive" }) 
        console.error(error)
    }
  }

  const handleDeleteAccount = async (id: string) => {
    await deleteAccount(id);
    loadAccounts();
    toast({ title: "Silindi", description: "Cari silindi." })
  }

  return (
    <div className="w-full space-y-6">
      <div className="flex items-center justify-between">
        <div>
            <h1 className="text-3xl font-bold tracking-tight">Cariler</h1>
            <p className="text-muted-foreground mt-1">Müşteri ve tedarikçi hesapları.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => window.print()} className="gap-2"><Printer className="h-4 w-4" /> Yazdır</Button>
          <Button onClick={openNewAccountModal} className="gap-2"><Plus className="h-4 w-4" /> Yeni Cari Ekle</Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle>Hesap Listesi</CardTitle></CardHeader>
        <CardContent>
          <AccountsTable data={accounts} onDelete={handleDeleteAccount} onEdit={handleEdit} onRefresh={loadAccounts} />
        </CardContent>
      </Card>

      {/* MODAL (Ekleme ve Düzenleme İçin Ortak) */}
      <Dialog open={showNewAccount} onOpenChange={setShowNewAccount}>
        <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
              <DialogTitle>{editingId ? "Cari Düzenle" : "Yeni Cari Hesap"}</DialogTitle>
          </DialogHeader>
          
          <div className="grid gap-5 py-2">
            
            <div className="grid grid-cols-2 p-1 bg-muted rounded-lg">
                <button type="button" onClick={() => setAccountType('individual')} 
                    className={cn("flex items-center justify-center gap-2 py-2.5 rounded-md text-sm font-medium transition-all", 
                    accountType === 'individual' ? "bg-background shadow-sm text-primary" : "text-muted-foreground hover:text-foreground")}> 
                    <User className="h-4 w-4" /> Şahıs 
                </button>
                <button type="button" onClick={() => setAccountType('corporate')} 
                    className={cn("flex items-center justify-center gap-2 py-2.5 rounded-md text-sm font-medium transition-all", 
                    accountType === 'corporate' ? "bg-background shadow-sm text-primary" : "text-muted-foreground hover:text-foreground")}> 
                    <Building2 className="h-4 w-4" /> Kurum / Yapı 
                </button>
            </div>

            {accountType === 'individual' ? (
                <div className="grid gap-4 animate-in fade-in slide-in-from-top-2">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5"><Label>Ad</Label><Input value={formData.ad} onChange={e => setFormData({...formData, ad: e.target.value})} placeholder="Ad giriniz" /></div>
                        <div className="space-y-1.5"><Label>Soyad</Label><Input value={formData.soyad} onChange={e => setFormData({...formData, soyad: e.target.value})} placeholder="Soyad giriniz" /></div>
                    </div>
                    <div className="space-y-1.5"><Label>TC Kimlik No</Label><Input value={formData.tc} onChange={e => setFormData({...formData, tc: e.target.value})} maxLength={11} placeholder="11 haneli TC Kimlik No" /></div>
                </div>
            ) : (
                <div className="grid gap-4 animate-in fade-in slide-in-from-top-2">
                    <div className="space-y-1.5"><Label>Ünvan</Label><Input value={formData.unvan} onChange={e => setFormData({...formData, unvan: e.target.value})} placeholder="Kurum veya Apartman adı" /></div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5"><Label>Vergi No</Label><Input value={formData.vkn} onChange={e => setFormData({...formData, vkn: e.target.value})} maxLength={10} placeholder="Vergi No" /></div>
                        <div className="space-y-1.5"><Label>Vergi Dairesi</Label><Input value={formData.vergiDairesi} onChange={e => setFormData({...formData, vergiDairesi: e.target.value})} placeholder="Vergi Dairesi" /></div>
                    </div>
                </div>
            )}

            <div className="grid gap-4">
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <Label>Telefon</Label>
                        <div className="flex">
                            <Popover open={openCountry} onOpenChange={setOpenCountry}>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" role="combobox" aria-expanded={openCountry} className="w-[100px] justify-between rounded-r-none border-r-0 px-2">
                                        <span className="flex items-center gap-1 truncate">
                                            <span>{selectedCountry.value}</span>
                                            <span className="text-muted-foreground">{selectedCountry.code}</span>
                                        </span>
                                        <ChevronsUpDown className="ml-1 h-3 w-3 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[200px] p-0" align="start">
                                    <Command>
                                        <CommandInput placeholder="Ülke ara..." />
                                        <CommandList>
                                            <CommandEmpty>Bulunamadı.</CommandEmpty>
                                            <CommandGroup>
                                                {countries.map((country) => (
                                                    <CommandItem key={country.value} value={country.label} onSelect={() => { setSelectedCountry(country); setOpenCountry(false) }}>
                                                        <Check className={cn("mr-2 h-4 w-4", selectedCountry.value === country.value ? "opacity-100" : "opacity-0")} />
                                                        <span className="mr-2">{country.flag}</span>{country.label}
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                            <Input id="tel" type="tel" placeholder="5XX XXX XX XX" className="rounded-l-none" value={formData.telefon} onChange={(e) => setFormData({...formData, telefon: e.target.value})} />
                        </div>
                    </div>
                    <div className="space-y-1.5"><Label>E-posta</Label><Input placeholder="ornek@email.com" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5"><Label>İl</Label><Input placeholder="Örn: İstanbul" value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} /></div>
                    <div className="space-y-1.5"><Label>İlçe</Label><Input placeholder="Örn: Kadıköy" value={formData.district} onChange={e => setFormData({...formData, district: e.target.value})} /></div>
                </div>
            </div>

            {accountType === 'corporate' && (
                <div className="border rounded-lg overflow-hidden animate-in fade-in slide-in-from-top-2">
                    <button type="button" onClick={() => setShowBuildingInfo(!showBuildingInfo)} className="w-full flex items-center justify-between p-3 bg-muted/50 hover:bg-muted transition-colors">
                        <span className="text-sm font-medium">Yapı & Arsa Bilgileri</span>
                        {showBuildingInfo ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                    {showBuildingInfo && (
                        <div className="p-3 space-y-3 bg-card border-t">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1"><Label className="text-xs">Arsa Payı</Label><Input placeholder="Örn: 15/1000" className="h-9" value={formData.arsaPayi} onChange={e => setFormData({...formData, arsaPayi: e.target.value})} /></div>
                                <div className="space-y-1"><Label className="text-xs">Ada / Parsel</Label><Input placeholder="Örn: 123/45" className="h-9" value={formData.adaParsel} onChange={e => setFormData({...formData, adaParsel: e.target.value})} /></div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1"><Label className="text-xs">Blok No</Label><Input placeholder="Örn: A Blok" className="h-9" value={formData.blokNo} onChange={e => setFormData({...formData, blokNo: e.target.value})} /></div>
                                <div className="space-y-1"><Label className="text-xs">Daire Sayısı</Label><Input placeholder="Örn: 24" className="h-9" value={formData.daireSayisi} onChange={e => setFormData({...formData, daireSayisi: e.target.value})} /></div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* DÜZENLEME MODUNDA FİNANSAL BİLGİLER GİZLENSİN (KARIŞIKLIĞI ÖNLEMEK İÇİN) */}
            {!editingId && (
                <div className="grid grid-cols-3 gap-3 p-3 bg-muted/30 rounded-lg border border-dashed">
                    <div className="space-y-1.5">
                        <Label className="text-xs">Para Birimi</Label>
                        <Select value={formData.currency} onValueChange={v => setFormData({...formData, currency: v})}>
                            <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="TRY">TRY (₺)</SelectItem>
                                <SelectItem value="USD">USD ($)</SelectItem>
                                <SelectItem value="EUR">EUR (€)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-xs">Açılış Tutarı</Label>
                        <Input type="number" className="h-9 text-sm" placeholder="0.00" value={formData.initialBalance} onChange={e => setFormData({...formData, initialBalance: e.target.value})} />
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-xs">Durumu</Label>
                        <Select value={formData.balanceType} onValueChange={v => setFormData({...formData, balanceType: v})}>
                            <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="borc">Borçlu (Verecek)</SelectItem>
                                <SelectItem value="alacak">Alacaklı (Alacak)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            )}

          </div>
          <DialogFooter><Button onClick={handleSave} className="w-full sm:w-auto">{editingId ? "Güncelle" : "Kaydet"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}