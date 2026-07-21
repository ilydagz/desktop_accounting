import { useState } from "react"
import { Printer, Plus, User, Building2, ChevronDown, ChevronUp, Check, ChevronsUpDown, UserPlus, Star } from "lucide-react"
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
import { addAccount, deleteAccount, updateAccount } from "@/services/db"
import { useAuth } from "@/contexts/AuthContext"
import { useData } from "@/contexts/DataContext"

const formatCurrency = (amount: number) => new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(amount)
const countries = [{ label: "Türkiye", value: "TR", code: "+90", flag: "🇹🇷" }, { label: "ABD", value: "US", code: "+1", flag: "🇺🇸" }, { label: "Almanya", value: "DE", code: "+49", flag: "🇩🇪" }]

export type Account = {
  id: string; type: "individual" | "corporate" | "owner" | "customer"; name: string; phone: string; email: string; city?: string; district?: string; tax_number?: string; tax_office?: string; land_share?: string; block_number?: string; parcel?: string; flat_count?: string; owner_id?: string | null; currency?: string; borc: number; alacak: number; bakiye: number; created_at?: string; role?: string; salary?: string; start_date?: string; customer_group?: string; maturity_days?: string; delivery_address?: string; notes?: string; custom_code?: string;
}

export default function AccountsPage() {
  const { toast } = useToast()
  const { institutionType } = useAuth()
  const { accounts, setAccounts, refreshData } = useData()
  const [showNewAccount, setShowNewAccount] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [accountType, setAccountType] = useState<"individual" | "corporate" | "customer">("individual")
  const [showBuildingInfo, setShowBuildingInfo] = useState(false) 
  const [openCountry, setOpenCountry] = useState(false)
  const [selectedCountry, setSelectedCountry] = useState(countries[0])

  const [showQuickAdd, setShowQuickAdd] = useState(false)
  const [quickAddName, setQuickAddName] = useState("")
  const [quickAddPhone, setQuickAddPhone] = useState("")

  const [formData, setFormData] = useState({
      ad: "", soyad: "", unvan: "", tc: "", vkn: "", vergiDairesi: "",
      telefon: "", email: "", city: "", district: "",
      arsaPayi: "", adaParsel: "", blokNo: "", daireSayisi: "", ownerId: "none",
      currency: "TRY", borc: "", alacak: "", bakiye: "", role: "", salary: "", startDate: "",
      customerGroup: "", maturityDays: "", deliveryAddress: "", notes: "", customCode: ""
  })

  const getTerm = () => {
    switch (institutionType) {
      case 'sirket': return { title: "Cariler", sub: "Müşteri ve tedarikçi hesapları.", addBtn: "Yeni Cari Ekle", single: "Cari", list: "Cari Listesi", customTabName: "Detaylı Müşteri Profili" }
      case 'koop': return { title: "Kooperatif Üyeleri", sub: "Kooperatife kayıtlı üyeler ve aidat hesapları.", addBtn: "Yeni Üye Ekle", single: "Üye", list: "Üye Listesi", customTabName: "Detaylı Müşteri Profili" }
      case 'apartman': return { title: "Kat Malikleri / Sakinler", sub: "Apartman veya site sakinlerinin aidat hesapları.", addBtn: "Yeni Sakin Ekle", single: "Sakin", list: "Sakinler Listesi", customTabName: "Detaylı Müşteri Profili" }
      case 'dernek': return { title: "Üyeler / Bağışçılar", sub: "Dernek üyeleri ve bağışçı hesapları.", addBtn: "Yeni Üye Ekle", single: "Üye", list: "Üye Listesi", customTabName: "Detaylı Müşteri Profili" }
      case 'cami': return { title: "Bağışçılar", sub: "Cami bağışçıları ve yardım hesapları.", addBtn: "Yeni Bağışçı Ekle", single: "Bağışçı", list: "Bağışçı Listesi", customTabName: "Detaylı Bağışçı Profili" }
      case 'bireysel': return { title: "Kişiler / Borçlular", sub: "Bireysel alacak ve verecek hesapları.", addBtn: "Yeni Kişi Ekle", single: "Kişi", list: "Kişi Listesi", customTabName: "Özel Müşteri Kartı" }
      default: return { title: "Cariler", sub: "Müşteri ve tedarikçi hesapları.", addBtn: "Yeni Cari Ekle", single: "Cari", list: "Cari Listesi", customTabName: "Detaylı Müşteri Profili" }
    }
  }
  const t = getTerm();

  const [showPrintDialog, setShowPrintDialog] = useState(false);
  const [printFilter, setPrintFilter] = useState("all");
  const [printSort, setPrintSort] = useState("name-asc");
  const [printShowPhone, setPrintShowPhone] = useState(true);

  const handlePrintAccountsList = () => {
    const printWindow = document.createElement('iframe');
    printWindow.style.position = 'absolute';
    printWindow.style.top = '-1000px';
    printWindow.style.left = '-1000px';
    document.body.appendChild(printWindow);

    const doc = printWindow.contentWindow?.document;
    if (!doc) return;

    let visibleAccounts = accounts.filter(a => a.type !== 'owner');
    
    if (printFilter === "borclular") {
      visibleAccounts = visibleAccounts.filter(a => ((a.borc || 0) - (a.alacak || 0)) > 0);
    } else if (printFilter === "alacaklilar") {
      visibleAccounts = visibleAccounts.filter(a => ((a.borc || 0) - (a.alacak || 0)) < 0);
    } else if (printFilter === "custom-code-only") {
      visibleAccounts = visibleAccounts.filter(a => !!a.custom_code);
    }

    // Sort accounts
    visibleAccounts.sort((a, b) => {
      if (printSort === "name-asc") return a.name.localeCompare(b.name);
      if (printSort === "name-desc") return b.name.localeCompare(a.name);
      
      const codeA = parseFloat(a.custom_code || "0") || 0;
      const codeB = parseFloat(b.custom_code || "0") || 0;
      if (printSort === "code-asc") return codeA - codeB;
      if (printSort === "code-desc") return codeB - codeA;
      
      return 0;
    });

    const accountsHtml = visibleAccounts.map(acc => {
      const netFark = (acc.borc || 0) - (acc.alacak || 0);
      const durumText = netFark > 0 ? '<br/><span style="font-size:10px; color:#16a34a;">(BORÇLU)</span>' : netFark < 0 ? '<br/><span style="font-size:10px; color:#dc2626;">(ALACAKLI)</span>' : '';
      return `
      <tr>
        <td>${acc.custom_code || '-'}</td>
        <td>${acc.name}</td>
        ${printShowPhone ? `<td>${acc.phone && acc.phone !== "undefined" ? acc.phone : '-'}</td>` : ''}
        <td class="text-right text-red">${formatCurrency(acc.borc || 0)}</td>
        <td class="text-right text-green">${formatCurrency(acc.alacak || 0)}</td>
        <td class="text-right font-bold">${formatCurrency(acc.bakiye || 0)}</td>
        <td class="text-right font-bold">${formatCurrency(Math.abs(netFark))} ${durumText}</td>
      </tr>
    `}).join('');

    const totalBorc = visibleAccounts.reduce((sum, acc) => sum + (acc.borc || 0), 0);
    const totalAlacak = visibleAccounts.reduce((sum, acc) => sum + (acc.alacak || 0), 0);
    const totalBakiye = visibleAccounts.reduce((sum, acc) => sum + (acc.bakiye || 0), 0);
    const totalNetFark = totalBorc - totalAlacak;
    const totalDurumText = totalNetFark > 0 ? '<br/><span style="font-size:10px; color:#16a34a;">(BORÇLU)</span>' : totalNetFark < 0 ? '<br/><span style="font-size:10px; color:#dc2626;">(ALACAKLI)</span>' : '';

    const filterTitle = printFilter === "borclular" ? `Borçlu ${t.title}` : printFilter === "alacaklilar" ? `Alacaklı ${t.title}` : t.list;

    doc.write(`
      <html>
        <head>
          <title>${filterTitle}</title>
          <style>
            @page { margin: 0; }
            body { font-family: Arial, sans-serif; padding: 20px; color: #333; margin: 1cm; }
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
            <h1>${filterTitle}</h1>
            <p style="margin:0; color:#666;">İşletmenize ait kayıtlı ${t.title.toLowerCase()} listesinin güncel özet tablosudur.</p>
          </div>
          <table>
            <thead>
              <tr>
                <th>Özel Kod</th>
                <th>Ad / Ünvan</th>
                ${printShowPhone ? `<th>Telefon</th>` : ''}
                <th class="text-right">Borç</th>
                <th class="text-right">Alacak</th>
                <th class="text-right">Genel Bakiye</th>
                <th class="text-right">Net Durum</th>
              </tr>
            </thead>
            <tbody>
              ${accountsHtml || `<tr><td colspan="${printShowPhone ? 7 : 6}" style="text-align:center">Kayıtlı ${t.single.toLowerCase()} bulunamadı.</td></tr>`}
            </tbody>
            <tfoot>
              <tr style="background-color: #f1f5f9; font-weight: bold;">
                <td colspan="${printShowPhone ? 3 : 2}" class="text-right">TOPLAM</td>
                <td class="text-right text-red">${formatCurrency(totalBorc)}</td>
                <td class="text-right text-green">${formatCurrency(totalAlacak)}</td>
                <td class="text-right">${formatCurrency(totalBakiye)}</td>
                <td class="text-right">${formatCurrency(Math.abs(totalNetFark))} ${totalDurumText}</td>
              </tr>
            </tfoot>
          </table>
          <div class="print-date">Yazdırılma Tarihi: ${new Date().toLocaleString('tr-TR')}</div>
        </body>
      </html>
    `);
    doc.close();

    setTimeout(() => {
        printWindow.contentWindow?.focus();
        printWindow.contentWindow?.print();
        setTimeout(() => { document.body.removeChild(printWindow); }, 1000);
    }, 250);
    
    setShowPrintDialog(false);
  };

  const selectableOwners = accounts.filter(acc => acc.type === "individual" || acc.type === "owner");
  const mainTableAccounts = accounts.filter(acc => acc.type !== "owner");

  const handleQuickAdd = async () => {
      if (!quickAddName.trim()) { toast({ title: "Hata", description: "Ad Soyad gerekli.", variant: "destructive" }); return; }
      try {
          const tempId = "temp-" + Date.now();
          const newOwner = { id: tempId, type: "owner", name: quickAddName, phone: quickAddPhone, borc: 0, alacak: 0, bakiye: 0 };
          setAccounts(prev => [newOwner, ...prev]);
          setFormData({ ...formData, ownerId: tempId });
          setShowQuickAdd(false); setQuickAddName(""); setQuickAddPhone("");
          toast({ title: "Başarılı", description: "Sahip eklendi." });
          
          await addAccount({ type: "owner", name: quickAddName, phone: quickAddPhone, borc: 0, alacak: 0, bakiye: 0 });
          await refreshData();
      } catch(e) { 
          refreshData();
          toast({ title: "Hata", description: "Eklenemedi", variant: "destructive" }); 
      }
  }

  const handleEdit = (account: Account) => {
      setEditingId(account.id); 
      setAccountType(account.type === "owner" ? "individual" : account.type);
      let ad = "", soyad = "", unvan = "";
      if (account.type === "individual" || account.type === "owner") {
          const parts = account.name.split(" ");
          if (parts.length > 1) { soyad = parts.pop() || ""; ad = parts.join(" "); } else { ad = account.name; }
      } else { unvan = account.name; }

      let phone = account.phone || ""; phone = phone.replace("+90 ", "").replace("+1 ", "").replace("+49 ", "");

      setFormData({
          ad, soyad, unvan, tc: account.tax_number === "undefined" ? "" : (account.tax_number || ""), vkn: account.tax_number === "undefined" ? "" : (account.tax_number || ""), vergiDairesi: account.tax_office === "undefined" ? "" : (account.tax_office || ""),
          telefon: phone === "undefined" ? "" : phone, email: account.email === "undefined" ? "" : (account.email || ""), city: account.city === "undefined" ? "" : (account.city || ""), district: account.district === "undefined" ? "" : (account.district || ""),
          arsaPayi: account.land_share === "undefined" ? "" : (account.land_share || ""), adaParsel: account.parcel === "undefined" ? "" : (account.parcel || ""), blokNo: account.block_number === "undefined" ? "" : (account.block_number || ""), daireSayisi: account.flat_count === "undefined" ? "" : (account.flat_count || ""),
          ownerId: account.owner_id || "none", currency: account.currency || "TRY",
          borc: account.borc.toString(), alacak: account.alacak.toString(), bakiye: account.bakiye.toString(),
          role: account.role === "undefined" ? "" : (account.role || ""), salary: account.salary === "undefined" ? "" : (account.salary || ""), startDate: account.start_date === "undefined" ? "" : (account.start_date || ""),
          customerGroup: account.customer_group === "undefined" ? "" : (account.customer_group || ""), maturityDays: account.maturity_days === "undefined" ? "" : (account.maturity_days || ""), deliveryAddress: account.delivery_address === "undefined" ? "" : (account.delivery_address || ""), notes: account.notes === "undefined" ? "" : (account.notes || ""),
          customCode: account.custom_code === "undefined" ? "" : (account.custom_code || "")
      });
      setShowNewAccount(true);
  }

  const openNewAccountModal = () => {
      setEditingId(null); 
      setFormData({ ad: "", soyad: "", unvan: "", tc: "", vkn: "", vergiDairesi: "", telefon: "", email: "", city: "", district: "", arsaPayi: "", adaParsel: "", blokNo: "", daireSayisi: "", ownerId: "none", currency: "TRY", borc: "", alacak: "", bakiye: "", role: "", salary: "", startDate: "", customerGroup: "", maturityDays: "", deliveryAddress: "", notes: "", customCode: "" });
      setShowNewAccount(true);
  }

  const handleSave = async () => {
    const isPerson = accountType === "individual" || accountType === "customer";
    const displayName = isPerson ? `${formData.ad} ${formData.soyad}`.trim() : formData.unvan.trim();
    if (!displayName) { toast({ title: "Hata", description: "Lütfen isim veya ünvan giriniz.", variant: "destructive" }); return }

    try {
        const commonData = {
            type: accountType, name: displayName,
            tax_number: accountType === 'individual' ? formData.tc : accountType === 'customer' ? formData.tc : formData.vkn,
            tax_office: accountType === 'corporate' ? formData.vergiDairesi : null,
            phone: formData.telefon ? `${selectedCountry.code} ${formData.telefon}` : null,
            email: formData.email || null, city: formData.city || null, district: formData.district || null,
            land_share: formData.arsaPayi || null, block_number: formData.blokNo || null, parcel: formData.adaParsel || null, flat_count: formData.daireSayisi || null,
            owner_id: accountType === 'corporate' && formData.ownerId !== "none" ? formData.ownerId : null,
            customer_group: accountType === 'customer' ? formData.customerGroup : null,
            maturity_days: accountType === 'customer' ? formData.maturityDays : null,
            delivery_address: accountType === 'customer' ? formData.deliveryAddress : null,
            notes: accountType === 'customer' ? formData.notes : null,
            custom_code: formData.customCode || null,
            currency: formData.currency, borc: parseFloat(formData.borc) || 0, alacak: parseFloat(formData.alacak) || 0, bakiye: parseFloat(formData.bakiye) || 0
        };

        if (editingId) { 
            setAccounts(prev => prev.map(a => a.id === editingId ? { ...a, ...commonData } : a));
            setShowNewAccount(false); setEditingId(null);
            toast({ title: "Güncellendi", description: `${t.single} başarıyla güncellendi.` });
            await updateAccount(editingId, commonData); 
        } 
        else { 
            const tempId = "temp-" + Date.now();
            setAccounts(prev => [{ id: tempId, ...commonData }, ...prev]);
            setShowNewAccount(false); setEditingId(null);
            toast({ title: "Başarılı", description: `${t.single} kartı oluşturuldu.` });
            await addAccount(commonData); 
        }

        refreshData(); 
    } catch (error) { 
        refreshData();
        toast({ title: "Hata", description: "İşlem sırasında bir hata oluştu.", variant: "destructive" });
    }
  }

  const handleDeleteAccount = async (id: string) => { 
      try {
          setAccounts(prev => prev.filter(a => a.id !== id));
          toast({ title: "Silindi", description: `${t.single} silindi.` });
          await deleteAccount(id); 
          refreshData(); 
      } catch (e) {
          refreshData();
          toast({ title: "Hata", description: "Silinemedi", variant: "destructive" });
      }
  }

  return (
    <div className="w-full space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-3xl font-bold tracking-tight">{t.title}</h1><p className="text-muted-foreground mt-1">{t.sub}</p></div>
        <div className="flex gap-3">
            <Button variant="outline" onClick={() => setShowPrintDialog(true)} className="gap-2"><Printer className="h-4 w-4" /> Listeyi Yazdır</Button>
            <Button onClick={openNewAccountModal} className="gap-2"><Plus className="h-4 w-4" /> {t.addBtn}</Button>
        </div>
      </div>

      <Dialog open={showPrintDialog} onOpenChange={setShowPrintDialog}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader><DialogTitle>Yazdır - {t.list}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-1.5">
              <Label>Hangi listeyi yazdırmak istersiniz?</Label>
              <Select value={printFilter} onValueChange={setPrintFilter}>
                <SelectTrigger><SelectValue placeholder="Seçiniz..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tüm {t.title}</SelectItem>
                  <SelectItem value="borclular">Sadece Borçlular (Bize Borcu Olanlar)</SelectItem>
                  <SelectItem value="alacaklilar">Sadece Alacaklılar (Bizden Alacağı Olanlar)</SelectItem>
                  <SelectItem value="custom-code-only">Sadece Özel Kodu Olanlar</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-1.5 mt-2">
              <Label>Sıralama Seçeneği</Label>
              <Select value={printSort} onValueChange={setPrintSort}>
                <SelectTrigger><SelectValue placeholder="Sıralama Seçiniz..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="name-asc">Ad (A-Z)</SelectItem>
                  <SelectItem value="name-desc">Ad (Z-A)</SelectItem>
                  <SelectItem value="code-asc">Özel Kod (Küçükten Büyüğe)</SelectItem>
                  <SelectItem value="code-desc">Özel Kod (Büyükten Küçüğe)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2 mt-4">
              <input type="checkbox" id="showPhone" className="h-4 w-4" checked={printShowPhone} onChange={e => setPrintShowPhone(e.target.checked)} />
              <Label htmlFor="showPhone" className="cursor-pointer">Telefon Numaraları Yazdırılsın</Label>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setShowPrintDialog(false)}>İptal</Button><Button onClick={handlePrintAccountsList}><Printer className="h-4 w-4 mr-2" /> Yazdır</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader className="pb-3"><CardTitle>Hesap Listesi</CardTitle></CardHeader>
        <CardContent>
            <AccountsTable data={mainTableAccounts} fullData={accounts} onDelete={handleDeleteAccount} onEdit={handleEdit} onRefresh={refreshData} />
        </CardContent>
      </Card>

      <Dialog open={showNewAccount} onOpenChange={setShowNewAccount}>
        <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingId ? `${t.single} Düzenle` : `Yeni ${t.single}`}</DialogTitle></DialogHeader>
          
          <div className="grid gap-5 py-2">
            <div className={`grid grid-cols-${t.customTabName ? '3' : '2'} p-1 bg-muted rounded-lg`}>
                <button type="button" onClick={() => setAccountType('individual')} className={cn("flex items-center justify-center gap-2 py-2.5 rounded-md text-sm font-medium transition-all", accountType === 'individual' ? "bg-background shadow-sm text-primary" : "text-muted-foreground hover:text-foreground")}><User className="h-4 w-4" /> {institutionType === 'cami' ? 'Bireysel Bağışçı' : 'Şahıs'}</button>
                <button type="button" onClick={() => setAccountType('corporate')} className={cn("flex items-center justify-center gap-2 py-2.5 rounded-md text-sm font-medium transition-all", accountType === 'corporate' ? "bg-background shadow-sm text-primary" : "text-muted-foreground hover:text-foreground")}><Building2 className="h-4 w-4" /> {institutionType === 'cami' ? 'Kurumsal Bağışçı' : 'Kurum'}</button>
                {t.customTabName && (
                  <button type="button" onClick={() => setAccountType('customer')} className={cn("flex items-center justify-center gap-2 py-2.5 rounded-md text-sm font-medium transition-all", accountType === 'customer' ? "bg-background shadow-sm text-primary" : "text-muted-foreground hover:text-foreground")}><Star className="h-4 w-4" /> CRM Kartı</button>
                )}
            </div>

            {accountType === 'individual' && (
                <div className="grid gap-4 animate-in fade-in slide-in-from-top-2">
                    <div className="space-y-1.5"><Label>{institutionType === 'cami' ? 'Makbuz No / Özel Kod' : 'Özel Kod / Hisse No (Opsiyonel)'}</Label><Input autoComplete="off" type="number" value={formData.customCode} onChange={e => setFormData({...formData, customCode: e.target.value})} placeholder="Sayısal kod giriniz" /></div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5"><Label>Ad</Label><Input autoComplete="off" value={formData.ad} onChange={e => setFormData({...formData, ad: e.target.value})} placeholder="Ad giriniz" /></div>
                        <div className="space-y-1.5"><Label>Soyad</Label><Input autoComplete="off" value={formData.soyad} onChange={e => setFormData({...formData, soyad: e.target.value})} placeholder="Soyad giriniz" /></div>
                    </div>
                    <div className="space-y-1.5"><Label>TC Kimlik No (Opsiyonel)</Label><Input autoComplete="off" value={formData.tc} onChange={e => setFormData({...formData, tc: e.target.value})} maxLength={11} placeholder="11 haneli TC Kimlik No" /></div>
                    
                    <div className="grid grid-cols-2 gap-4"><div className="space-y-1.5"><Label>Telefon</Label><div className="flex"><Popover open={openCountry} onOpenChange={setOpenCountry}><PopoverTrigger asChild><Button variant="outline" role="combobox" aria-expanded={openCountry} className="w-[100px] justify-between rounded-r-none border-r-0 px-2"><span className="flex items-center gap-1 truncate"><span>{selectedCountry.value}</span></span><ChevronsUpDown className="ml-1 h-3 w-3 opacity-50" /></Button></PopoverTrigger><PopoverContent className="w-[200px] p-0" align="start"><Command><CommandInput placeholder="Ülke ara..." /><CommandList><CommandEmpty>Bulunamadı.</CommandEmpty><CommandGroup>{countries.map((country) => (<CommandItem key={country.value} value={country.label} onSelect={() => { setSelectedCountry(country); setOpenCountry(false) }}><Check className={cn("mr-2 h-4 w-4", selectedCountry.value === country.value ? "opacity-100" : "opacity-0")} /><span className="mr-2">{country.flag}</span>{country.label}</CommandItem>))}</CommandGroup></CommandList></Command></PopoverContent></Popover><Input autoComplete="off" id="tel" type="tel" placeholder="5XX XXX XX XX" className="rounded-l-none" value={formData.telefon} onChange={(e) => setFormData({...formData, telefon: e.target.value})} /></div></div><div className="space-y-1.5"><Label>E-posta</Label><Input autoComplete="off" placeholder="ornek@email.com" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} /></div></div>
                    <div className="grid grid-cols-2 gap-4"><div className="space-y-1.5"><Label>İl</Label><Input autoComplete="off" placeholder="Örn: İstanbul" value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} /></div><div className="space-y-1.5"><Label>İlçe</Label><Input autoComplete="off" placeholder="Örn: Kadıköy" value={formData.district} onChange={e => setFormData({...formData, district: e.target.value})} /></div></div>
                </div>
            )}

            {accountType === 'corporate' && (
                <div className="grid gap-4 animate-in fade-in slide-in-from-top-2">
                    <div className="space-y-1.5"><Label>{institutionType === 'cami' ? 'Makbuz No / Özel Kod' : 'Özel Kod / Hisse No (Opsiyonel)'}</Label><Input autoComplete="off" type="number" value={formData.customCode} onChange={e => setFormData({...formData, customCode: e.target.value})} placeholder="Sayısal kod giriniz" /></div>
                    <div className="space-y-1.5"><Label>{institutionType === 'cami' ? 'Kurum / Vakıf / Dernek Adı' : 'Ünvan (Kurum / Firma Adı)'}</Label><Input autoComplete="off" value={formData.unvan} onChange={e => setFormData({...formData, unvan: e.target.value})} placeholder={institutionType === 'cami' ? "Örn: ABC Derneği" : "Örn: ABC İnşaat A.Ş."} /></div>
                    
                    <div className="space-y-1.5 p-3 border rounded-lg bg-muted/30">
                        <Label className="text-primary font-semibold">Bağlı Olduğu Şahıs / Sahibi (Opsiyonel)</Label>
                        <div className="flex gap-2">
                            <Select value={formData.ownerId} onValueChange={(v) => setFormData({...formData, ownerId: v})}>
                                <SelectTrigger className="flex-1 bg-background"><SelectValue placeholder="Şahıs Seçiniz..." /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none" className="text-muted-foreground italic">Bağımsız (Sahibi Yok)</SelectItem>
                                    {selectableOwners.map(ind => (<SelectItem key={ind.id} value={ind.id.toString()}>{ind.name}</SelectItem>))}
                                </SelectContent>
                            </Select>
                            <Button type="button" variant="outline" size="icon" onClick={() => setShowQuickAdd(true)} title="Yeni Şahıs Ekle"><UserPlus className="h-4 w-4" /></Button>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5"><Label>Vergi No</Label><Input autoComplete="off" value={formData.vkn} onChange={e => setFormData({...formData, vkn: e.target.value})} maxLength={10} placeholder="Vergi No" /></div>
                        <div className="space-y-1.5"><Label>Vergi Dairesi</Label><Input autoComplete="off" value={formData.vergiDairesi} onChange={e => setFormData({...formData, vergiDairesi: e.target.value})} placeholder="Vergi Dairesi" /></div>
                    </div>

                    <div className="grid grid-cols-2 gap-4"><div className="space-y-1.5"><Label>Telefon</Label><div className="flex"><Popover open={openCountry} onOpenChange={setOpenCountry}><PopoverTrigger asChild><Button variant="outline" role="combobox" aria-expanded={openCountry} className="w-[100px] justify-between rounded-r-none border-r-0 px-2"><span className="flex items-center gap-1 truncate"><span>{selectedCountry.value}</span></span><ChevronsUpDown className="ml-1 h-3 w-3 opacity-50" /></Button></PopoverTrigger><PopoverContent className="w-[200px] p-0" align="start"><Command><CommandInput placeholder="Ülke ara..." /><CommandList><CommandEmpty>Bulunamadı.</CommandEmpty><CommandGroup>{countries.map((country) => (<CommandItem key={country.value} value={country.label} onSelect={() => { setSelectedCountry(country); setOpenCountry(false) }}><Check className={cn("mr-2 h-4 w-4", selectedCountry.value === country.value ? "opacity-100" : "opacity-0")} /><span className="mr-2">{country.flag}</span>{country.label}</CommandItem>))}</CommandGroup></CommandList></Command></PopoverContent></Popover><Input autoComplete="off" id="tel" type="tel" placeholder="5XX XXX XX XX" className="rounded-l-none" value={formData.telefon} onChange={(e) => setFormData({...formData, telefon: e.target.value})} /></div></div><div className="space-y-1.5"><Label>E-posta</Label><Input autoComplete="off" placeholder="ornek@email.com" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} /></div></div>
                    <div className="grid grid-cols-2 gap-4"><div className="space-y-1.5"><Label>İl</Label><Input autoComplete="off" placeholder="Örn: İstanbul" value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} /></div><div className="space-y-1.5"><Label>İlçe</Label><Input autoComplete="off" placeholder="Örn: Kadıköy" value={formData.district} onChange={e => setFormData({...formData, district: e.target.value})} /></div></div>

                    <div className="border rounded-lg overflow-hidden animate-in fade-in slide-in-from-top-2">
                        <button type="button" onClick={() => setShowBuildingInfo(!showBuildingInfo)} className="w-full flex items-center justify-between p-3 bg-muted/50 hover:bg-muted transition-colors"><span className="text-sm font-medium">Yapı, Arsa ve Apartman Özellikleri (Opsiyonel)</span>{showBuildingInfo ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}</button>
                        {showBuildingInfo && (
                            <div className="p-3 space-y-3 bg-card border-t">
                                <div className="grid grid-cols-2 gap-3"><div className="space-y-1"><Label className="text-xs">Arsa Payı</Label><Input autoComplete="off" placeholder="Örn: 15/1000" className="h-9" value={formData.arsaPayi} onChange={e => setFormData({...formData, arsaPayi: e.target.value})} /></div><div className="space-y-1"><Label className="text-xs">Ada / Parsel</Label><Input autoComplete="off" placeholder="Örn: 123/45" className="h-9" value={formData.adaParsel} onChange={e => setFormData({...formData, adaParsel: e.target.value})} /></div></div>
                                <div className="grid grid-cols-2 gap-3"><div className="space-y-1"><Label className="text-xs">Blok No / Kapı No</Label><Input autoComplete="off" placeholder="Örn: A Blok / 12" className="h-9" value={formData.blokNo} onChange={e => setFormData({...formData, blokNo: e.target.value})} /></div><div className="space-y-1"><Label className="text-xs">Daire / Bağımsız Bölüm Sayısı</Label><Input autoComplete="off" placeholder="Örn: 24" className="h-9" value={formData.daireSayisi} onChange={e => setFormData({...formData, daireSayisi: e.target.value})} /></div></div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {accountType === 'customer' && (
                <div className="grid gap-4 animate-in fade-in slide-in-from-top-2">
                    <div className="space-y-1.5"><Label>Özel Kod (Opsiyonel)</Label><Input autoComplete="off" type="number" value={formData.customCode} onChange={e => setFormData({...formData, customCode: e.target.value})} placeholder="Sayısal kod giriniz" /></div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5"><Label>Müşteri Adı</Label><Input autoComplete="off" value={formData.ad} onChange={e => setFormData({...formData, ad: e.target.value})} placeholder="Ad veya Ünvan" /></div>
                        <div className="space-y-1.5"><Label>Müşteri Soyadı / Devamı</Label><Input autoComplete="off" value={formData.soyad} onChange={e => setFormData({...formData, soyad: e.target.value})} placeholder="Soyad veya Devamı" /></div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 p-3 bg-muted/30 border rounded-lg">
                        <div className="space-y-1.5"><Label>Müşteri Grubu / Türü</Label><Input autoComplete="off" value={formData.customerGroup} onChange={e => setFormData({...formData, customerGroup: e.target.value})} placeholder="Örn: VIP, Perakende, Bayi" /></div>
                        <div className="space-y-1.5"><Label>Ödeme Vadesi / Tolerans (Gün)</Label><Input autoComplete="off" type="number" value={formData.maturityDays} onChange={e => setFormData({...formData, maturityDays: e.target.value})} placeholder="Örn: 30" /></div>
                    </div>

                    <div className="space-y-1.5"><Label>Teslimat veya Hizmet Adresi</Label><Input autoComplete="off" value={formData.deliveryAddress} onChange={e => setFormData({...formData, deliveryAddress: e.target.value})} placeholder="Örn: X Mahallesi Y Caddesi No:10" /></div>
                    <div className="space-y-1.5"><Label>Açıklama / Notlar</Label><Input autoComplete="off" value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} placeholder="Müşteriye özel takip notları..." /></div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5 pt-2">
                            <Label>İletişim (Telefon No)</Label>
                            <div className="flex">
                                <Popover open={openCountry} onOpenChange={setOpenCountry}>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" role="combobox" aria-expanded={openCountry} className="w-[100px] justify-between rounded-r-none border-r-0 px-2"><span className="flex items-center gap-1 truncate"><span>{selectedCountry.value}</span></span><ChevronsUpDown className="ml-1 h-3 w-3 opacity-50" /></Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[200px] p-0" align="start">
                                        <Command>
                                            <CommandInput placeholder="Ülke ara..." />
                                            <CommandList>
                                                <CommandEmpty>Bulunamadı.</CommandEmpty>
                                                <CommandGroup>{countries.map((country) => (<CommandItem key={country.value} value={country.label} onSelect={() => { setSelectedCountry(country); setOpenCountry(false) }}><Check className={cn("mr-2 h-4 w-4", selectedCountry.value === country.value ? "opacity-100" : "opacity-0")} /><span className="mr-2">{country.flag}</span>{country.label}</CommandItem>))}</CommandGroup>
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                                <Input autoComplete="off" id="tel3" type="tel" placeholder="5XX XXX XX XX" className="rounded-l-none" value={formData.telefon} onChange={(e) => setFormData({...formData, telefon: e.target.value})} />
                            </div>
                        </div>
                        <div className="space-y-1.5 pt-2"><Label>E-posta (Opsiyonel)</Label><Input autoComplete="off" placeholder="ornek@email.com" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} /></div>
                    </div>
                </div>
            )}

            <div className="border border-dashed p-4 rounded-lg bg-card/50">
                <h4 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center justify-between"><span>Açılış Finansal Bilgileri</span><Select value={formData.currency} onValueChange={v => setFormData({...formData, currency: v})}><SelectTrigger className="w-[120px] h-8 text-xs bg-background"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="TRY">TRY (₺)</SelectItem><SelectItem value="USD">USD ($)</SelectItem><SelectItem value="EUR">EUR (€)</SelectItem></SelectContent></Select></h4>
                <div className="grid grid-cols-3 gap-3"><div className="space-y-1.5"><Label className="text-xs text-destructive">Açılış Borcu</Label><Input autoComplete="off" type="number" placeholder="0.00" value={formData.borc} onChange={e => setFormData({...formData, borc: e.target.value})} /></div><div className="space-y-1.5"><Label className="text-xs text-green-600">Açılış Alacağı</Label><Input autoComplete="off" type="number" placeholder="0.00" value={formData.alacak} onChange={e => setFormData({...formData, alacak: e.target.value})} /></div><div className="space-y-1.5"><Label className="text-xs text-primary font-bold">Açılış Bakiyesi</Label><Input autoComplete="off" type="number" className="font-bold bg-muted/50" placeholder="0.00" value={formData.bakiye} onChange={e => setFormData({...formData, bakiye: e.target.value})} /></div></div>
            </div>

          </div>
          <DialogFooter><Button onClick={handleSave} className="w-full sm:w-auto">{editingId ? "Güncelle" : "Kaydet"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showQuickAdd} onOpenChange={setShowQuickAdd}>
          <DialogContent className="sm:max-w-[350px]">
              <DialogHeader><DialogTitle>Hızlı Sahip Ekle</DialogTitle></DialogHeader>
              <div className="space-y-4 py-2">
                  <div className="space-y-1.5"><Label>Ad Soyad</Label><Input autoComplete="off" placeholder="Sahip adı soyadı..." value={quickAddName} onChange={e => setQuickAddName(e.target.value)} autoFocus /></div>
                  <div className="space-y-1.5"><Label>Telefon</Label><Input autoComplete="off" placeholder="5XX XXX XX XX" value={quickAddPhone} onChange={e => setQuickAddPhone(e.target.value)} /></div>
              </div>
              <DialogFooter><Button variant="outline" onClick={() => setShowQuickAdd(false)}>İptal</Button><Button onClick={handleQuickAdd}>Ekle ve Seç</Button></DialogFooter>
          </DialogContent>
      </Dialog>
    </div>
  )
}