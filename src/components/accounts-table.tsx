import { useState } from "react"
import { Eye, Plus, MoreHorizontal, User, Building2, Search, ArrowUp, ArrowDown, Trash2, Phone, Calendar, Copy, Pencil, Mail, MapPin, CreditCard, FileText, Home, Filter } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuCheckboxItem, DropdownMenuLabel } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { Account } from "@/pages/AccountsPage"
import { addTransaction, getTransactionsByAccount } from "@/services/db"

const formatCurrency = (amount: number) => new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(amount)
const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("tr-TR") + " " + d.toLocaleTimeString("tr-TR", {hour: '2-digit', minute:'2-digit'});
}

// 1. onEdit PROPU EKLENDİ
interface AccountsTableProps {
    data: Account[];
    onDelete: (id: string) => void;
    onEdit: (account: Account) => void; // Yeni eklenen özellik
    onRefresh: () => void;
}

export function AccountsTable({ data, onDelete, onEdit, onRefresh }: AccountsTableProps) {
  const { toast } = useToast()
  const [filterText, setFilterText] = useState("")
  const [filterType, setFilterType] = useState<"all" | "individual" | "corporate">("all")
  
  // Sheet ve Modal State'leri
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null)
  const [accountHistory, setAccountHistory] = useState<any[]>([])
  const [transactionAccount, setTransactionAccount] = useState<Account | null>(null)
  const [txType, setTxType] = useState<"tahsilat" | "odeme">("tahsilat")
  const [txAmount, setTxAmount] = useState("")
  const [txDesc, setTxDesc] = useState("")
  const [txDate, setTxDate] = useState("")

  const copyPhone = (phone: string) => {
    navigator.clipboard.writeText(phone)
    toast({ title: "Kopyalandı", description: "Telefon numarası panoya alındı." })
  }

  const handleViewDetails = async (account: Account) => {
      setSelectedAccount(account);
      try {
          const history = await getTransactionsByAccount(account.id);
          setAccountHistory(history);
      } catch (e) { console.error(e); }
  }

  const openTransactionModal = (account: Account) => {
    setTransactionAccount(account);
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    setTxDate(now.toISOString().slice(0, 16));
    setTxAmount(""); setTxDesc("");
  }

  const handleTransactionSave = async () => {
    if (!transactionAccount || !txAmount || !txDate) {
        toast({ title: "Hata", description: "Lütfen tutar ve tarih giriniz.", variant: "destructive" }); return
    }
    try {
        await addTransaction({
            accountId: Number(transactionAccount.id),
            type: txType,
            amount: parseFloat(txAmount),
            description: txDesc || (txType === 'tahsilat' ? 'Tahsilat' : 'Ödeme'),
            date: txDate
        });
        onRefresh(); 
        if (selectedAccount && selectedAccount.id === transactionAccount.id) {
            const history = await getTransactionsByAccount(selectedAccount.id);
            setAccountHistory(history);
        }
        setTransactionAccount(null);
        toast({ title: "Başarılı", description: "İşlem kaydedildi." })
    } catch (e) { toast({ title: "Hata", description: "Kaydedilemedi.", variant: "destructive" }) }
  }

  const filteredData = data.filter((account) => {
    const search = filterText.toLowerCase();
    const matchesSearch = account.name.toLowerCase().includes(search) || (account.phone && account.phone.includes(filterText));
    const matchesType = filterType === "all" || account.type === filterType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
         <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Cari adı veya telefon ile ara..." value={filterText} onChange={(e) => setFilterText(e.target.value)} className="pl-9" />
        </div>
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className={filterType !== 'all' ? 'text-primary border-primary bg-primary/5' : ''}><Filter className="h-4 w-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>Cari Tipi</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuCheckboxItem checked={filterType === 'all'} onCheckedChange={() => setFilterType('all')}>Tümü</DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem checked={filterType === 'individual'} onCheckedChange={() => setFilterType('individual')}><User className="mr-2 h-4 w-4" /> Sadece Şahıslar</DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem checked={filterType === 'corporate'} onCheckedChange={() => setFilterType('corporate')}><Building2 className="mr-2 h-4 w-4" /> Sadece Kurumlar</DropdownMenuCheckboxItem>
            </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]"></TableHead>
              <TableHead>Ad / Ünvan</TableHead>
              <TableHead className="hidden md:table-cell">Şehir</TableHead>
              <TableHead className="text-right text-destructive">Borç</TableHead>
              <TableHead className="text-right text-green-600">Alacak</TableHead>
              <TableHead className="text-right">Bakiye</TableHead>
              <TableHead className="text-right">İşlemler</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredData.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="h-24 text-center text-muted-foreground">Kayıt bulunamadı.</TableCell></TableRow>
            ) : (
                filteredData.map((account) => {
                const bakiye = account.alacak - account.borc
                return (
                    <TableRow key={account.id}>
                    <TableCell><div className={`flex h-9 w-9 items-center justify-center rounded-lg border ${account.type === 'corporate' ? 'bg-green-500/10 text-green-700' : 'bg-primary/10 text-primary'}`}>{account.type === "individual" ? <User className="h-4 w-4" /> : <Building2 className="h-4 w-4" />}</div></TableCell>
                    <TableCell className="font-medium">{account.name}<div className="text-xs text-muted-foreground">{account.phone}</div></TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">{account.city || "-"}</TableCell>
                    <TableCell className="text-right text-destructive font-medium">{formatCurrency(account.borc)}</TableCell>
                    <TableCell className="text-right text-green-600 font-medium">{formatCurrency(account.alacak)}</TableCell>
                    <TableCell className={`text-right font-bold ${bakiye >= 0 ? 'text-green-600' : 'text-destructive'}`}>{formatCurrency(bakiye)}</TableCell>
                    <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleViewDetails(account)}><Eye className="h-4 w-4 text-muted-foreground hover:text-foreground" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => openTransactionModal(account)}><Plus className="h-4 w-4" /></Button>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => copyPhone(account.phone)}><Copy className="mr-2 h-4 w-4" /> Telefonu Kopyala</DropdownMenuItem>
                            {/* 2. DÜZENLEME BUTONUNU BAĞLADIK */}
                            <DropdownMenuItem onClick={() => onEdit(account)}><Pencil className="mr-2 h-4 w-4" /> Düzenle</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive" onClick={() => onDelete(account.id)}><Trash2 className="mr-2 h-4 w-4" /> Sil</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                        </div>
                    </TableCell>
                    </TableRow>
                )
                })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Sheet ve Dialoglar (Aynı Kalıyor - Kısaltıldı) */}
      <Sheet open={!!selectedAccount} onOpenChange={(open) => !open && setSelectedAccount(null)}>
        <SheetContent className="sm:max-w-[500px] w-full overflow-y-auto">
          <SheetHeader className="mb-6"><SheetTitle>Cari Detayı</SheetTitle><SheetDescription>Kayıtlı bilgiler.</SheetDescription></SheetHeader>
          {selectedAccount && (
            <div className="space-y-6">
              <div className="flex items-center gap-4 p-5 rounded-xl border bg-card shadow-sm">
                 <div className={`flex h-14 w-14 items-center justify-center rounded-full border ${selectedAccount.type === 'corporate' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>{selectedAccount.type === "individual" ? <User className="h-7 w-7" /> : <Building2 className="h-7 w-7" />}</div>
                 <div><h3 className="font-bold text-lg">{selectedAccount.name}</h3><div className="flex items-center gap-2 text-sm text-muted-foreground mt-1 cursor-pointer hover:text-primary" onClick={() => copyPhone(selectedAccount.phone)}><Phone className="h-3 w-3" />{selectedAccount.phone}</div></div>
              </div>
              <div className="space-y-4">
                  <h4 className="font-semibold text-sm text-muted-foreground border-b pb-2">KİMLİK & İLETİŞİM</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="space-y-1"><span className="text-muted-foreground flex items-center gap-1"><Mail className="h-3 w-3" /> E-posta</span><p className="font-medium truncate">{selectedAccount.email || "-"}</p></div>
                      <div className="space-y-1"><span className="text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" /> Adres</span><p className="font-medium truncate">{selectedAccount.city || "-"} / {selectedAccount.district || "-"}</p></div>
                      {selectedAccount.type === 'individual' ? (
                          <div className="space-y-1 col-span-2"><span className="text-muted-foreground flex items-center gap-1"><CreditCard className="h-3 w-3" /> TC Kimlik No</span><p className="font-medium">{selectedAccount.tax_number || "-"}</p></div>
                      ) : (
                          <>
                            <div className="space-y-1"><span className="text-muted-foreground flex items-center gap-1"><FileText className="h-3 w-3" /> Vergi No</span><p className="font-medium">{selectedAccount.tax_number || "-"}</p></div>
                            <div className="space-y-1"><span className="text-muted-foreground flex items-center gap-1"><Building2 className="h-3 w-3" /> Vergi Dairesi</span><p className="font-medium">{selectedAccount.tax_office || "-"}</p></div>
                          </>
                      )}
                  </div>
                  {selectedAccount.type === 'corporate' && (
                      <div className="mt-4"><h4 className="font-semibold text-sm text-muted-foreground border-b pb-2 pt-2 mb-3">YAPI & ARSA BİLGİLERİ</h4><div className="grid grid-cols-2 gap-3 text-sm bg-muted/30 p-3 rounded-lg border border-dashed"><div className="space-y-1"><span className="text-muted-foreground text-xs">Arsa Payı</span><p className="font-medium">{selectedAccount.land_share || "-"}</p></div><div className="space-y-1"><span className="text-muted-foreground text-xs">Ada / Parsel</span><p className="font-medium">{selectedAccount.parcel || "-"}</p></div><div className="space-y-1"><span className="text-muted-foreground text-xs flex items-center gap-1"><Home className="h-3 w-3" /> Blok No</span><p className="font-medium">{selectedAccount.block_number || "-"}</p></div><div className="space-y-1"><span className="text-muted-foreground text-xs">Daire Sayısı</span><p className="font-medium">{selectedAccount.flat_count || "-"}</p></div></div></div>
                  )}
              </div>
              <div className="grid grid-cols-2 gap-4 pt-2"><div className="p-4 rounded-xl border bg-card shadow-sm"><span className="text-xs font-medium text-muted-foreground uppercase">Toplam Borç</span><div className="text-xl font-bold text-destructive mt-1">{formatCurrency(selectedAccount.borc)}</div></div><div className="p-4 rounded-xl border bg-card shadow-sm"><span className="text-xs font-medium text-muted-foreground uppercase">Toplam Alacak</span><div className="text-xl font-bold text-green-600 mt-1">{formatCurrency(selectedAccount.alacak)}</div></div></div>
              <div><h4 className="font-semibold mb-3 flex items-center gap-2 border-b pb-2 mt-2"><Calendar className="h-4 w-4 text-muted-foreground" /> Son Hareketler</h4><div className="space-y-3">{accountHistory.length === 0 ? (<div className="text-sm text-muted-foreground text-center py-4 border rounded-lg border-dashed">Henüz işlem kaydı yok.</div>) : (accountHistory.map((tx, i) => (<div key={i} className="flex items-center justify-between p-3 rounded-lg border bg-card/50 hover:bg-muted/50 transition-colors"><div className="flex items-center gap-3"><div className={`flex h-8 w-8 items-center justify-center rounded-full ${tx.type === 'tahsilat' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-destructive'}`}>{tx.type === 'tahsilat' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}</div><div><p className="text-sm font-medium">{tx.description}</p><p className="text-xs text-muted-foreground">{formatDate(tx.date)}</p></div></div><div className={`font-bold text-sm ${tx.type === 'tahsilat' ? 'text-green-600' : 'text-destructive'}`}>{tx.type === 'tahsilat' ? '+' : '-'}{formatCurrency(tx.amount)}</div></div>)))}</div></div>
              <Button className="w-full py-6 text-base shadow-lg" onClick={() => openTransactionModal(selectedAccount)}><Plus className="mr-2 h-5 w-5" /> Yeni İşlem Ekle</Button>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {transactionAccount && (
      <Dialog open={!!transactionAccount} onOpenChange={(open) => !open && setTransactionAccount(null)}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader><DialogTitle>Yeni İşlem Ekle</DialogTitle><DialogDescription className="font-semibold text-primary">{transactionAccount.name}</DialogDescription></DialogHeader>
          <div className="grid gap-4 py-4"><div className="grid grid-cols-2 gap-4"><button onClick={() => setTxType('tahsilat')} className={`flex flex-col items-center p-3 rounded-lg border-2 transition-all ${txType === 'tahsilat' ? 'border-green-600 bg-green-50 text-green-700' : 'border-muted opacity-60 hover:opacity-100'}`}><ArrowUp className="h-6 w-6"/><span className="text-sm font-bold">Tahsilat (Al)</span></button><button onClick={() => setTxType('odeme')} className={`flex flex-col items-center p-3 rounded-lg border-2 transition-all ${txType === 'odeme' ? 'border-destructive bg-red-50 text-destructive' : 'border-muted opacity-60 hover:opacity-100'}`}><ArrowDown className="h-6 w-6"/><span className="text-sm font-bold">Ödeme (Ver)</span></button></div><div className="space-y-3"><div className="space-y-1"><Label>Tutar</Label><Input type="number" value={txAmount} onChange={e => setTxAmount(e.target.value)} placeholder="0.00" autoFocus /></div><div className="space-y-1"><Label>Tarih ve Saat</Label><Input type="datetime-local" value={txDate} onChange={e => setTxDate(e.target.value)} /></div><div className="space-y-1"><Label>Açıklama</Label><Input value={txDesc} onChange={e => setTxDesc(e.target.value)} placeholder={txType === 'tahsilat' ? 'Tahsilat açıklaması...' : 'Ödeme açıklaması...'} /></div></div></div>
          <DialogFooter><Button variant="outline" onClick={() => setTransactionAccount(null)}>İptal</Button><Button onClick={handleTransactionSave}>İşlemi Kaydet</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      )}
    </div>
  )
}