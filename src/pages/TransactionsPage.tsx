import { useState, useEffect, useMemo } from "react"
import { Link } from "react-router-dom"
import { Plus, Search, ArrowUp, ArrowDown, Filter, MoreHorizontal, Pencil, Trash2, Wallet, TrendingUp, TrendingDown, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuCheckboxItem, DropdownMenuTrigger, DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { getTransactions, addTransaction, getAccounts, deleteTransaction, updateTransaction } from "@/services/db"

function formatCurrency(amount: number): string { return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(amount) }
function formatDateTime(dateString: string): string { const d = new Date(dateString); return d.toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric" }) + " " + d.toLocaleTimeString("tr-TR", { hour: '2-digit', minute: '2-digit' }); }

const getLocalDatetime = () => { const now = new Date(); now.setMinutes(now.getMinutes() - now.getTimezoneOffset()); return now.toISOString().slice(0, 16); }

type TransactionType = "tahsilat" | "odeme"

interface Transaction { id: number; account_id?: number; accountId?: number; accountName: string; type: TransactionType; amount: number; description: string; date: string; method?: string; }

export default function TransactionsPage() {
  const { toast } = useToast()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [accounts, setAccounts] = useState<any[]>([]) 
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterType, setFilterType] = useState<"all" | "tahsilat" | "odeme">("all")
  const [selectedAccountId, setSelectedAccountId] = useState<string>("all")
  const [editingTxId, setEditingTxId] = useState<number | null>(null)
  const [txType, setTxType] = useState<TransactionType>("tahsilat")

  const [formData, setFormData] = useState({
      accountId: "", amount: "", description: "", date: getLocalDatetime(), method: "Nakit"
  })

  const loadData = async () => {
      try { const txData = await getTransactions(); setTransactions(txData); const accData = await getAccounts(); setAccounts(accData); } 
      catch (error) { console.error(error); }
  }
  useEffect(() => { loadData(); }, [])

  const openNewTxModal = () => {
      setEditingTxId(null); setTxType("tahsilat");
      setFormData({ accountId: "", amount: "", description: "", method: "Nakit", date: getLocalDatetime() });
      setIsModalOpen(true);
  }

  const openEditTxModal = (tx: Transaction) => {
      setEditingTxId(tx.id); setTxType(tx.type);
      setFormData({
          accountId: (tx.account_id || tx.accountId || "").toString(),
          amount: (tx.amount || 0).toString(), description: tx.description || "",
          date: tx.date || getLocalDatetime(), method: tx.method || "Nakit"
      });
      setIsModalOpen(true);
  }

  const handleSave = async () => {
      if (!formData.accountId || !formData.amount) { toast({ title: "Hata", description: "Lütfen cari ve tutar giriniz.", variant: "destructive" }); return; }
      try {
          const txData = {
              accountId: Number(formData.accountId), type: txType, amount: parseFloat(formData.amount),
              description: formData.description || (txType === 'tahsilat' ? 'Tahsilat' : 'Ödeme'),
              date: formData.date, method: formData.method
          };
          if (editingTxId) { await updateTransaction(editingTxId.toString(), txData); toast({ title: "Güncellendi" }) } 
          else { await addTransaction(txData); toast({ title: "Başarılı" }) }
          await loadData(); setIsModalOpen(false);
      } catch (error) { toast({ title: "Hata", variant: "destructive" }) }
  }

  const handleDelete = async (txId: number) => {
      if (window.confirm("Bu işlemi silmek istediğinize emin misiniz? (Cari bakiye onarılacaktır)")) {
          try { await deleteTransaction(txId.toString()); await loadData(); toast({ title: "Silindi" }) } 
          catch (error) { toast({ title: "Hata", variant: "destructive" }) }
      }
  }

  const filteredTransactions = useMemo(() => {
    let result = transactions;
    if (selectedAccountId !== "all") { result = result.filter((tx) => (tx.account_id || tx.accountId)?.toString() === selectedAccountId); }
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter((tx) => (tx.accountName && tx.accountName.toLowerCase().includes(query)) || (tx.description && tx.description.toLowerCase().includes(query)))
    }
    if (filterType !== "all") { result = result.filter((tx) => tx.type === filterType) }
    return result;
  }, [transactions, searchQuery, filterType, selectedAccountId])

  const selectedAccountDetails = accounts.find(a => a.id.toString() === selectedAccountId);
  const visibleAccounts = accounts.filter(acc => acc.type !== "owner");

  const displayBorc = selectedAccountId === "all" ? visibleAccounts.reduce((sum, acc) => sum + (acc.borc || 0), 0) : (selectedAccountDetails?.borc || 0);
  const displayAlacak = selectedAccountId === "all" ? visibleAccounts.reduce((sum, acc) => sum + (acc.alacak || 0), 0) : (selectedAccountDetails?.alacak || 0);
  const displayBakiye = selectedAccountId === "all" ? visibleAccounts.reduce((sum, acc) => sum + (acc.bakiye || 0), 0) : (selectedAccountDetails?.bakiye || 0);
  const totalTahsilat = filteredTransactions.filter((tx) => tx.type === "tahsilat").reduce((sum, tx) => sum + tx.amount, 0)
  const totalOdeme = filteredTransactions.filter((tx) => tx.type === "odeme").reduce((sum, tx) => sum + tx.amount, 0)
  const tabloBakiyesi = totalTahsilat - totalOdeme

  return (
    <div className="w-full space-y-6">
      <div className="flex items-center justify-between"><div><h1 className="text-3xl font-bold tracking-tight">Kasa ve Hareketler</h1><p className="text-muted-foreground mt-1">İşletme geneli veya kişiye özel finansal işlemleri yönetin.</p></div><Button className="gap-2" onClick={openNewTxModal}><Plus className="h-4 w-4" /> Yeni İşlem Ekle</Button></div>
      <div className="flex items-center justify-between bg-muted/30 p-4 rounded-lg border border-dashed"><h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2"><User className="h-4 w-4" /> Özet Görünümü:</h3><Select value={selectedAccountId} onValueChange={setSelectedAccountId}><SelectTrigger className="w-[300px] bg-background"><SelectValue placeholder="Görünüm Seçin..." /></SelectTrigger><SelectContent><SelectItem value="all" className="font-bold text-primary">-- Tümü (Genel Kasa) --</SelectItem>{visibleAccounts.map(acc => (<SelectItem key={acc.id} value={acc.id.toString()}>{acc.name}</SelectItem>))}</SelectContent></Select></div>
      <div className="grid gap-4 md:grid-cols-3"><Card className="bg-destructive/5 border-destructive/20 transition-all"><CardContent className="p-6"><div className="flex items-center gap-2 mb-2 text-destructive"><TrendingDown className="h-5 w-5" /><h3 className="font-semibold text-sm uppercase tracking-wider">{selectedAccountId === "all" ? "Piyasadan Alacak (Borçlar)" : "Müşterinin Borcu"}</h3></div><div className="text-3xl font-bold text-destructive">{formatCurrency(displayBorc)}</div></CardContent></Card><Card className="bg-green-600/5 border-green-600/20 transition-all"><CardContent className="p-6"><div className="flex items-center gap-2 mb-2 text-green-700"><TrendingUp className="h-5 w-5" /><h3 className="font-semibold text-sm uppercase tracking-wider">{selectedAccountId === "all" ? "Piyasaya Borç (Alacaklar)" : "Müşterinin Alacağı"}</h3></div><div className="text-3xl font-bold text-green-700">{formatCurrency(displayAlacak)}</div></CardContent></Card><Card className="bg-primary/5 border-primary/20 shadow-sm transition-all"><CardContent className="p-6"><div className="flex items-center gap-2 mb-2 text-primary"><Wallet className="h-5 w-5" /><h3 className="font-semibold text-sm uppercase tracking-wider">{selectedAccountId === "all" ? "Genel Net Bakiye" : "Kişisel Net Bakiye"}</h3></div><div className={`text-3xl font-bold ${displayBakiye >= 0 ? 'text-primary' : 'text-destructive'}`}>{formatCurrency(displayBakiye)}</div></CardContent></Card></div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader><DialogTitle>{editingTxId ? "İşlemi Düzenle" : "Yeni İşlem Ekle"}</DialogTitle><DialogDescription>{editingTxId ? "İşlem bilgilerini değiştirin." : "Listeye manuel olarak yeni bir gelir veya gider ekleyin."}</DialogDescription></DialogHeader>
          <div className="grid gap-5 py-4">
              <div className="grid grid-cols-2 gap-4"><button type="button" onClick={() => setTxType('tahsilat')} className={`flex flex-col items-center justify-center gap-2 p-3 rounded-lg border-2 transition-all ${txType === 'tahsilat' ? 'border-green-600 bg-green-50 text-green-700' : 'border-muted hover:border-green-200 text-muted-foreground'}`}><ArrowUp className={`h-6 w-6 ${txType === 'tahsilat' ? 'text-green-600' : ''}`} /><span className="font-semibold text-sm">Tahsilat (Al)</span></button><button type="button" onClick={() => setTxType('odeme')} className={`flex flex-col items-center justify-center gap-2 p-3 rounded-lg border-2 transition-all ${txType === 'odeme' ? 'border-destructive bg-red-50 text-destructive' : 'border-muted hover:border-red-200 text-muted-foreground'}`}><ArrowDown className={`h-6 w-6 ${txType === 'odeme' ? 'text-destructive' : ''}`} /><span className="font-semibold text-sm">Ödeme (Ver)</span></button></div>
              <div className="space-y-4">
                  <div className="grid grid-cols-4 items-center gap-4"><Label className="text-right font-medium">Cari Adı</Label><Select value={formData.accountId} onValueChange={(val) => setFormData({...formData, accountId: val})} disabled={!!editingTxId}><SelectTrigger className="col-span-3"><SelectValue placeholder="Cari Seçiniz" /></SelectTrigger><SelectContent>{visibleAccounts.map(acc => (<SelectItem key={acc.id} value={acc.id.toString()}>{acc.name}</SelectItem>))}</SelectContent></Select></div>
                  <div className="grid grid-cols-4 items-center gap-4"><Label className="text-right font-medium">Tarih / Saat</Label><Input type="datetime-local" className="col-span-3" value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} /></div>
                  <div className="grid grid-cols-4 items-center gap-4"><Label className="text-right font-medium">Yöntem</Label>
                      <Select value={formData.method} onValueChange={(v) => setFormData({...formData, method: v})}>
                          <SelectTrigger className="col-span-3"><SelectValue placeholder="Seçiniz"/></SelectTrigger>
                          <SelectContent>
                              <SelectItem value="Nakit">Nakit</SelectItem>
                              <SelectItem value="Havale/EFT">Havale / EFT</SelectItem>
                              <SelectItem value="Kredi Kartı">Kredi Kartı</SelectItem>
                              <SelectItem value="Çek">Çek</SelectItem>
                              <SelectItem value="Senet">Senet</SelectItem>
                          </SelectContent>
                      </Select>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4"><Label className="text-right font-medium">Tutar</Label><div className="col-span-3 relative"><Input type="number" className="pl-8" value={formData.amount} onChange={(e) => setFormData({...formData, amount: e.target.value})} /><span className="absolute left-3 top-2.5 text-muted-foreground text-sm">₺</span></div></div>
                  <div className="grid grid-cols-4 items-center gap-4"><Label className="text-right font-medium">Açıklama</Label><Input className="col-span-3" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} /></div>
              </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setIsModalOpen(false)}>İptal</Button><Button onClick={handleSave} className={txType === 'tahsilat' ? 'bg-green-600 hover:bg-green-700' : 'bg-destructive hover:bg-destructive/90'}>{editingTxId ? 'Güncelle' : (txType === 'tahsilat' ? 'Tahsilatı Kaydet' : 'Ödemeyi Kaydet')}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Card>
        <CardContent className="p-0">
          <div className="p-4 border-b border-border flex gap-2"><div className="relative flex-1 max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input type="text" placeholder="Açıklama veya cari ara..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" /></div><DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline" size="icon" className={filterType !== 'all' ? 'text-primary border-primary' : ''}><Filter className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuLabel>İşlem Tipi</DropdownMenuLabel><DropdownMenuSeparator /><DropdownMenuCheckboxItem checked={filterType === 'all'} onCheckedChange={() => setFilterType('all')}>Tümü</DropdownMenuCheckboxItem><DropdownMenuCheckboxItem checked={filterType === 'tahsilat'} onCheckedChange={() => setFilterType('tahsilat')}>Sadece Tahsilatlar</DropdownMenuCheckboxItem><DropdownMenuCheckboxItem checked={filterType === 'odeme'} onCheckedChange={() => setFilterType('odeme')}>Sadece Ödemeler</DropdownMenuCheckboxItem></DropdownMenuContent></DropdownMenu></div>
          <div className="overflow-hidden">
            <Table>
              <TableHeader><TableRow className="hover:bg-transparent border-border"><TableHead className="w-40">Tarih / Saat</TableHead><TableHead>Hesap Adı</TableHead><TableHead>Yöntem</TableHead><TableHead>İşlem Tipi</TableHead><TableHead className="text-right">Tutar</TableHead><TableHead>Açıklama</TableHead><TableHead className="text-right w-16"></TableHead></TableRow></TableHeader>
              <TableBody>
                {filteredTransactions.length === 0 ? (<TableRow><TableCell colSpan={7} className="h-24 text-center text-muted-foreground">İşlem bulunamadı.</TableCell></TableRow>) : (filteredTransactions.map((tx) => (
                    <TableRow key={tx.id} className="border-border group">
                      <TableCell className="text-muted-foreground font-medium text-xs">{formatDateTime(tx.date)}</TableCell>
                      <TableCell><Link to={`/accounts?id=${tx.account_id || tx.accountId}`} className="font-medium text-foreground hover:text-primary hover:underline">{tx.accountName || "Silinmiş Cari"}</Link></TableCell>
                      <TableCell><Badge variant="secondary" className="font-normal">{tx.method || 'Nakit'}</Badge></TableCell>
                      <TableCell><Badge variant="outline" className={cn("gap-1 pr-3", tx.type === "tahsilat" ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-destructive border-red-200")}>{tx.type === "tahsilat" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}{tx.type === "tahsilat" ? "Tahsilat" : "Ödeme"}</Badge></TableCell>
                      <TableCell className={cn("text-right font-bold text-base", tx.type === "tahsilat" ? "text-green-600" : "text-destructive")}>{tx.type === "tahsilat" ? "+" : "-"}{formatCurrency(tx.amount)}</TableCell>
                      <TableCell className="text-muted-foreground">{tx.description}</TableCell>
                      <TableCell className="text-right"><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onSelect={() => openEditTxModal(tx)}><Pencil className="mr-2 h-4 w-4" /> Düzenle</DropdownMenuItem><DropdownMenuSeparator /><DropdownMenuItem className="text-destructive" onSelect={() => handleDelete(tx.id)}><Trash2 className="mr-2 h-4 w-4" /> Sil</DropdownMenuItem></DropdownMenuContent></DropdownMenu></TableCell>
                    </TableRow>
                  )))}
              </TableBody>
              <TableFooter><TableRow className="hover:bg-muted/50 border-t-2 border-border"><TableCell colSpan={4} className="font-semibold text-foreground text-base">Filtrelenen İşlemlerin Özeti (Alacak - Borç)</TableCell><TableCell className={cn("text-right font-bold text-xl", tabloBakiyesi >= 0 ? "text-green-600" : "text-destructive")}>{formatCurrency(tabloBakiyesi)}</TableCell><TableCell colSpan={2} /></TableRow></TableFooter>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}