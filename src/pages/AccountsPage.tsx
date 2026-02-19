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
import { getAccounts, addAccount, deleteAccount, updateAccount } from "@/services/db"

// Para birimi formatlayıcı (Yazdırma ekranı için gerekli)
const formatCurrency = (amount: number) => new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(amount)

const countries = [
  { label: "Türkiye", value: "TR", code: "+90", flag: "🇹🇷" },
  { label: "ABD", value: "US", code: "+1", flag: "🇺🇸" },
  { label: "Almanya", value: "DE", code: "+49", flag: "🇩🇪" },
  { label: "İngiltere", value: "UK", code: "+44", flag: "🇬🇧" },
  { label: "Fransa", value: "FR", code: "+33", flag: "🇫🇷" },
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
  bakiye: number; 
}

export default function AccountsPage() {
  const { toast } = useToast()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [showNewAccount, setShowNewAccount] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [accountType, setAccountType] = useState<"individual" | "corporate">("individual")
  const [showBuildingInfo, setShowBuildingInfo] = useState(false) 
  const [openCountry, setOpenCountry] = useState(false)
  const [selectedCountry, setSelectedCountry] = useState(countries[0])

  const [formData, setFormData] = useState({
      ad: "", soyad: "", unvan: "", 
      tc: "", vkn: "", vergiDairesi: "",
      telefon: "", email: "", 
      city: "", district: "",
      arsaPayi: "", adaParsel: "", blokNo: "", daireSayisi: "",
      currency: "TRY", borc: "", alacak: "", bakiye: ""
  })

  const loadAccounts = async () => {
    try {
      const data = await getAccounts();
      setAccounts(data as Account[]);
    } catch (error) { console.error(error) }
  }

  useEffect(() => { loadAccounts() }, [])

  // --- LİSTEYİ YAZDIRMA FONKSİYONU ---
  const handlePrintAccountsList = () => {
    const printWindow = document.createElement('iframe');
    printWindow.style.position = 'absolute';
    printWindow.style.top = '-1000px';
    printWindow.style.left = '-1000px';
    document.body.appendChild(printWindow);

    const doc = printWindow.contentWindow?.document;
    if (!doc) return;

    // Tüm carileri HTML tablo satırlarına dönüştür
    const accountsHtml = accounts.map(acc => `
      <tr>
        <td>${acc.name}</td>
        <td>${acc.phone || '-'}</td>
        <td>${acc.city || '-'} / ${acc.district || '-'}</td>
        <td class="text-right text-red">${formatCurrency(acc.borc || 0)}</td>
        <td class="text-right text-green">${formatCurrency(acc.alacak || 0)}</td>
        <td class="text-right font-bold">${formatCurrency(acc.bakiye || 0)}</td>
      </tr>
    `).join('');

    doc.write(`
      <html>
        <head>
          <title>Cari Hesap Listesi</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
            .header { border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
            h1 { font-size: 24px; margin: 0 0 5px 0; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 10px; text-align: left; font-size: 13px; }
            th { background-color: #f1f5f9; }
            .text-right { text-align: right; }
            .font-bold { font-weight: bold; }
            .text-red { color: #dc2626; }
            .text-green { color: #16a34a; }
            .print-date { font-size: 12px; color: #666; text-align: right; margin-top: 30px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Cari Hesap Listesi</h1>
            <p style="margin:0; color:#666;">İşletmenize ait tüm kayıtlı cari hesapların genel özet tablosudur.</p>
          </div>
          
          <table>
            <thead>
              <tr>
                <th>Ad / Ünvan</th>
                <th>Telefon</th>
                <th>Bölge</th>
                <th class="text-right">Toplam Borç</th>
                <th class="text-right">Toplam Alacak</th>
                <th class="text-right">Bakiye</th>
              </tr>
            </thead>
            <tbody>
              ${accountsHtml || '<tr><td colspan="6" style="text-align:center">Kayıtlı cari bulunamadı.</td></tr>'}
            </tbody>
          </table>

          <div class="print-date">
            Yazdırılma Tarihi: ${new Date().toLocaleString('tr-TR')}
          </div>
        </body>
      </html>
    `);
    doc.close();

    printWindow.contentWindow?.focus();
    printWindow.contentWindow?.print();
    setTimeout(() => { document.body.removeChild(printWindow); }, 1000);
  };

  const handleEdit = (account: Account) => {
      setEditingId(account.id); 
      setAccountType(account.type);
      
      let ad = "", soyad = "", unvan = "";
      if (account.type === "individual") {
          const parts = account.name.split(" ");
          if (parts.length > 1) {
              soyad = parts.pop() || ""; 
              ad = parts.join(" "); 
          } else {
              ad = account.name;
          }
      } else {
          unvan = account.name;
      }

      let phone = account.phone || "";
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
          borc: account.borc.toString(),
          alacak: account.alacak.toString(),
          bakiye: account.bakiye.toString()
      });

      setShowNewAccount(true);
  }

  const openNewAccountModal = () => {
      setEditingId(null); 
      setFormData({ 
            ad: "", soyad: "", unvan: "", tc: "", vkn: "", vergiDairesi: "",
            telefon: "", email: "", city: "", district: "", 
            arsaPayi: "", adaParsel: "", blokNo: "", daireSayisi: "",
            currency: "TRY", borc: "", alacak: "", bakiye: "" 
      });
      setShowNewAccount(true);
  }

  const handleSave = async () => {
    const displayName = accountType === "individual" ? `${formData.ad} ${formData.soyad}` : formData.unvan
    if (!displayName.trim()) {
        toast({ title: "Hata", description: "Lütfen Ad/Soyad veya Ünvan giriniz.", variant: "destructive" }); return
    }

    try {
        const parsedBorc = parseFloat(formData.borc) || 0;
        const parsedAlacak = parseFloat(formData.alacak) || 0;
        const parsedBakiye = parseFloat(formData.bakiye) || 0;

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
            borc: parsedBorc,
            alacak: parsedAlacak,
            bakiye: parsedBakiye
        };

        if (editingId) {
            await updateAccount(editingId, commonData);
            toast({ title: "Güncellendi", description: "Cari bilgileri başarıyla güncellendi." })
        } else {
            await addAccount(commonData);
            toast({ title: "Başarılı", description: "Cari kart oluşturuldu." })
        }

        await loadAccounts();
        setShowNewAccount(false)
        setEditingId(null);

    } catch (error) { 
        toast({ title: "Hata", description: "Kaydedilemedi.", variant: "destructive" }) 
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
          {/* YAZDIR BUTONU YENİ FONKSİYONA BAĞLANDI */}
          <Button variant="outline" onClick={handlePrintAccountsList} className="gap-2">
            <Printer className="h-4 w-4" /> Yazdır
          </Button>
          <Button onClick={openNewAccountModal} className="gap-2">
            <Plus className="h-4 w-4" /> Yeni Cari Ekle
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle>Hesap Listesi</CardTitle></CardHeader>
        <CardContent>
          <AccountsTable data={accounts} onDelete={handleDeleteAccount} onEdit={handleEdit} onRefresh={loadAccounts} />
        </CardContent>
      </Card>

      <Dialog open={showNewAccount} onOpenChange={setShowNewAccount}>
        <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto">
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

            <div className="border border-dashed p-4 rounded-lg bg-card/50">
                <h4 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center justify-between">
                    <span>Finansal Bilgiler</span>
                    <Select value={formData.currency} onValueChange={v => setFormData({...formData, currency: v})}>
                        <SelectTrigger className="w-[120px] h-8 text-xs bg-background"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="TRY">TRY (₺)</SelectItem>
                            <SelectItem value="USD">USD ($)</SelectItem>
                            <SelectItem value="EUR">EUR (€)</SelectItem>
                        </SelectContent>
                    </Select>
                </h4>
                <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                        <Label className="text-xs text-destructive">Toplam Borç</Label>
                        <Input type="number" placeholder="0.00" value={formData.borc} onChange={e => setFormData({...formData, borc: e.target.value})} />
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-xs text-green-600">Toplam Alacak</Label>
                        <Input type="number" placeholder="0.00" value={formData.alacak} onChange={e => setFormData({...formData, alacak: e.target.value})} />
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-xs text-primary font-bold">Açılış Bakiyesi</Label>
                        <Input type="number" className="font-bold bg-muted/50" placeholder="0.00" value={formData.bakiye} onChange={e => setFormData({...formData, bakiye: e.target.value})} />
                    </div>
                </div>
            </div>

          </div>
          <DialogFooter><Button onClick={handleSave} className="w-full sm:w-auto">{editingId ? "Güncelle" : "Kaydet"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}