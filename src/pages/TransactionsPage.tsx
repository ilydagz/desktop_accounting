import { useState, useMemo } from "react"
import { Link } from "react-router-dom"
import { Plus, Search, ArrowUp, ArrowDown, Filter, MoreHorizontal, Pencil, Trash2, Wallet, TrendingUp, TrendingDown, User, Percent, Calendar, Printer, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuCheckboxItem, DropdownMenuTrigger, DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { addTransaction, deleteTransaction, updateTransactionPaidStatus, addTransactionToMultipleAccounts } from "@/services/db"
import { useAuth } from "@/contexts/AuthContext"
import { useData } from "@/contexts/DataContext"

function formatCurrency(amount: number): string { return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(amount) }
function formatDateTime(dateString: string): string { const d = new Date(dateString); return d.toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric" }) + " " + d.toLocaleTimeString("tr-TR", { hour: '2-digit', minute: '2-digit' }); }

const getLocalDatetime = () => { const now = new Date(); now.setMinutes(now.getMinutes() - now.getTimezoneOffset()); return now.toISOString().slice(0, 16); }

type TransactionType = "tahsilat" | "odeme" | "faiz_isleme"

interface Transaction { id: string; account_id?: string; accountId?: string; accountName: string; type: TransactionType; amount: number; description: string; date: string; method?: string; ledger_id?: string; ledgerName?: string; maturity_date?: string; interest_rate?: number; interest_type?: string; is_interest?: boolean; parent_id?: string; is_paid?: boolean; }

export default function TransactionsPage() {
  const { toast } = useToast()
  const { institutionType } = useAuth()
  const { transactions, setTransactions, accounts, ledgers, refreshData } = useData()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterType, setFilterType] = useState<"all" | "tahsilat" | "odeme">("all")
  const [filterLedger, setFilterLedger] = useState<string>("all")
  const [selectedAccountId, setSelectedAccountId] = useState<string>("all")
  const [editingTxId, setEditingTxId] = useState<string | null>(null)
  const [txType, setTxType] = useState<TransactionType>("tahsilat")

  const [formData, setFormData] = useState({
      accountId: "", ledgerId: "none", amount: "", description: "", date: getLocalDatetime(), method: "Nakit", maturityDate: "", interestRate: "0", interestType: "aylik"
  })
  const [searchQueryAcc, setSearchQueryAcc] = useState("")

  // Faiz Hesaplama State'leri
  const [interestModalOpen, setInterestModalOpen] = useState(false)
  const [selectedTxForInterest, setSelectedTxForInterest] = useState<Transaction | null>(null)
  const [interestResult, setInterestResult] = useState({ days: 0, amount: 0 })
  const [interestApplyMode, setInterestApplyMode] = useState<"genel" | "tekil">("genel")
  const [applyToAll, setApplyToAll] = useState(false)

  const getAccruedInterest = (tx: Transaction) => {
    if (!tx.maturity_date || !tx.interest_rate || tx.is_paid || tx.is_interest) return 0;
    const today = new Date();
    const maturity = new Date(tx.maturity_date);
    const diffTime = today.getTime() - maturity.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays <= 0) return 0;
    let dailyRate = tx.interest_type === 'yillik' ? tx.interest_rate / 365 / 100 : tx.interest_rate / 30 / 100;
    return parseFloat((tx.amount * dailyRate * diffDays).toFixed(2));
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

  const loadData = refreshData;

  const openNewTxModal = () => {
      setEditingTxId(null); setTxType("tahsilat"); setApplyToAll(false);
      // Varsayılan kasa/banka seçimi
      const defaultLedger = ledgers.find(l => l.type === 'kasa')?.id || "none";
      setFormData({ accountId: "", ledgerId: defaultLedger, amount: "", description: "", method: "Nakit", date: getLocalDatetime(), maturityDate: "", interestRate: "0", interestType: "aylik" });
      setIsModalOpen(true);
  }

  const openEditTxModal = (tx: Transaction) => {
      setEditingTxId(tx.id); setTxType(tx.type);
      setFormData({
          accountId: (tx.account_id || tx.accountId || "").toString(),
          ledgerId: tx.ledger_id || "none",
          amount: (tx.amount || 0).toString(), description: tx.description || "",
          date: tx.date || getLocalDatetime(), method: tx.method || "Nakit",
          maturityDate: tx.maturity_date || "", interestRate: (tx.interest_rate || 0).toString(), interestType: tx.interest_type || "aylik"
      });
      setIsModalOpen(true);
  }

  const handleSave = async () => {
      if (!applyToAll && !formData.accountId) { toast({ title: "Hata", description: `Lütfen ${tSingle.toLowerCase()} seçiniz.`, variant: "destructive" }); return; }
      if (!formData.amount) { toast({ title: "Hata", description: "Lütfen tutar giriniz.", variant: "destructive" }); return; }
      try {
          let finalAmount = parseFloat(formData.amount);
          if (parseFloat(formData.interestRate) > 0) {
             const principal = parseFloat(formData.amount);
             const dailyRate = formData.interestType === 'yillik' ? parseFloat(formData.interestRate) / 365 / 100 : parseFloat(formData.interestRate) / 30 / 100;
             if (formData.maturityDate && new Date(formData.maturityDate) < new Date()) {
                const diffTime = new Date().getTime() - new Date(formData.maturityDate).getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                finalAmount = parseFloat((principal * dailyRate * diffDays).toFixed(2));
             } else {
                finalAmount = parseFloat((principal * (parseFloat(formData.interestRate) / 100)).toFixed(2));
             }
          }

          const txData = {
              accountId: formData.accountId, 
              type: txType === 'faiz_isleme' ? 'odeme' : txType, 
              amount: finalAmount,
              ledgerId: formData.ledgerId === "none" ? null : formData.ledgerId,
              description: formData.description || (txType === 'tahsilat' ? 'Tahsilat' : txType === 'odeme' ? 'Ödeme' : 'Faiz / Gecikme Zammı'),
              date: formData.date, method: formData.method,
              maturity_date: formData.maturityDate || undefined, interest_rate: parseFloat(formData.interestRate) || 0,
              interest_type: formData.interestType,
              is_interest: txType === 'faiz_isleme'
          };

          if (applyToAll) {
              const activeAccIds = visibleAccounts.map(a => a.id.toString());
              setIsModalOpen(false);
              toast({ title: "Başarılı", description: `${activeAccIds.length} hesaba başarıyla işlendi.` }) 
              await addTransactionToMultipleAccounts(activeAccIds, txData);
              refreshData();
          } else {
              const accountName = accounts.find(a => a.id.toString() === txData.accountId)?.name || "";
              const ledgerName = ledgers.find(l => l.id.toString() === txData.ledgerId)?.name || "";
              const tempTx: any = { id: "temp-" + Date.now(), ...txData, accountName, ledgerName };
              
              if (editingTxId) { 
                setTransactions(prev => prev.map(t => t.id === editingTxId ? { ...t, ...tempTx, id: editingTxId } : t));
                setIsModalOpen(false);
                toast({ title: "Güncellendi" }) 
                await deleteTransaction(editingTxId);
                await addTransaction(txData);
                refreshData();
              } 
              else { 
                setTransactions(prev => [tempTx, ...prev]);
                setIsModalOpen(false);
                toast({ title: "Başarılı" }) 
                await addTransaction(txData);
                refreshData();
              }
          }
      } catch (error) { toast({ title: "Hata", variant: "destructive" }) }
  }

  const handleMarkAsPaid = async (txId: string) => {
      try { await updateTransactionPaidStatus(txId, true); await loadData(); toast({ title: "Ödendi İşaretlendi", description: "Bu işlem için artık faiz hesaplanmayacak." }) }
      catch (error) { toast({ title: "Hata", variant: "destructive" }) }
  }

  const handleDelete = async (txId: string) => {
      if (window.confirm("Bu işlemi silmek istediğinize emin misiniz? (Bakiye onarılacaktır)")) {
          try { 
              setTransactions(prev => prev.filter(t => t.id !== txId));
              toast({ title: "Silindi" });
              await deleteTransaction(txId); 
              refreshData(); 
          } 
          catch (error) { toast({ title: "Hata", variant: "destructive" }) }
      }
  }

  const handleMethodChange = (v: string) => {
    let suggestedLedger = formData.ledgerId;
    if (v === 'Nakit') {
      const kasa = ledgers.find(l => l.type === 'kasa');
      if (kasa) suggestedLedger = kasa.id;
    } else if (v === 'Havale/EFT') {
      const banka = ledgers.find(l => l.type === 'banka');
      if (banka) suggestedLedger = banka.id;
    }
    setFormData({...formData, method: v, ledgerId: suggestedLedger});
  }

  const filteredTransactions = useMemo(() => {
    let result = transactions;
    if (selectedAccountId !== "all") { result = result.filter((tx) => (tx.account_id || tx.accountId)?.toString() === selectedAccountId); }
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter((tx) => (tx.accountName && tx.accountName.toLowerCase().includes(query)) || (tx.description && tx.description.toLowerCase().includes(query)))
    }
    if (filterType !== "all") { result = result.filter((tx) => tx.type === filterType) }
    if (filterLedger !== "all") {
       if (filterLedger === "nakit") result = result.filter(tx => ledgers.find(l => l.id === tx.ledger_id)?.type === 'kasa' || tx.method === 'Nakit');
       else if (filterLedger === "banka") result = result.filter(tx => ledgers.find(l => l.id === tx.ledger_id)?.type === 'banka' || tx.method === 'Havale/EFT');
    }
    return result;
  }, [transactions, searchQuery, filterType, filterLedger, selectedAccountId, ledgers])

  const selectedAccountDetails = accounts.find(a => a.id.toString() === selectedAccountId);
  const visibleAccounts = accounts.filter(acc => acc.type !== "owner");

  const displayBorc = selectedAccountId === "all" ? visibleAccounts.reduce((sum, acc) => sum + (acc.borc || 0), 0) : (selectedAccountDetails?.borc || 0);
  const displayAlacak = selectedAccountId === "all" ? visibleAccounts.reduce((sum, acc) => sum + (acc.alacak || 0), 0) : (selectedAccountDetails?.alacak || 0);
  const displayBakiye = selectedAccountId === "all" ? visibleAccounts.reduce((sum, acc) => sum + (acc.bakiye || 0), 0) : (selectedAccountDetails?.bakiye || 0);
  const totalTahsilat = filteredTransactions.filter((tx) => tx.type === "tahsilat").reduce((sum, tx) => sum + tx.amount, 0)
  const totalOdeme = filteredTransactions.filter((tx) => tx.type === "odeme").reduce((sum, tx) => sum + tx.amount, 0)
  const tabloBakiyesi = totalTahsilat - totalOdeme

  const handlePrint = () => {
    const printWindow = document.createElement('iframe');
    printWindow.style.position = 'absolute';
    printWindow.style.top = '-1000px';
    printWindow.style.left = '-1000px';
    document.body.appendChild(printWindow);

    const doc = printWindow.contentWindow?.document;
    if (!doc) return;

    let filterTitle = "Tüm Kasa ve Hareketler";
    if (filterType === 'tahsilat') filterTitle = "Sadece Tahsilatlar";
    if (filterType === 'odeme') filterTitle = "Sadece Ödemeler";
    if (filterLedger === 'nakit') filterTitle += " (Sadece Nakit)";
    if (filterLedger === 'banka') filterTitle += " (Sadece Banka)";

    const txHtml = filteredTransactions.map(tx => {
      const typeStr = tx.type === "tahsilat" ? "Tahsilat" : "Ödeme";
      const amountStr = tx.type === "tahsilat" ? `+${formatCurrency(tx.amount)}` : `-${formatCurrency(tx.amount)}`;
      const amountColor = tx.type === "tahsilat" ? "#16a34a" : "#dc2626";
      const desc = tx.description + (tx.interest_rate ? ` (%${tx.interest_rate} Faiz)` : '');
      const account = accounts.find(a => a.id.toString() === (tx.account_id || tx.accountId)?.toString());
      return `
      <tr>
        <td>${formatDateTime(tx.date).split(' ')[0]}</td>
        <td>${account?.custom_code || '-'}</td>
        <td>${tx.accountName || `Silinmiş ${tSingle}`}</td>
        <td>${tx.ledgerName || tx.method || 'Yok'}</td>
        <td>${typeStr}</td>
        <td class="text-right" style="color: ${amountColor}; font-weight: bold;">${amountStr}</td>
        <td>${desc}</td>
      </tr>
    `}).join('');

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
            .print-date { font-size: 12px; color: #666; text-align: right; margin-top: 30px; }
            .summary { margin-top: 20px; font-weight: bold; font-size: 16px; text-align: right; border-top: 2px solid #333; padding-top: 10px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${filterTitle}</h1>
            <p style="margin:0; color:#666;">İşletmenizin finansal hareket dökümüdür.</p>
          </div>
          <table>
            <thead>
              <tr>
                <th>Tarih</th>
                <th>Özel Kod</th>
                <th>${tSingle} Adı</th>
                <th>Kasa/Banka</th>
                <th>Tip</th>
                <th class="text-right">Tutar</th>
                <th>Açıklama</th>
              </tr>
            </thead>
            <tbody>
              ${txHtml || '<tr><td colspan="7" style="text-align:center">İşlem bulunamadı.</td></tr>'}
            </tbody>
          </table>
          <div class="summary">
             Filtrelenen Net Bakiye: <span style="color: ${tabloBakiyesi >= 0 ? '#16a34a' : '#dc2626'}">${formatCurrency(tabloBakiyesi)}</span>
          </div>
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
  }

  const calculateInterest = (tx: Transaction) => {
      if (!tx.maturity_date || !tx.interest_rate) return;
      const today = new Date();
      const maturity = new Date(tx.maturity_date);
      const diffTime = today.getTime() - maturity.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays <= 0) {
          toast({ title: "Vadesi Geçmemiş", description: "Bu işlemin henüz vadesi geçmemiş.", variant: "destructive" });
          return;
      }
      
      let dailyRate = 0;
      if (tx.interest_type === 'yillik') { dailyRate = tx.interest_rate / 365 / 100; } 
      else { dailyRate = tx.interest_rate / 30 / 100; } // aylik

      const interestAmount = tx.amount * dailyRate * diffDays;
      setInterestResult({ days: diffDays, amount: parseFloat(interestAmount.toFixed(2)) });
      setSelectedTxForInterest(tx);
      setInterestModalOpen(true);
  }

  const applyInterest = async () => {
      if (!selectedTxForInterest) return;
      try {
          const accId = selectedTxForInterest.account_id || selectedTxForInterest.accountId;
          if (!accId) return;

          if (interestApplyMode === "genel" || interestApplyMode === "tekil") {
              // Create a new transaction representing the interest. It acts as an 'odeme' (debt increase for the customer).
              // Tekil is just a visual grouping (parent_id) we can use later.
              await addTransaction({
                  accountId: accId.toString(),
                  type: 'odeme', // Borçlandırma
                  amount: interestResult.amount,
                  description: `Faiz/Gecikme Zammı (${interestResult.days} gün) - Ref: ${selectedTxForInterest.description}`,
                  date: getLocalDatetime(),
                  method: "Nakit", // or none
                  ledgerId: null, // Bakiye yansımayacak kasa bazında, sadece borçlandırılacak
                  // @ts-ignore
                  is_interest: true,
                  parent_id: interestApplyMode === "tekil" ? selectedTxForInterest.id : undefined
              });
              toast({ title: "Başarılı", description: "Faiz hesaba yansıtıldı." });
          }
          await loadData();
          setInterestModalOpen(false);
      } catch (e) {
          toast({ title: "Hata", variant: "destructive" });
      }
  }

  return (
    <div className="w-full space-y-6">
      <div className="flex items-center justify-between"><div><h1 className="text-3xl font-bold tracking-tight">Kasa ve Hareketler</h1><p className="text-muted-foreground mt-1">İşletme geneli veya kişiye özel finansal işlemleri yönetin.</p></div><Button className="gap-2" onClick={openNewTxModal}><Plus className="h-4 w-4" /> Yeni İşlem Ekle</Button></div>
      <div className="flex items-center justify-between bg-muted/30 p-4 rounded-lg border border-dashed"><h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2"><User className="h-4 w-4" /> Özet Görünümü:</h3><Select value={selectedAccountId} onValueChange={setSelectedAccountId}><SelectTrigger className="w-[300px] bg-background"><SelectValue placeholder="Görünüm Seçin..." /></SelectTrigger><SelectContent><SelectItem value="all" className="font-bold text-primary">-- Tümü (Genel Kasa) --</SelectItem>{visibleAccounts.map(acc => (<SelectItem key={acc.id} value={acc.id.toString()}>{acc.name} {acc.custom_code ? `(${acc.custom_code})` : ''}</SelectItem>))}</SelectContent></Select></div>
      <div className="grid gap-4 md:grid-cols-3"><Card className="bg-destructive/5 border-destructive/20 transition-all"><CardContent className="p-6"><div className="flex items-center gap-2 mb-2 text-destructive"><TrendingDown className="h-5 w-5" /><h3 className="font-semibold text-sm uppercase tracking-wider">{selectedAccountId === "all" ? "Piyasadan Alacak (Borçlar)" : "Müşterinin Borcu"}</h3></div><div className="text-3xl font-bold text-destructive">{formatCurrency(displayBorc)}</div></CardContent></Card><Card className="bg-green-600/5 border-green-600/20 transition-all"><CardContent className="p-6"><div className="flex items-center gap-2 mb-2 text-green-700"><TrendingUp className="h-5 w-5" /><h3 className="font-semibold text-sm uppercase tracking-wider">{selectedAccountId === "all" ? "Piyasaya Borç (Alacaklar)" : "Müşterinin Alacağı"}</h3></div><div className="text-3xl font-bold text-green-700">{formatCurrency(displayAlacak)}</div></CardContent></Card><Card className="bg-primary/5 border-primary/20 shadow-sm transition-all"><CardContent className="p-6"><div className="flex items-center gap-2 mb-2 text-primary"><Wallet className="h-5 w-5" /><h3 className="font-semibold text-sm uppercase tracking-wider">{selectedAccountId === "all" ? "Genel Net Bakiye" : "Kişisel Net Bakiye"}</h3></div><div className={`text-3xl font-bold ${displayBakiye >= 0 ? 'text-primary' : 'text-destructive'}`}>{formatCurrency(Math.abs(displayBakiye))} <span className="text-xs font-bold">{displayBakiye > 0 ? '(ALACAKLIYIZ)' : displayBakiye < 0 ? '(BORÇLUYUZ)' : ''}</span></div></CardContent></Card></div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader><DialogTitle>{editingTxId ? "İşlemi Düzenle" : "Yeni İşlem Ekle"}</DialogTitle><DialogDescription>{editingTxId ? "İşlem bilgilerini değiştirin." : "Listeye manuel olarak yeni bir gelir veya gider ekleyin."}</DialogDescription></DialogHeader>
          <div className="grid gap-5 py-2">
              <div className="grid grid-cols-3 gap-2">
                <button type="button" onClick={() => setTxType('tahsilat')} className={`flex flex-col items-center justify-center gap-1 p-2 rounded-lg border-2 transition-all ${txType === 'tahsilat' ? 'border-green-600 bg-green-50 text-green-700' : 'border-muted hover:border-green-200 text-muted-foreground'}`}><ArrowUp className={`h-5 w-5 ${txType === 'tahsilat' ? 'text-green-600' : ''}`} /><span className="font-semibold text-xs">Tahsilat (Al)</span></button>
                <button type="button" onClick={() => setTxType('odeme')} className={`flex flex-col items-center justify-center gap-1 p-2 rounded-lg border-2 transition-all ${txType === 'odeme' ? 'border-destructive bg-red-50 text-destructive' : 'border-muted hover:border-red-200 text-muted-foreground'}`}><ArrowDown className={`h-5 w-5 ${txType === 'odeme' ? 'text-destructive' : ''}`} /><span className="font-semibold text-xs">Ödeme (Ver)</span></button>
                <button type="button" onClick={() => setTxType('faiz_isleme')} className={`flex flex-col items-center justify-center gap-1 p-2 rounded-lg border-2 transition-all ${txType === 'faiz_isleme' ? 'border-orange-500 bg-orange-50 text-orange-600' : 'border-muted hover:border-orange-200 text-muted-foreground'}`}><Percent className={`h-5 w-5 ${txType === 'faiz_isleme' ? 'text-orange-500' : ''}`} /><span className="font-semibold text-xs">Faiz (Ekle)</span></button>
              </div>
              <div className="space-y-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right font-medium">{tSingle} Adı</Label>
                    <div className="col-span-3 space-y-2">
                      <Select value={formData.accountId} onValueChange={(val) => setFormData({...formData, accountId: val})} disabled={!!editingTxId || applyToAll}>
                        <SelectTrigger><SelectValue placeholder={`${tSingle} Seçiniz`} /></SelectTrigger>
                        <SelectContent>
                          <div className="px-2 pb-2 pt-2 sticky top-0 bg-popover z-10">
                            <Input placeholder="Ara..." value={searchQueryAcc} onChange={e => setSearchQueryAcc(e.target.value)} onKeyDown={e => e.stopPropagation()} className="h-8" />
                          </div>
                          {visibleAccounts.filter(a => a.name.toLowerCase().includes(searchQueryAcc.toLowerCase()) || (a.custom_code && a.custom_code.includes(searchQueryAcc))).map(acc => (
                            <SelectItem key={acc.id} value={acc.id.toString()}>{acc.name} {acc.custom_code ? `(${acc.custom_code})` : ''}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {!editingTxId && (
                        <div className="flex items-center gap-2 mt-2 p-2 border rounded-md bg-muted/30">
                          <input type="checkbox" id="applyAll" checked={applyToAll} onChange={e => { setApplyToAll(e.target.checked); if(e.target.checked) setFormData({...formData, accountId: ""}); }} className="h-4 w-4" />
                          <Label htmlFor="applyAll" className="text-sm font-semibold text-primary cursor-pointer">Tüm {tSingle}lere Uygula (Toplu İşlem)</Label>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4"><Label className="text-right font-medium">Yöntem</Label>
                      <Select value={formData.method} onValueChange={handleMethodChange}>
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
                  
                  <div className="grid grid-cols-4 items-center gap-4"><Label className="text-right font-medium">Kasa/Banka</Label>
                      <Select value={formData.ledgerId} onValueChange={(v) => setFormData({...formData, ledgerId: v})}>
                          <SelectTrigger className="col-span-3"><SelectValue placeholder="Bakiye Yansımayacak (Bağımsız)"/></SelectTrigger>
                          <SelectContent>
                              <SelectItem value="none" className="text-muted-foreground italic">Bakiye Yansımayacak</SelectItem>
                              {ledgers.filter(l => {
                                 if (formData.method === 'Nakit') return l.type === 'kasa';
                                 if (formData.method === 'Havale/EFT') return l.type === 'banka';
                                 return true;
                              }).map(l => (
                                <SelectItem key={l.id} value={l.id.toString()}>{l.name} ({l.type})</SelectItem>
                              ))}
                          </SelectContent>
                      </Select>
                      {(formData.method === 'Nakit' || formData.method === 'Havale/EFT') && (
                        <p className="col-start-2 col-span-3 text-xs text-muted-foreground">
                          {formData.method} seçildiği için otomatik yönlendirilmiştir.
                        </p>
                      )}
                  </div>

                  <div className="grid grid-cols-4 items-center gap-4"><Label className="text-right font-medium">{txType === 'faiz_isleme' ? 'Ana Para Tutarı' : 'Tutar'}</Label><div className="col-span-3 relative"><Input type="number" className="pl-8" value={formData.amount} onChange={(e) => setFormData({...formData, amount: e.target.value})} /><span className="absolute left-3 top-2.5 text-muted-foreground text-sm">₺</span></div></div>
                  
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right font-medium text-xs">İşlem Tarihi / Saati</Label>
                    <div className="col-span-3 flex items-center relative"><Calendar className="absolute left-2 h-4 w-4 text-muted-foreground" /><Input type="datetime-local" className="pl-8" value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} /></div>
                  </div>

                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right font-medium text-xs">Vade Tarihi</Label>
                    <div className="col-span-3 flex items-center relative"><Calendar className="absolute left-2 h-4 w-4 text-muted-foreground" /><Input type="date" className="pl-8" value={formData.maturityDate} onChange={(e) => setFormData({...formData, maturityDate: e.target.value})} /></div>
                  </div>

                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right font-medium text-xs">Faiz Oranı (%)</Label>
                    <div className="col-span-3 flex gap-2">
                        <div className="flex-1 flex items-center relative"><Percent className="absolute left-2 h-4 w-4 text-muted-foreground" /><Input type="number" step="0.01" className="pl-8" value={formData.interestRate} onChange={(e) => setFormData({...formData, interestRate: e.target.value})} /></div>
                        <Select value={formData.interestType} onValueChange={(v) => setFormData({...formData, interestType: v})}>
                            <SelectTrigger className="w-[110px]"><SelectValue /></SelectTrigger>
                            <SelectContent><SelectItem value="aylik">Aylık</SelectItem><SelectItem value="yillik">Yıllık</SelectItem></SelectContent>
                        </Select>
                    </div>
                  </div>
                  
                  {formData.amount && formData.interestRate !== "0" && (
                    <div className="col-span-4 bg-orange-50 border border-orange-200 text-orange-700 p-3 rounded-md text-sm flex justify-between items-center">
                      <span>Anlık Hesaplanan Gecikme Faizi:</span>
                      <strong className="text-lg">{
                        (() => {
                          const principal = parseFloat(formData.amount);
                          if (formData.maturityDate && new Date(formData.maturityDate) < new Date()) {
                              const today = new Date(); const maturity = new Date(formData.maturityDate);
                              const diffTime = today.getTime() - maturity.getTime();
                              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                              const dailyRate = formData.interestType === 'yillik' ? parseFloat(formData.interestRate) / 365 / 100 : parseFloat(formData.interestRate) / 30 / 100;
                              return formatCurrency(parseFloat((principal * dailyRate * diffDays).toFixed(2)));
                          } else {
                              return formatCurrency(parseFloat((principal * (parseFloat(formData.interestRate) / 100)).toFixed(2)));
                          }
                        })()
                      }</strong>
                    </div>
                  )}

                  <div className="grid grid-cols-4 items-center gap-4"><Label className="text-right font-medium">Açıklama</Label><Input className="col-span-3" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} /></div>
              </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setIsModalOpen(false)}>İptal</Button><Button onClick={handleSave} className={txType === 'tahsilat' ? 'bg-green-600 hover:bg-green-700' : 'bg-destructive hover:bg-destructive/90'}>{editingTxId ? 'Güncelle' : (txType === 'tahsilat' ? 'Tahsilatı Kaydet' : 'Ödemeyi Kaydet')}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={interestModalOpen} onOpenChange={setInterestModalOpen}>
          <DialogContent>
              <DialogHeader><DialogTitle>Faiz / Gecikme Zammı Hesapla</DialogTitle><DialogDescription>Vadesi geçmiş işlem için gecikme faizi hesaplanıyor.</DialogDescription></DialogHeader>
              <div className="space-y-4 py-4">
                  <div className="bg-muted p-4 rounded-lg space-y-2 text-sm">
                      <div className="flex justify-between"><span>İşlem Tutarı:</span><span className="font-semibold">{formatCurrency(selectedTxForInterest?.amount || 0)}</span></div>
                      <div className="flex justify-between"><span>Vade Tarihi:</span><span>{selectedTxForInterest?.maturity_date ? new Date(selectedTxForInterest.maturity_date).toLocaleDateString('tr-TR') : '-'}</span></div>
                      <div className="flex justify-between"><span>Gecikilen Gün:</span><span className="text-destructive font-bold">{interestResult.days} Gün</span></div>
                      <div className="flex justify-between border-t pt-2 mt-2"><span>Faiz Oranı:</span><span>%{selectedTxForInterest?.interest_rate} ({selectedTxForInterest?.interest_type === 'yillik' ? 'Yıllık' : 'Aylık'})</span></div>
                      <div className="flex justify-between text-lg font-bold text-destructive"><span>Hesaplanan Gecikme Zammı:</span><span>{formatCurrency(interestResult.amount)}</span></div>
                  </div>
                  <div className="space-y-3 pt-2">
                      <Label className="text-base font-semibold">Nasıl Yansıtılsın?</Label>
                      <RadioGroup value={interestApplyMode} onValueChange={(v: any) => setInterestApplyMode(v)}>
                          <div className="flex items-center space-x-2 border p-3 rounded-md cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setInterestApplyMode("genel")}>
                              <RadioGroupItem value="genel" id="r1" />
                              <Label htmlFor="r1" className="cursor-pointer"><strong>Genel Bakiyeye Yansıt</strong> (Kişinin toplam borcuna eklenir)</Label>
                          </div>
                          <div className="flex items-center space-x-2 border p-3 rounded-md cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setInterestApplyMode("tekil")}>
                              <RadioGroupItem value="tekil" id="r2" />
                              <Label htmlFor="r2" className="cursor-pointer"><strong>Tekil İşleme Yansıt</strong> (Bu faturaya/aidata bağlı alt işlem olarak eklenir)</Label>
                          </div>
                      </RadioGroup>
                  </div>
              </div>
              <DialogFooter><Button variant="outline" onClick={() => setInterestModalOpen(false)}>İptal</Button><Button onClick={applyInterest} className="bg-destructive hover:bg-destructive/90">Faizi İşle ({formatCurrency(interestResult.amount)})</Button></DialogFooter>
          </DialogContent>
      </Dialog>

      <Card className="print:shadow-none print:border-none">
        <CardContent className="p-0">
          <div className="p-4 border-b border-border flex gap-2 flex-wrap items-center">
            <div className="relative flex-1 min-w-[200px] max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input type="text" placeholder={`Açıklama veya ${tSingle.toLowerCase()} ara...`} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" /></div>
            
            <Select value={filterLedger} onValueChange={setFilterLedger}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Kasa/Banka Filtresi" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Kasalar</SelectItem>
                <SelectItem value="nakit">Sadece Nakit İşlemler</SelectItem>
                <SelectItem value="banka">Sadece Banka İşlemleri</SelectItem>
              </SelectContent>
            </Select>

            <DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline" size="icon" className={filterType !== 'all' ? 'text-primary border-primary' : ''}><Filter className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuLabel>İşlem Tipi</DropdownMenuLabel><DropdownMenuSeparator /><DropdownMenuCheckboxItem checked={filterType === 'all'} onCheckedChange={() => setFilterType('all')}>Tümü</DropdownMenuCheckboxItem><DropdownMenuCheckboxItem checked={filterType === 'tahsilat'} onCheckedChange={() => setFilterType('tahsilat')}>Sadece Tahsilatlar</DropdownMenuCheckboxItem><DropdownMenuCheckboxItem checked={filterType === 'odeme'} onCheckedChange={() => setFilterType('odeme')}>Sadece Ödemeler</DropdownMenuCheckboxItem></DropdownMenuContent></DropdownMenu>
            
            <Button variant="outline" className="gap-2 print:hidden ml-auto" onClick={handlePrint}>
              <Printer className="h-4 w-4" /> Yazdır
            </Button>
          </div>
          <div className="overflow-x-auto print:overflow-visible">
            <Table>
              <TableHeader><TableRow className="hover:bg-transparent border-border"><TableHead className="w-32">Tarih</TableHead><TableHead className="w-24">Özel Kod</TableHead><TableHead>{tSingle} Adı</TableHead><TableHead>Kasa/Banka</TableHead><TableHead>Vade</TableHead><TableHead>Tip</TableHead><TableHead className="text-right">Tutar</TableHead><TableHead>Açıklama</TableHead><TableHead className="text-right w-16"></TableHead></TableRow></TableHeader>
              <TableBody>
                {filteredTransactions.length === 0 ? (<TableRow><TableCell colSpan={9} className="h-24 text-center text-muted-foreground">İşlem bulunamadı.</TableCell></TableRow>) : (filteredTransactions.map((tx) => (
                    <TableRow key={tx.id} className="border-border group">
                      <TableCell className="text-muted-foreground font-medium text-xs">{formatDateTime(tx.date).split(' ')[0]}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{accounts.find(a => a.id.toString() === (tx.account_id || tx.accountId)?.toString())?.custom_code || "-"}</TableCell>
                      <TableCell><Link to={`/accounts?id=${tx.account_id || tx.accountId}`} className="font-medium text-foreground hover:text-primary hover:underline">{tx.accountName || `Silinmiş ${tSingle}`}</Link></TableCell>
                      <TableCell><Badge variant="secondary" className="font-normal">{tx.ledgerName || tx.method || 'Yok'}</Badge></TableCell>
                      <TableCell className="text-xs text-muted-foreground">{tx.maturity_date ? new Date(tx.maturity_date).toLocaleDateString('tr-TR') : '-'}</TableCell>
                      <TableCell><Badge variant="outline" className={cn("gap-1 pr-2", tx.type === "tahsilat" ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-destructive border-red-200")}>{tx.type === "tahsilat" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}{tx.type === "tahsilat" ? "Tahsilat" : "Ödeme"}</Badge></TableCell>
                      <TableCell className={cn("text-right font-bold text-base", tx.type === "tahsilat" ? "text-green-600" : "text-destructive")}>{tx.type === "tahsilat" ? "+" : "-"}{formatCurrency(tx.amount)}</TableCell>
                      <TableCell className="text-muted-foreground text-sm flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          {tx.is_interest && <Percent className="h-3 w-3 text-orange-500" />}
                          {tx.description} 
                          {tx.interest_rate && tx.interest_rate > 0 ? <span className="text-xs text-orange-500 bg-orange-50 px-1 py-0.5 rounded border border-orange-200">(%{tx.interest_rate} {tx.interest_type})</span> : null}
                          {tx.type === 'odeme' && tx.is_paid && <Badge variant="outline" className="text-[10px] h-4 border-green-600 text-green-600 px-1 py-0">ÖDENDİ</Badge>}
                        </div>
                        {getAccruedInterest(tx) > 0 && (
                          <div className="text-[11px] font-bold text-orange-600 bg-orange-50 w-fit px-1.5 py-0.5 rounded border border-orange-200">
                            (+{formatCurrency(getAccruedInterest(tx))} faiz birikti)
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {tx.maturity_date && tx.interest_rate && tx.interest_rate > 0 && !tx.is_interest && !tx.is_paid && (
                              <DropdownMenuItem onSelect={() => handleMarkAsPaid(tx.id)} className="text-green-600 font-medium"><ShieldCheck className="mr-2 h-4 w-4" /> Ödendi İşaretle</DropdownMenuItem>
                            )}
                            <DropdownMenuItem onSelect={() => openEditTxModal(tx)}><Pencil className="mr-2 h-4 w-4" /> Düzenle</DropdownMenuItem>
                            {tx.maturity_date && tx.interest_rate && tx.interest_rate > 0 && !tx.is_interest && !tx.is_paid && (
                                <DropdownMenuItem onSelect={() => calculateInterest(tx)} className="text-orange-600 font-medium"><Percent className="mr-2 h-4 w-4" /> Faiz Tahakkuk Ettir</DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive" onSelect={() => handleDelete(tx.id)}><Trash2 className="mr-2 h-4 w-4" /> Sil</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )))}
              </TableBody>
              <TableFooter><TableRow className="hover:bg-muted/50 border-t-2 border-border"><TableCell colSpan={6} className="font-semibold text-foreground text-base">Filtrelenen İşlemlerin Özeti</TableCell><TableCell className={cn("text-right font-bold text-xl", tabloBakiyesi >= 0 ? "text-green-600" : "text-destructive")}>{formatCurrency(tabloBakiyesi)}</TableCell><TableCell colSpan={2} /></TableRow></TableFooter>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}